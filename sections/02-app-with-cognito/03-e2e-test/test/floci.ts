import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const FLOCI = process.env.FLOCI_ENDPOINT ?? 'http://localhost:4566';
const REGION = 'ap-northeast-1';

const cognito = new CognitoIdentityProviderClient({
  region: REGION,
  endpoint: FLOCI,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

// テストごとに新しい User Pool を作る。前のテストのユーザーと混ざらないので、全体を消す必要が無い
export async function createUserPool() {
  const pool = await cognito.send(
    new CreateUserPoolCommand({
      PoolName: `e2e-${Date.now()}`,
      // メールを確認用に使う設定。これが無いと確認コードのメールが送られない
      AutoVerifiedAttributes: ['email'],
      Policies: {
        PasswordPolicy: { MinimumLength: 8, RequireUppercase: true, RequireLowercase: true, RequireNumbers: true, RequireSymbols: false },
      },
    }),
  );
  const userPoolId = pool.UserPool!.Id!;
  const client = await cognito.send(
    new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: 'e2e',
      ExplicitAuthFlows: ['ALLOW_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
    }),
  );
  await cognito.send(new CreateGroupCommand({ UserPoolId: userPoolId, GroupName: 'admin' }));

  // アプリが読む環境変数に入れる。設定はモジュールを組み立てるときに読まれる
  Object.assign(process.env, {
    AWS_REGION: REGION,
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
    COGNITO_ENDPOINT: FLOCI,
    COGNITO_USER_POOL_ID: userPoolId,
    COGNITO_CLIENT_ID: client.UserPoolClient!.ClientId!,
  });
  return userPoolId;
}

export async function addToGroup(userPoolId: string, username: string, group: string) {
  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: username, GroupName: group }));
}

// サインアップ確認のメールは Floci の SES に届く。いちばん新しいメールから 6 桁のコードを抜き出す
export async function readVerificationCode(email: string): Promise<string> {
  const { messages } = (await (await fetch(`${FLOCI}/_aws/ses`)).json()) as {
    messages: { Destination: { ToAddresses: string[] }; Body: { text_part: string | null } }[];
  };
  const mail = messages.filter((m) => m.Destination.ToAddresses.includes(email)).at(-1);
  const code = mail?.Body.text_part?.match(/\d{6}/)?.[0];
  if (!code) throw new Error(`${email} 宛ての確認コードが見つかりません`);
  return code;
}
