import axiosInstance from "@/constants/api/axiosInstance";

export interface OlaAutocompleteSuggestion {
  id: string;
  title: string;
  description: string;
}

export interface OlaLocationData {
  address: string;
  city: string;
  pincode: string;
  landmark: string;
  lat: number;
  lng: number;
}

type AnyRecord = Record<string, any>;

type AddressComponent = {
  types?: string[];
  long_name?: string;
  short_name?: string;
};

function assertApiKey() {
  return;
}

function pickByTypes(components: AddressComponent[] | undefined, ...wantedTypes: string[]): string {
  if (!Array.isArray(components)) return "";
  for (const t of wantedTypes) {
    const hit = components.find((c) => (c.types || []).includes(t));
    if (hit?.long_name) return hit.long_name;
  }
  return "";
}

/** Parses Ola Places reverse/details result: formatted_address + address_components[]. */
function buildLocationDataFromOlaResult(
  result: AnyRecord,
  latFallback: number,
  lngFallback: number
): OlaLocationData {
  const loc = result?.geometry?.location ?? result?.location ?? {};
  const lat = Number(loc.lat ?? loc.latitude ?? latFallback);
  const lng = Number(loc.lng ?? loc.longitude ?? lngFallback);

  const formatted = String(
    result?.formatted_address ?? result?.address ?? result?.display_name ?? ""
  );
  const components = result?.address_components as AddressComponent[] | undefined;

  if (Array.isArray(components) && components.length > 0) {
    const city = pickByTypes(
      components,
      "locality",
      "sublocality_level_1",
      "administrative_area_level_3",
      "administrative_area_level_2"
    );
    const pincode = pickByTypes(components, "postal_code");
    const landmark = pickByTypes(
      components,
      "sublocality",
      "neighborhood",
      "premise",
      "route"
    );

    return {
      address: formatted,
      city,
      pincode,
      landmark,
      lat,
      lng,
    };
  }

  return parseOlaFlatPayload(result as AnyRecord, lat, lng);
}

/** Legacy flat payload (no address_components array). */
function parseOlaFlatPayload(payload: AnyRecord, lat: number, lng: number): OlaLocationData {
  const address = payload?.formatted_address || payload?.address || payload?.display_name || "";
  const city =
    payload?.city ||
    payload?.locality ||
    payload?.district ||
    payload?.state_district ||
    payload?.county ||
    "";
  const pincode = payload?.pincode || payload?.postal_code || payload?.postcode || "";
  const landmark = payload?.landmark || payload?.sublocality || payload?.sub_locality || "";

  return {
    address,
    city,
    pincode,
    landmark,
    lat,
    lng,
  };
}

export async function fetchOlaAutocomplete(
  query: string,
  signal?: AbortSignal
): Promise<OlaAutocompleteSuggestion[]> {
  assertApiKey();
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const response = await axiosInstance.get("/api/maps/autocomplete", {
    params: { q: trimmedQuery },
    signal,
  });
  const data = response.data;
  const predictions = data?.predictions || data?.results || data?.data || [];

  return predictions
    .map((item: AnyRecord) => ({
      id: String(item?.place_id || item?.id || item?.reference || ""),
      title: String(item?.structured_formatting?.main_text || item?.name || item?.title || ""),
      description: String(
        item?.description || item?.formatted_address || item?.vicinity || item?.subtitle || ""
      ),
    }))
    .filter((item: OlaAutocompleteSuggestion) => Boolean(item.id && item.title));
}

export async function fetchOlaPlaceDetails(
  placeId: string,
  signal?: AbortSignal
): Promise<OlaLocationData> {
  assertApiKey();
  const response = await axiosInstance.get(`/api/maps/place/${encodeURIComponent(placeId)}`, {
    signal,
  });
  const data = response.data;
  const place = data?.result || data?.data || data;
  const location = place?.geometry?.location || place?.location || {};
  const lat = Number(location?.lat ?? place?.lat ?? 0);
  const lng = Number(location?.lng ?? place?.lng ?? 0);

  return buildLocationDataFromOlaResult(place, lat, lng);
}

export async function reverseGeocodeWithOla(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<OlaLocationData> {
  assertApiKey();
  const response = await axiosInstance.get("/api/maps/reverse", {
    params: { lat, lng },
    signal,
  });
  const data = response.data;
  const result = data?.results?.[0] || data?.result || data?.data?.[0] || data;
  return buildLocationDataFromOlaResult(result, lat, lng);
}
