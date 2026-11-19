// public/ の画面を配る静的サーバー。Node の標準 API だけで書く。
// あわせて、画面に「どの User Pool に、どのクライアントとしてログインするか」を教える /config を返す。
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, sep } from 'node:path';

const PORT = 3000;
const PUBLIC_DIR = join(import.meta.dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

// create-user-pool.sh が書いた .cognito.env（export POOL_ID=... の行）を読む。
// リクエストのたびに読むので、setup で User Pool を作り直しても、サーバーの起動し直しは要らない
async function readCognitoEnv() {
  const text = await readFile(join(import.meta.dirname, '.cognito.env'), 'utf8');
  return Object.fromEntries([...text.matchAll(/^export (\w+)=(.*)$/gm)].map((m) => [m[1], m[2]]));
}

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/config') {
    const env = await readCognitoEnv();
    // Cognito の API の入口。Floci なら http://localhost:4566、本物なら https://cognito-idp.<リージョン>.amazonaws.com
    const endpoint = env.COGNITO_ENDPOINT ?? 'http://localhost:4566';
    // どれもブラウザに渡る値で、秘密ではない
    const config = { issuer: `${endpoint}/${env.POOL_ID}`, clientId: env.CLIENT_ID };
    return send(res, 200, 'application/json', JSON.stringify(config));
  }

  // / は index.html。public/ の外（../ など）は読ませない
  const file = join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(PUBLIC_DIR + sep)) return send(res, 404, 'text/plain', 'Not Found');
  try {
    send(res, 200, TYPES[extname(file)] ?? 'application/octet-stream', await readFile(file));
  } catch {
    send(res, 404, 'text/plain', 'Not Found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT} で画面を配っています（止めるときは Ctrl+C）`));
