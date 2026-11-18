import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  AuthFlowType,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import cognitoConfig from '../config/cognito.config.js';

@Injectable()
export class AuthService {
  private readonly client: CognitoIdentityProviderClient;

  constructor(
    @Inject(cognitoConfig.KEY) private readonly config: ConfigType<typeof cognitoConfig>,
  ) {
    // endpoint を上書きすると、SDK は AWS ではなく Floci に話しかける。それ以外のコードは本番と同じ
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
      endpoint: config.endpoint,
    });
  }

  async signUp(username: string, email: string, password: string) {
    const result = await this.client.send(
      new SignUpCommand({
        ClientId: this.config.clientId,
        Username: username,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }],
      }),
    );
    return { userSub: result.UserSub, confirmed: result.UserConfirmed };
  }

  async confirmSignUp(username: string, code: string) {
    await this.client.send(
      new ConfirmSignUpCommand({
        ClientId: this.config.clientId,
        Username: username,
        ConfirmationCode: code,
      }),
    );
    return { confirmed: true };
  }

  async login(username: string, password: string) {
    const result = await this.client.send(
      new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: { USERNAME: username, PASSWORD: password },
      }),
    );
    // 管理者が作ったユーザーの初回ログインなどでは、トークンの代わりにチャレンジが返る
    if (result.ChallengeName) {
      return { challenge: result.ChallengeName, session: result.Session };
    }
    return this.toTokens(result.AuthenticationResult);
  }

  async refresh(refreshToken: string) {
    const result = await this.client.send(
      new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }),
    );
    return this.toTokens(result.AuthenticationResult);
  }


  private toTokens(result: { IdToken?: string; AccessToken?: string; RefreshToken?: string; ExpiresIn?: number } | undefined) {
    return {
      idToken: result?.IdToken,
      accessToken: result?.AccessToken,
      refreshToken: result?.RefreshToken,
      expiresIn: result?.ExpiresIn,
    };
  }
}
