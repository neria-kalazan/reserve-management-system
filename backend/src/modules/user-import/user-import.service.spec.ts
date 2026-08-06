import { UserImportService } from './user-import.service';
import { createPrismaMock, prismaClientKnownRequestError } from '../../test/prisma.mock';

describe('UserImportService', () => {
  let prisma: any;
  let service: UserImportService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UserImportService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('importFromBuffer: valid CSV creates user', async () => {
    const csv = 'firstName,lastName,phone,personalNumber,unitName\nTest,User,050,500,מחלקה 1\n';
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findFirst.mockResolvedValue({ id: 'u1' });
    prisma.user.create.mockResolvedValue({ id: 'user1' });

    const res = await service.importFromBuffer('c1', Buffer.from(csv));
    expect(res.created).toBe(1);
    expect(res.failed).toBe(0);
  });

  it('importFromBuffer: invalid row returns error', async () => {
    const csv = 'firstName,lastName,phone,personalNumber,unitName\nBadRow,,,,\n';
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });

    const res = await service.importFromBuffer('c1', Buffer.from(csv));
    expect(res.created).toBe(0);
    expect(res.failed).toBe(1);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('importFromBuffer: invalid unit returns error', async () => {
    const csv = 'firstName,lastName,phone,personalNumber,unitName\nBad,User,050,500,Missing Unit\n';
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findFirst.mockResolvedValue(null);

    const res = await service.importFromBuffer('c1', Buffer.from(csv));
    expect(res.created).toBe(0);
    expect(res.failed).toBe(1);
    expect(res.errors[0].reason).toMatch(/Unit/i);
  });

  it('importFromBuffer: duplicate personalNumber handled', async () => {
    const csv = 'firstName,lastName,phone,personalNumber,unitName\nDup,User,050,500,מחלקה 1\n';
    prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.unit.findFirst.mockResolvedValue({ id: 'u1' });
    prisma.user.create.mockImplementation(() => {
      throw prismaClientKnownRequestError('P2002');
    });

    const res = await service.importFromBuffer('c1', Buffer.from(csv));
    expect(res.created).toBe(0);
    expect(res.failed).toBe(1);
    expect(res.errors[0].reason).toMatch(/Duplicate/i);
  });
});
