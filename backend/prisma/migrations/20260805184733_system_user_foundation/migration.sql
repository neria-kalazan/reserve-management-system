-- CreateTable
CREATE TABLE "SystemUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemPermission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemUserPermission" (
    "systemUserId" UUID NOT NULL,
    "systemPermissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemUserPermission_pkey" PRIMARY KEY ("systemUserId","systemPermissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemUser_email_key" ON "SystemUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SystemPermission_key_key" ON "SystemPermission"("key");

-- AddForeignKey
ALTER TABLE "SystemUserPermission" ADD CONSTRAINT "SystemUserPermission_systemUserId_fkey" FOREIGN KEY ("systemUserId") REFERENCES "SystemUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemUserPermission" ADD CONSTRAINT "SystemUserPermission_systemPermissionId_fkey" FOREIGN KEY ("systemPermissionId") REFERENCES "SystemPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
