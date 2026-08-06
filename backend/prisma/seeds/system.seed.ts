import { PrismaClient } from '@prisma/client';

const systemPermissions = [
  {
    key: 'MANAGE_COMPANIES',
    description: 'Manage companies and their commanders',
  },
  {
    key: 'MANAGE_SYSTEM_USERS',
    description: 'Manage system users',
  },
  {
    key: 'MANAGE_SYSTEM_PERMISSIONS',
    description: 'Manage system permissions',
  },
  {
    key: 'VIEW_SYSTEM_REPORTS',
    description: 'View system reports',
  },
];

export async function seedSystem(prisma: PrismaClient) {
  console.log('🌱 Seeding system permissions...');

  const permissions: {
    id: string;
    key: string;
  }[] = [];

  for (const permission of systemPermissions) {
    const createdPermission = await prisma.systemPermission.upsert({
      where: {
        key: permission.key,
      },
      update: {},
      create: permission,
    });

    permissions.push(createdPermission);
  }


  console.log('🌱 Creating system user...');

  const systemUser = await prisma.systemUser.upsert({
    where: {
      email: 'neriakalazan@gmail.com',
    },
    update: {},
    create: {
      email: 'neriakalazan@gmail.com',
      firstName: 'Neria',
      lastName: 'Kalazan',
    },
  });


  console.log('🌱 Assigning permissions...');

  for (const permission of permissions) {
    await prisma.systemUserPermission.upsert({
      where: {
        systemUserId_systemPermissionId: {
          systemUserId: systemUser.id,
          systemPermissionId: permission.id,
        },
      },
      update: {},
      create: {
        systemUserId: systemUser.id,
        systemPermissionId: permission.id,
      },
    });
  }


  console.log('✅ System seed completed');
}