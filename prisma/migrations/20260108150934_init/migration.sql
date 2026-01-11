-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEDECIN', 'INFIRMIER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('HOMME', 'FEMME');

-- CreateEnum
CREATE TYPE "StatutAttente" AS ENUM ('EN_ATTENTE', 'EN_CONSULTATION', 'TERMINE');

-- CreateEnum
CREATE TYPE "MaladiePredite" AS ENUM ('DIABETE', 'MALADIE_RENALE', 'CARDIOVASCULAIRE', 'TUBERCULOSE');

-- CreateEnum
CREATE TYPE "StatutValidation" AS ENUM ('VALIDE', 'REJETE', 'MODIFIE', 'EN_ATTENTE');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id_utilisateur" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "mot_de_passe" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_utilisateur")
);

-- CreateTable
CREATE TABLE "patient" (
    "id_patient" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "sexe" "Sexe" NOT NULL,
    "date_naissance" TIMESTAMP(3) NOT NULL,
    "telephone" VARCHAR(20),
    "adresse" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id_patient")
);

-- CreateTable
CREATE TABLE "salle_attente" (
    "id_salle_attente" SERIAL NOT NULL,
    "id_patient" INTEGER NOT NULL,
    "date_arrivee" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutAttente" NOT NULL DEFAULT 'EN_ATTENTE',

    CONSTRAINT "salle_attente_pkey" PRIMARY KEY ("id_salle_attente")
);

-- CreateTable
CREATE TABLE "consultation" (
    "id_consultation" SERIAL NOT NULL,
    "id_patient" INTEGER NOT NULL,
    "id_medecin" INTEGER NOT NULL,
    "date_consultation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" TEXT,
    "observation" TEXT,

    CONSTRAINT "consultation_pkey" PRIMARY KEY ("id_consultation")
);

-- CreateTable
CREATE TABLE "visite" (
    "id_visite" SERIAL NOT NULL,
    "id_consultation" INTEGER NOT NULL,
    "date_visite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visite_pkey" PRIMARY KEY ("id_visite")
);

-- CreateTable
CREATE TABLE "constantes_vitales" (
    "id_constante" SERIAL NOT NULL,
    "temperature" DECIMAL(4,1),
    "frequence_cardiaque" INTEGER,
    "saturation_oxygene" INTEGER,
    "poids" DECIMAL(5,2),
    "taille" DECIMAL(5,2),
    "id_visite" INTEGER NOT NULL,

    CONSTRAINT "constantes_vitales_pkey" PRIMARY KEY ("id_constante")
);

-- CreateTable
CREATE TABLE "donnees_cliniques_ia" (
    "id_donnee_ia" SERIAL NOT NULL,
    "id_visite" INTEGER NOT NULL,
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

    CONSTRAINT "donnees_cliniques_ia_pkey" PRIMARY KEY ("id_donnee_ia")
);

-- CreateTable
CREATE TABLE "image_radiographie" (
    "id_image" SERIAL NOT NULL,
    "id_visite" INTEGER NOT NULL,
    "nom_fichier" VARCHAR(255) NOT NULL,
    "chemin_fichier" VARCHAR(500) NOT NULL,
    "taille_fichier" BIGINT,
    "type_mime" VARCHAR(50),
    "date_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_radiographie_pkey" PRIMARY KEY ("id_image")
);

-- CreateTable
CREATE TABLE "prediction_ia" (
    "id_prediction" SERIAL NOT NULL,
    "maladie_predite" "MaladiePredite" NOT NULL,
    "probabilite" DECIMAL(5,4) NOT NULL,
    "seuil_utilise" DECIMAL(4,2) NOT NULL,
    "date_prediction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_visite" INTEGER NOT NULL,
    "id_image" INTEGER,
    "niveau_confiance" VARCHAR(20),
    "interpretation" TEXT,
    "recommendation" TEXT,
    "features_detected" JSONB,
    "model_version" VARCHAR(50),

    CONSTRAINT "prediction_ia_pkey" PRIMARY KEY ("id_prediction")
);

-- CreateTable
CREATE TABLE "explicabilite_ia" (
    "id_explicabilite" SERIAL NOT NULL,
    "variable" VARCHAR(100) NOT NULL,
    "contribution" DECIMAL(6,4) NOT NULL,
    "id_prediction" INTEGER NOT NULL,

    CONSTRAINT "explicabilite_ia_pkey" PRIMARY KEY ("id_explicabilite")
);

-- CreateTable
CREATE TABLE "validation" (
    "id_validation" SERIAL NOT NULL,
    "id_prediction" INTEGER NOT NULL,
    "id_medecin" INTEGER NOT NULL,
    "validation_status" "StatutValidation" NOT NULL,
    "commentaire" TEXT,
    "diagnostic_final" VARCHAR(100),
    "date_validation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_pkey" PRIMARY KEY ("id_validation")
);

