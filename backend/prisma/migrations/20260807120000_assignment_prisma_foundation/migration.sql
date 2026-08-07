-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "taskInstanceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_taskInstanceId_idx" ON "Assignment"("taskInstanceId");

-- CreateIndex
CREATE INDEX "Assignment_userId_idx" ON "Assignment"("userId");

-- CreateIndex
CREATE INDEX "Assignment_createdBy_idx" ON "Assignment"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_taskInstanceId_userId_key" ON "Assignment"("taskInstanceId", "userId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_taskInstanceId_fkey" FOREIGN KEY ("taskInstanceId") REFERENCES "TaskInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
