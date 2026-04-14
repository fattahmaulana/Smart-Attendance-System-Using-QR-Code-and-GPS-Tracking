/**
 * Menghitung jarak antara dua titik koordinat menggunakan formula Haversine.
 * Mengembalikan jarak dalam satuan meter.
 * 
 * @param lat1 Latitude titik pertama
 * @param lon1 Longitude titik pertama
 * @param lat2 Latitude titik kedua
 * @param lon2 Longitude titik kedua
 * @returns Jarak dalam meter
 */
export function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Jarak dalam meter
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Koordinat sekolah (Hardcoded sesuai permintaan)
export const SCHOOL_COORDS = {
  lat: -7.0170,
  lng: 110.3972
};

// Jarak maksimal yang diizinkan (meter)
export const MAX_DISTANCE_M = 50;