-- CreateTable
CREATE TABLE "suivi_medical" (
    "id_suivi" SERIAL NOT NULL,
    "traitement" TEXT,
    "recommandations" TEXT,
    "date_suivi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_patient" INTEGER NOT NULL,

    CONSTRAINT "suivi_medical_pkey" PRIMARY KEY ("id_suivi")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id_log" SERIAL NOT NULL,
    "id_utilisateur" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id_log")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "salle_attente_statut_idx" ON "salle_attente"("statut");

-- CreateIndex
CREATE INDEX "salle_attente_date_arrivee_idx" ON "salle_attente"("date_arrivee");

-- CreateIndex
CREATE INDEX "consultation_id_patient_idx" ON "consultation"("id_patient");

-- CreateIndex
CREATE INDEX "consultation_id_medecin_idx" ON "consultation"("id_medecin");

-- CreateIndex
CREATE INDEX "visite_id_consultation_idx" ON "visite"("id_consultation");

-- CreateIndex
CREATE UNIQUE INDEX "constantes_vitales_id_visite_key" ON "constantes_vitales"("id_visite");

-- CreateIndex
CREATE UNIQUE INDEX "donnees_cliniques_ia_id_visite_key" ON "donnees_cliniques_ia"("id_visite");

-- CreateIndex
CREATE INDEX "image_radiographie_id_visite_idx" ON "image_radiographie"("id_visite");

-- CreateIndex
CREATE INDEX "prediction_ia_id_visite_idx" ON "prediction_ia"("id_visite");

-- CreateIndex
CREATE INDEX "prediction_ia_maladie_predite_idx" ON "prediction_ia"("maladie_predite");

-- CreateIndex
CREATE INDEX "prediction_ia_date_prediction_idx" ON "prediction_ia"("date_prediction");

-- CreateIndex
CREATE INDEX "explicabilite_ia_id_prediction_idx" ON "explicabilite_ia"("id_prediction");

-- CreateIndex
CREATE INDEX "explicabilite_ia_variable_idx" ON "explicabilite_ia"("variable");

-- CreateIndex
CREATE INDEX "validation_id_prediction_idx" ON "validation"("id_prediction");

-- CreateIndex
CREATE INDEX "validation_id_medecin_idx" ON "validation"("id_medecin");

-- CreateIndex
CREATE INDEX "suivi_medical_id_patient_idx" ON "suivi_medical"("id_patient");

-- CreateIndex
CREATE INDEX "activity_log_id_utilisateur_idx" ON "activity_log"("id_utilisateur");

-- CreateIndex
CREATE INDEX "activity_log_action_idx" ON "activity_log"("action");

-- CreateIndex
CREATE INDEX "activity_log_entity_type_idx" ON "activity_log"("entity_type");

-- CreateIndex
CREATE INDEX "activity_log_date_creation_idx" ON "activity_log"("date_creation");

-- AddForeignKey
ALTER TABLE "salle_attente" ADD CONSTRAINT "salle_attente_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patient"("id_patient") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation" ADD CONSTRAINT "consultation_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patient"("id_patient") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation" ADD CONSTRAINT "consultation_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visite" ADD CONSTRAINT "visite_id_consultation_fkey" FOREIGN KEY ("id_consultation") REFERENCES "consultation"("id_consultation") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constantes_vitales" ADD CONSTRAINT "constantes_vitales_id_visite_fkey" FOREIGN KEY ("id_visite") REFERENCES "visite"("id_visite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donnees_cliniques_ia" ADD CONSTRAINT "donnees_cliniques_ia_id_visite_fkey" FOREIGN KEY ("id_visite") REFERENCES "visite"("id_visite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_radiographie" ADD CONSTRAINT "image_radiographie_id_visite_fkey" FOREIGN KEY ("id_visite") REFERENCES "visite"("id_visite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_ia" ADD CONSTRAINT "prediction_ia_id_visite_fkey" FOREIGN KEY ("id_visite") REFERENCES "visite"("id_visite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_ia" ADD CONSTRAINT "prediction_ia_id_image_fkey" FOREIGN KEY ("id_image") REFERENCES "image_radiographie"("id_image") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explicabilite_ia" ADD CONSTRAINT "explicabilite_ia_id_prediction_fkey" FOREIGN KEY ("id_prediction") REFERENCES "prediction_ia"("id_prediction") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation" ADD CONSTRAINT "validation_id_prediction_fkey" FOREIGN KEY ("id_prediction") REFERENCES "prediction_ia"("id_prediction") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation" ADD CONSTRAINT "validation_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_medical" ADD CONSTRAINT "suivi_medical_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patient"("id_patient") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id_utilisateur") ON DELETE SET NULL ON UPDATE CASCADE;
