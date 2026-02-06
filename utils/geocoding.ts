interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodingCache {
  [address: string]: {
    coordinates: Coordinates;
    timestamp: number;
  };
}

const geocodingCache: GeocodingCache = {};
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const getCoordinatesFromAddress = async (
  address: string
): Promise<Coordinates | null> => {
  // Check cache first
  const cached = geocodingCache[address];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.coordinates;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY}`
    );
    const data = await response.json();

    if (data.results?.[0]?.geometry?.location) {
      const coordinates = data.results[0].geometry.location;

      // Cache the result
      geocodingCache[address] = {
        coordinates,
        timestamp: Date.now(),
      };

      return coordinates;
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// interface Coordinates {
//   lat: number;
//   lng: number;
// }

// interface GeocodingCache {
//   [address: string]: {
//     coordinates: Coordinates;
//     timestamp: number;
//   };
// }

// const geocodingCache: GeocodingCache = {};
// const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// export const getCoordinatesFromAddress = async (
//   address: string
// ): Promise<Coordinates | null> => {
//   // 1. Check cache
//   const cached = geocodingCache[address];
//   if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
//     return cached.coordinates;
//   }

//   try {
//     const encodedAddress = encodeURIComponent(address);
//     const URL = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodedAddress}&access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&limit=1&country=NG`

//     const response = await fetch(URL);

//     const data = await response.json();

//     console.log(data.features?.[0]?.geometry?.coordinates, 'COORDS')

//     if (data.features?.[0]?.geometry?.coordinates) {
//       const [lng, lat] = data.features[0].geometry.coordinates;

//       const coordinates: Coordinates = { lat, lng };

//       // Cache the result
//       geocodingCache[address] = {
//         coordinates,
//         timestamp: Date.now(),
//       };

//       return coordinates;
//     }

//     return null;
//   } catch (error) {
//     console.error("Mapbox geocoding error:", error);
//     return null;
//   }
// };
