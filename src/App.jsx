import React, { useState, useMemo } from "react";
import { Bike, Waves, MapPin, Users, Clock, Plus, X, ChevronLeft, ChevronRight, Check, AlertTriangle, UserCircle2, ShieldCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Données de démonstration (à remplacer par les vraies données du club)
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: "poussin", label: "Poussin", sub: "9-10 ans", color: "#4E7A51" },
  { id: "pupille", label: "Pupille", sub: "11-12 ans", color: "#2F6690" },
  { id: "benjamin", label: "Benjamin", sub: "13-14 ans", color: "#B5622A" },
  { id: "minime", label: "Minime-Junior", sub: "15-18 ans", color: "#7A3B69" },
];

// Niveaux repris du planning club : brevets fédéraux (BF1 à BF5), diplômes
// STAPS, ou "Bénévole" pour les encadrants sans qualification formelle.
const ENCADRANTS = [
  { name: "Alain Audinot", niveau: "BF2" },
  { name: "Nadine Bellot", niveau: "BF5" },
  { name: "Alexandre Contri", niveau: "BF5" },
  { name: "Christophe Lefevre", niveau: "BF5" },
  { name: "Marine Lefevre", niveau: "STAPS" },
  { name: "Florence Thepaut", niveau: "BF3" },
  { name: "Ludovic Dard", niveau: "BF1" },
  { name: "Kim Huynh", niveau: "BF1" },
  { name: "Fabien Martin Bucher", niveau: "BF1" },
  { name: "Karine Mondenard", niveau: "Bénévole" },
];

// Seule la catégorie Minime-Junior sort en Route (ou Route/VTT selon les
// semaines) ; Poussin, Pupille et Benjamin sortent uniquement en VTT.
const initialSorties = [
  {
    id: 1, day: "Mer. 10 sept.", time: "13h45", type: "vtt", cat: "poussin",
    lieu: "Nautil", referent: "Christophe", besoin: 4, inscrits: ["Alain Audinot"],
  },
  {
    id: 2, day: "Mer. 10 sept.", time: "13h45", type: "vtt", cat: "benjamin",
    lieu: "Nautil", referent: "Alexandre Contri",
    besoin: 4, inscrits: ["Alexandre Contri", "Fabien Martin Bucher", "Karine Mondenard"],
  },
  {
    id: 3, day: "Mer. 10 sept.", time: "13h45", type: "route", cat: "minime",
    lieu: "Nautil", referent: "Marine", besoin: 6, inscrits: [],
  },
  {
    id: 4, day: "Sam. 13 sept.", time: "13h45", type: "vtt", cat: "pupille",
    lieu: "Torcy", referent: "Florence Thepaut",
    besoin: 4, inscrits: ["Florence Thepaut", "Kim Huynh", "Marine Lefevre"],
  },
  {
    id: 5, day: "Sam. 13 sept.", time: "15h", type: "vtt", cat: "benjamin",
    lieu: "Nautil", referent: "Nadine Bellot", besoin: 3, inscrits: ["Nadine Bellot"],
  },
];

const catInfo = (id) => CATEGORIES.find((c) => c.id === id);
const NIVEAU_COLOR = { BF1: "#8A8371", BF2: "#6E8B74", BF3: "#4E7A51", BF4: "#2F6690", BF5: "#1B2430", STAPS: "#7A3B69", "Bénévole": "#B5622A" };

// ---------------------------------------------------------------------------

function TypeIcon({ type, size = 16 }) {
  return type === "vtt" ? <Bike size={size} /> : <Waves size={size} style={{ transform: "rotate(0deg)" }} />;
}
// (Route sorties use a simple road glyph instead of Waves — see RoadIcon below)
function RoadIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 3 4 21" />
      <path d="M15 3l5 18" />
      <path d="M12 7v2M12 12v2M12 17v2" strokeDasharray="2 3" />
    </svg>
  );
}
function KindIcon({ type, size = 16 }) {
  return type === "vtt" ? <Bike size={size} /> : <RoadIcon size={size} />;
}

function Badge({ children, color }) {
  return (
    <span
      style={{ background: color + "1A", color, border: `1px solid ${color}55` }}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
    >
      {children}
    </span>
  );
}

