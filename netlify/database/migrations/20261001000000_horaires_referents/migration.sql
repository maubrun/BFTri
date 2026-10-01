-- Horaires par groupe et référents par défaut (saison 2026-2027)

ALTER TABLE sorties ADD COLUMN referent2 TEXT REFERENCES encadrants (id) ON DELETE SET NULL;

-- Nouveaux encadrants référents (niveau à préciser dans l'appli ; ignorés s'ils existent déjà)
INSERT INTO encadrants (id, name, niveau) VALUES
  ('e11', 'Cristina Da Silva', 'Bénévole'),
  ('e12', 'Mathieu',           'Bénévole'),
  ('e13', 'Marlie',            'Bénévole'),
  ('e14', 'Evan',              'Bénévole'),
  ('e15', 'Tibo',              'Bénévole')
ON CONFLICT DO NOTHING;

-- Horaires et référents par groupe et jour (dow : 3 = mercredi, 6 = samedi).
-- Les référents sont retrouvés par leur nom : cela fonctionne même si la personne existait déjà.
-- Seuls les créneaux encore aux valeurs de départ (13h45, 120 min, sans référent) sont mis à jour.
WITH defauts (cat, dow, heure, duree, n1, n2) AS (
  VALUES
    ('poussin',  3, '13:15', 105, 'christophe lefevre', 'cristina da silva'),
    ('poussin',  6, '13:45', 135, 'christophe lefevre', 'cristina da silva'),
    ('pupille',  3, '13:15', 105, 'mathieu',            'marlie'),
    ('pupille',  6, '13:45', 150, 'mathieu',            'marlie'),
    ('benjamin', 3, '13:45', 135, 'evan',               'tibo'),
    ('benjamin', 6, '10:15', 135, 'evan',               'tibo'),
    ('minime',   3, '15:45', 135, 'evan',               'tibo'),
    ('minime',   6, '13:45', 135, 'evan',               'tibo')
)
UPDATE sorties s
SET heure = d.heure, duree = d.duree,
    referent  = (SELECT id FROM encadrants WHERE lower(name) = d.n1),
    referent2 = (SELECT id FROM encadrants WHERE lower(name) = d.n2)
FROM defauts d
WHERE s.cat = d.cat
  AND extract(dow FROM s.jour)::int = d.dow
  AND s.heure = '13:45' AND s.duree = 120 AND s.referent IS NULL;
