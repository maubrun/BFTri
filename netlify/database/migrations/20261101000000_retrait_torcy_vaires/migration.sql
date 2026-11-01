-- Retrait de Torcy (et Vaires) : les créneaux concernés passent à Nautil, puis les lieux sont retirés de la liste.
INSERT INTO lieux (name, ordre) VALUES ('Nautil', 1) ON CONFLICT DO NOTHING;
UPDATE sorties SET lieu = 'Nautil' WHERE lieu ILIKE '%torcy%' OR lieu ILIKE '%vaires%';
DELETE FROM lieux WHERE name ILIKE '%torcy%' OR name ILIKE '%vaires%';
