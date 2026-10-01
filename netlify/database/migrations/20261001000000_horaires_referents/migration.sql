-- Horaires par groupe et référents par défaut (saison 2026-2027)

ALTER TABLE sorties ADD COLUMN referent2 TEXT REFERENCES encadrants (id) ON DELETE SET NULL;

-- Nouveaux encadrants référents (prénom seul, niveau à préciser)
INSERT INTO encadrants (id, name, niveau) VALUES
  ('e11', 'Cristina', 'Bénévole'),
  ('e12', 'Mathieu',  'Bénévole'),
  ('e13', 'Marlie',   'Bénévole'),
  ('e14', 'Evan',     'Bénévole'),
  ('e15', 'Tibo',     'Bénévole')
ON CONFLICT DO NOTHING;

-- Horaires et référents par groupe et jour (dow : 3 = mercredi, 6 = samedi).
-- Seuls les créneaux encore aux valeurs de départ (13h45, 120 min, sans référent) sont mis à jour.
WITH defauts (cat, dow, heure, duree, r1, r2) AS (
  VALUES
    ('poussin',  3, '13:15', 105, 'e4',  'e11'),
    ('poussin',  6, '13:45', 135, 'e4',  'e11'),
    ('pupille',  3, '13:15', 105, 'e12', 'e13'),
    ('pupille',  6, '13:45', 150, 'e12', 'e13'),
    ('benjamin', 3, '13:45', 135, 'e14', 'e15'),
    ('benjamin', 6, '10:15', 135, 'e14', 'e15'),
    ('minime',   3, '15:45', 135, 'e14', 'e15'),
    ('minime',   6, '13:45', 135, 'e14', 'e15')
)
UPDATE sorties s
SET heure = d.heure, duree = d.duree, referent = d.r1, referent2 = d.r2
FROM defauts d
WHERE s.cat = d.cat
  AND extract(dow FROM s.jour)::int = d.dow
  AND s.heure = '13:45' AND s.duree = 120 AND s.referent IS NULL;
