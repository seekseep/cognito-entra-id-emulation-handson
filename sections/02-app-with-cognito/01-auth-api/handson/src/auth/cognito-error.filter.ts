import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { CognitoIdentityProviderServiceException } from '@aws-sdk/client-cognito-identity-provider';
import type { Response } from 'express';

// Cognito の例外名 → HTTP ステータスと、利用者に見せる文言
const MAPPING: Record<string, [number, string]> = {
  // ユーザーの有無を区別して返すと、登録済みのユーザー名を探られる。どちらも同じ 401 にする
  NotAuthorizedException: [HttpStatus.UNAUTHORIZED, 'ユーザー名かパスワードが違います'],
  UserNotFoundException: [HttpStatus.UNAUTHORIZED, 'ユーザー名かパスワードが違います'],
  // 下の 2 つ（403・409）は「登録済み」だと分かってしまう。分かりやすさを優先して残している（本文の注意を参照）
  UserNotConfirmedException: [HttpStatus.FORBIDDEN, 'ユーザーの確認が済んでいません'],
  UsernameExistsException: [HttpStatus.CONFLICT, 'そのユーザー名は使われています'],
  InvalidPasswordException: [HttpStatus.BAD_REQUEST, 'パスワードがポリシーを満たしていません'],
  InvalidParameterException: [HttpStatus.BAD_REQUEST, '入力が正しくありません'],
  CodeMismatchException: [HttpStatus.BAD_REQUEST, '確認コードが違います'],
  ExpiredCodeException: [HttpStatus.BAD_REQUEST, '確認コードの期限が切れています'],
  TooManyRequestsException: [HttpStatus.TOO_MANY_REQUESTS, '時間をおいて試してください'],
  // User Pool やクライアントが無い。利用者のせいではなく API の設定の誤り（setup をやり直したのに
  // API を起動し直していない、など）なので 500 にし、どこを見ればよいかだけ伝える
  ResourceNotFoundException: [HttpStatus.INTERNAL_SERVER_ERROR, 'API の Cognito の設定が正しくありません'],
};

@Catch(CognitoIdentityProviderServiceException)
export class CognitoErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(CognitoErrorFilter.name);

  catch(error: CognitoIdentityProviderServiceException, host: ArgumentsHost) {
    const [status, message] = MAPPING[error.name] ?? [HttpStatus.BAD_GATEWAY, '認証基盤でエラーが起きました'];
    // 細かい理由はログにだけ残す
    this.logger.warn(`${error.name}: ${error.message}`);
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, message });
  }
}
