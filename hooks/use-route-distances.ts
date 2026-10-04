import { useMemo } from "react";

import { fetchVendorPins } from "@/api/user";
import { useUserStore } from "@/store/userStore";
import { distanceCache } from "@/utils/distance-cache";
import { getRouteMatrix } from "@/utils/map";
import { useQuery } from "@tanstack/react-query";

const ROUTE_CACHE_MS = 30 * 60 * 1000;

/**
 * Road distance (km) from the current location to each given store, priced
 * through the Mapbox Matrix API so a whole list costs one call.
 *
 * Straight-line `distance_km` from the RPC stays on every card as the
 * fallback: a missing pin, a Matrix failure or no location permission all
 * degrade to the old number instead of blanking the list. Results are also
 * kept in `distanceCache` (30 min, GPS jitter tolerant), so search and
 * re-focus do not re-bill the same pairs.
 */
export const useRouteDistances = (
  vendorIds: string[],
  enabled: boolean = true,
): Record<string, number> => {
  const currentLocation = useUserStore((s) => s.currentLocation);

  // Callers pass a freshly mapped array every render; the joined string is
  // the stable identity React Query keys on.
  const idsKey = useMemo(() => [...vendorIds].sort().join("|"), [vendorIds]);

  const { data } = useQuery({
    queryKey: [
      "route-distances",
      currentLocation?.lat,
      currentLocation?.lng,
      idsKey,
    ],
    queryFn: async () => {
      const origin: [number, number] = [
        currentLocation!.lat,
        currentLocation!.lng,
      ];
      const ids = idsKey.split("|");
      const result: Record<string, number> = {};
      const pins = await fetchVendorPins(ids);

      const missing: { id: string; pin: [number, number] }[] = [];
      for (const id of ids) {
        const pin = pins[id];
        if (!pin) continue;
        const hit = distanceCache.get(origin[0], origin[1], pin[0], pin[1]);
        if (hit != null) {
          result[id] = hit;
        } else {
          missing.push({ id, pin });
        }
      }

      if (missing.length > 0) {
        const meters = await getRouteMatrix(
          origin,
          missing.map((m) => m.pin),
        );
        missing.forEach((m, index) => {
          const km = meters[index] != null ? meters[index]! / 1000 : null;
          if (km == null) return;
          distanceCache.set(origin[0], origin[1], m.pin[0], m.pin[1], km);
          result[m.id] = km;
        });
      }

      return result;
    },
    enabled:
      enabled && !!currentLocation && idsKey.length > 0,
    staleTime: ROUTE_CACHE_MS,
    gcTime: ROUTE_CACHE_MS,
    retry: false,
  });

  return data ?? {};
};
