// JWKS を取ってきて、JWT の署名・発行者・有効期限を確かめる。
// 使い方: node scripts/verify-jwt.mjs <token>
import { createRemoteJWKSet, jwtVerify } from 'jose';

const token = process.argv[2];
// Floci の iss は http://localhost:4566/<プール ID>。本物なら https://cognito-idp.<region>.amazonaws.com/<プール ID>
const issuer = `${process.env.AWS_ENDPOINT_URL}/${process.env.POOL_ID}`;

// 鍵の在りかは discovery（<iss>/.well-known/openid-configuration）が教えてくれる
const discovery = await (await fetch(`${issuer}/.well-known/openid-configuration`)).json();
const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));

try {
  const { payload, protectedHeader } = await jwtVerify(token, jwks, { issuer });
  console.log('OK: 署名と iss と exp を確かめました');
  console.log({ kid: protectedHeader.kid, token_use: payload.token_use, sub: payload.sub });
} catch (error) {
  console.error(`NG: ${error.code ?? error.name}: ${error.message}`);
  process.exitCode = 1;
}
