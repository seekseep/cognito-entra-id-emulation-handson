# aws CLI と SDK の向き先を Floci に変える。`source ./env.sh` で読み込む。
# Floci は認証情報の中身を確かめないので、キーはダミーでよい（本物のキーを入れない）。
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=ap-northeast-1
export AWS_PAGER=""
