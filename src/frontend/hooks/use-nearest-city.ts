/**
 * Определение города по геопозиции браузера.
 *
 * Ближайший город ищется по локальному справочнику — внешние геокодеры не
 * используются: лишняя зависимость на демо, а точности до города достаточно.
 *
 * Экспорты:
 * - useNearestCity() — запрос геопозиции и подбор города
 */

'use client';

import { useCallback, useState } from 'react';
import cities from '@/modules/routing/cities.json';
import { distanceKm } from '@/frontend/geo';
import {
  GEOLOCATION_TIMEOUT_MS,
  HUB_CITY_POPULATION,
  MAJOR_CITY_POPULATION,
  MAJOR_CITY_RADIUS_KM,
  NEAREST_CITY_MAX_KM,
} from '@/frontend/config';

type City = { n: string; r: string; p: number; lat?: number; lon?: number };

const WITH_COORDS = (cities as City[]).filter(
  (city): city is Required<City> => typeof city.lat === 'number' && typeof city.lon === 'number',
);

export type GeoStatus = 'idle' | 'asking' | 'done' | 'denied' | 'failed';

export type GeoResult = {
  city: string | null;
  /** Координаты человека: по ним считаем расстояние до гостиниц. */
  coords?: { lat: number; lon: number };
  /** Что показать человеку: определили город, отказал в доступе или не вышло. */
  message: string;
  /** Точность позиции в метрах: на десктопе она часто в километрах. */
  accuracyKm?: number;
};

export function useNearestCity() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [result, setResult] = useState<GeoResult | null>(null);

  const detect = useCallback(async (): Promise<string | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('failed');
      setResult({ city: null, message: 'Браузер не умеет определять положение' });
      return null;
    }

    setStatus('asking');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Ближайший город — не всегда правильный ответ: из Шереметьево
          // формально ближе Лобня, но человек там скажет «я в Москве», да и
          // билетов из Лобни почти нет. Поэтому крупный узел поблизости
          // важнее маленького города вплотную.
          const withDistance = WITH_COORDS.map((city) => ({
            city,
            km: distanceKm(latitude, longitude, city.lat, city.lon),
          }));

          const nearby = withDistance.filter(({ km }) => km <= MAJOR_CITY_RADIUS_KM);

          // Миллионник в радиусе побеждает: от Домодедово Подольск ближе Москвы,
          // но уезжают отсюда из Москвы. Затем — просто крупный город, и лишь
          // потом ближайший какой есть.
          const hub =
            nearby.filter(({ city }) => city.p >= HUB_CITY_POPULATION).sort((a, b) => a.km - b.km)[0] ??
            nearby.filter(({ city }) => city.p >= MAJOR_CITY_POPULATION).sort((a, b) => a.km - b.km)[0];

          const closest = withDistance.sort((a, b) => a.km - b.km)[0];
          const picked = hub ?? closest;
          const nearest = picked?.city ?? null;
          const best = picked?.km ?? Infinity;

          // Слишком далеко от любого города — значит справочник не поможет
          // (например, человек за границей), и подставлять наугад нельзя.
          const accuracyKm = position.coords.accuracy / 1000;

          if (!nearest || best > NEAREST_CITY_MAX_KM) {
            setStatus('failed');
            setResult({
              city: null,
              message: 'Рядом не нашлось знакомого города — введите вручную',
              accuracyKm,
            });
            resolve(null);
            return;
          }

          setStatus('done');
          setResult({
            city: nearest.n,
            coords: { lat: latitude, lon: longitude },
            // Точность стоит показать: на десктопе положение берётся по сети
            // и может промахнуться на сотни километров.
            message:
              accuracyKm > 50
                ? `Определили примерно: ${nearest.n}. Точность низкая, проверьте`
                : `Вы в городе ${nearest.n}`,
            accuracyKm,
          });
          resolve(nearest.n);
        },
        (error) => {
          // Отказ в доступе — не ошибка приложения: человек просто не захотел.
          const denied = error.code === error.PERMISSION_DENIED;
          setStatus(denied ? 'denied' : 'failed');
          setResult({
            city: null,
            message: denied
              ? 'Доступ к положению запрещён — введите город вручную'
              : 'Не удалось определить положение',
          });
          resolve(null);
        },
        {
          // На телефоне включает GPS вместо определения по сети. На десктопе
          // положение всё равно берётся по IP и Wi-Fi и может промахнуться
          // на сотни километров — поэтому рядом показываем точность.
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: 60_000,
        },
      );
    });
  }, []);

  return { detect, status, result };
}
