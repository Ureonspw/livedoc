-- Migration pour corriger les enregistrements suivi_medical avec valeurs NULL
-- Supprimer les enregistrements invalides (sans id_medecin ou maladie_predite)
-- car ils ne peuvent pas être utilisés pour le suivi médical

-- Supprimer les enregistrements sans id_medecin ou maladie_predite
DELETE FROM "suivi_medical" 
WHERE "id_medecin" IS NULL 
   OR "maladie_predite" IS NULL;

-- Maintenant, les colonnes peuvent être rendues NOT NULL (déjà fait dans la migration précédente)
-- Cette migration nettoie juste les données invalides
