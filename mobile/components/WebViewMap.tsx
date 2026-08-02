import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface Location {
  lat: number;
  lng: number;
}

interface WebViewMapProps {
  userLocation: Location | null;
  destinationLocation?: Location | null;
  driverLocation?: Location | null;
  isDarkMode?: boolean;
}

export default function WebViewMap({ 
  userLocation, 
  destinationLocation, 
  driverLocation, 
  isDarkMode = false 
}: WebViewMapProps) {
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; background: ${isDarkMode ? '#1a1a1a' : '#f8f9fa'}; }
        
        .car-icon {
          background-color: #2563eb; width: 35px; height: 35px; border-radius: 50%;
          display: flex; justify-content: center; align-items: center;
          border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); color: white;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const isDarkMode = ${isDarkMode};
        const tileUrl = isDarkMode 
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

        // Initialize Map
        const map = L.map('map', { zoomControl: false }).setView([24.7577, 92.7923], 15);
        L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

        // Icons
        const pickupIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41]
        });

        const destIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41]
        });

        const carHtml = '<div class="car-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>';
        const carIcon = L.divIcon({ html: carHtml, className: '', iconSize: [35, 35], iconAnchor: [17, 17] });

        // Markers & Polylines
        let userMarker = null;
        let destMarker = null;
        let driverMarker = null;
        let routeLine = null;

        // Exposed global functions for React Native to call via injectJavaScript
        window.updateLocations = (userStr, destStr, driverStr) => {
          const user = userStr ? JSON.parse(userStr) : null;
          const dest = destStr ? JSON.parse(destStr) : null;
          const driver = driverStr ? JSON.parse(driverStr) : null;

          const bounds = [];

          if (user) {
            if (!userMarker) userMarker = L.marker([user.lat, user.lng], { icon: pickupIcon }).addTo(map);
            else userMarker.setLatLng([user.lat, user.lng]);
            bounds.push([user.lat, user.lng]);
          } else if (userMarker) {
            map.removeLayer(userMarker); userMarker = null;
          }

          if (dest) {
            if (!destMarker) destMarker = L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(map);
            else destMarker.setLatLng([dest.lat, dest.lng]);
            bounds.push([dest.lat, dest.lng]);
          } else if (destMarker) {
            map.removeLayer(destMarker); destMarker = null;
          }

          if (driver) {
            if (!driverMarker) driverMarker = L.marker([driver.lat, driver.lng], { icon: carIcon }).addTo(map);
            else driverMarker.setLatLng([driver.lat, driver.lng]);
            bounds.push([driver.lat, driver.lng]);
          } else if (driverMarker) {
            map.removeLayer(driverMarker); driverMarker = null;
          }

          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [50, 50], duration: 1.5 });
          } else if (bounds.length === 1) {
            map.flyTo(bounds[0], 16, { duration: 1.5 });
          }
        };

        window.drawRoute = (routeCoordsStr) => {
          const coords = JSON.parse(routeCoordsStr);
          if (routeLine) {
            map.removeLayer(routeLine);
          }
          if (coords && coords.length > 0) {
            routeLine = L.polyline(coords, { color: isDarkMode ? '#60a5fa' : '#2563eb', weight: 4, dashArray: '10, 10' }).addTo(map);
          }
        };
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (!webViewRef.current) return;
    
    // Pass locations
    const userStr = userLocation ? JSON.stringify(userLocation) : 'null';
    const destStr = destinationLocation ? JSON.stringify(destinationLocation) : 'null';
    const driverStr = driverLocation ? JSON.stringify(driverLocation) : 'null';
    
    if (Platform.OS !== 'web') {
      webViewRef.current.injectJavaScript(
        `window.updateLocations('${userStr}', '${destStr}', '${driverStr}'); true;`
      );
    } else {
      // For web iframe
      const iframe = document.getElementById('map-iframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'updateLocations', userStr, destStr, driverStr }, '*');
      }
    }

    // Fetch Route if user and dest exist
    if (userLocation && destinationLocation) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destinationLocation.lng},${destinationLocation.lat}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          if (data.routes?.[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            if (Platform.OS !== 'web') {
              webViewRef.current?.injectJavaScript(`window.drawRoute('${JSON.stringify(coords)}'); true;`);
            } else {
              const iframe = document.getElementById('map-iframe') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'drawRoute', routeStr: JSON.stringify(coords) }, '*');
              }
            }
          }
        } catch (e) {
          console.error("Routing error:", e);
        }
      };
      fetchRoute();
    } else {
      if (Platform.OS !== 'web') {
        webViewRef.current?.injectJavaScript(`window.drawRoute('[]'); true;`);
      } else {
        const iframe = document.getElementById('map-iframe') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'drawRoute', routeStr: '[]' }, '*');
        }
      }
    }
  }, [userLocation, destinationLocation, driverLocation]);

  if (Platform.OS === 'web') {
    // Web requires a slightly modified HTML to listen for postMessage instead of injectJavaScript
    const webHtmlContent = htmlContent.replace(
      '// Exposed global functions for React Native to call via injectJavaScript',
      `// Listen for messages from React Native Web
      window.addEventListener('message', function(event) {
        if (event.data.type === 'updateLocations') {
          window.updateLocations(event.data.userStr, event.data.destStr, event.data.driverStr);
        } else if (event.data.type === 'drawRoute') {
          window.drawRoute(event.data.routeStr);
        }
      });
      // Exposed global functions`
    );

    return (
      <View style={styles.container}>
        <iframe 
          id="map-iframe"
          srcDoc={webHtmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => {
            const userStr = userLocation ? JSON.stringify(userLocation) : 'null';
            const destStr = destinationLocation ? JSON.stringify(destinationLocation) : 'null';
            const driverStr = driverLocation ? JSON.stringify(driverLocation) : 'null';
            const iframe = document.getElementById('map-iframe') as HTMLIFrameElement;
            iframe?.contentWindow?.postMessage({ type: 'updateLocations', userStr, destStr, driverStr }, '*');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  }
});
