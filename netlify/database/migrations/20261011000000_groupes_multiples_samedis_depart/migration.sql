-- 1) Un créneau peut concerner plusieurs groupes : nouvelle colonne "cats".
--    La colonne "cat" reste le groupe principal (Compet pour une sortie Route, sinon le premier groupe).
ALTER TABLE sorties ADD COLUMN cats TEXT[];
UPDATE sorties SET cats = ARRAY[cat];
ALTER TABLE sorties ALTER COLUMN cats SET NOT NULL;
ALTER TABLE sorties ADD CONSTRAINT sorties_cats_valides
  CHECK (cardinality(cats) >= 1 AND cats <@ ARRAY['poussin', 'pupille', 'benjamin', 'minime']::text[]);

-- 2) Le 1er samedi de chaque période de vacances est un samedi normal (les vacances démarrent le soir) :
--    on ajoute les samedis 17/10/2026, 19/12/2026, 06/02/2027 et 03/04/2027 pour les 4 groupes.
--    Heure, durée, lieu et référents sont repris du samedi régulier précédent du même groupe.
WITH jours (jour) AS (
  VALUES ('2026-10-17'::date), ('2026-12-19'::date), ('2027-02-06'::date), ('2027-04-03'::date)
),
groupes (cat, ord, besoin, typ, heure, duree) AS (
  VALUES ('poussin', 1, 3, 'vtt', '13:45', 135), ('pupille', 2, 3, 'vtt', '13:45', 150),
         ('benjamin', 3, 2, 'vtt', '10:15', 135), ('minime', 4, 4, 'route', '13:45', 135)
)
INSERT INTO sorties (id, jour, heure, duree, type, cat, cats, lieu, referent, referent2, besoin, participants, note)
SELECT
  'sv' || to_char(j.jour, 'YYYYMMDD') || g.cat,
  j.jour,
  COALESCE(prev.heure, g.heure),
  COALESCE(prev.duree, g.duree),
  g.typ, g.cat, ARRAY[g.cat],
  COALESCE(prev.lieu, 'Nautil'),
  prev.referent, prev.referent2,
  g.besoin, NULL, ''
FROM jours j
CROSS JOIN groupes g
LEFT JOIN LATERAL (
  SELECT p.heure, p.duree, p.lieu, p.referent, p.referent2
  FROM sorties p
  WHERE p.cat = g.cat AND p.jour < j.jour AND extract(dow FROM p.jour) = 6 AND p.besoin > 0
  ORDER BY p.jour DESC LIMIT 1
) prev ON TRUE
WHERE NOT EXISTS (SELECT 1 FROM sorties x WHERE x.jour = j.jour AND x.cat = g.cat);
