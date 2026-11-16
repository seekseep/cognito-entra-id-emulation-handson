import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Request } from 'express';
import cognitoConfig from '../config/cognito.config.js';

export interface CognitoUser {
  sub: string;
  username: string;
  groups: string[];
}

export type AuthenticatedRequest = Request & { user: CognitoUser };

@Injectable()
export class CognitoJwtGuard implements CanActivate {
  // JWKS は一度取ったらキャッシュされ、知らない kid が来たときだけ取り直す
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    @Inject(cognitoConfig.KEY) private readonly config: ConfigType<typeof cognitoConfig>,
  ) {
    this.jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization: Bearer <アクセストークン> が必要です');
    }

    let payload: JWTPayload;
    try {
      // 署名・iss・exp を確かめる
      ({ payload } = await jwtVerify(token, this.jwks, { issuer: this.config.issuer }));
    } catch {
      throw new UnauthorizedException('トークンを確かめられませんでした');
    }

    // Cognito のアクセストークンには aud が無い。代わりに token_use と client_id を見る
    if (payload.token_use !== 'access') {
      throw new UnauthorizedException('アクセストークンを送ってください（ID トークンは使えません）');
    }
    if (payload.client_id !== this.config.clientId) {
      throw new UnauthorizedException('このアプリ向けのトークンではありません');
    }

    request.user = {
      sub: String(payload.sub),
      username: String(payload.username),
      groups: (payload['cognito:groups'] as string[] | undefined) ?? [],
    };
    return true;
  }
}
