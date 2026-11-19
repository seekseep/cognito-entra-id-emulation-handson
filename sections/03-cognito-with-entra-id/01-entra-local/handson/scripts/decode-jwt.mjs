// JWT のヘッダーとペイロードを読む。署名は確かめない（読むだけ）。
// 使い方: node scripts/decode-jwt.mjs <token>   または   echo <token> | node scripts/decode-jwt.mjs
import { readFileSync } from 'node:fs';

const token = (process.argv[2] ?? readFileSync(0, 'utf8')).trim();
const [header, payload] = token.split('.');

// JWT の各部は base64url。Node の Buffer はそのまま読める
const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

const claims = decode(payload);
// iat / exp は UNIX 秒なので、読める形を横に添える
for (const key of ['iat', 'auth_time', 'exp']) {
  if (typeof claims[key] === 'number') {
    claims[`${key} (読める形)`] = new Date(claims[key] * 1000).toISOString();
  }
}

console.log('header:', JSON.stringify(decode(header), null, 2));
console.log('payload:', JSON.stringify(claims, null, 2));
