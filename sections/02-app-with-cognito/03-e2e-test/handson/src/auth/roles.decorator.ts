import { Reflector } from '@nestjs/core';

// @Roles('admin') と書いたハンドラは、そのグループの利用者だけが呼べる
export const Roles = Reflector.createDecorator<string[]>();
