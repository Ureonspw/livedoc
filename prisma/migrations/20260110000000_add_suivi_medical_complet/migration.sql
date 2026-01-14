-- CreateEnum
CREATE TYPE "StatutSuivi" AS ENUM ('EN_COURS', 'AMELIORATION', 'STABLE', 'DETERIORATION', 'GUERI', 'ARRETE');

-- CreateEnum
CREATE TYPE "StatutExamenSuivi" AS ENUM ('PROGRAMME', 'REALISE', 'ANNULE', 'REPORTE');

-- AlterTable
ALTER TABLE "suivi_medical" ADD COLUMN "id_medecin" INTEGER,
ADD COLUMN "id_prediction_initiale" INTEGER,
ADD COLUMN "maladie_predite" "MaladiePredite",
ADD COLUMN "statut_suivi" "StatutSuivi" NOT NULL DEFAULT 'EN_COURS',
ADD COLUMN "date_debut_suivi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "date_prochain_examen" TIMESTAMP(3),
ADD COLUMN "notes_evolution" TEXT,
ADD COLUMN "date_derniere_consultation" TIMESTAMP(3),
ADD COLUMN "date_guerison" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "examen_suivi_programme" (
    "id_examen_suivi" SERIAL NOT NULL,
    "id_suivi" INTEGER NOT NULL,
    "id_medecin" INTEGER NOT NULL,
    "date_examen" TIMESTAMP(3) NOT NULL,
    "type_examen" VARCHAR(100) NOT NULL,
    "raison" TEXT,
    "statut" "StatutExamenSuivi" NOT NULL DEFAULT 'PROGRAMME',
    "date_realisation" TIMESTAMP(3),
    "id_visite" INTEGER,
    "notes" TEXT,

    CONSTRAINT "examen_suivi_programme_pkey" PRIMARY KEY ("id_examen_suivi")
);

-- CreateTable
CREATE TABLE "consultation_suivi" (
    "id_consultation_suivi" SERIAL NOT NULL,
    "id_suivi" INTEGER NOT NULL,
    "id_consultation" INTEGER NOT NULL,
    "date_consultation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evolution" TEXT,
    "symptomes" TEXT,
    "traitement_actuel" TEXT,
    "prochaines_etapes" TEXT,

    CONSTRAINT "consultation_suivi_pkey" PRIMARY KEY ("id_consultation_suivi")
);

-- CreateIndex
CREATE INDEX "suivi_medical_id_medecin_idx" ON "suivi_medical"("id_medecin");

-- CreateIndex
CREATE INDEX "suivi_medical_maladie_predite_idx" ON "suivi_medical"("maladie_predite");

-- CreateIndex
CREATE INDEX "suivi_medical_statut_suivi_idx" ON "suivi_medical"("statut_suivi");

-- CreateIndex
CREATE INDEX "suivi_medical_date_prochain_examen_idx" ON "suivi_medical"("date_prochain_examen");

-- CreateIndex
CREATE INDEX "examen_suivi_programme_id_suivi_idx" ON "examen_suivi_programme"("id_suivi");

-- CreateIndex
CREATE INDEX "examen_suivi_programme_id_medecin_idx" ON "examen_suivi_programme"("id_medecin");

-- CreateIndex
CREATE INDEX "examen_suivi_programme_date_examen_idx" ON "examen_suivi_programme"("date_examen");

-- CreateIndex
CREATE INDEX "examen_suivi_programme_statut_idx" ON "examen_suivi_programme"("statut");

-- CreateIndex
CREATE INDEX "consultation_suivi_id_suivi_idx" ON "consultation_suivi"("id_suivi");

-- CreateIndex
CREATE INDEX "consultation_suivi_id_consultation_idx" ON "consultation_suivi"("id_consultation");

-- AddForeignKey
ALTER TABLE "suivi_medical" ADD CONSTRAINT "suivi_medical_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suivi_medical" ADD CONSTRAINT "suivi_medical_id_prediction_initiale_fkey" FOREIGN KEY ("id_prediction_initiale") REFERENCES "prediction_ia"("id_prediction") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_suivi_programme" ADD CONSTRAINT "examen_suivi_programme_id_suivi_fkey" FOREIGN KEY ("id_suivi") REFERENCES "suivi_medical"("id_suivi") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_suivi_programme" ADD CONSTRAINT "examen_suivi_programme_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "utilisateur"("id_utilisateur") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examen_suivi_programme" ADD CONSTRAINT "examen_suivi_programme_id_visite_fkey" FOREIGN KEY ("id_visite") REFERENCES "visite"("id_visite") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_suivi" ADD CONSTRAINT "consultation_suivi_id_suivi_fkey" FOREIGN KEY ("id_suivi") REFERENCES "suivi_medical"("id_suivi") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_suivi" ADD CONSTRAINT "consultation_suivi_id_consultation_fkey" FOREIGN KEY ("id_consultation") REFERENCES "consultation"("id_consultation") ON DELETE CASCADE ON UPDATE CASCADE;
