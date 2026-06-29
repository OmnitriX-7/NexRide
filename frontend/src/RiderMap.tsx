import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + React
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// --- COMPONENT: SMART BOUNDS & RECENTERING ---
const MapController = ({ userLoc, driverLoc, destLoc }: { 
  userLoc: { lat: number; lng: number } | null, 
  driverLoc?: { lat: number; lng: number } | null,
  destLoc?: { lat: number; lng: number } | null 
}) => {
  const map = useMap();

  useEffect(() => {
    if (!userLoc) return;

    // If we have a driver and a user, fit the map to show both
    if (driverLoc) {
      const bounds = L.latLngBounds(
        [userLoc.lat, userLoc.lng],
        [driverLoc.lat, driverLoc.lng]
      );
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    } 
    // If no driver but we have a destination, show the full route
    else if (destLoc) {
      const bounds = L.latLngBounds(
        [userLoc.lat, userLoc.lng],
        [destLoc.lat, destLoc.lng]
      );
      map.flyToBounds(bounds, { padding: [80, 80], duration: 1.5 });
    }
    // Otherwise, just center on the user
    else {
      map.flyTo([userLoc.lat, userLoc.lng], 16);
    }
  }, [userLoc, driverLoc, destLoc, map]);

  return null;
};

// --- CUSTOM ICONS ---
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41]
});

// Modern Car Icon
const carIcon = new L.DivIcon({
  html: `<div style="
    background-color: #2563eb; 
    width: 35px; 
    height: 35px; 
    border-radius: 50%; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    border: 3px solid white; 
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    color: white;
  ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [35, 35],
  iconAnchor: [17, 17],
});

interface RiderMapProps {
  userLocation: { lat: number; lng: number } | null;
  destinationLocation?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  isDarkMode: boolean;
}

export default function RiderMap({ 
  userLocation, 
  destinationLocation, 
  driverLocation, 
  isDarkMode 
}: RiderMapProps) {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const defaultPosition: [number, number] = [24.7577, 92.7923]; 

  // Fetch Route Logic (OSRM)
  useEffect(() => {
    if (userLocation && destinationLocation) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destinationLocation.lng},${destinationLocation.lat}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          if (data.routes?.[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            setRoutePoints(coords);
          }
        } catch (e) {
          console.error("Routing error:", e);
        }
      };
      fetchRoute();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoutePoints([]);
    }
  }, [userLocation, destinationLocation]);

  return (
    <div style={{ height: '100%', width: '100%', zIndex: 0 }}>
      <MapContainer 
        center={userLocation ? [userLocation.lat, userLocation.lng] : defaultPosition} 
        zoom={15} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} 
      >
        <TileLayer
          url={isDarkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />

        {/* This component handles all the automatic movement/zooming */}
        <MapController 
          userLoc={userLocation} 
          driverLoc={driverLocation} 
          destLoc={destinationLocation} 
        />

        {/* TRIP ROUTE LINE */}
        {routePoints.length > 0 && (
          <Polyline 
            positions={routePoints} 
            color="#2563eb" 
            weight={6} 
            opacity={0.6} 
            lineCap="round"
          />
        )}

        {/* RIDER PICKUP MARKER */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={pickupIcon}>
            <Popup>Pickup Point</Popup>
          </Marker>
        )}

        {/* DESTINATION MARKER */}
        {destinationLocation && (
          <Marker position={[destinationLocation.lat, destinationLocation.lng]} icon={destinationIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {/* LIVE DRIVER CAR MARKER */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
            <Popup>Your Driver</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}