import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_METADATA_KEY } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('Not authenticated');
    }

    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId: user.id },
      select: { permission: { select: { key: true } } },
    });

    const hasPermission = userPermissions.some((entry: { permission?: { key?: string } }) => entry.permission?.key === requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
