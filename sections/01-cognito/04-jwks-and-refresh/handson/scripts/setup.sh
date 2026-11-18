#!/usr/bin/env bash
# Floci のデータはメモリにあり、止めると消える。ここまでのレクチャーで作ったものを、順に作り直す。
# レクチャーを 1 つ終えるたびに、そのレクチャーで作ったものを 1 行ずつ足していく。
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/create-user-pool.sh
bash scripts/create-users.sh
bash scripts/create-groups.sh
