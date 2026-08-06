import { PrismaClient } from '@prisma/client';

export async function seedDemo(prisma: PrismaClient) {
  console.log('🌱 Seeding demo company...');

  let company = await prisma.company.findFirst({
    where: {
      name: 'פלוגת Demo',
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'פלוגת Demo',
        status: 'ACTIVE',
      },
    });
  }


  console.log('🌱 Creating units...');

  const unitNames = [
    'מחלקה 1',
    'מחלקה 2',
    'מחלקה 3',
    'חפ"ק',
    'מפל"ג',
  ];

  const units = {};

  for (const [index, name] of unitNames.entries()) {
    const unit = await prisma.unit.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name,
        displayOrder: index,
      },
    });

    units[name] = unit;
  }


  console.log('🌱 Creating roles...');

  const roleNames = [
    'מ"פ',
    'סמ"פ',
    'מ"מ',
    'סמל',
    'לוחם',
    'נהג חפ"ק',
  ];

  const roles = {};

  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name,
      },
    });
  }


  console.log('🌱 Creating qualifications...');

  const qualificationNames = [
    'חובש',
    'קשר',
    'נהג',
    'נגב',
    'מטול',
  ];

  const qualifications = {};

  for (const name of qualificationNames) {
    qualifications[name] = await prisma.qualification.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name,
      },
    });
  }


  console.log('🌱 Creating users...');

  const usersData = [
    {
      firstName: 'יונתן',
      lastName: 'ישראלי',
      personalNumber: '100001',
      unit: 'מפל"ג',
      role: 'מ"פ',
    },
    {
      firstName: 'דוד',
      lastName: 'כהן',
      personalNumber: '100002',
      unit: 'מחלקה 1',
      role: 'סמ"פ',
    },
    {
      firstName: 'אורי',
      lastName: 'לוי',
      personalNumber: '100003',
      unit: 'מחלקה 2',
      role: 'מ"מ',
    },
    {
      firstName: 'נועם',
      lastName: 'מזרחי',
      personalNumber: '100004',
      unit: 'מחלקה 3',
      role: 'לוחם',
    },
    {
      firstName: 'אלון',
      lastName: 'שמעוני',
      personalNumber: '100005',
      unit: 'חפ"ק',
      role: 'נהג חפ"ק',
    },
    {
      firstName: 'מיכאל',
      lastName: 'ביין',
      personalNumber: '100006',
      unit: 'מחלקה 1',
      role: 'מ"מ',
      phone: '0500000006',
      email: 'michael@example.com',
    },
    {
      firstName: 'שרה',
      lastName: 'כהן',
      personalNumber: '100007',
      unit: 'מחלקה 1',
      role: 'סמל',
      phone: '0500000007',
      email: 'sara@example.com',
    },
    {
      firstName: 'גיא',
      lastName: 'אבוטבול',
      personalNumber: '100008',
      unit: 'מחלקה 2',
      role: 'לוחם',
      phone: '0500000008',
    },
    {
      firstName: 'רוני',
      lastName: 'ברק',
      personalNumber: '100009',
      unit: 'מחלקה 2',
      role: 'לוחם',
      phone: '0500000009',
    },
    {
      firstName: 'אדם',
      lastName: 'לוי',
      personalNumber: '100010',
      unit: 'מחלקה 3',
      role: 'לוחם',
      phone: '0500000010',
    },
    {
      firstName: 'נועם',
      lastName: 'אלון',
      personalNumber: '100011',
      unit: 'מחלקה 3',
      role: 'מ"מ',
      phone: '0500000011',
    },
    {
      firstName: 'יעל',
      lastName: 'שמש',
      personalNumber: '100012',
      unit: 'חפ"ק',
      role: 'נהג חפ"ק',
      phone: '0500000012',
    },
    {
      firstName: 'איתי',
      lastName: 'גולן',
      personalNumber: '100013',
      unit: 'חפ"ק',
      role: 'לוחם',
      phone: '0500000013',
    },
    {
      firstName: 'טל',
      lastName: 'פרידמן',
      personalNumber: '100014',
      unit: 'מפל"ג',
      role: 'לוחם',
      phone: '0500000014',
    },
    {
      firstName: 'אביב',
      lastName: 'רוזן',
      personalNumber: '100015',
      unit: 'מפל"ג',
      role: 'מ"מ',
      phone: '0500000015',
    },
  ];

  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: {
        companyId_personalNumber: {
          companyId: company.id,
          personalNumber: userData.personalNumber,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        unitId: units[userData.unit].id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone ?? '0500000000',
        email: userData.email ?? null,
        personalNumber: userData.personalNumber,
        isActive: true,
      },
    });


    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: roles[userData.role].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: roles[userData.role].id,
      },
    });
  }

  
  console.log('🌱 Creating user qualifications...');

  const userQualifications = [
    {
      firstName: 'דוד',
      lastName: 'כהן',
      qualification: 'חובש',
    },
    {
      firstName: 'אורי',
      lastName: 'לוי',
      qualification: 'קשר',
    },
    {
      firstName: 'אלון',
      lastName: 'שמעוני',
      qualification: 'נהג',
    },
    {
      firstName: 'גיא',
      lastName: 'אבוטבול',
      qualification: 'חובש',
    },
    {
      firstName: 'רוני',
      lastName: 'ברק',
      qualification: 'קשר',
    },
    {
      firstName: 'יעל',
      lastName: 'שמש',
      qualification: 'נהג',
    },
  ];


  for (const item of userQualifications) {
    const user = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        firstName: item.firstName,
        lastName: item.lastName,
      },
    });

    if (!user) continue;

    await prisma.userQualification.upsert({
      where: {
        userId_qualificationId: {
          userId: user.id,
          qualificationId: qualifications[item.qualification].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        qualificationId: qualifications[item.qualification].id,
      },
    });
  }


  // Optionally assign any existing demo permissions if present (do not create permissions)
  console.log('🌱 Assigning existing permissions (if any)...');
  const demoPermissionKeys = ['users.manage', 'users.view', 'roles.manage'];
  const foundPermissions = {} as Record<string, any>;
  for (const key of demoPermissionKeys) {
    const p = await prisma.permission.findFirst({ where: { key } });
    if (p) foundPermissions[key] = p;
  }

  if (Object.keys(foundPermissions).length) {
    // assign first permission to the company commander if exists
    const commander = await prisma.user.findFirst({ where: { companyId: company.id, personalNumber: '100001' } });
    if (commander) {
      for (const p of Object.values(foundPermissions)) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: { userId: commander.id, permissionId: p.id },
          },
          update: {},
          create: { userId: commander.id, permissionId: p.id },
        });
      }
    }
  }


  console.log('✅ Demo seed completed');
}