import { GPSLocation } from '../types';

export class GPSService {
  /**
   * Calculates Haversine distance in meters between two coordinates.
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Radius of Earth in meters
    const toRad = (angle: number) => (angle * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Prompts browser Geolocation API with high accuracy options.
   */
  public static async getCurrentPosition(): Promise<GPSLocation> {
    if (!navigator.geolocation) {
      throw new Error('GPS/Geolocation tidak didukung oleh browser Anda.');
    }

    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Check for mock location indicator if provided by browser/device
          const coords = position.coords;
          // In some Chromium / Android WebView builds, 'mocked' or 'isMock' might be attached
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isMocked = (coords as any).isMock || (coords as any).mocked || false;

          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            altitude: coords.altitude,
            speed: coords.speed,
            heading: coords.heading,
            timestamp: position.timestamp,
            isMocked,
          });
        },
        (error) => {
          let message = 'Gagal memperoleh lokasi GPS.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Izin akses GPS ditolak. Silakan izinkan akses lokasi pada browser Anda.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Sinyal GPS tidak tersedia atau tidak akurat.';
              break;
            case error.TIMEOUT:
              message = 'Waktu permintaan lokasi GPS habis. Pastikan GPS perangkat aktif.';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  }

  /**
   * Evaluates location against school coordinate, radius, accuracy, and fake GPS signals.
   */
  public static evaluateLocation(
    loc: GPSLocation,
    schoolLat: number,
    schoolLon: number,
    maxRadiusMeters: number,
    lastKnownLocation?: { lat: number; lon: number; timestamp: number }
  ): {
    isValid: boolean;
    status: 'HADIR' | 'TERLAMBAT' | 'DI_LUAR_AREA' | 'GPS_TIDAK_VALID' | 'INDIKASI_FAKE_GPS';
    distance: number;
    notes: string[];
    isMockDetected: boolean;
  } {
    const notes: string[] = [];
    const distance = this.calculateHaversineDistance(
      loc.latitude,
      loc.longitude,
      schoolLat,
      schoolLon
    );

    let isMockDetected = Boolean(loc.isMocked);

    // Heuristics for Fake GPS / Mock Location in browser:
    // 1. Accuracy unrealistically 0 or perfect 1.0000 with speed 0 (common in some mock APKs)
    if (loc.accuracy === 0) {
      isMockDetected = true;
      notes.push('Nilai akurasi GPS 0 meter tidak wajar (indikasi generator mock)');
    }

    // 2. Impossibly high accuracy on web (e.g. < 0.1 meter without RTK GPS)
    if (loc.accuracy > 0 && loc.accuracy < 0.5) {
      notes.push('Akurasi sinyal terlalu presisi untuk perangkat mobile standar');
    }

    // 3. Teleportation / Speed Check: check movement speed from last check-in
    if (lastKnownLocation) {
      const timeDiffSeconds = Math.abs(loc.timestamp - lastKnownLocation.timestamp) / 1000;
      if (timeDiffSeconds > 0 && timeDiffSeconds < 3600) { // within an hour
        const distanceTravelled = this.calculateHaversineDistance(
          loc.latitude,
          loc.longitude,
          lastKnownLocation.lat,
          lastKnownLocation.lon
        );
        const speedKmh = (distanceTravelled / 1000) / (timeDiffSeconds / 3600);
        if (speedKmh > 300) { // faster than 300 km/h (teleportation)
          isMockDetected = true;
          notes.push(`Kecepatan perpindahan tidak masuk akal: ${Math.round(speedKmh)} km/jam`);
        }
      }
    }

    // 4. Accuracy too low (e.g. > 150m indicates cell tower triangulation, not real GPS)
    if (loc.accuracy > 150) {
      notes.push(`Akurasi GPS terlalu lemah (${Math.round(loc.accuracy)}m > 150m)`);
      return {
        isValid: false,
        status: 'GPS_TIDAK_VALID',
        distance,
        notes,
        isMockDetected,
      };
    }

    if (isMockDetected) {
      notes.push('Terdeteksi pola sinyal mencurigakan (Indikasi Fake GPS)');
      return {
        isValid: false,
        status: 'INDIKASI_FAKE_GPS',
        distance,
        notes,
        isMockDetected: true,
      };
    }

    // Check radius
    if (distance > maxRadiusMeters) {
      notes.push(`Di luar radius sekolah (${distance}m > ${maxRadiusMeters}m)`);
      return {
        isValid: false,
        status: 'DI_LUAR_AREA',
        distance,
        notes,
        isMockDetected: false,
      };
    }

    notes.push(`Berada di dalam radius sekolah (${distance}m <= ${maxRadiusMeters}m)`);
    return {
      isValid: true,
      status: 'HADIR',
      distance,
      notes,
      isMockDetected: false,
    };
  }
}
