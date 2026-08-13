-- CreateEnum
CREATE TYPE "ActivityUserAvailabilityEnum" AS ENUM ('MORNING', 'EVENING', 'ALL_DAY', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "ActivityUserStatus" ADD COLUMN     "availability" "ActivityUserAvailabilityEnum" NOT NULL DEFAULT 'ALL_DAY';
