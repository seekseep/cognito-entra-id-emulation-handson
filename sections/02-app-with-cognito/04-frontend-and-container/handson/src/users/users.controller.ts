import { Controller, Get, UseGuards } from '@nestjs/common';
import { CognitoJwtGuard, type CognitoUser } from '../auth/cognito-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Controller()
@UseGuards(CognitoJwtGuard, RolesGuard)
export class UsersController {
  // ログインしていれば誰でも呼べる
  @Get('me')
  me(@CurrentUser() user: CognitoUser) {
    return user;
  }

  // admin グループの利用者だけが呼べる
  @Get('admin/dashboard')
  @Roles(['admin'])
  dashboard(@CurrentUser() user: CognitoUser) {
    return { message: `ようこそ、管理者の ${user.username} さん` };
  }
}
