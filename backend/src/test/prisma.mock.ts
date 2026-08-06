import { Prisma, PrismaClient } from '@prisma/client';

type Fn = jest.Mock<any, any>;

export function createPrismaMock() {
  const m = {
    company: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    unit: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    qualification: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    userQualification: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    userPermission: {
      upsert: jest.fn(),
    },
    permission: {
      findFirst: jest.fn(),
    },
  } as any;

  return m as unknown as PrismaClient;
}

export function prismaClientKnownRequestError(code: string, message = 'error') {
  const err = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
  err.code = code;
  err.message = message;
  return err;
}

export default createPrismaMock;
