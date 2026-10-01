import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

/**
 * API du planning d'encadrement des sorties jeunes (BFTRI).
 *
 * Public (aucun mot de passe, comme l'appli d'origine : on choisit son nom) :
 *   GET  /api/state
 *   POST /api/register    { sortieId, encadrantId }
 *   POST /api/unregister  { sortieId, encadrantId }
 *
 * Administration (mot de passe vérifié ici, jeton signé de 12 h) :
 *   POST /api/admin/login            { password }
 *   POST /api/admin/sortie           { id?, date, time, duree, type, cat, lieu, referent, besoin, participants, note }
 *   POST /api/admin/sortie/remove    { id }
 *   POST /api/admin/encadrant        { name, niveau }
 *   POST /api/admin/encadrant/remove { id }
 *
 * Variables d'environnement requises : ADMIN_PASSWORD, TOKEN_SECRET.
 */

const CATS = ["poussin", "pupille", "benjamin", "minime"];
const NIVEAUX = ["BF1", "BF2", "BF3", "BF4", "BF5", "STAPS", "Bénévole"];
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const env = (key: string): string | undefined => (globalThis as any).Netlify?.env?.get(key);

/* ---------- Jeton administrateur (HMAC) ---------- */
const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

function makeToken(secret: string): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function checkToken(token: string, secret: string): boolean {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload, secret));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function requireAdmin(req: Request) {
  const secret = env("TOKEN_SECRET");
  if (!secret) throw new HttpError(500, "Configuration serveur incomplète (TOKEN_SECRET).");
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !checkToken(token, secret)) throw new HttpError(401, "Session administrateur expirée, reconnecte-toi.");
}

/* ---------- Lecture de l'état complet ---------- */
async function loadState(db: any) {
  const encadrants = await db.sql`SELECT id, name, niveau FROM encadrants ORDER BY lower(name)`;
  const sorties = await db.sql`
    SELECT s.id,
           to_char(s.jour, 'YYYY-MM-DD') AS date,
           s.heure AS time,
           s.duree, s.type, s.cat, s.lieu, s.referent, s.referent2, s.besoin, s.participants, s.note,
           COALESCE(array_agg(i.encadrant_id ORDER BY i.created_at) FILTER (WHERE i.encadrant_id IS NOT NULL), '{}') AS inscrits
    FROM sorties s
    LEFT JOIN inscriptions i ON i.sortie_id = s.id
    GROUP BY s.id
    ORDER BY s.jour, s.heure, s.id`;
  return { encadrants, sorties };
}

