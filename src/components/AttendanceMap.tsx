import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface AttendanceMapProps {
  schoolLat: number;
  schoolLng: number;
  radiusMeters: number;
  schoolName: string;
  userLat?: number;
  userLng?: number;
  accuracy?: number;
  height?: string;
  isPickerMode?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export const AttendanceMap: React.FC<AttendanceMapProps> = ({
  schoolLat,
  schoolLng,
  radiusMeters,
  schoolName,
  userLat,
  userLng,
  accuracy,
  height = '320px',
  isPickerMode = false,
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    schoolMarker?: L.Marker;
    circle?: L.Circle;
    userMarker?: L.Marker;
    userCircle?: L.Circle;
    polyline?: L.Polyline;
  }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [schoolLat, schoolLng],
        zoom: 17,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap kontributor',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      if (isPickerMode && onLocationSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous dynamic layers
    if (layersRef.current.schoolMarker) map.removeLayer(layersRef.current.schoolMarker);
    if (layersRef.current.circle) map.removeLayer(layersRef.current.circle);
    if (layersRef.current.userMarker) map.removeLayer(layersRef.current.userMarker);
    if (layersRef.current.userCircle) map.removeLayer(layersRef.current.userCircle);
    if (layersRef.current.polyline) map.removeLayer(layersRef.current.polyline);

    // School Custom Icon (Green School Pin)
    const schoolIcon = L.divIcon({
      className: 'custom-school-icon',
      html: `
        <div style="background-color: #2563eb; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 3px solid white;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m4 6 8-4 8 4" /><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" /><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" /><path d="M18 5v17" /><path d="M6 5v17" /><circle cx="12" cy="9" r="2" />
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const schoolMarker = L.marker([schoolLat, schoolLng], { icon: schoolIcon }).addTo(map);
    schoolMarker.bindPopup(`<b>${schoolName}</b><br/>Pusat Radius Absensi`).openPopup();
    layersRef.current.schoolMarker = schoolMarker;

    // Radius Circle
    const circle = L.circle([schoolLat, schoolLng], {
      color: '#3b82f6',
      fillColor: '#60a5fa',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '4, 6',
      radius: radiusMeters,
    }).addTo(map);
    layersRef.current.circle = circle;

    // User Location Marker if available
    if (userLat !== undefined && userLng !== undefined) {
      const userIcon = L.divIcon({
        className: 'custom-user-icon',
        html: `
          <div style="background-color: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 3px solid white; animation: pulse 2s infinite;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
      userMarker.bindPopup(`<b>Lokasi Anda</b><br/>Akurasi: ±${accuracy ? Math.round(accuracy) : 0}m`);
      layersRef.current.userMarker = userMarker;

      // Accuracy bubble
      if (accuracy && accuracy > 0) {
        const userCircle = L.circle([userLat, userLng], {
          color: '#10b981',
          fillColor: '#34d399',
          fillOpacity: 0.12,
          weight: 1,
          radius: accuracy,
        }).addTo(map);
        layersRef.current.userCircle = userCircle;
      }

      // Connecting line
      const polyline = L.polyline(
        [
          [schoolLat, schoolLng],
          [userLat, userLng],
        ],
        {
          color: '#0284c7',
          weight: 3,
          dashArray: '5, 8',
        }
      ).addTo(map);
      layersRef.current.polyline = polyline;

      // Fit bounds to show both school and user
      const group = new L.FeatureGroup([schoolMarker, userMarker, circle]);
      map.fitBounds(group.getBounds().pad(0.2));
    } else {
      map.setView([schoolLat, schoolLng], 17);
    }
  }, [schoolLat, schoolLng, radiusMeters, schoolName, userLat, userLng, accuracy, isPickerMode, onLocationSelect]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      {isPickerMode && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs font-medium text-slate-700 pointer-events-none z-[1000]">
          💡 Klik pada peta untuk memindahkan titik koordinat sekolah
        </div>
      )}
    </div>
  );
};
