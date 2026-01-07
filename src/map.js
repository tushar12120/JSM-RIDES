
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { supabase } from './supabase.js';

// Fix for Leaflet missing marker icons in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});


let map;
let pickupMarker;
let dropMarker;
let driverMarkers = {};

const JAISALMER_COORDS = [26.9157, 70.9083];

export function initMap() {
    if (map) return;

    // Base Layers
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USGS'
    });

    map = L.map('map', {
        zoomControl: false,
        layers: [satelliteLayer] // Default to Satellite (matches OSM better)
    }).setView(JAISALMER_COORDS, 14);

    // Layer Control
    const baseMaps = {
        "Satellite": satelliteLayer,
        "Dark Mode": darkLayer
    };
    L.control.layers(baseMaps).addTo(map);

    // Re-add Zoom Control to bottom-right

    // Re-add Zoom Control to bottom-right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Map Click Logic
    map.on('click', (e) => {
        handleMapClick(e.latlng);
    });

    fetchDrivers();
    subscribeToDrivers();

    // Reset Listener
    document.getElementById('btn-reset-booking')?.addEventListener('click', resetMap);

    // Locate Me Listener
    document.getElementById('btn-locate')?.addEventListener('click', () => {
        map.locate({ setView: true, maxZoom: 16 });
    });

    // Auto locate on load - DISABLED (User feedback: Inaccurate on Desktop)
    // map.locate({setView: true, maxZoom: 16});

    map.on('locationfound', onLocationFound);
    map.on('locationerror', () => {
        // Fallback to Jaisalmer if denied/error
        // showToast('Location access denied. Centered on Jaisalmer.', 'info'); 
        // Logic already defaults to Jaisalmer on init
    });
}

let userMarker;

function onLocationFound(e) {
    const radius = e.accuracy / 2;

    if (userMarker) {
        userMarker.setLatLng(e.latlng);
        userMarker.setRadius(radius);
    } else {
        userMarker = L.circle(e.latlng, {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            radius: radius
        }).addTo(map);

        L.circleMarker(e.latlng, {
            color: '#fff',
            fillColor: '#3388ff',
            fillOpacity: 1,
            radius: 8,
            weight: 3
        }).addTo(map);
    }
}


export function resetMap() {
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropMarker) map.removeLayer(dropMarker);
    if (routingControl) map.removeControl(routingControl);

    pickupMarker = null;
    dropMarker = null;
    routingControl = null;

    document.getElementById('pickup-input').value = '';
    document.getElementById('drop-input').value = '';
    document.getElementById('booking-container').classList.add('hidden');
    document.getElementById('vehicle-selection').classList.add('hidden');
}

function handleMapClick(latlng) {
    const pickupInput = document.getElementById('pickup-input');
    const dropInput = document.getElementById('drop-input');
    const bookingContainer = document.getElementById('booking-container');

    if (!pickupMarker) {
        // Set Pickup
        pickupMarker = createCustomMarker(latlng, 'gold');
        pickupInput.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;

        // Listen for drag
        pickupMarker.on('dragend', () => {
            pickupInput.value = `${pickupMarker.getLatLng().lat.toFixed(4)}, ${pickupMarker.getLatLng().lng.toFixed(4)}`;
            notifyLocationChange();
            drawRoute();
        });

        bookingContainer.classList.remove('hidden'); // Show panel

    } else if (!dropMarker) {
        // Set Drop
        dropMarker = createCustomMarker(latlng, 'red');
        dropInput.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;

        // Listen for drag
        dropMarker.on('dragend', () => {
            dropInput.value = `${dropMarker.getLatLng().lat.toFixed(4)}, ${dropMarker.getLatLng().lng.toFixed(4)}`;
            notifyLocationChange();
            drawRoute();
        });

        document.getElementById('vehicle-selection').classList.remove('hidden');
        notifyLocationChange();
        drawRoute(); // Initial draw on drop set
        fitMapBounds();
        map.panBy([0, 100]);

    } else {
        // Both exist: Move Drop Marker
        dropMarker.setLatLng(latlng);
        dropInput.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
        notifyLocationChange();
        drawRoute();
    }
    // Vehicle Selection Listener (Switch Profiles)
    window.addEventListener('vehicle-selected', (e) => {
        const type = e.detail.type;
        const newProfile = (type === 'bike') ? 'foot' : 'driving'; // Use 'foot' for narrow alleys for Bike

        if (currentProfile !== newProfile) {
            currentProfile = newProfile;

            // Show Feedback
            const modeName = (newProfile === 'foot') ? 'Bike (Narrow Roads)' : 'Car (Main Roads)';
            // console.log('Switched routing to:', modeName);
            // We could showToast here if imported, but map.js manages UI silently

            drawRoute(); // Redraw with new profile
        }
    });
}

