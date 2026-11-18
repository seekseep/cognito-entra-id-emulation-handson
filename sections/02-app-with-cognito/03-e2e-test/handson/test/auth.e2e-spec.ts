import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { addToGroup, createUserPool, readVerificationCode } from './floci.js';

const PASSWORD = 'Passw0rd!';

describe('認証 API（Floci に向けて）', () => {
  let app: INestApplication<App>;
  let userPoolId: string;

  beforeEach(async () => {
    // 環境変数を入れてからモジュールを組み立てる（設定はこのときに読まれる）
    userPoolId = await createUserPool();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function signUpAndLogin(username: string) {
    const server = app.getHttpServer();
    await request(server).post('/auth/signup').send({ username, email: `${username}@example.com`, password: PASSWORD }).expect(201);
    const code = await readVerificationCode(`${username}@example.com`);
    await request(server).post('/auth/confirm').send({ username, code }).expect(200);
    const login = await request(server).post('/auth/login').send({ username, password: PASSWORD }).expect(200);
    return login.body as { accessToken: string; idToken: string; refreshToken: string };
  }

  it('サインアップしただけではログインできない', async () => {
    const server = app.getHttpServer();
    await request(server).post('/auth/signup').send({ username: 'carol', email: 'carol@example.com', password: PASSWORD }).expect(201);
    await request(server).post('/auth/login').send({ username: 'carol', password: PASSWORD }).expect(403);
  });

  it('パスワード違いと存在しないユーザーは、同じ 401 になる', async () => {
    await signUpAndLogin('carol');
    const server = app.getHttpServer();
    const wrong = await request(server).post('/auth/login').send({ username: 'carol', password: 'Wrong1234' }).expect(401);
    const missing = await request(server).post('/auth/login').send({ username: 'nobody', password: 'Wrong1234' }).expect(401);
    expect(wrong.body).toEqual(missing.body);
  });

  it('アクセストークンで /me が読める。ID トークンでは読めない', async () => {
    const tokens = await signUpAndLogin('carol');
    const server = app.getHttpServer();
    const me = await request(server).get('/me').set('Authorization', `Bearer ${tokens.accessToken}`).expect(200);
    expect(me.body).toMatchObject({ username: 'carol', groups: [] });
    await request(server).get('/me').set('Authorization', `Bearer ${tokens.idToken}`).expect(401);
  });

  it('admin グループに入ると、新しいトークンから管理画面を使える', async () => {
    const before = await signUpAndLogin('carol');
    const server = app.getHttpServer();
    await request(server).get('/admin/dashboard').set('Authorization', `Bearer ${before.accessToken}`).expect(403);

    await addToGroup(userPoolId, 'carol', 'admin');
    const refreshed = await request(server).post('/auth/refresh').send({ refreshToken: before.refreshToken }).expect(200);
    await request(server).get('/admin/dashboard').set('Authorization', `Bearer ${refreshed.body.accessToken}`).expect(200);
  });

  it('間違った確認コードは 400 になる', async () => {
    const server = app.getHttpServer();
    await request(server).post('/auth/signup').send({ username: 'carol', email: 'carol@example.com', password: PASSWORD }).expect(201);
    await request(server).post('/auth/confirm').send({ username: 'carol', code: '000000' }).expect(400);
  });

  it('前のテストのユーザーは残っていない', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ username: 'carol', password: PASSWORD }).expect(401);
  });
});
