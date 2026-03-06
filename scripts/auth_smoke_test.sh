#!/usr/bin/env bash

set -u

API_BASE="${API_BASE:-https://keskealsaydim.vercel.app}"
EMAIL="${EMAIL:-ahmet@ahmet.com}"
PASSWORD="${PASSWORD:-ahmet1907}"
NAME="${NAME:-Ahmet Test}"
EXPERIENCE="${EXPERIENCE:-BEGINNER}"

echo "API_BASE: $API_BASE"
echo "EMAIL:    $EMAIL"

register_payload="{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"experienceLevel\":\"$EXPERIENCE\"}"
login_payload="{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

register_resp="$(curl -sS -X POST "$API_BASE/api/auth?action=register" \
  -H "content-type: application/json" \
  --data-raw "$register_payload")"

echo "register response: $register_resp"

access_token="$(echo "$register_resp" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
refresh_token="$(echo "$register_resp" | sed -n 's/.*"refreshToken":"\([^"]*\)".*/\1/p')"

if [ -z "$access_token" ] || [ -z "$refresh_token" ]; then
  if echo "$register_resp" | grep -q "zaten kullanılıyor"; then
    echo "kullanıcı mevcut, login deneniyor..."
  else
    echo "register ile token alınamadı, login deneniyor..."
  fi

  login_resp="$(curl -sS -X POST "$API_BASE/api/auth?action=login" \
    -H "content-type: application/json" \
    --data-raw "$login_payload")"

  echo "login response: $login_resp"

  access_token="$(echo "$login_resp" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
  refresh_token="$(echo "$login_resp" | sed -n 's/.*"refreshToken":"\([^"]*\)".*/\1/p')"
fi

if [ -z "$access_token" ] || [ -z "$refresh_token" ]; then
  echo "❌ auth smoke başarısız: access/refresh token alınamadı"
  exit 1
fi

echo "✅ register/login başarılı"

refresh_payload="{\"refreshToken\":\"$refresh_token\"}"
refresh_resp="$(curl -sS -X POST "$API_BASE/api/auth?action=refresh" \
  -H "content-type: application/json" \
  --data-raw "$refresh_payload")"

echo "refresh response: $refresh_resp"

new_access="$(echo "$refresh_resp" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
new_refresh="$(echo "$refresh_resp" | sed -n 's/.*"refreshToken":"\([^"]*\)".*/\1/p')"

if [ -z "$new_access" ] || [ -z "$new_refresh" ]; then
  echo "❌ refresh başarısız"
  exit 1
fi

echo "✅ refresh başarılı"

logout_payload="{\"refreshToken\":\"$new_refresh\"}"
logout_status="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API_BASE/api/auth?action=logout" \
  -H "content-type: application/json" \
  -H "authorization: Bearer $new_access" \
  --data-raw "$logout_payload")"

if [ "$logout_status" = "204" ]; then
  echo "✅ logout başarılı"
  exit 0
fi

echo "❌ logout başarısız (status: $logout_status)"
exit 1