let routingControl;
let routeTimer;
let currentProfile = 'driving';

function drawRoute() {
    if (!pickupMarker || !dropMarker) return;

    // Debounce to prevent spamming OSRM Demo Server
    if (routeTimer) clearTimeout(routeTimer);

    routeTimer = setTimeout(() => {
        // Remove previous route
        if (routingControl) {
            map.removeControl(routingControl);
        }

        const p = pickupMarker.getLatLng();
        const d = dropMarker.getLatLng();

        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(p.lat, p.lng),
                L.latLng(d.lat, d.lng)
            ],
            lineOptions: {
                styles: [{ color: (currentProfile === 'foot' ? '#FFD700' : '#00BFFF'), opacity: 0.8, weight: 6 }]
                // Gold path for Bike, Blue for Car
            },
            createMarker: function () { return null; },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            // Dynamic Profile
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: currentProfile
            })
        }).addTo(map);

        routingControl.on('routesfound', function (e) {
            const routes = e.routes;
            const summary = routes[0].summary; // { totalDistance (meters), totalTime (seconds) }

            let finalTimeMin = Math.ceil(summary.totalTime / 60);

            // Override Time for Bike (since we used 'foot' profile which is slow)
            if (currentProfile === 'foot') {
                const distKm = summary.totalDistance / 1000;
                // Assume Avg Speed 30km/h for Bike in alleys
                finalTimeMin = Math.ceil((distKm / 30) * 60);
            }

            // Dispatch real data
            window.dispatchEvent(new CustomEvent('route-calculated', {
                detail: {
                    distanceKm: (summary.totalDistance / 1000).toFixed(2),
                    durationMin: finalTimeMin
                }
            }));
        });

        // Handle routing errors silently
        routingControl.on('routingerror', function (e) {
            console.warn('Routing error:', e);
        });

    }, 500); // 500ms delay
}

function createCustomMarker(latlng, color) {
    const colorCode = color === 'gold' ? '#FFD700' : '#ff4757';
    const html = `<div style="
        background-color: ${colorCode};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 10px ${colorCode};
    "></div>`;

    const icon = L.divIcon({
        className: 'custom-pin',
        html: html,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    return L.marker(latlng, { icon: icon, draggable: true }).addTo(map);
}

function notifyLocationChange() {
    window.dispatchEvent(new CustomEvent('location-updated'));
}

function fitMapBounds() {
    if (pickupMarker && dropMarker) {
        const group = new L.featureGroup([pickupMarker, dropMarker]);
        map.fitBounds(group.getBounds().pad(0.2));
    }
}

// Drivers
async function fetchDrivers() {
    const { data: drivers } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_available', true);

    if (drivers) {
        drivers.forEach(d => updateDriverMarker(d));
    }
}

function subscribeToDrivers() {
    supabase
        .channel('drivers-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, payload => {
            if (payload.eventType === 'DELETE') {
                removeDriverMarker(payload.old.id);
            } else {
                updateDriverMarker(payload.new);
            }
        })
        .subscribe();
}

function updateDriverMarker(driver) {
    if (!driver.is_available) {
        removeDriverMarker(driver.id);
        return;
    }

    const latlng = [driver.location_lat, driver.location_lng];
    const iconHtml = driver.vehicle_type === 'bike' ? '<i class="bx bxs-taxi"></i>' : '<i class="bx bxs-car"></i>';
    // Simplified icons for demo

    const customIcon = L.divIcon({
        html: `<div style="font-size: 20px; color: #fff; background: #333; padding: 5px; border-radius: 50%; border: 2px solid gold;">${iconHtml}</div>`,
        className: 'driver-marker',
        iconSize: [30, 30]
    });

    if (driverMarkers[driver.id]) {
        driverMarkers[driver.id].setLatLng(latlng);
    } else {
        driverMarkers[driver.id] = L.marker(latlng, { icon: customIcon }).addTo(map);
    }
}

function removeDriverMarker(id) {
    if (driverMarkers[id]) {
        map.removeLayer(driverMarkers[id]);
        delete driverMarkers[id];
    }
}

export function getRideDetails() {
    if (!pickupMarker || !dropMarker) return null;
    return {
        pickup: pickupMarker.getLatLng(),
        drop: dropMarker.getLatLng()
    };
}
