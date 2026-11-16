import { registerAs } from '@nestjs/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} がありません（npm run setup で .env を作れます）`);
  return value;
}

export default registerAs('cognito', () => {
  const region = process.env.AWS_REGION ?? 'ap-northeast-1';
  // 未設定なら本物の Cognito に向く。Floci を使うときだけ http://localhost:4566 を入れる
  const endpoint = process.env.COGNITO_ENDPOINT || undefined;
  const userPoolId = required('COGNITO_USER_POOL_ID');
  const issuer = process.env.COGNITO_ISSUER ?? `${endpoint ?? `https://cognito-idp.${region}.amazonaws.com`}/${userPoolId}`;
  return {
    region,
    endpoint,
    userPoolId,
    clientId: required('COGNITO_CLIENT_ID'),
    issuer,
    jwksUrl: process.env.COGNITO_JWKS_URL ?? `${issuer}/.well-known/jwks.json`,
    // ログイン画面に並べる外部 IdP の名前（Cognito に登録した ProviderName）
    identityProviders: (process.env.COGNITO_IDENTITY_PROVIDERS ?? '').split(',').map((name) => name.trim()).filter(Boolean),
  };
});
