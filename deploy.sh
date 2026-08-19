#!/usr/bin/env bash
# Деплой на сервер одной командой: заливаем исходники, собираем образ на месте
# и перезапускаем. Ключ и адрес берутся из переменных окружения, чтобы файл
# можно было держать в репозитории.
set -euo pipefail

SERVER="${DEPLOY_SERVER:-root@178.212.13.132}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/remote_vibe_station_root_2026-03-08}"
REMOTE_DIR="${DEPLOY_DIR:-/opt/kak-dobratsya}"

echo "→ Заливаю файлы на ${SERVER}:${REMOTE_DIR}"
ssh -i "$KEY" "$SERVER" "mkdir -p ${REMOTE_DIR}"

# node_modules, .next и .git не нужны: образ собирается на сервере с нуля.
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude 'src/lib/generated' --exclude '.env' \
  -e "ssh -i $KEY" ./ "${SERVER}:${REMOTE_DIR}/"

echo "→ Собираю образы"
ssh -i "$KEY" "$SERVER" "cd ${REMOTE_DIR} && docker compose -f compose.yml build"

echo "→ Поднимаю базу и накатываю миграции"
ssh -i "$KEY" "$SERVER" "cd ${REMOTE_DIR} && docker compose -f compose.yml up -d db && \
  docker build -q --target build -t kak-dobratsya-migrate . >/dev/null && \
  docker run --rm --network ${REMOTE_DIR##*/}_default --env-file .env \
    -e DATABASE_URL=\"postgres://tutu:\$(grep '^DB_PASSWORD=' .env | cut -d= -f2)@db:5432/tutu\" \
    kak-dobratsya-migrate npx prisma migrate deploy"

echo "→ Запускаю приложение"
ssh -i "$KEY" "$SERVER" "cd ${REMOTE_DIR} && docker compose -f compose.yml up -d"

echo "→ Готово. Состояние:"
ssh -i "$KEY" "$SERVER" "cd ${REMOTE_DIR} && docker compose ps"
