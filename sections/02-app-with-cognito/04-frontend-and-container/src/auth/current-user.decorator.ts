import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, CognitoUser } from './cognito-jwt.guard.js';

// Guard が request.user に入れた利用者を、ハンドラの引数として受け取る
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): CognitoUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
