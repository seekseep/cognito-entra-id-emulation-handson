import { join } from 'node:path'; // @since 02-04
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static'; // @since 02-04
import { AuthModule } from './auth/auth.module.js';
import cognitoConfig from './config/cognito.config.js';
import { UsersModule } from './users/users.module.js'; // @since 02-02

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [cognitoConfig] }),
    // @since 02-04
    // public/ をそのまま配る。API と同じオリジンなので CORS の設定が要らない
    ServeStaticModule.forRoot({ rootPath: join(process.cwd(), 'public') }),
    // @end
    AuthModule,
    UsersModule, // @since 02-02
  ],
})
export class AppModule {}
