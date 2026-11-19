#!/usr/bin/env bash
# Floci のデータはメモリにあり、止めると消える。ここまでのレクチャーで作ったものを、順に作り直す。
# レクチャーを 1 つ終えるたびに、そのレクチャーで作ったものを 1 行ずつ足していく。
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/create-user-pool.sh
bash scripts/create-users.sh
bash scripts/create-groups.sh
bash scripts/update-client.sh
bash scripts/entra-register-app.sh
bash scripts/entra-create-user.sh taro '山田 太郎'
bash scripts/register-entra.sh
