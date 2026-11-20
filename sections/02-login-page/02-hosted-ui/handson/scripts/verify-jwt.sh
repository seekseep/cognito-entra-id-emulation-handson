#!/usr/bin/env bash
# JWKS を取ってきて、JWT の署名・発行者・有効期限を確かめる。
# 使い方: bash scripts/verify-jwt.sh <token>
# 別の User Pool で確かめたいときは POOL_ID=<プール ID> を付けて実行する（付けた値が .cognito.env より優先）
set -euo pipefail
cd "$(dirname "$0")/.."
GIVEN_POOL_ID=${POOL_ID:-}
source ./env.sh
source ./.cognito.env
POOL_ID=${GIVEN_POOL_ID:-$POOL_ID}

TOKEN=${1:?使い方: npm run verify <トークン>}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

ng() { echo "NG: $*" >&2; exit 1; }
# base64url → バイト列。+ と / に戻し、= で 4 の倍数の長さにそろえてから戻す
b64url_decode() {
  local s
  s=$(printf '%s' "$1" | tr '_-' '/+')
  while (( ${#s} % 4 )); do s+='='; done
  printf '%s' "$s" | openssl base64 -d -A
}
# base64url → 16 進の文字列（鍵の数を openssl に渡すため）
b64url_hex() { b64url_decode "$1" | od -An -v -tx1 | tr -d ' \n'; }

IFS=. read -r HEADER PAYLOAD SIGNATURE <<< "$TOKEN"
[[ -n ${SIGNATURE:-} ]] || ng "JWT の形（ヘッダー.ペイロード.署名）になっていません"

# Floci の iss は http://localhost:4566/<プール ID>。本物なら https://cognito-idp.<region>.amazonaws.com/<プール ID>
# トークンの中の iss ではなく、自分の User Pool から組み立てる
ISSUER="$AWS_ENDPOINT_URL/$POOL_ID"

# 1. 鍵を選ぶ。鍵の在りかは discovery（<iss>/.well-known/openid-configuration）が教えてくれる
JWKS_URI=$(curl -fsS "$ISSUER/.well-known/openid-configuration" | jq -r .jwks_uri) \
  || ng "discovery を読めませんでした（$ISSUER）"
ALG=$(b64url_decode "$HEADER" | jq -r .alg)
KID=$(b64url_decode "$HEADER" | jq -r .kid)
[[ $ALG == RS256 ]] || ng "alg が RS256 ではありません（$ALG）"
JWK=$(curl -fsS "$JWKS_URI" | jq -c --arg kid "$KID" '.keys[] | select(.kid == $kid)')
[[ -n $JWK ]] || ng "JWKS に kid が $KID の鍵がありません"

# 2. 署名を確かめる。JWK（n と e）から openssl が読める公開鍵（PEM）を組み立て、
#    「ヘッダー.ペイロード」の SHA-256 と署名が合うかを見る
cat > "$WORK/key.conf" <<CONF
asn1 = SEQUENCE:public_key
[public_key]
algorithm = SEQUENCE:rsa_algorithm
key = BITWRAP,SEQUENCE:rsa_key
[rsa_algorithm]
oid = OID:rsaEncryption
parameters = NULL
[rsa_key]
n = INTEGER:0x$(b64url_hex "$(jq -r .n <<< "$JWK")")
e = INTEGER:0x$(b64url_hex "$(jq -r .e <<< "$JWK")")
CONF
openssl asn1parse -genconf "$WORK/key.conf" -noout -out "$WORK/key.der"
openssl pkey -pubin -inform DER -in "$WORK/key.der" -out "$WORK/key.pem"
printf '%s' "$HEADER.$PAYLOAD" > "$WORK/signed"
b64url_decode "$SIGNATURE" > "$WORK/signature"
openssl dgst -sha256 -verify "$WORK/key.pem" -signature "$WORK/signature" "$WORK/signed" > /dev/null 2>&1 \
  || ng "署名が合いません（中身が書き換えられています）"

# 3. 署名が正しいと分かったので、中身（iss と exp）を信じて確かめる
CLAIMS=$(b64url_decode "$PAYLOAD")
[[ $(jq -r .iss <<< "$CLAIMS") == "$ISSUER" ]] || ng "iss が自分の User Pool ではありません（$(jq -r .iss <<< "$CLAIMS")）"
(( $(jq -r .exp <<< "$CLAIMS") > $(date +%s) )) || ng "有効期限（exp）を過ぎています"

echo "OK: 署名と iss と exp を確かめました"
jq --arg kid "$KID" '{ kid: $kid, token_use, sub }' <<< "$CLAIMS"
