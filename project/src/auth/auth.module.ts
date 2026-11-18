import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CognitoErrorFilter } from './cognito-error.filter.js';
// @since 02-02
import { CognitoJwtGuard } from './cognito-jwt.guard.js';
import { RolesGuard } from './roles.guard.js';
// @end
import { ConfigController } from './config.controller.js'; // @since 03-01

@Module({
  controllers: [AuthController], // @until 03-01
  // Hosted UI のログイン画面が知りたい値（どこに、どのクライアントとして行くか）を返す ConfigController を足す // @since 03-01
  controllers: [AuthController, ConfigController], // @since 03-01
  providers: [AuthService, { provide: APP_FILTER, useClass: CognitoErrorFilter }], // @until 02-02
  exports: [AuthService], // @until 02-02
  providers: [AuthService, CognitoJwtGuard, RolesGuard, { provide: APP_FILTER, useClass: CognitoErrorFilter }], // @since 02-02
  exports: [AuthService, CognitoJwtGuard, RolesGuard], // @since 02-02
})
export class AuthModule {}
