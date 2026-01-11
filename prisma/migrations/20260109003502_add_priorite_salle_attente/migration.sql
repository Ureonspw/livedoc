-- CreateEnum
CREATE TYPE "PrioriteAttente" AS ENUM ('NORMAL', 'URGENT', 'CRITIQUE');

-- AlterTable
ALTER TABLE "salle_attente" ADD COLUMN     "priorite" "PrioriteAttente" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "salle_attente_priorite_idx" ON "salle_attente"("priorite");