function CoverageBar({ inscrits, besoin }) {
  const ratio = Math.min(inscrits / besoin, 1);
  const full = inscrits >= besoin;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-[#E7E1D3] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${ratio * 100}%`, background: full ? "#4E7A51" : "#B5622A" }}
        />
      </div>
      <span className="text-[12px] font-semibold" style={{ color: full ? "#4E7A51" : "#B5622A" }}>
        {inscrits}/{besoin}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MODE ENCADRANT
// ---------------------------------------------------------------------------

function EncadrantMode({ sorties, setSorties, identity, setIdentity }) {
  const [openId, setOpenId] = useState(null);

  if (!identity) {
    return (
      <div className="px-5 pt-6 pb-10 max-w-md mx-auto">
        <h2 className="font-display text-[26px] leading-tight text-[#1B2430]">
          Qui se connecte&nbsp;?
        </h2>
        <p className="text-[14px] text-[#5B5648] mt-1 mb-5">
          Choisis ton nom dans la liste des encadrants du club.
        </p>
        <div className="flex flex-col gap-2">
          {ENCADRANTS.map(({ name, niveau }) => (
            <button
              key={name}
              onClick={() => setIdentity(name)}
              className="flex items-center gap-3 rounded-2xl border border-[#E7E1D3] bg-white px-4 py-3 text-left hover:border-[#B5622A] transition-colors"
            >
              <UserCircle2 size={22} className="text-[#8A8371]" />
              <span className="text-[15px] font-medium text-[#1B2430] flex-1">{name}</span>
              <Badge color={NIVEAU_COLOR[niveau] || "#8A8371"}>{niveau}</Badge>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const grouped = useMemo(() => {
    const byDay = {};
    sorties.forEach((s) => {
      byDay[s.day] = byDay[s.day] || [];
      byDay[s.day].push(s);
    });
    return byDay;
  }, [sorties]);

  const toggleInscription = (id) => {
    setSorties((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const already = s.inscrits.includes(identity);
        return {
          ...s,
          inscrits: already ? s.inscrits.filter((n) => n !== identity) : [...s.inscrits, identity],
        };
      })
    );
  };

  return (
    <div className="px-5 pt-5 pb-14 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[12px] uppercase tracking-wide text-[#8A8371] font-semibold">Connecté</p>
          <p className="font-display text-[20px] text-[#1B2430]">{identity}</p>
        </div>
        <button onClick={() => setIdentity(null)} className="text-[13px] text-[#B5622A] font-medium">
          Changer
        </button>
      </div>

      {Object.entries(grouped).map(([day, list]) => (
        <div key={day} className="mb-6">
          <h3 className="font-display text-[18px] text-[#1B2430] mb-2.5">{day}</h3>
          <div className="flex flex-col gap-2.5">
            {list.map((s) => {
              const ci = catInfo(s.cat);
              const mine = s.inscrits.includes(identity);
              const full = s.inscrits.length >= s.besoin && !mine;
              return (
                <div key={s.id} className="rounded-2xl border border-[#E7E1D3] bg-white overflow-hidden">
                  <button
                    onClick={() => setOpenId(openId === s.id ? null : s.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: ci.color + "1A", color: ci.color }}
                    >
                      <KindIcon type={s.type} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1B2430]">
                        <Clock size={13} className="text-[#8A8371]" /> {s.time}
                        <span className="text-[#D8D2C1]">·</span>
                        {s.type === "vtt" ? "VTT" : "Route"}
                      </div>
                      <p className="text-[12.5px] text-[#8A8371] truncate">{ci.label} — {s.lieu}</p>
                    </div>
                    {mine ? (
                      <span className="flex items-center gap-1 text-[12px] font-semibold text-[#4E7A51]">
                        <Check size={14} /> Inscrit
                      </span>
                    ) : (
                      <CoverageBar inscrits={s.inscrits.length} besoin={s.besoin} />
                    )}
                  </button>

                  {openId === s.id && (
                    <div className="border-t border-[#EEE8DA] px-4 py-3 bg-[#FAF7F0]">
                      <div className="flex items-center gap-1.5 text-[13px] text-[#5B5648] mb-1">
                        <MapPin size={13} /> {s.lieu}
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] text-[#5B5648] mb-3">
                        <ShieldCheck size={13} /> Référent : {s.referent}
                      </div>
                      <p className="text-[12px] font-semibold text-[#8A8371] mb-1.5 uppercase tracking-wide">
                        Encadrants inscrits ({s.inscrits.length}/{s.besoin})
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {s.inscrits.length === 0 && (
                          <span className="text-[13px] text-[#B5622A]">Personne pour l'instant</span>
                        )}
                        {s.inscrits.map((n) => (
                          <span key={n} className="rounded-full bg-white border border-[#E7E1D3] px-2.5 py-1 text-[12px] text-[#1B2430]">
                            {n}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => toggleInscription(s.id)}
                        disabled={full}
                        className={`w-full rounded-xl py-2.5 text-[14px] font-semibold transition-colors ${
                          mine
                            ? "bg-white border border-[#C1652F] text-[#C1652F]"
                            : full
                            ? "bg-[#EEE8DA] text-[#B0A98F] cursor-not-allowed"
                            : "bg-[#C1652F] text-white"
                        }`}
                      >
                        {mine ? "Se désinscrire" : full ? "Créneau complet" : "Je suis disponible"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MODE ADMIN
// ---------------------------------------------------------------------------

function AdminMode({ sorties, setSorties }) {
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [draft, setDraft] = useState({
    day: "", time: "", type: "vtt", cat: "poussin", lieu: "", referent: "", besoin: 2,
  });

  const filtered = filterCat === "all" ? sorties : sorties.filter((s) => s.cat === filterCat);
  const understaffed = sorties.filter((s) => s.inscrits.length < s.besoin).length;

  const addSortie = () => {
    if (!draft.day || !draft.time || !draft.lieu || !draft.referent) return;
    setSorties((prev) => [...prev, { ...draft, id: Date.now(), besoin: Number(draft.besoin), inscrits: [] }]);
    setDraft({ day: "", time: "", type: "vtt", cat: "poussin", lieu: "", referent: "", besoin: 2 });
    setShowForm(false);
  };

  return (
    <div className="px-5 pt-5 pb-14 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-[22px] text-[#1B2430]">Besoins d'encadrement</h2>
      </div>
      {understaffed > 0 && (
        <div className="flex items-center gap-1.5 text-[13px] text-[#B5622A] font-medium mb-4">
          <AlertTriangle size={14} /> {understaffed} créneau{understaffed > 1 ? "x" : ""} à compléter
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        <button
          onClick={() => setFilterCat("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold border ${
            filterCat === "all" ? "bg-[#1B2430] text-white border-[#1B2430]" : "bg-white text-[#5B5648] border-[#E7E1D3]"
          }`}
        >
          Toutes
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCat(c.id)}
            className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold border"
            style={
              filterCat === c.id
                ? { background: c.color, color: "white", borderColor: c.color }
                : { background: "white", color: "#5B5648", borderColor: "#E7E1D3" }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 mb-5">
        {filtered.map((s) => {
          const ci = catInfo(s.cat);
          const missing = s.besoin - s.inscrits.length;
          return (
            <div key={s.id} className="rounded-2xl border border-[#E7E1D3] bg-white p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1B2430]">
                    {s.day} <span className="text-[#D8D2C1]">·</span> {s.time}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge color={ci.color}>{ci.label}</Badge>
                    <span className="flex items-center gap-1 text-[12px] text-[#5B5648]">
                      <KindIcon type={s.type} size={12} /> {s.type === "vtt" ? "VTT" : "Route"}
                    </span>
                  </div>
                </div>
                <CoverageBar inscrits={s.inscrits.length} besoin={s.besoin} />
              </div>
              <div className="text-[12.5px] text-[#5B5648] flex items-center gap-1.5 mb-0.5">
                <MapPin size={12} /> {s.lieu}
              </div>
              <div className="text-[12.5px] text-[#5B5648] flex items-center gap-1.5 mb-2">
                <ShieldCheck size={12} /> Référent : {s.referent}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.inscrits.map((n) => (
                  <span key={n} className="rounded-full bg-[#F3EEE3] px-2 py-0.5 text-[11.5px] text-[#1B2430]">{n}</span>
                ))}
                {missing > 0 && (
                  <span className="rounded-full bg-[#FBEEE4] px-2 py-0.5 text-[11.5px] text-[#B5622A] font-medium">
                    {missing} manquant{missing > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#C1652F] text-[#C1652F] py-3 text-[14px] font-semibold"
        >
          <Plus size={16} /> Ajouter une sortie
        </button>
      ) : (
        <div className="rounded-2xl border border-[#E7E1D3] bg-[#FAF7F0] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-[16px] text-[#1B2430]">Nouvelle sortie</p>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-[#8A8371]" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input placeholder="Jour (ex. Sam. 20 sept.)" value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: e.target.value })}
              className="col-span-2 rounded-lg border border-[#E7E1D3] px-3 py-2 text-[13px]" />
            <input placeholder="Heure (ex. 9h00)" value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              className="rounded-lg border border-[#E7E1D3] px-3 py-2 text-[13px]" />
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}
              className="rounded-lg border border-[#E7E1D3] px-3 py-2 text-[13px]">
              <option value="vtt">VTT</option>
              {draft.cat === "minime" && <option value="route">Route</option>}
            </select>
            <select value={draft.cat}
              onChange={(e) => {
                const cat = e.target.value;
                setDraft({ ...draft, cat, type: cat === "minime" ? draft.type : "vtt" });
              }}
              className="col-span-2 rounded-lg border border-[#E7E1D3] px-3 py-2 text-[13px]">
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <p className="col-span-2 text-[11.5px] text-[#8A8371] -mt-1">
              Seule la catégorie Minime-Junior sort en Route.
            </p>
            <input placeholder="Lieu de rdv" value={draft.lieu}
              onChange={(e) => setDraft({ ...draft, lieu: e.target.value })}
              className="col-span-2 rounded-lg border border-[#E7E1D3] px-3 py-2 text-[13px]" />
            <select value={draft.referent} onChange={(e) => setDraft({ ...draft, referent: e.target.value })}
              className="col-span-2 rounded-lg border border-[#E7E1D3] px-3 py-2 text-[13px]">
              <option value="">Référent…</option>
              {ENCADRANTS.map(({ name }) => <option key={name} value={name}>{name}</option>)}
            </select>
            <div className="col-span-2 flex items-center gap-2">
              <label className="text-[13px] text-[#5B5648]">Encadrants requis</label>
              <input type="number" min={1} value={draft.besoin}
                onChange={(e) => setDraft({ ...draft, besoin: e.target.value })}
                className="w-16 rounded-lg border border-[#E7E1D3] px-2 py-1.5 text-[13px]" />
            </div>
          </div>
          <button onClick={addSortie} className="w-full rounded-xl bg-[#1B2430] text-white py-2.5 text-[14px] font-semibold mt-1">
            Créer la sortie
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function App() {
  const [mode, setMode] = useState("encadrant");
  const [sorties, setSorties] = useState(initialSorties);
  const [identity, setIdentity] = useState(null);

  return (
    <div className="min-h-screen bg-[#FAF7F0]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Oswald', system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.01em; }
      `}</style>

      <header className="sticky top-0 z-10 bg-[#1B2430] text-white px-5 pt-5 pb-4">
        <p className="text-[11px] tracking-[0.15em] text-[#C1652F] font-semibold uppercase mb-0.5">
          Brie Francilienne Triathlon
        </p>
        <h1 className="font-display text-[24px]">Encadrement Jeunes</h1>

        <div className="mt-4 flex rounded-xl bg-white/10 p-1">
          {[
            { id: "encadrant", label: "Encadrant" },
            { id: "admin", label: "Admin" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors ${
                mode === m.id ? "bg-white text-[#1B2430]" : "text-white/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {mode === "encadrant" ? (
        <EncadrantMode sorties={sorties} setSorties={setSorties} identity={identity} setIdentity={setIdentity} />
      ) : (
        <AdminMode sorties={sorties} setSorties={setSorties} />
      )}
    </div>
  );
}
