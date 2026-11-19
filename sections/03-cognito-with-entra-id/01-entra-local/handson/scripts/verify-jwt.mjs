// JWKS を取ってきて、JWT の署名・発行者・有効期限を確かめる。
// 使い方: node scripts/verify-jwt.mjs <token>
// 別の User Pool で確かめたいときは POOL_ID=<プール ID> を付けて実行する（環境変数がファイルより優先）
import { readFileSync, existsSync } from 'node:fs';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// env.sh と .cognito.env の `export KEY=VALUE` を読む。ほかのスクリプト（login.sh など）と同じく、
// 端末を開き直して source し忘れていても動くようにするため
function readExports(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    [...readFileSync(file, 'utf8').matchAll(/^export (\w+)=(.*)$/gm)].map(([, key, value]) => [key, value.replace(/^["']|["']$/g, '')]),
  );
}
const env = { ...readExports('env.sh'), ...readExports('.cognito.env'), ...process.env };

const token = process.argv[2];
if (!token) {
  console.error('使い方: npm run verify <トークン>');
  process.exit(1);
}
if (!env.AWS_ENDPOINT_URL || !env.POOL_ID) {
  console.error('AWS_ENDPOINT_URL か POOL_ID が分かりません。先に npm run setup を実行してください');
  process.exit(1);
}

// Floci の iss は http://localhost:4566/<プール ID>。本物なら https://cognito-idp.<region>.amazonaws.com/<プール ID>
const issuer = `${env.AWS_ENDPOINT_URL}/${env.POOL_ID}`;

try {
  // 鍵の在りかは discovery（<iss>/.well-known/openid-configuration）が教えてくれる
  const response = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!response.ok) throw new Error(`discovery を読めませんでした（HTTP ${response.status}、${issuer}）`);
  const discovery = await response.json();
  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));

  const { payload, protectedHeader } = await jwtVerify(token, jwks, { issuer });
  console.log('OK: 署名と iss と exp を確かめました');
  console.log({ kid: protectedHeader.kid, token_use: payload.token_use, sub: payload.sub });
} catch (error) {
  console.error(`NG: ${error.code ?? error.name}: ${error.message}`);
  process.exitCode = 1;
}
