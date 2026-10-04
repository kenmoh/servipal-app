import { mapboxClient } from "./client";

interface MapboxRoute {
  geometry: {
    coordinates: number[][];
    type: string;
  };
  distance: number;
  duration: number;
}

interface MapboxDirectionsResponse {
  routes: MapboxRoute[];
  waypoints: any[];
  code: string;
  uuid: string;
}

export const getDirections = async (
  origin: [number, number],
  destination: [number, number],
): Promise<{
  coordinates: [number, number][];
  distance: number;
  duration: number;
}> => {
  try {
    // origin/destination are [lat, lng] — Mapbox wants [lng, lat]
    const mapboxOrigin: [number, number] = [origin[1], origin[0]];
    const mapboxDestination: [number, number] = [
      destination[1],
      destination[0],
    ];

    const accessToken = process.env.EXPO_PUBLIC_MAPBOX_KEY;
    if (!accessToken) {
      return { coordinates: [], distance: 0, duration: 0 };
    }

    const path = `/directions/v5/mapbox/driving/${mapboxOrigin[0]},${mapboxOrigin[1]};${mapboxDestination[0]},${mapboxDestination[1]}`;

    const response = await mapboxClient.get<MapboxDirectionsResponse>(path, {
      access_token: accessToken,
      geometries: "geojson",
    });

    if (!response.ok) {
      return { coordinates: [], distance: 0, duration: 0 };
    }

    if (!response.data?.routes?.[0]) {
      return { coordinates: [], distance: 0, duration: 0 };
    }

    const route = response.data.routes[0];
    const coordinates = route.geometry.coordinates.map(
      (coord: number[]): [number, number] => [coord[1], coord[0]],
    );

    return {
      coordinates,
      distance: route.distance, // meters
      duration: route.duration, // seconds
    };
  } catch (error) {
    return { coordinates: [], distance: 0, duration: 0 };
  }
};

interface MapboxMatrixResponse {
  code: string;
  distances?: (number | null)[][] | null;
}

// Mapbox caps one matrix at 25 coordinates (origin counts as one).
const MAX_MATRIX_COORDINATES = 25;

/**
 * Road distance from one origin to many destinations in a single Matrix API
 * call — the batched sibling of getDirections, so a store list prices every
 * card without one Directions request per card.
 *
 * Returns meters per destination (same unit as getDirections), with `null`
 * for any pair Mapbox could not price. Every failure mode returns an empty
 * array so callers fall back to the straight-line distance instead of
 * breaking the list.
 */
export const getRouteMatrix = async (
  origin: [number, number],
  destinations: [number, number][],
): Promise<(number | null)[]> => {
  try {
    if (destinations.length === 0) return [];
    const accessToken = process.env.EXPO_PUBLIC_MAPBOX_KEY;
    if (!accessToken) return [];

    const dests = destinations.slice(0, MAX_MATRIX_COORDINATES - 1);
    const points = [origin, ...dests]
      // [lat, lng] in, [lng, lat] out — Mapbox coordinate order.
      .map(([lat, lng]) => `${lng},${lat}`)
      .join(";");

    const response = await mapboxClient.get<MapboxMatrixResponse>(
      `/directions-matrix/v1/mapbox/driving/${points}`,
      {
        access_token: accessToken,
        sources: "0",
        annotations: "distance",
      },
    );

    if (!response.ok) return [];
    const row = response.data?.distances?.[0];
    if (!row) return [];

    // With sources=0 the default destination list includes the origin itself
    // as column 0; some responses exclude it. Accept both shapes.
    const values = row.length === dests.length + 1 ? row.slice(1) : row;
    return values.map((meters) => (typeof meters === "number" ? meters : null));
  } catch {
    return [];
  }
};
