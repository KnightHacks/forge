import { KhixVenueMap } from "../../_components/khix-venue-map";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string | string[] }>;
}) {
  const { location } = await searchParams;
  return (
    <KhixVenueMap location={Array.isArray(location) ? location[0] : location} />
  );
}
