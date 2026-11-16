import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './cognito-jwt.guard.js';
import { Roles } from './roles.decorator.js';

// CognitoJwtGuard の後ろで使う。request.user が入っている前提
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride(Roles, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (required.some((role) => user.groups.includes(role))) return true;
    // 本人であることは分かっている（401 ではない）が、権限が足りない
    throw new ForbiddenException(`${required.join(' / ')} グループの利用者だけが使えます`);
  }
}
