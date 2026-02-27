import { useLocationStore } from "@/store/locationStore";
import { getDirections } from "@/utils/map";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

// helper to format duration into hr/min
const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "" : ""}`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
};

const Map = ({ id, isPickedUp }: { id: string; isPickedUp: boolean }) => {
  const {
    originCoords,
    destinationCoords,
    origin,
    destination,
    riderLocation,
  } = useLocationStore();

  const [riderToOriginRoute, setRiderToOriginRoute] = useState<number[][]>([]);

  const showRider = riderLocation && riderLocation.deliveryId === id;

  const [route, setRoute] = useState<number[][]>([]);
  const [region, setRegion] = useState({
    latitude: 9.082,
    longitude: 8.6753,
    latitudeDelta: 5,
    longitudeDelta: 5,
  });

  const mapRef = useRef<MapView>(null);

  const [distance, setDistance] = useState(0); // in km
  const [duration, setDuration] = useState(""); // formatted

  useEffect(() => {
    const fetchRoute = async () => {
      if (originCoords && destinationCoords) {
        const result = await getDirections(originCoords, destinationCoords);

        setRoute(result.coordinates);
        setDistance(result.distance / 1000); // meters → km
        setDuration(formatDuration(result.duration)); // seconds → hr/min

        // Zoom to fit route
        const allCoords = [
          originCoords,
          destinationCoords,
          ...result.coordinates,
        ];
        if (showRider && riderLocation) {
          allCoords.push(riderLocation.coordinates);
        }

        const lats = allCoords.map((c) => c[0]);
        const lngs = allCoords.map((c) => c[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.5),
          longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.5),
        });
      }
    };
    fetchRoute();
  }, [originCoords, destinationCoords]);

  useEffect(() => {
    const fetchRiderRoute = async () => {
      if (showRider && riderLocation) {
        const target = isPickedUp ? destinationCoords : originCoords;
        if (target) {
          const result = await getDirections(riderLocation.coordinates, target);
          setRiderToOriginRoute(result.coordinates);
        } else {
          setRiderToOriginRoute([]);
        }
      } else {
        setRiderToOriginRoute([]);
      }
    };

    fetchRiderRoute();
  }, [riderLocation, originCoords, destinationCoords, showRider, isPickedUp]);

  // Auto-fit on rider updates without refetching main route
  useEffect(() => {
    const points: [number, number][] = [];
    if (originCoords) points.push(originCoords);
    if (destinationCoords) points.push(destinationCoords);
    if (route && route.length > 0) {
      route.forEach((coord) => {
        if (coord.length === 2) points.push(coord as [number, number]);
      });
    }
    if (riderLocation) points.push(riderLocation.coordinates);

    if (points.length >= 2) {
      const lats = points.map((p) => p[0]);
      const lngs = points.map((p) => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      setRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.5),
        longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.5),
      });
    }
  }, [riderLocation, originCoords, destinationCoords, route]);

  // useEffect(() => {
  //   const fetchRiderRoute = async () => {
  //     if (showRider && riderLocation) {
  //       const target = isPickedUp ? destinationCoords : originCoords;
  //       if (target) {
  //         const result = await getDirections(riderLocation.coordinates, target);
  //         setRiderToOriginRoute(result.coordinates);
  //       }
  //     } else {
  //       setRiderToOriginRoute([]);
  //     }
  //   };
  //   fetchRiderRoute();
  // }, [riderLocation, originCoords, destinationCoords, showRider, isPickedUp]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        mapType={"standard"}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        region={region}
      >
        {originCoords && (
          <Marker
            coordinate={{
              latitude: originCoords[0],
              longitude: originCoords[1],
            }}
            title={origin || "Origin"}
            description={origin || undefined}
            pinColor="teal"
          />
        )}
        {destinationCoords && (
          <Marker
            coordinate={{
              latitude: destinationCoords[0],
              longitude: destinationCoords[1],
            }}
            title={destination || "Destination"}
            description={destination || undefined}
            pinColor="red"
          />
        )}

        {showRider && (
          <Marker
            key={`${riderLocation.deliveryId}-${riderLocation.coordinates.join(",")}`}
            coordinate={{
              latitude: riderLocation.coordinates[0],
              longitude: riderLocation.coordinates[1],
            }}
            title="Rider"
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "rgba(128, 0, 128, 0.3)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "purple",
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "purple",
                }}
              />
            </View>
          </Marker>
        )}
        {route.length > 0 && (
          <Polyline
            coordinates={route.map((coord) => ({
              latitude: coord[0],
              longitude: coord[1],
            }))}
            strokeColor="blue"
            strokeWidth={4}
          />
        )}

        {riderToOriginRoute.length > 0 && (
          <Polyline
            coordinates={riderToOriginRoute.map((coord) => ({
              latitude: coord[0],
              longitude: coord[1],
            }))}
            strokeColor={isPickedUp ? "#10b981" : "#f59e0b"}
            strokeWidth={4}
            lineDashPattern={isPickedUp ? undefined : [10, 5]}
          />
        )}
      </MapView>

      {/* Overlay box for distance & duration */}
      {distance > 0 && duration && (
        <View style={styles.overlay}>
          <Text className="font-poppins text-sm text-white">
            Distance: {distance.toFixed(2)} km
          </Text>
          <Text className="font-poppins text-sm text-white">
            Duration: {duration}
          </Text>
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: "blue" }]} />
          <Text style={styles.legendText}>Job route</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: "#f59e0b" }]} />
          <Text style={styles.legendText}>To pickup</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: "#10b981" }]} />
          <Text style={styles.legendText}>To destination</Text>
        </View>
      </View>
    </View>
  );
};

export default Map;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 25,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  legend: {
    position: "absolute",
    bottom: 25,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  swatch: {
    width: 18,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    color: "white",
    marginLeft: 6,
    fontSize: 12,
  },
});