/* ---------- Validation ---------- */
const toInt = (v: unknown, min: number, max: number, label: string): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} invalide.`);
  return n;
};

function parseSortie(b: any) {
  const date = String(b.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new HttpError(400, "Date invalide.");
  const time = String(b.time || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new HttpError(400, "Heure invalide.");
  const cat = String(b.cat || "");
  if (!CATS.includes(cat)) throw new HttpError(400, "Groupe invalide.");
  const type = b.type === "route" ? "route" : "vtt";
  if (type === "route" && cat !== "minime") throw new HttpError(400, "Seul le groupe Compet sort en Route.");
  const lieu = String(b.lieu || "").trim().slice(0, 80);
  if (!lieu) throw new HttpError(400, "Le lieu est obligatoire.");
  const duree = toInt(b.duree ?? 120, 15, 600, "Durée");
  const besoin = toInt(b.besoin, 0, 50, "Nombre d'encadrants");
  const participants =
    b.participants === null || b.participants === undefined || b.participants === ""
      ? null
      : toInt(b.participants, 0, 500, "Nombre de jeunes");
  const note = String(b.note || "").trim().slice(0, 200);
  const referent = b.referent ? String(b.referent) : null;
  const referent2 = b.referent2 ? String(b.referent2) : null;
  if (referent && referent === referent2) throw new HttpError(400, "Les deux référents doivent être différents.");
  return { date, time, cat, type, lieu, duree, besoin, participants, note, referent, referent2 };
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/* ---------- Inscription (transaction : jamais plus d'inscrits que de besoins) ---------- */
async function register(db: any, sortieId: string, encadrantId: string) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT to_char(jour,'YYYY-MM-DD') AS jour, heure, duree, besoin FROM sorties WHERE id = $1 FOR UPDATE", [sortieId]);
    const s = found.rows[0];
    if (!s) {
      await client.query("ROLLBACK");
      throw new HttpError(404, "Créneau introuvable.");
    }
    const who = await client.query("SELECT 1 FROM encadrants WHERE id = $1", [encadrantId]);
    if (!who.rows[0]) {
      await client.query("ROLLBACK");
      throw new HttpError(404, "Encadrant introuvable.");
    }

    let reason: string | null = null;
    if (s.besoin === 0) reason = "Ce créneau vient d'être annulé.";
    if (!reason) {
      const c = await client.query("SELECT count(*)::int AS n FROM inscriptions WHERE sortie_id = $1", [sortieId]);
      if (c.rows[0].n >= s.besoin) reason = "Ce créneau vient d'être complété.";
    }
    if (!reason) {
      const start = minutes(s.heure);
      const clash = await client.query(
        `SELECT 1 FROM inscriptions i JOIN sorties o ON o.id = i.sortie_id
         WHERE i.encadrant_id = $1 AND o.jour = $2::date AND o.id <> $3 AND o.besoin > 0
           AND (split_part(o.heure, ':', 1)::int * 60 + split_part(o.heure, ':', 2)::int) < $4::int + $5::int
           AND $4::int < (split_part(o.heure, ':', 1)::int * 60 + split_part(o.heure, ':', 2)::int) + o.duree
         LIMIT 1`,
        [encadrantId, s.jour, sortieId, start, s.duree]
      );
      if (clash.rows[0]) reason = "Tu es déjà positionné sur un autre créneau à la même heure.";
    }
    if (reason) {
      await client.query("ROLLBACK");
      return { ok: false, error: reason };
    }
    await client.query("INSERT INTO inscriptions (sortie_id, encadrant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [sortieId, encadrantId]);
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* déjà terminé */
    }
    throw e;
  } finally {
    client.release();
  }
}

/* ---------- Routeur ---------- */
export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const method = req.method.toUpperCase();

  try {
    const db: any = getDatabase();
    const withState = async (extra: Record<string, unknown> = {}, status = 200) =>
      json({ ok: status < 400, ...extra, state: await loadState(db) }, status);

    if (method === "GET" && route === "state") return withState();
    if (method !== "POST") throw new HttpError(405, "Méthode non autorisée.");

    const body: any = await req.json().catch(() => ({}));

    /* --- encadrants --- */
    if (route === "register" || route === "unregister") {
      const sortieId = String(body.sortieId || "");
      const encadrantId = String(body.encadrantId || "");
      if (!sortieId || !encadrantId) throw new HttpError(400, "Requête incomplète.");
      if (route === "register") {
        const r = await register(db, sortieId, encadrantId);
        return r.ok ? withState() : withState({ error: r.error }, 409);
      }
      await db.sql`DELETE FROM inscriptions WHERE sortie_id = ${sortieId} AND encadrant_id = ${encadrantId}`;
      return withState();
    }

    /* --- administration --- */
    if (route === "admin/login") {
      const expected = env("ADMIN_PASSWORD");
      const secret = env("TOKEN_SECRET");
      if (!expected || !secret) throw new HttpError(500, "Configuration serveur incomplète (ADMIN_PASSWORD / TOKEN_SECRET).");
      const given = String(body.password || "");
      if (!safeEqual(given, expected)) {
        await new Promise((r) => setTimeout(r, 600)); // ralentit les essais répétés
        throw new HttpError(401, "Mot de passe incorrect.");
      }
      return json({ ok: true, token: makeToken(secret) });
    }

    if (route.startsWith("admin/")) {
      requireAdmin(req);

      if (route === "admin/sortie") {
        const p = parseSortie(body);
        for (const r of [p.referent, p.referent2]) {
          if (!r) continue;
          const ok = await db.sql`SELECT 1 AS x FROM encadrants WHERE id = ${r}`;
          if (!ok.length) throw new HttpError(400, "Référent inconnu.");
        }
        if (body.id) {
          const rows = await db.sql`
            UPDATE sorties SET jour = ${p.date}, heure = ${p.time}, duree = ${p.duree}, type = ${p.type}, cat = ${p.cat},
                   lieu = ${p.lieu}, referent = ${p.referent}, referent2 = ${p.referent2}, besoin = ${p.besoin}, participants = ${p.participants}, note = ${p.note}
            WHERE id = ${String(body.id)} RETURNING id`;
          if (!rows.length) throw new HttpError(404, "Créneau introuvable.");
        } else {
          const id = "s" + randomUUID().slice(0, 8);
          await db.sql`
            INSERT INTO sorties (id, jour, heure, duree, type, cat, lieu, referent, referent2, besoin, participants, note)
            VALUES (${id}, ${p.date}, ${p.time}, ${p.duree}, ${p.type}, ${p.cat}, ${p.lieu}, ${p.referent}, ${p.referent2}, ${p.besoin}, ${p.participants}, ${p.note})`;
        }
        return withState();
      }

      if (route === "admin/sortie/remove") {
        const id = String(body.id || "");
        if (!id) throw new HttpError(400, "Requête incomplète.");
        const rows = await db.sql`DELETE FROM sorties WHERE id = ${id} RETURNING id`;
        if (!rows.length) throw new HttpError(404, "Créneau introuvable.");
        return withState();
      }

      if (route === "admin/encadrant") {
        const name = String(body.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
        const niveau = NIVEAUX.includes(body.niveau) ? body.niveau : "Bénévole";
        if (!name) throw new HttpError(400, "Indique un nom.");
        const dup = await db.sql`SELECT 1 AS x FROM encadrants WHERE lower(name) = lower(${name})`;
        if (dup.length) throw new HttpError(409, "Cette personne existe déjà.");
        const id = "e" + randomUUID().slice(0, 8);
        await db.sql`INSERT INTO encadrants (id, name, niveau) VALUES (${id}, ${name}, ${niveau})`;
        return withState();
      }

      if (route === "admin/encadrant/remove") {
        const id = String(body.id || "");
        if (!id) throw new HttpError(400, "Requête incomplète.");
        await db.sql`DELETE FROM encadrants WHERE id = ${id}`;
        return withState();
      }
    }

    throw new HttpError(404, "Route inconnue.");
  } catch (e: any) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
    console.error("Erreur API", e);
    return json({ ok: false, error: "Erreur serveur. Réessaie dans un instant." }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
