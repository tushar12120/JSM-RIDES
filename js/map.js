
import { supabase } from './supabase.js';

let map;
let pickupMarker;
let dropMarker;
let driverMarkers = {}; // Store driver markers by ID

const JAISALMER_COORDS = [26.9157, 70.9083];

export function initMap() {
    if (map) return; // Already initialized

    map = L.map('map').setView(JAISALMER_COORDS, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Map Click to set Pickup/Drop
    map.on('click', (e) => {
        handleMapClick(e.latlng);
    });

    // Fetch Drivers
    fetchDrivers();

    // Subscribe to Driver Updates
    subscribeToDrivers();
}

function handleMapClick(latlng) {
    const pickupInput = document.getElementById('pickup-input');
    const dropInput = document.getElementById('drop-input');
    const bookingContainer = document.getElementById('booking-container');

    // Simple logic: If no pickup, set pickup. If pickup exists, set drop.
    if (!pickupMarker) {
        pickupMarker = L.marker(latlng, { draggable: true }).addTo(map);
        pickupMarker.bindPopup("Pickup Location").openPopup();
        pickupInput.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;

        // Show booking container
        bookingContainer.classList.remove('hidden');
    } else if (!dropMarker) {
        dropMarker = L.marker(latlng, { draggable: true }).addTo(map);
        dropMarker.bindPopup("Drop Location").openPopup();
        dropInput.value = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;

        // Trigger ride selection
        document.getElementById('vehicle-selection').classList.remove('hidden');
        document.getElementById('btn-book-ride').classList.remove('hidden');

        // Fit bounds
        const group = new L.featureGroup([pickupMarker, dropMarker]);
        map.fitBounds(group.getBounds().pad(0.2));
    }
}

// --- Driver Data Fetching ---

async function fetchDrivers() {
    const { data: drivers, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_available', true);

    if (error) {
        console.error('Error fetching drivers:', error);
        return;
    }

    drivers.forEach(driver => updateDriverMarker(driver));
}

function subscribeToDrivers() {
    supabase
        .channel('drivers-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, payload => {
            console.log('Driver Update:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                updateDriverMarker(payload.new);
            } else if (payload.eventType === 'DELETE') {
                removeDriverMarker(payload.old.id);
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

    // Icon based on vehicle type
    const iconHtml = driver.vehicle_type === 'bike' ? '🏍️' :
        driver.vehicle_type === 'auto' ? '🛺' : '🚗';

    const customIcon = L.divIcon({
        html: `<div style="font-size: 24px;">${iconHtml}</div>`,
        className: 'driver-marker',
        iconSize: [30, 30]
    });

    if (driverMarkers[driver.id]) {
        driverMarkers[driver.id].setLatLng(latlng);
    } else {
        driverMarkers[driver.id] = L.marker(latlng, { icon: customIcon }).addTo(map);
        driverMarkers[driver.id].bindPopup(`Driver: ${driver.id}`);
    }
}

function removeDriverMarker(driverId) {
    if (driverMarkers[driverId]) {
        map.removeLayer(driverMarkers[driverId]);
        delete driverMarkers[driverId];
    }
}

export function getRideDetails() {
    if (!pickupMarker || !dropMarker) return null;
    return {
        pickup: pickupMarker.getLatLng(),
        drop: dropMarker.getLatLng()
    };
}
