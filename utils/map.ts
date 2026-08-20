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
