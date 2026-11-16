import { Module } from '@nestjs/common';
import { CognitoJwtGuard } from './cognito-jwt.guard.js';
import { ConfigController } from './config.controller.js';
import { RolesGuard } from './roles.guard.js';

// パスワードを受け取る /auth/* は無くなった。ログインは Hosted UI に任せ、API はトークンを確かめるだけ
@Module({
  controllers: [ConfigController],
  providers: [CognitoJwtGuard, RolesGuard],
  exports: [CognitoJwtGuard, RolesGuard],
})
export class AuthModule {}
