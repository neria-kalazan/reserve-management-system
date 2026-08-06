import { UserPermissionsService } from './user-permissions.service';
import { createPrismaMock } from '../../test/prisma.mock';

describe('UserPermissionsService', () => {
  let prisma: any;
  let service: UserPermissionsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UserPermissionsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
