import * as Location from "expo-location";
import { create } from "zustand";

export type Coordinates = [number, number];

interface LocationStore {
  origin: string | null;
  destination: string | null;
  originCoords: Coordinates | null;
  userLocation: Coordinates | null;
  destinationCoords: Coordinates | null;
  riderLocation: {
    deliveryId: string;
    coordinates: Coordinates;
  } | null;

  reset: () => void;
  setOrigin: (address: string | null, coords: Coordinates | null) => void;
  setDestination: (address: string | null, coords: Coordinates | null) => void;
  setUserLocation: (coords: Coordinates | null) => void;
  getCurrentLocation: () => Promise<{
    coords: Coordinates;
    address: string;
  } | null>;

  setRiderLocation: (deliveryId: string, coords: Coordinates) => void;
  clearRiderLocation: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  origin: null,
  userLocation: null,
  destination: null,
  originCoords: null,
  destinationCoords: null,
  riderLocation: null,

  setOrigin: (address, coords) => {
    set({ origin: address, originCoords: coords });
  },
  setUserLocation: (coords) => {
    set({ userLocation: coords });
  },

  setDestination: (address, coords) => {
    set({ destination: address, destinationCoords: coords });
  },

  setRiderLocation: (deliveryId, coordinates) => {
    set((state) => {
      const newRiderLocation = { deliveryId, coordinates };
      return {
        ...state,
        riderLocation: newRiderLocation,
      };
    });
  },

  clearRiderLocation: () => {
    set({ riderLocation: null });
  },

  reset: () => {
    set({
      origin: null,
      destination: null,
      originCoords: null,
      destinationCoords: null,
    });
  },

  getCurrentLocation: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;

      const [result] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result) {
        const address = [
          result.name,
          result.streetNumber,
          result.street,
          result.district,
          result.city,
          result.region,
          result.country,
        ]
          .filter(Boolean)
          .filter(
            (part) =>
              typeof part === "string" && part.toLowerCase() !== "nigeria",
          )
          .join(", ");

        return {
          coords: [latitude, longitude] as Coordinates,
          address,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting location:", error);
      return null;
    }
  },
}));

// import { create } from "zustand";
// import * as Location from "expo-location";

// interface LocationStore {
//   origin: string | null;
//   destination: string | null;
//   originCoords: [number, number] | null;
//   destinationCoords: [number, number] | null;
//   riderLocation: {
//     deliveryId: string;
//     coordinates: [number, number];
//   } | null;

//   reset: () => void;
//   setOrigin: (address: string | null, coords: [number, number] | null) => void;
//   setDestination: (
//     address: string | null,
//     coords: [number, number] | null
//   ) => void;
//   getCurrentLocation: () => Promise<{
//     coords: [number, number];
//     address: string;
//   } | null>;

//   setRiderLocation: (deliveryId: string, coords: [number, number]) => void;
//   clearRiderLocation: () => void;
// }

// export const useLocationStore = create<LocationStore>((set) => ({
//   origin: null,
//   destination: null,
//   originCoords: null,
//   destinationCoords: null,
//   riderLocation: null,

//   setOrigin: (address, coords) => {
//     set({ origin: address, originCoords: coords });
//   },

//   setDestination: (address, coords) => {
//     set({ destination: address, destinationCoords: coords });
//   },

//   // setRiderLocation: (deliveryId, coordinates) => {
//   //   set({ riderLocation: { deliveryId, coordinates } });
//   // },

// setRiderLocation: (deliveryId, coordinates) => {
//   set((state) => ({
//     riderLocation: { deliveryId, coordinates }
//   }));
// },
//   clearRiderLocation: () => {
//     set({ riderLocation: null });
//   },
//   reset: () => {
//     set({
//       origin: null,
//       destination: null,
//       originCoords: null,
//       destinationCoords: null,
//     });
//   },

//   getCurrentLocation: async () => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") return null;

//       const location = await Location.getCurrentPositionAsync({});
//       const { latitude, longitude } = location.coords;

//       const [result] = await Location.reverseGeocodeAsync({
//         latitude,
//         longitude,
//       });

//       if (result) {
//         const address = [
//           result.street,
//           result.district,
//           result.city,
//           result.region,
//           result.country,
//         ]
//           .filter(Boolean)
//           .filter(
//             (part) =>
//               typeof part === "string" && part.toLowerCase() !== "nigeria"
//           )
//           .join(", ");

//         return {
//           coords: [latitude, longitude],
//           address,
//         };
//       }
//       return null;
//     } catch (error) {
//       console.error("Error getting location:", error);
//       return null;
//     }
//   },
// }));
