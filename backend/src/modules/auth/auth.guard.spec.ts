import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: any;
  let prisma: any;

  beforeEach(() => {
    authService = {
      getSessionUser: jest.fn(),
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    guard = new AuthGuard(authService as AuthService, prisma as PrismaService);
  });

  it('rejects when no cookie is present', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid sessions', async () => {
    authService.getSessionUser.mockReturnValue(null);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { cookie: 'app_session=bad' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('populates request.user for a valid session', async () => {
    authService.getSessionUser.mockReturnValue('user-1');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      companyId: 'company-1',
      isActive: true,
    });
    const request: any = { headers: { cookie: 'app_session=valid' } };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, email: true, firstName: true, lastName: true, companyId: true, isActive: true },
    });
    expect(request.user.id).toBe('user-1');
    expect(request.user.companyId).toBe('company-1');
  });

  it('rejects inactive business users', async () => {
    authService.getSessionUser.mockReturnValue('user-1');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Inactive',
      lastName: 'User',
      companyId: 'company-1',
      isActive: false,
    });
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { cookie: 'app_session=valid' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('does not treat non-business identities as authenticated users', async () => {
    authService.getSessionUser.mockReturnValue('system-user-1');
    prisma.user.findUnique.mockResolvedValue(null);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { cookie: 'app_session=valid' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
