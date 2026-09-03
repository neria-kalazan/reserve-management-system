import { PrismaClient } from '@prisma/client';

export const createUtcCalendarDate = (baseDate: Date = new Date()) =>
  new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()));

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

  console.log('🌱 Creating activity management demo data...');

  const activityStartDate = createUtcCalendarDate(new Date());
  const activityEndDate = new Date(activityStartDate);
  activityEndDate.setUTCDate(activityEndDate.getUTCDate() + 30);

  const buildDateTime = (baseDate: Date, time: string, nextDay = false) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);

    if (nextDay) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  };

  let activity = await prisma.activity.findFirst({
    where: {
      companyId: company.id,
      name: 'תעסוקת איתמר',
    },
  });

  if (!activity) {
    activity = await prisma.activity.create({
      data: {
        companyId: company.id,
        name: 'תעסוקת איתמר',
        type: 'EMPLOYMENT',
        status: 'ACTIVE',
        startDate: activityStartDate,
        endDate: activityEndDate,
      },
    });
  } else if (!activity.type) {
    activity = await prisma.activity.update({
      where: { id: activity.id },
      data: {
        type: 'EMPLOYMENT',
      },
    });
  }

  const activityTasks = [
    {
      name: 'סיור',
      description: 'סיור גזרה',
      manpower: 4,
      taskInstances: [
        { title: 'סיור בוקר', startTime: '06:00', endTime: '14:00' },
        { title: 'סיור צהריים', startTime: '14:00', endTime: '22:00' },
        { title: 'סיור לילה', startTime: '22:00', endTime: '06:00', nextDay: true },
      ],
    },
    {
      name: 'שמירה',
      description: 'שמירה בעמדה',
      manpower: 2,
      taskInstances: [
        { title: 'שמירה עמדה 1', startTime: '06:00', endTime: '10:00' },
      ],
    },
    {
      name: 'מחסום',
      description: 'מחסום כניסה',
      manpower: 3,
      taskInstances: [
        { title: 'מחסום בוקר', startTime: '06:00', endTime: '10:00' },
      ],
    },
  ];

  for (const taskDefinition of activityTasks) {
    let task = await prisma.activityTask.findFirst({
      where: {
        activityId: activity.id,
        name: taskDefinition.name,
      },
    });

    if (!task) {
      task = await prisma.activityTask.create({
        data: {
          activityId: activity.id,
          name: taskDefinition.name,
          description: taskDefinition.description,
        },
      });
    }

    await prisma.activityTaskManpowerRequirement.upsert({
      where: {
        activityTaskId: task.id,
      },
      update: {
        quantity: taskDefinition.manpower,
        required: true,
      },
      create: {
        activityTaskId: task.id,
        quantity: taskDefinition.manpower,
        required: true,
      },
    });

    for (const taskInstanceDefinition of taskDefinition.taskInstances) {
      const existingInstance = await prisma.taskInstance.findFirst({
        where: {
          activityTaskId: task.id,
          title: taskInstanceDefinition.title,
        },
      });

      if (!existingInstance) {
        const startTime = buildDateTime(activityStartDate, taskInstanceDefinition.startTime);
        const endTime = buildDateTime(activityStartDate, taskInstanceDefinition.endTime, taskInstanceDefinition.nextDay ?? false);

        await prisma.taskInstance.create({
          data: {
            activityTaskId: task.id,
            title: taskInstanceDefinition.title,
            startTime,
            endTime,
          },
        });
      }
    }
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
      phone: '0547724987',
      email: 'neriakalazan@gmail.com',
    },
    {
      firstName: 'דוד',
      lastName: 'כהן',
      personalNumber: '100002',
      unit: 'מחלקה 1',
      role: 'סמ"פ',
        phone: '0500000002',
    },
    {
      firstName: 'אורי',
      lastName: 'לוי',
      personalNumber: '100003',
      unit: 'מחלקה 2',
      role: 'מ"מ',
        phone: '0500000003',
    },
    {
      firstName: 'נועם',
      lastName: 'מזרחי',
      personalNumber: '100004',
      unit: 'מחלקה 3',
      role: 'לוחם',
        phone: '0500000004',
    },
    {
      firstName: 'אלון',
      lastName: 'שמעוני',
      personalNumber: '100005',
      unit: 'חפ"ק',
      role: 'נהג חפ"ק',
        phone: '0500000005',
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
      update: {
        unitId: units[userData.unit].id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone ?? '0500000000',
        email: userData.email ?? null,
        isActive: true,
      },
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

  console.log('🌱 Creating activity availability demo data...');

  const activityDateRange: Date[] = [];
  const currentActivityDate = new Date(activity.startDate);
  currentActivityDate.setUTCHours(0, 0, 0, 0);
  const activityEndDateOnly = new Date(activity.endDate);
  activityEndDateOnly.setUTCHours(0, 0, 0, 0);

  while (currentActivityDate <= activityEndDateOnly) {
    activityDateRange.push(new Date(currentActivityDate));
    currentActivityDate.setUTCDate(currentActivityDate.getUTCDate() + 1);
  }

  const activeUsers = await prisma.user.findMany({
    where: {
      companyId: company.id,
      isActive: true,
    },
    select: {
      id: true,
      personalNumber: true,
    },
  });

  for (const user of activeUsers) {
    for (const date of activityDateRange) {
      await prisma.activityUserStatus.upsert({
        where: {
          activityId_userId_date: {
            activityId: activity.id,
            userId: user.id,
            date,
          },
        },
        update: {
          status: 'ACTIVE',
          availability: 'ALL_DAY',
        },
        create: {
          activityId: activity.id,
          userId: user.id,
          date,
          status: 'ACTIVE',
          availability: 'ALL_DAY',
        },
      });
    }
  }

  const statusOverrides = [
    { personalNumber: '100001', status: 'HOLIDAY' as const },
    { personalNumber: '100002', status: 'SICK' as const },
    { personalNumber: '100003', status: 'RELEASED' as const },
  ];

  for (const override of statusOverrides) {
    const user = activeUsers.find((item) => item.personalNumber === override.personalNumber);

    if (!user) continue;

    for (const date of activityDateRange) {
      await prisma.activityUserStatus.updateMany({
        where: {
          activityId: activity.id,
          userId: user.id,
          date,
        },
        data: {
          status: override.status,
        },
      });
    }
  }

  const availabilityOverrides = [
    { personalNumber: '100004', availability: 'MORNING' as const },
    { personalNumber: '100005', availability: 'EVENING' as const },
    { personalNumber: '100006', availability: 'UNAVAILABLE' as const },
  ];

  for (const override of availabilityOverrides) {
    const user = activeUsers.find((item) => item.personalNumber === override.personalNumber);

    if (!user) continue;

    for (const date of activityDateRange) {
      await prisma.activityUserStatus.updateMany({
        where: {
          activityId: activity.id,
          userId: user.id,
          date,
        },
        data: {
          availability: override.availability,
        },
      });
    }
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
  console.log('🌱 Seeding and assigning demo permissions...');

  // All protected company-facing APIs currently require MANAGE_COMPANIES.
  // Seed and assign it to the demo commander for an end-to-end local demo.
  const manageCompaniesPermission = await prisma.permission.upsert({
    where: { key: 'MANAGE_COMPANIES' },
    update: {},
    create: {
      key: 'MANAGE_COMPANIES',
      description: 'Manage companies and commander-facing company operations',
    },
  });

  const approveSchedulingPermission = await prisma.permission.upsert({
    where: { key: 'APPROVE_SCHEDULING' },
    update: {},
    create: {
      key: 'APPROVE_SCHEDULING',
      description: 'Approve and return scheduling plans for correction',
    },
  });

  const commander = await prisma.user.findFirst({
    where: { companyId: company.id, personalNumber: '100001' },
  });

  if (commander) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: commander.id,
          permissionId: manageCompaniesPermission.id,
        },
      },
      update: {},
      create: {
        userId: commander.id,
        permissionId: manageCompaniesPermission.id,
      },
    });

    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: commander.id,
          permissionId: approveSchedulingPermission.id,
        },
      },
      update: {},
      create: {
        userId: commander.id,
        permissionId: approveSchedulingPermission.id,
      },
    });
  }


  console.log('✅ Demo seed completed');
}