import { getUsCity } from "./us-cities";

export interface GlobeCity {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  name: string;
  state: string;
}

const DEVELOPMENT_GLOBE_CITIES: readonly GlobeCity[] = [
  {
    key: "99-00001",
    label: "Orlando, FL",
    latitude: 28.5383,
    longitude: -81.3792,
    name: "Orlando",
    state: "FL",
  },
  {
    key: "99-00002",
    label: "Santa Clara, CA",
    latitude: 37.3541,
    longitude: -121.9552,
    name: "Santa Clara",
    state: "CA",
  },
  {
    key: "99-00003",
    label: "New York, NY",
    latitude: 40.7128,
    longitude: -74.006,
    name: "New York",
    state: "NY",
  },
  {
    key: "99-00004",
    label: "Toronto, Canada",
    latitude: 43.6532,
    longitude: -79.3832,
    name: "Toronto",
    state: "Canada",
  },
  {
    key: "99-00005",
    label: "Mexico City, Mexico",
    latitude: 19.4326,
    longitude: -99.1332,
    name: "Mexico City",
    state: "Mexico",
  },
  {
    key: "99-00006",
    label: "São Paulo, Brazil",
    latitude: -23.5505,
    longitude: -46.6333,
    name: "São Paulo",
    state: "Brazil",
  },
  {
    key: "99-00007",
    label: "London, United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
    name: "London",
    state: "United Kingdom",
  },
  {
    key: "99-00008",
    label: "Lagos, Nigeria",
    latitude: 6.5244,
    longitude: 3.3792,
    name: "Lagos",
    state: "Nigeria",
  },
  {
    key: "99-00009",
    label: "Dubai, United Arab Emirates",
    latitude: 25.2048,
    longitude: 55.2708,
    name: "Dubai",
    state: "United Arab Emirates",
  },
  {
    key: "99-00010",
    label: "Bengaluru, India",
    latitude: 12.9716,
    longitude: 77.5946,
    name: "Bengaluru",
    state: "India",
  },
  {
    key: "99-00011",
    label: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    name: "Singapore",
    state: "Singapore",
  },
  {
    key: "99-00012",
    label: "Tokyo, Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    name: "Tokyo",
    state: "Japan",
  },
  {
    key: "99-00013",
    label: "Seoul, South Korea",
    latitude: 37.5665,
    longitude: 126.978,
    name: "Seoul",
    state: "South Korea",
  },
  {
    key: "99-00014",
    label: "Sydney, Australia",
    latitude: -33.8688,
    longitude: 151.2093,
    name: "Sydney",
    state: "Australia",
  },
] as const;

const developmentCitiesByKey = new Map(
  DEVELOPMENT_GLOBE_CITIES.map((city) => [city.key, city]),
);

export function getGlobeCity(
  key: string,
  options?: { includeDevelopmentPreview?: boolean },
): GlobeCity | null {
  const usCity = getUsCity(key);
  if (usCity) return usCity;
  // NODE_ENV is supplied by the runtime; importing the API's storage env here
  // would make this pure coordinate lookup depend on unrelated MinIO secrets.
  // eslint-disable-next-line no-restricted-properties
  const isDevelopment = process.env.NODE_ENV === "development";
  const includeDevelopmentPreview =
    options?.includeDevelopmentPreview ?? isDevelopment;
  if (!includeDevelopmentPreview) return null;
  return developmentCitiesByKey.get(key) ?? null;
}
