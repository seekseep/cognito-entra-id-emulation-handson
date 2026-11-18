import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import cognitoConfig from './config/cognito.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [cognitoConfig] }),
    AuthModule,
  ],
})
export class AppModule {}
