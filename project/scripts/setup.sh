#!/usr/bin/env bash
# Floci のデータはメモリにあり、止めると消える。ここまでのレクチャーで作ったものを、順に作り直す。
# レクチャーを 1 つ終えるたびに、そのレクチャーで作ったものを 1 行ずつ足していく。
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/create-user-pool.sh
bash scripts/create-users.sh # @since 01-02
bash scripts/create-groups.sh # @since 01-03
bash scripts/update-client.sh # @since 02-02
bash scripts/entra-register-app.sh # @since 03-01
bash scripts/entra-create-user.sh taro '山田 太郎' # @since 03-01
bash scripts/register-entra.sh # @since 03-02
