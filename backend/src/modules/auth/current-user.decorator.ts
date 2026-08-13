import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedBusinessUser } from './authenticated-user.interface';

interface CurrentUserRequest {
  user?: AuthenticatedBusinessUser;
}

export const CurrentUser = createParamDecorator((data: keyof AuthenticatedBusinessUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<CurrentUserRequest>();

  if (!request.user) {
    return undefined;
  }

  return data ? request.user[data] : request.user;
});
