import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module.js';
import cognitoConfig from './config/cognito.config.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [cognitoConfig] }),
    // public/ をそのまま配る。API と同じオリジンなので CORS の設定が要らない
    ServeStaticModule.forRoot({ rootPath: join(process.cwd(), 'public') }),
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
