import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const sessionToken = this.getSessionToken(request);

    if (!sessionToken) {
      throw new UnauthorizedException('Not authenticated');
    }

    const userId = this.authService.getSessionUser(sessionToken);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    request.user = user;
    return true;
  }

  private getSessionToken(req: Request): string | undefined {
    const cookieHeader = req.headers.cookie ?? '';
    const cookies = Object.fromEntries(cookieHeader.split(';').filter(Boolean).map((item) => {
      const [name, ...rest] = item.trim().split('=');
      return [name, rest.join('=')];
    }));

    return cookies.app_session;
  }
}
