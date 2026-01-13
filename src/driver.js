import { supabase } from './supabase.js';
import { showToast } from './ui.js';

let driverId = null;
let currentRide = null;
let map = null, driverMarker = null, routeControl = null;
let driverLat = 26.9157, driverLng = 70.9083; // Default

// Map Init
function initMap() {

    // Initialize Map (SATELLITE VIEW)
    map = L.map('map').setView([26.9124, 70.9002], 13);

    // Esri World Imagery (Satellite)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(map);

    // Also add labels (Hybrid) if possible, or stick to Satellite only.
    // For "Colourfull", Satellite is best.

    // Function to Open Google Maps
    window.openGoogleMaps = function (lat, lng) {
        if (!lat || !lng) return;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two_wheeler`, '_blank');
    }


    // Custom Icon
    const carIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097033.png',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    driverMarker = L.marker([driverLat, driverLng], { icon: carIcon }).addTo(map);
}

const loginPanel = document.getElementById('driver-login');
const dashboard = document.getElementById('driver-dashboard');
const btnLogin = document.getElementById('btn-driver-login');
const list = document.getElementById('requests-list');

// VIEWS
const viewSearch = document.getElementById('view-searching');
const viewPickup = document.getElementById('view-pickup');
const viewInRide = document.getElementById('view-in-ride');
const viewPayment = document.getElementById('view-payment');

// LOGIN
btnLogin.addEventListener('click', async () => {
    const email = document.getElementById('d-email').value;
    const password = document.getElementById('d-password').value;
    if (!email || !password) return showToast('Enter Credentials', 'error');

    btnLogin.innerText = "Verifying...";
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showToast(error.message, 'error');
        btnLogin.innerText = "Login";
        return;
    }
    fetchDriverProfile(data.user.id);
});

async function fetchDriverProfile(userId) {
    const { data } = await supabase.from('drivers').select('*').eq('user_id', userId).single();
    if (!data) return showToast('Driver profile not found', 'error');

    driverId = data.id;
    loginPanel.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('driver-status').classList.remove('hidden');

    // Init Map after Login
    initMap();
    trackLocation();
    startListening();
}


// LIVE LOCATION
function trackLocation() {
    if (!navigator.geolocation) return;
    const locText = document.getElementById('my-loc-text');

    navigator.geolocation.watchPosition(async position => {
        driverLat = position.coords.latitude;
        driverLng = position.coords.longitude;

        // Update Map
        if (driverMarker) driverMarker.setLatLng([driverLat, driverLng]);
        if (map) map.setView([driverLat, driverLng], map.getZoom()); // Follow Mode?

        locText.innerText = `${driverLat.toFixed(4)}, ${driverLng.toFixed(4)}`;

        // Update DB
        if (driverId) {
            await supabase.from('drivers').update({
                location_lat: driverLat,
                location_lng: driverLng
            }).eq('id', driverId);
        }
    }, (err) => console.error(err), { enableHighAccuracy: true });
}

// REALTIME LISTENER
function startListening() {
    console.log("Listening for targeted rides... My Driver ID:", driverId);
    supabase.channel('public:rides')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, payload => {
            const ride = payload.new;
            if (!ride) return;

            if (ride.target_driver_id === driverId && ride.status === 'pending') {
                showRideRequest(ride);
            } else {
                removeCard(ride.id);
            }
        })
        .subscribe();
}

function showRideRequest(ride) {
    if (document.getElementById(`ride-${ride.id}`)) return;

    const card = document.createElement('div');
    card.className = 'request-card';
    card.id = `ride-${ride.id}`;

    // Accept/Timer UI
    card.innerHTML = `
        <div class="req-header">
            <span class="req-type">Incoming Ride</span>
            <span class="req-price">₹${ride.price}</span>
        </div>
        <div class="progress-bar" style="background:#333; height:4px; width:100%; border-radius:2px; overflow:hidden;">
            <div class="progress" style="background:var(--gold); width:100%; height:100%; transition: width 5s linear;"></div>
        </div>
        <div style="font-size:0.8rem; margin:10px 0; color:#eee;">
             <i class='bx bx-map-pin'></i> Pickup: Jaisalmer (Tap for Details)
        </div>
        <button class="cta-btn accept-btn" style="width:100%;" data-id="${ride.id}">Accept</button>
    `;
    list.prepend(card);

    setTimeout(() => {
        const p = card.querySelector('.progress');
        if (p) p.style.width = '0%';
    }, 100);

    card.querySelector('.accept-btn').addEventListener('click', () => acceptRide(ride, card));
}

function removeCard(rideId) {
    const el = document.getElementById(`ride-${rideId}`);
    if (el) el.remove();
}

async function acceptRide(ride, card) {
    card.remove();
    currentRide = ride;

    const { error } = await supabase.from('rides').update({ status: 'accepted', driver_id: driverId }).eq('id', ride.id);
    if (error) {
        showToast('Accepted by another driver.', 'error');
    } else {
        switchView('pickup');
        drawRoute(driverLat, driverLng, ride.pickup_lat, ride.pickup_lng);

        // Navigation Button
        document.getElementById('btn-nav-google').onclick = () => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${ride.pickup_lat},${ride.pickup_lng}`, '_blank');
        };
    }
}

// START RIDE
document.getElementById('btn-start-ride').addEventListener('click', async () => {
    const inputOtp = document.getElementById('otp-input').value;
    if (inputOtp !== currentRide.otp) {
        showToast('Invalid OTP!', 'error');
        return;
    }

    await supabase.from('rides').update({ status: 'in_progress' }).eq('id', currentRide.id);
    switchView('in-ride');

    // Route to Drop
    drawRoute(currentRide.pickup_lat, currentRide.pickup_lng, currentRide.drop_lat, currentRide.drop_lng);
});

// COMPLETE
document.getElementById('btn-complete-ride').addEventListener('click', async () => {
    switchView('payment');
    document.getElementById('pay-amount').innerText = currentRide.price;
    if (routeControl) map.removeControl(routeControl); // Clear Map
});

document.getElementById('btn-confirm-pay').addEventListener('click', async () => {
    await supabase.from('rides').update({ status: 'completed' }).eq('id', currentRide.id);
    showToast('Payment Collected.', 'success');
    currentRide = null;
    document.getElementById('otp-input').value = "";
    switchView('searching');
});

function drawRoute(lat1, lng1, lat2, lng2) {
    if (routeControl) map.removeControl(routeControl);

    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(lat1, lng1),
            L.latLng(lat2, lng2)
        ],
        lineOptions: { styles: [{ color: '#00ff88', opacity: 0.8, weight: 6 }] }, // Green Line
        createMarker: function () { return null; }, // No markers, custom ones
        addWaypoints: false,
        zoom: false
    }).addTo(map);
}

function switchView(viewName) {
    viewSearch.classList.add('hidden');
    viewPickup.classList.add('hidden');
    viewInRide.classList.add('hidden');
    viewPayment.classList.add('hidden');

    if (viewName === 'searching') viewSearch.classList.remove('hidden');
    if (viewName === 'pickup') viewPickup.classList.remove('hidden');
    if (viewName === 'in-ride') viewInRide.classList.remove('hidden');
    if (viewName === 'payment') viewPayment.classList.remove('hidden');
}
