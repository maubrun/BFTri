-- Schéma et données de départ : saison 2026-2027 du BFTRI (encadrement des sorties jeunes)

CREATE TABLE encadrants (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  niveau     TEXT NOT NULL DEFAULT 'Bénévole',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX encadrants_name_unique ON encadrants (lower(name));

CREATE TABLE sorties (
  id           TEXT PRIMARY KEY,
  jour         DATE NOT NULL,
  heure        TEXT NOT NULL CHECK (heure ~ '^[0-2][0-9]:[0-5][0-9]$'),
  duree        INTEGER NOT NULL DEFAULT 120 CHECK (duree > 0),
  type         TEXT NOT NULL CHECK (type IN ('vtt', 'route')),
  cat          TEXT NOT NULL CHECK (cat IN ('poussin', 'pupille', 'benjamin', 'minime')),
  lieu         TEXT NOT NULL,
  referent     TEXT REFERENCES encadrants (id) ON DELETE SET NULL,
  besoin       INTEGER NOT NULL DEFAULT 4 CHECK (besoin >= 0),
  participants INTEGER CHECK (participants >= 0),
  note         TEXT NOT NULL DEFAULT '',
  -- seule la catégorie Minime-Junior sort en Route
  CHECK (type = 'vtt' OR cat = 'minime')
);
CREATE INDEX sorties_jour_idx ON sorties (jour);

CREATE TABLE inscriptions (
  sortie_id    TEXT NOT NULL REFERENCES sorties (id) ON DELETE CASCADE,
  encadrant_id TEXT NOT NULL REFERENCES encadrants (id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sortie_id, encadrant_id)
);

-- Encadrants (niveau = brevet fédéral BF1 à BF5, STAPS ou Bénévole)
INSERT INTO encadrants (id, name, niveau) VALUES
  ('e1',  'Alain Audinot',        'BF2'),
  ('e2',  'Nadine Bellot',        'BF5'),
  ('e3',  'Alexandre Contri',     'BF5'),
  ('e4',  'Christophe Lefevre',   'BF5'),
  ('e5',  'Marine Lefevre',       'STAPS'),
  ('e6',  'Florence Thepaut',     'BF3'),
  ('e7',  'Ludovic Dard',         'BF1'),
  ('e8',  'Kim Huynh',            'BF1'),
  ('e9',  'Fabien Martin Bucher', 'BF1'),
  ('e10', 'Karine Mondenard',     'Bénévole');

-- Créneaux : tous les mercredis et samedis du 9 sept. 2026 au 30 juin 2027,
-- hors vacances scolaires zone C (Créteil), pour les 4 groupes.
-- Les 3 jours fériés (11 nov., 1er mai, 8 mai) sont préchargés annulés (besoin = 0).
WITH cats (cat, ord, besoin, typ) AS (
  VALUES ('poussin', 1, 4, 'vtt'), ('pupille', 2, 4, 'vtt'),
         ('benjamin', 3, 4, 'vtt'), ('minime', 4, 6, 'route')
),
jours AS (
  SELECT g::date AS jour, row_number() OVER (ORDER BY g) AS n
  FROM generate_series('2026-09-09'::date, '2027-06-30'::date, interval '1 day') AS g
  WHERE extract(dow FROM g) IN (3, 6)
    AND NOT (g::date BETWEEN '2026-10-17' AND '2026-11-02')
    AND NOT (g::date BETWEEN '2026-12-19' AND '2027-01-04')
    AND NOT (g::date BETWEEN '2027-02-06' AND '2027-02-22')
    AND NOT (g::date BETWEEN '2027-04-03' AND '2027-04-19')
)
INSERT INTO sorties (id, jour, heure, duree, type, cat, lieu, besoin, note)
SELECT
  's' || ((jours.n - 1) * 4 + cats.ord),
  jours.jour, '13:45', 120, cats.typ, cats.cat,
  CASE WHEN (jours.n - 1) % 4 = 3 THEN 'Torcy' ELSE 'Nautil' END,
  CASE WHEN jours.jour IN ('2026-11-11', '2027-05-01', '2027-05-08') THEN 0 ELSE cats.besoin END,
  CASE WHEN jours.jour IN ('2026-11-11', '2027-05-01', '2027-05-08') THEN 'Férié' ELSE '' END
FROM jours CROSS JOIN cats;
