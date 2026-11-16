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
  // トークンの iss は「エンドポイント/プール ID」。Floci も本物も同じ形なので、ここから組み立てられる
  const issuer = process.env.COGNITO_ISSUER ?? `${endpoint ?? `https://cognito-idp.${region}.amazonaws.com`}/${userPoolId}`;
  return {
    region,
    endpoint,
    userPoolId,
    clientId: required('COGNITO_CLIENT_ID'),
    issuer,
    // API をコンテナで動かすときなど、鍵を取りに行く先だけ変えたいときに上書きする
    jwksUrl: process.env.COGNITO_JWKS_URL ?? `${issuer}/.well-known/jwks.json`,
  };
});
