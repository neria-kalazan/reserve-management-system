-- CreateEnum
CREATE TYPE "SchedulingApprovalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED');

-- AlterTable
ALTER TABLE "ActivitySchedulingDay"
ADD COLUMN "approvalStatus" "SchedulingApprovalStatus" NOT NULL DEFAULT 'DRAFT';
