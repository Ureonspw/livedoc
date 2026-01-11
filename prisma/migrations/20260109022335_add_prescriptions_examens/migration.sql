-- CreateEnum
CREATE TYPE "StatutPrescription" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TERMINE');

-- CreateTable
CREATE TABLE "prescription_examen" (
    "id_prescription" SERIAL NOT NULL,
    "id_consultation" INTEGER NOT NULL,
    "id_medecin" INTEGER NOT NULL,
    "maladies_ciblees" TEXT[],
    "date_prescription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutPrescription" NOT NULL DEFAULT 'EN_ATTENTE',
    "commentaire" TEXT,

    CONSTRAINT "prescription_examen_pkey" PRIMARY KEY ("id_prescription")
);

-- CreateTable
CREATE TABLE "resultat_examen" (
    "id_resultat" SERIAL NOT NULL,
    "id_prescription" INTEGER NOT NULL,
    "id_visite" INTEGER,
    "id_infirmier" INTEGER,
    "date_saisie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombre_grossesses" INTEGER,
    "taux_glucose" DECIMAL(5,2),
    "pression_arterielle" DECIMAL(5,2),
    "epaisseur_pli_cutane" DECIMAL(5,2),
    "taux_insuline" DECIMAL(5,2),
    "imc" DECIMAL(5,2),
    "fonction_pedigree_diabete" DECIMAL(5,3),
    "age" INTEGER,
    "uree_sanguine" DECIMAL(5,2),
    "creatinine_serique" DECIMAL(5,2),
    "sodium" DECIMAL(5,2),
    "potassium" DECIMAL(5,2),
    "hemoglobine" DECIMAL(5,2),
    "volume_cellulaire_packe" DECIMAL(5,2),
    "globules_blancs" DECIMAL(10,2),
    "globules_rouges" DECIMAL(10,2),
    "gravite_specifique" DECIMAL(4,3),
    "albumine" INTEGER,
    "sucre" DECIMAL(4,2),
    "globules_rouges_urine" VARCHAR(10),
    "pus_cells" VARCHAR(10),
    "pus_cells_clumps" VARCHAR(10),
    "bacteries" VARCHAR(10),
    "glucose_sang" DECIMAL(5,2),
    "hypertension" BOOLEAN,
    "diabete_mellitus" BOOLEAN,
    "maladie_coronaire" BOOLEAN,
    "appetit" VARCHAR(10),
    "oedeme_pieds" BOOLEAN,
    "anemie" BOOLEAN,
    "cholesterol" DECIMAL(5,2),
    "pression_systolique" INTEGER,
    "pression_diastolique" INTEGER,
    "fumeur" BOOLEAN,
    "consommation_alcool" BOOLEAN,
    "activite_physique" BOOLEAN,
    "genre" "Sexe",
    "taille_cm" DECIMAL(5,2),
    "poids_kg" DECIMAL(5,2),
    "glucose_cardio" INTEGER,

    CONSTRAINT "resultat_examen_pkey" PRIMARY KEY ("id_resultat")
);

-- CreateTable
CREATE TABLE "photo_document_examen" (
    "id_photo" SERIAL NOT NULL,
    "id_resultat" INTEGER NOT NULL,
    "nom_fichier" VARCHAR(255) NOT NULL,
    "chemin_fichier" VARCHAR(500) NOT NULL,
    "taille_fichier" BIGINT,
    "type_mime" VARCHAR(50),
    "date_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "photo_document_examen_pkey" PRIMARY KEY ("id_photo")
);

-- CreateIndex
CREATE INDEX "prescription_examen_id_consultation_idx" ON "prescription_examen"("id_consultation");

-- CreateIndex
CREATE INDEX "prescription_examen_id_medecin_idx" ON "prescription_examen"("id_medecin");

-- CreateIndex
CREATE INDEX "prescription_examen_statut_idx" ON "prescription_examen"("statut");

-- CreateIndex
CREATE INDEX "resultat_examen_id_prescription_idx" ON "resultat_examen"("id_prescription");

-- CreateIndex
CREATE INDEX "resultat_examen_id_visite_idx" ON "resultat_examen"("id_visite");

-- CreateIndex
CREATE INDEX "photo_document_examen_id_resultat_idx" ON "photo_document_examen"("id_resultat");

-- AddForeignKey
ALTER TABLE "prescription_examen" ADD CONSTRAINT "prescription_examen_id_consultation_fkey" FOREIGN KEY ("id_consultation") REFERENCES "consultation"("id_consultation") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_examen" ADD CONSTRAINT "prescription_examen_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultat_examen" ADD CONSTRAINT "resultat_examen_id_prescription_fkey" FOREIGN KEY ("id_prescription") REFERENCES "prescription_examen"("id_prescription") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultat_examen" ADD CONSTRAINT "resultat_examen_id_visite_fkey" FOREIGN KEY ("id_visite") REFERENCES "visite"("id_visite") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultat_examen" ADD CONSTRAINT "resultat_examen_id_infirmier_fkey" FOREIGN KEY ("id_infirmier") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_document_examen" ADD CONSTRAINT "photo_document_examen_id_resultat_fkey" FOREIGN KEY ("id_resultat") REFERENCES "resultat_examen"("id_resultat") ON DELETE CASCADE ON UPDATE CASCADE;
