-- 1) Les Benjamins peuvent aussi sortir en Route (en plus du groupe Compet).
--    On remplace la contrainte d'origine "type = 'vtt' OR cat = 'minime'" (retrouvée par sa définition,
--    car son nom est généré automatiquement).
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'sorties'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%vtt%' AND pg_get_constraintdef(oid) LIKE '%minime%'
  LOOP
    EXECUTE format('ALTER TABLE sorties DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE sorties ADD CONSTRAINT sorties_route_groupes
  CHECK (type = 'vtt' OR cats && ARRAY['minime', 'benjamin']::text[]);

-- 2) Liste des lieux de rendez-vous, gérée par les administrateurs.
CREATE TABLE lieux (
  name  TEXT PRIMARY KEY,
  ordre INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX lieux_nom_unique ON lieux (lower(name));
INSERT INTO lieux (name, ordre) VALUES ('Nautil', 1), ('Parking Decathlon Pontault', 2);
-- Lieux déjà utilisés par des créneaux (hors Torcy et Vaires, retirés de la liste).
INSERT INTO lieux (name, ordre)
SELECT DISTINCT lieu, 10 FROM sorties
WHERE lieu NOT IN ('Nautil', 'Parking Decathlon Pontault', 'Torcy', 'Vaires')
ON CONFLICT DO NOTHING;
