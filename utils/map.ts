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

interface MapboxRoute {
  geometry: {
    coordinates: number[][];
    type: string;
  };
  distance: number; // in meters
  duration: number; // in seconds
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
    const mapboxOrigin: [number, number] = [origin[1], origin[0]];
    const mapboxDestination: [number, number] = [
      destination[1],
      destination[0],
    ];

    const response = await mapboxClient.get<MapboxDirectionsResponse>(
      `/directions/v5/mapbox/driving/${mapboxOrigin[0]},${mapboxOrigin[1]};${mapboxDestination[0]},${mapboxDestination[1]}?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&geometries=geojson`,
    );

    if (!response.data?.routes?.[0]) {
      throw new Error("No route found");
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
    console.error("Error fetching directions:", "ERROR: ", error);
    return { coordinates: [], distance: 0, duration: 0 };
  }
};
