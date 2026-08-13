import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermission } from './permission.decorator';

class TestController {
  @RequirePermission('MANAGE_USERS')
  decoratedMethod() {
    return undefined;
  }
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let prisma: any;
  let reflector: Reflector;

  beforeEach(() => {
    prisma = {
      userPermission: {
        findMany: jest.fn(),
      },
    };
    reflector = new Reflector();
    guard = new PermissionGuard(reflector, prisma as PrismaService);
  });

  it('allows requests when the user has the required permission', async () => {
    prisma.userPermission.findMany.mockResolvedValue([
      { permission: { key: 'MANAGE_USERS' } },
    ]);

    const context = createContext(TestController.prototype.decoratedMethod, TestController);
    (context.switchToHttp().getRequest() as any).user = {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      companyId: 'company-1',
      isActive: true,
    };

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { permission: { select: { key: true } } },
    });
  });

  it('throws forbidden when the user does not have the required permission', async () => {
    prisma.userPermission.findMany.mockResolvedValue([
      { permission: { key: 'VIEW_REPORTS' } },
    ]);

    const context = createContext(TestController.prototype.decoratedMethod, TestController);
    (context.switchToHttp().getRequest() as any).user = {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      companyId: 'company-1',
      isActive: true,
    };

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('throws unauthorized when there is no authenticated user', async () => {
    const context = createContext(TestController.prototype.decoratedMethod, TestController);
    (context.switchToHttp().getRequest() as any).user = undefined;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('allows endpoints without permission metadata', async () => {
    const context = createContext(() => undefined, TestController);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('uses request user context id and does not depend on email identity fallback', async () => {
    prisma.userPermission.findMany.mockResolvedValue([{ permission: { key: 'MANAGE_USERS' } }]);
    const context = createContext(TestController.prototype.decoratedMethod, TestController);
    (context.switchToHttp().getRequest() as any).user = {
      id: 'business-user-42',
      email: null,
      firstName: 'No',
      lastName: 'Email',
      companyId: 'company-1',
      isActive: true,
    };

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
      where: { userId: 'business-user-42' },
      select: { permission: { select: { key: true } } },
    });
  });
});

function createContext(handler: Function, controller: Function): ExecutionContext {
  const request = { headers: {} };

  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
