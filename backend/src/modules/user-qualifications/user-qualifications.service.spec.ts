import { UserQualificationsService } from './user-qualifications.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('UserQualificationsService', () => {
  let prisma: any;
  let service: UserQualificationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UserQualificationsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
