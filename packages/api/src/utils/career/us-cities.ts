import { US_CITIES_2025 } from "../../data/us-cities-2025";

export interface UsCity {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  name: string;
  state: string;
}

const cities: UsCity[] = US_CITIES_2025.map(
  ([key, name, state, latitude, longitude]) => ({
    key,
    label: `${name}, ${state}`,
    latitude,
    longitude,
    name,
    state,
  }),
);

const citiesByKey = new Map(cities.map((city) => [city.key, city]));

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchUsCities(query: string, limit: number) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];

  const terms = normalized.split(" ");
  return cities
    .filter((city) => {
      const haystack = normalizeSearch(`${city.name} ${city.state}`);
      return terms.every((term) => haystack.includes(term));
    })
    .sort((first, second) => {
      const firstName = normalizeSearch(first.name);
      const secondName = normalizeSearch(second.name);
      const firstExact = firstName === normalized ? 0 : 1;
      const secondExact = secondName === normalized ? 0 : 1;
      return (
        firstExact - secondExact ||
        firstName.localeCompare(secondName) ||
        first.state.localeCompare(second.state)
      );
    })
    .slice(0, Math.max(0, limit));
}

export function getUsCity(key: string) {
  return citiesByKey.get(key) ?? null;
}

export function hasUsCity(key: string) {
  return citiesByKey.has(key);
}
