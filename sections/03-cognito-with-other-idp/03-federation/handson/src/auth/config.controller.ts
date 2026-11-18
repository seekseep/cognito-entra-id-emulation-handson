import { Controller, Get, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import cognitoConfig from '../config/cognito.config.js';

// ブラウザが「どこに、どのクライアントとしてログインしに行くか」を知るための窓口。
// どれも秘密ではない（ブラウザに渡る値）ので、そのまま返してよい
@Controller('config')
export class ConfigController {
  constructor(@Inject(cognitoConfig.KEY) private readonly config: ConfigType<typeof cognitoConfig>) {}

  @Get()
  get() {
    return {
      issuer: this.config.issuer,
      clientId: this.config.clientId,
      scope: 'openid email profile',
      identityProviders: this.config.identityProviders,
    };
  }
}
