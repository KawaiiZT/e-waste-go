import { useEffect, useMemo, useState } from "react";
import { divIcon, LatLngBounds } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Crosshair, ExternalLink, LoaderCircle, MapPin, Navigation } from "lucide-react";

import type { Coordinates } from "@/types";

const DEFAULT_CENTER: Coordinates = { lat: 13.7563, lng: 100.5018 };

const pickupIcon = divIcon({ className: "map-pin-icon pickup", html: '<span aria-hidden="true"></span>', iconSize: [34, 42], iconAnchor: [17, 40] });
const depotIcon = divIcon({ className: "map-pin-icon depot", html: '<span aria-hidden="true"></span>', iconSize: [34, 42], iconAnchor: [17, 40] });

function MapClick({ onSelect }: { onSelect: (coordinates: Coordinates) => void }) {
  useMapEvents({ click: (event) => onSelect({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function Recenter({ coordinates }: { coordinates: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) map.flyTo([coordinates.lat, coordinates.lng], Math.max(map.getZoom(), 16), { duration: .7 });
  }, [coordinates, map]);
  return null;
}

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(new LatLngBounds(points), { padding: [34, 34] });
  }, [map, points]);
  return null;
}

export function LocationPicker({ value, onChange }: { value: Coordinates | null; onChange: (coordinates: Coordinates) => void }) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setLocationError("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาต Location หรือกดเลือกบนแผนที่");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  return (
    <div className="location-picker">
      <div className="map-toolbar">
        <div><strong>เลือกจุดรับบนแผนที่ *</strong><small>กดบนแผนที่ให้ตรงกับจุดที่ต้องการให้เข้ารับ</small></div>
        <button type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? <LoaderCircle className="spin" /> : <Crosshair />} ใช้ตำแหน่งปัจจุบัน</button>
      </div>
      <div className="map-frame location-map">
        <MapContainer center={[value?.lat ?? DEFAULT_CENTER.lat, value?.lng ?? DEFAULT_CENTER.lng]} zoom={value ? 16 : 11} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClick onSelect={onChange} />
          <Recenter coordinates={value} />
          {value && <Marker position={[value.lat, value.lng]} icon={pickupIcon} />}
        </MapContainer>
        {!value && <div className="map-empty-hint"><MapPin /><span>เลือกตำแหน่งบนแผนที่</span></div>}
      </div>
      <div className="coordinate-row">
        {value ? <><span><MapPin /> เลือกจุดรับแล้ว</span><code>{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</code></> : <span className="not-selected"><MapPin /> ยังไม่ได้เลือกตำแหน่ง</span>}
      </div>
      {locationError && <p className="map-error">{locationError}</p>}
    </div>
  );
}

function getDepot(): (Coordinates & { name: string }) | null {
  const rawLat = import.meta.env.VITE_DEPOT_LAT?.trim();
  const rawLng = import.meta.env.VITE_DEPOT_LNG?.trim();
  if (!rawLat || !rawLng) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng, name: import.meta.env.VITE_DEPOT_NAME || "จุดเริ่มต้นของทีมรับขยะ" };
}

export function RouteMap({ destination }: { destination: Coordinates | null }) {
  const depot = useMemo(getDepot, []);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    if (!destination || !depot) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setRouteError("");
    const url = `https://router.project-osrm.org/route/v1/driving/${depot.lng},${depot.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    void fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("route unavailable");
        return response.json() as Promise<{ routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }> }>;
      })
      .then((result) => {
        const firstRoute = result.routes?.[0];
        if (!firstRoute) throw new Error("route unavailable");
        setRoute(firstRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        setDistance(firstRoute.distance);
        setDuration(firstRoute.duration);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") setRouteError("โหลดเส้นทางไม่สำเร็จ กรุณาลองเปิดแผนที่ภายนอก");
        else setRouteError("ยังไม่สามารถคำนวณเส้นทางได้");
      })
      .finally(() => { window.clearTimeout(timeout); setLoading(false); });
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [depot, destination]);

  if (!destination) return <div className="route-unavailable"><MapPin /><span><strong>ยังไม่มีพิกัดจุดรับ</strong><small>รายการเก่าที่สร้างก่อนอัปเดตระบบจะยังไม่มีแผนที่</small></span></div>;

  const center = depot ? { lat: (depot.lat + destination.lat) / 2, lng: (depot.lng + destination.lng) / 2 } : destination;
  const osmUrl = depot
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${depot.lat}%2C${depot.lng}%3B${destination.lat}%2C${destination.lng}`
    : `https://www.openstreetmap.org/?mlat=${destination.lat}&mlon=${destination.lng}#map=17/${destination.lat}/${destination.lng}`;

  return (
    <div className="route-map-block">
      <div className="route-summary">
        <div><Navigation /><span><small>เส้นทางเข้ารับ</small><strong>{depot ? `${depot.name} → จุดรับ` : "จุดรับของผู้ใช้"}</strong></span></div>
        {distance !== null && duration !== null && <div className="route-metrics"><span>{(distance / 1000).toFixed(1)} กม.</span><span>ประมาณ {Math.max(1, Math.round(duration / 60))} นาที</span></div>}
      </div>
      <div className="map-frame route-map">
        <MapContainer center={[center.lat, center.lng]} zoom={depot ? 12 : 16} scrollWheelZoom={false}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {depot && <Marker position={[depot.lat, depot.lng]} icon={depotIcon} />}
          <Marker position={[destination.lat, destination.lng]} icon={pickupIcon} />
          {route.length > 1 && <><Polyline positions={route} pathOptions={{ color: "#0ca956", weight: 6, opacity: .9 }} /><FitRoute points={route} /></>}
        </MapContainer>
        {loading && <div className="map-loading"><LoaderCircle className="spin" /> กำลังคำนวณเส้นทาง</div>}
      </div>
      {!depot && <p className="route-note">ตั้งค่า VITE_DEPOT_LAT และ VITE_DEPOT_LNG ใน Vercel เพื่อแสดงเส้นทางจากศูนย์รับ</p>}
      {routeError && <p className="route-note warning">{routeError}</p>}
      <a className="external-map-link" href={osmUrl} target="_blank" rel="noreferrer"><ExternalLink /> เปิดแผนที่ขนาดเต็ม</a>
    </div>
  );
}
