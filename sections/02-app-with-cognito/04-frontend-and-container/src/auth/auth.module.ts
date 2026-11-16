import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CognitoErrorFilter } from './cognito-error.filter.js';
import { CognitoJwtGuard } from './cognito-jwt.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, CognitoJwtGuard, RolesGuard, { provide: APP_FILTER, useClass: CognitoErrorFilter }],
  exports: [AuthService, CognitoJwtGuard, RolesGuard],
})
export class AuthModule {}
