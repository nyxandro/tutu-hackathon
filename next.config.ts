import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в отдельную папку со своим сервером: в образ уезжает только
  // рантайм, без исходников и dev-зависимостей.
  output: 'standalone',
};

export default nextConfig;
