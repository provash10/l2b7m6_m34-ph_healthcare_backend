/*
  Warnings:

  - A unique constraint covering the columns `[patientId,doctorId,scheduleId]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,serialNumber,joiningTime]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `doctorId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduleId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `doctors` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "doctorId" TEXT NOT NULL,
ADD COLUMN     "joiningTime" TIMESTAMP(3),
ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "prescriptionPublicId" TEXT,
ADD COLUMN     "prescriptionUrl" TEXT,
ADD COLUMN     "recordPublicId" TEXT,
ADD COLUMN     "recordUrl" TEXT,
ADD COLUMN     "scheduleId" TEXT NOT NULL,
ADD COLUMN     "serialNumber" INTEGER;

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "id" TEXT NOT NULL,
ALTER COLUMN "additionalFiles" SET DEFAULT ARRAY[]::TEXT[],
ADD CONSTRAINT "doctors_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "schedule" (
    "id" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "availableSlots" INTEGER NOT NULL,
    "meetingLink" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deleteAt" TIMESTAMP(3),
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT NOT NULL,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_doctorId_startDateTime_endDateTime_key" ON "schedule"("doctorId", "startDateTime", "endDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_patientId_doctorId_scheduleId_key" ON "appointments"("patientId", "doctorId", "scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_scheduleId_serialNumber_joiningTime_key" ON "appointments"("scheduleId", "serialNumber", "joiningTime");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
