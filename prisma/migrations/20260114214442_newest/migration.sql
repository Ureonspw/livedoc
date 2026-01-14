/*
  Warnings:

  - You are about to drop the column `date_suivi` on the `suivi_medical` table. All the data in the column will be lost.
  - Made the column `id_medecin` on table `suivi_medical` required. This step will fail if there are existing NULL values in that column.
  - Made the column `maladie_predite` on table `suivi_medical` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "suivi_medical" DROP COLUMN "date_suivi",
ALTER COLUMN "id_medecin" SET NOT NULL,
ALTER COLUMN "maladie_predite" SET NOT NULL;
