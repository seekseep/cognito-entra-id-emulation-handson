// Cognito の API を呼ぶ。AWS SDK for JavaScript v3 の Cognito の部分を、CDN（esm.sh）から読み込む。ある日から変わらないよう、版を固定する
import { CognitoIdentityProviderClient } from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';
import { cognitoEndpoint } from './config.js';

// SignUpCommand・InitiateAuthCommand などのコマンドも、ここから使えるようにする
export * from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';

// 送り先を config.json の issuer のオリジン（Floci）に向けたクライアント。
// SignUp・InitiateAuth などは、AWS の認証情報（署名）なしで、クライアント ID だけで呼べる
export const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1', endpoint: cognitoEndpoint });
