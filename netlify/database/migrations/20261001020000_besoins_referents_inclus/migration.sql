-- Nombre d'encadrants requis par séance, référents inclus :
-- Poussins 3, Pupilles 3, Benjamins 2, Compet 4.
-- Seuls les créneaux encore à l'ancienne valeur de départ sont modifiés
-- (les créneaux annulés, à 0, et ceux réglés à la main restent tels quels).
UPDATE sorties SET besoin = 3 WHERE cat = 'poussin'  AND besoin = 4;
UPDATE sorties SET besoin = 3 WHERE cat = 'pupille'  AND besoin = 4;
UPDATE sorties SET besoin = 2 WHERE cat = 'benjamin' AND besoin = 4;
UPDATE sorties SET besoin = 4 WHERE cat = 'minime'   AND besoin = 6;
