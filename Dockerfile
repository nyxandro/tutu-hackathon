# Сборка Next в standalone: на сервере остаётся только рантайм, без исходников
# и dev-зависимостей. Иначе образ весит втрое больше и дольше стартует.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# На сборке база не нужна, но модуль клиента падает без строки подключения:
# Next импортирует роуты, чтобы собрать их данные. Даём заглушку только для
# этой стадии, в рантайм она не попадает.
ENV DATABASE_URL="postgres://build:build@127.0.0.1:5432/build"
# Prisma генерирует клиент в src/lib/generated — без этого сборка не пройдёт.
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Схема и миграции нужны в рантайме: перед стартом накатываем их на базу.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3100
CMD ["node", "server.js"]
