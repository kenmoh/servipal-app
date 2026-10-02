import type { Coordinates } from "@/store/locationStore";

const HAS_SRID = 0x20000000;

const readU32 = (view: DataView, offset: number, littleEndian: boolean) =>
  view.getUint32(offset, littleEndian);

/**
 * Decode a PostGIS `geography` value into `[lat, lng]`.
 *
 * PostgREST hands `profiles.location_coordinates` back as EWKB hex, which is
 * not JSON and cannot be split on a comma like the `"POINT(lng lat)"` string
 * the app writes. Returns null when the value is absent or unparseable so
 * callers fall back to withholding a route instead of guessing an origin.
 */
export const decodeGeography = (raw: unknown): Coordinates | null => {
  if (typeof raw !== "string" || raw.length < 2) return null;

  let bytes: Uint8Array;
  try {
    const hex = raw.startsWith("0x") || raw.startsWith("0X") ? raw.slice(2) : raw;
    if (hex.length % 2 !== 0) return null;
    bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
  } catch {
    return null;
  }

  if (bytes.length < 9) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const littleEndian = bytes[0] === 1;
  const geometryType = readU32(view, 1, littleEndian);
  let offset = 5;
  if ((geometryType & HAS_SRID) !== 0) offset += 4;

  const lng = view.getFloat64(offset, littleEndian);
  const lat = view.getFloat64(offset + 8, littleEndian);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return [lat, lng];
};
