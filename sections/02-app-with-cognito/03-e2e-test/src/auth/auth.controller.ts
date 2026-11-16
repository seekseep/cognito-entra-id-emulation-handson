import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

// 入力の形だけを確かめる。パスワードの強さなどは Cognito 側のポリシーに任せる
function requireStrings<K extends string>(body: unknown, keys: K[]): Record<K, string> {
  const record = (body ?? {}) as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] !== 'string' || record[key] === '') {
      throw new BadRequestException(`${key} を文字列で指定してください`);
    }
  }
  return record as Record<K, string>;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signUp(@Body() body: unknown) {
    const { username, email, password } = requireStrings(body, ['username', 'email', 'password']);
    return this.auth.signUp(username, email, password);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(@Body() body: unknown) {
    const { username, code } = requireStrings(body, ['username', 'code']);
    return this.auth.confirmSignUp(username, code);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: unknown) {
    const { username, password } = requireStrings(body, ['username', 'password']);
    return this.auth.login(username, password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: unknown) {
    const { refreshToken } = requireStrings(body, ['refreshToken']);
    return this.auth.refresh(refreshToken);
  }
}
