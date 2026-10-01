-- Correction : la référente Cristina est Cristina Da Silva.
-- Si "Cristina Da Silva" existe déjà (créée à la main), on la substitue au doublon "Cristina" (e11) ;
-- sinon on renomme simplement "Cristina" en "Cristina Da Silva".

UPDATE sorties SET referent = r.id
FROM (SELECT id FROM encadrants WHERE lower(name) = 'cristina da silva' AND id <> 'e11') r
WHERE sorties.referent = 'e11';

UPDATE sorties SET referent2 = r.id
FROM (SELECT id FROM encadrants WHERE lower(name) = 'cristina da silva' AND id <> 'e11') r
WHERE sorties.referent2 = 'e11';

INSERT INTO inscriptions (sortie_id, encadrant_id)
SELECT i.sortie_id, r.id
FROM inscriptions i,
     (SELECT id FROM encadrants WHERE lower(name) = 'cristina da silva' AND id <> 'e11') r
WHERE i.encadrant_id = 'e11'
ON CONFLICT DO NOTHING;

DELETE FROM encadrants
WHERE id = 'e11'
  AND EXISTS (SELECT 1 FROM encadrants WHERE lower(name) = 'cristina da silva' AND id <> 'e11');

UPDATE encadrants SET name = 'Cristina Da Silva' WHERE id = 'e11';
