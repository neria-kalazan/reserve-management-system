import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

describe('Auth activation persistence', () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  const createdActivationIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdUnitIds: string[] = [];
  const createdCompanyIds: string[] = [];

  const createCompanyGraph = async () => {
    const suffix = randomUUID();
    const company = await prisma.company.create({
      data: {
        name: `Activation Test Company ${suffix}`,
        status: 'ACTIVE',
      },
    });
    createdCompanyIds.push(company.id);

    const unit = await prisma.unit.create({
      data: {
        companyId: company.id,
        name: `Activation Test Unit ${suffix}`,
      },
    });
    createdUnitIds.push(unit.id);

    const creator = await prisma.user.create({
      data: {
        companyId: company.id,
        unitId: unit.id,
        firstName: 'Creator',
        lastName: suffix.slice(0, 8),
        phone: `059${suffix.replace(/-/g, '').slice(0, 7)}`,
        email: `creator-${suffix}@example.com`,
        personalNumber: `creator-${suffix}`.slice(0, 20),
        isActive: true,
      },
    });
    createdUserIds.push(creator.id);

    const target = await prisma.user.create({
      data: {
        companyId: company.id,
        unitId: unit.id,
        firstName: 'Target',
        lastName: suffix.slice(9, 17),
        phone: `058${suffix.replace(/-/g, '').slice(0, 7)}`,
        email: `target-${suffix}@example.com`,
        personalNumber: `target-${suffix}`.slice(0, 20),
        isActive: true,
      },
    });
    createdUserIds.push(target.id);

    return { company, unit, creator, target, suffix };
  };

  afterAll(async () => {
    if (createdActivationIds.length > 0) {
      await prisma.activationOtpChallenge.deleteMany({
        where: { activationId: { in: createdActivationIds } },
      });
      await prisma.activation.deleteMany({
        where: { id: { in: createdActivationIds } },
      });
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }

    if (createdUnitIds.length > 0) {
      await prisma.unit.deleteMany({ where: { id: { in: createdUnitIds } } });
    }

    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    }

    await prisma.$disconnect();
  });

  it('stores activation-related user fields as nullable values', async () => {
    const { target } = await createCompanyGraph();

    const initial = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: {
        activatedAt: true,
        phoneVerifiedAt: true,
        googleSubject: true,
        googleLinkedAt: true,
      },
    });

    expect(initial).toEqual({
      activatedAt: null,
      phoneVerifiedAt: null,
      googleSubject: null,
      googleLinkedAt: null,
    });

    const now = new Date();

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        activatedAt: now,
        phoneVerifiedAt: now,
        googleSubject: `google-subject-${randomUUID()}`,
        googleLinkedAt: now,
      },
      select: {
        activatedAt: true,
        phoneVerifiedAt: true,
        googleSubject: true,
        googleLinkedAt: true,
      },
    });

    expect(updated.activatedAt).not.toBeNull();
    expect(updated.phoneVerifiedAt).not.toBeNull();
    expect(updated.googleSubject).toMatch(/^google-subject-/);
    expect(updated.googleLinkedAt).not.toBeNull();
  });

  it('enforces globally unique phone numbers', async () => {
    const { company, unit, target } = await createCompanyGraph();

    await expect(
      prisma.user.create({
        data: {
          companyId: company.id,
          unitId: unit.id,
          firstName: 'Duplicate',
          lastName: 'Phone',
          phone: target.phone,
          email: `dup-phone-${randomUUID()}@example.com`,
          personalNumber: `dup-phone-${randomUUID()}`.slice(0, 20),
          isActive: true,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' } as Partial<Prisma.PrismaClientKnownRequestError>);
  });

  it('enforces globally unique googleSubject values', async () => {
    const first = await createCompanyGraph();
    const second = await createCompanyGraph();
    const googleSubject = `google-subject-${randomUUID()}`;

    await prisma.user.update({
      where: { id: first.target.id },
      data: { googleSubject },
    });

    await expect(
      prisma.user.update({
        where: { id: second.target.id },
        data: { googleSubject },
      }),
    ).rejects.toMatchObject({ code: 'P2002' } as Partial<Prisma.PrismaClientKnownRequestError>);
  });

  it('stores Activation and ActivationOtpChallenge relations correctly', async () => {
    const { company, creator, target, suffix } = await createCompanyGraph();

    const activation = await prisma.activation.create({
      data: {
        userId: target.id,
        createdByUserId: creator.id,
        companyId: company.id,
        tokenHash: `token-hash-${suffix}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      include: {
        user: true,
        createdByUser: true,
        company: true,
      },
    });
    createdActivationIds.push(activation.id);

    const challenge = await prisma.activationOtpChallenge.create({
      data: {
        activationId: activation.id,
        codeHash: `code-hash-${suffix}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        maxAttempts: 5,
      },
    });

    const loaded = await prisma.activation.findUniqueOrThrow({
      where: { id: activation.id },
      include: {
        user: true,
        createdByUser: true,
        company: true,
        otpChallenges: true,
      },
    });

    expect(loaded.user.id).toBe(target.id);
    expect(loaded.createdByUser.id).toBe(creator.id);
    expect(loaded.company.id).toBe(company.id);
    expect(loaded.usedAt).toBeNull();
    expect(loaded.revokedAt).toBeNull();
    expect(loaded.otpChallenges).toHaveLength(1);
    expect(loaded.otpChallenges[0]).toMatchObject({
      id: challenge.id,
      activationId: activation.id,
      attemptCount: 0,
      maxAttempts: 5,
      usedAt: null,
      lockedAt: null,
    });
  });
});