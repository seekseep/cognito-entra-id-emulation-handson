import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CognitoErrorFilter } from './cognito-error.filter.js';
import { CognitoJwtGuard } from './cognito-jwt.guard.js';
import { RolesGuard } from './roles.guard.js';
import { ConfigController } from './config.controller.js';

@Module({
  // Hosted UI のログイン画面が知りたい値（どこに、どのクライアントとして行くか）を返す ConfigController を足す
  controllers: [AuthController, ConfigController],
  providers: [AuthService, CognitoJwtGuard, RolesGuard, { provide: APP_FILTER, useClass: CognitoErrorFilter }],
  exports: [AuthService, CognitoJwtGuard, RolesGuard],
})
export class AuthModule {}
