import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CognitoErrorFilter } from './cognito-error.filter.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_FILTER, useClass: CognitoErrorFilter }],
  exports: [AuthService],
})
export class AuthModule {}
