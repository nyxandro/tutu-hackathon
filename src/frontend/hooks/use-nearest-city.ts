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

const EARTH_RADIUS_KM = 6371;

/** Расстояние по большому кругу: для выбора ближайшего города точности хватает. */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export type GeoStatus = 'idle' | 'asking' | 'done' | 'denied' | 'failed';

export function useNearestCity() {
  const [status, setStatus] = useState<GeoStatus>('idle');

  const detect = useCallback(async (): Promise<string | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('failed');
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
          if (!nearest || best > NEAREST_CITY_MAX_KM) {
            setStatus('failed');
            resolve(null);
            return;
          }

          setStatus('done');
          resolve(nearest.n);
        },
        (error) => {
          // Отказ в доступе — не ошибка приложения: человек просто не захотел.
          setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed');
          resolve(null);
        },
        { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 5 * 60 * 1000 },
      );
    });
  }, []);

  return { detect, status };
}
