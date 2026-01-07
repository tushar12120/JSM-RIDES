
import { supabase } from './supabase.js';
import { getRideDetails } from './map.js';

let selectedVehicle = null;
let currentRideId = null;

// UI Elements
const vehicleOptions = document.querySelectorAll('.vehicle-option');
const btnBookRide = document.getElementById('btn-book-ride');
const bookingContainer = document.getElementById('booking-container');

// Prices per km
const RATES = {
    bike: 10,
    auto: 15,
    car: 25
};

// Vehicle Selection
vehicleOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Clear previous selection
        vehicleOptions.forEach(opt => opt.classList.remove('selected'));

        // Select new
        option.classList.add('selected');
        selectedVehicle = option.dataset.type;

        // Calculate Price immediately
        updatePrices();
    });
});

// Calculate Prices based on distance
function updatePrices() {
    const details = getRideDetails();
    if (!details) return;

    const distKm = calculateDistance(
        details.pickup.lat, details.pickup.lng,
        details.drop.lat, details.drop.lng
    );

    document.getElementById('price-bike').innerText = Math.round(distKm * RATES.bike);
    document.getElementById('price-auto').innerText = Math.round(distKm * RATES.auto);
    document.getElementById('price-car').innerText = Math.round(distKm * RATES.car);
}

// Haversine Formula for distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Book Ride
btnBookRide.addEventListener('click', async () => {
    if (!selectedVehicle) {
        alert('Please select a vehicle type');
        return;
    }

    const details = getRideDetails();
    if (!details) {
        alert('Please select pickup and drop locations');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Please login to book a ride');
        return;
    }

    const price = document.getElementById(`price-${selectedVehicle}`).innerText;

    btnBookRide.disabled = true;
    btnBookRide.innerText = "Finding Driver...";

    try {
        const { data, error } = await supabase
            .from('rides')
            .insert({
                user_id: user.id,
                pickup_lat: details.pickup.lat,
                pickup_lng: details.pickup.lng,
                drop_lat: details.drop.lat,
                drop_lng: details.drop.lng,
                vehicle_type: selectedVehicle,
                price: parseFloat(price),
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        currentRideId = data.id;
        console.log('Ride Request Created:', currentRideId);

        // Subscribe to status changes for this ride
        subscribeToRideStatus(currentRideId);

    } catch (error) {
        console.error('Booking Error:', error);
        alert('Failed to book ride: ' + error.message);
        btnBookRide.disabled = false;
        btnBookRide.innerText = "Book Ride";
    }
});

function subscribeToRideStatus(rideId) {
    supabase
        .channel(`ride-${rideId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'rides',
            filter: `id=eq.${rideId}`
        }, payload => {
            console.log('Ride Status Update:', payload);
            const status = payload.new.status;

            if (status === 'accepted') {
                alert('Ride Accepted! Driver is on the way.');
                btnBookRide.innerText = "Driver Arriving...";
            } else if (status === 'completed') {
                alert('Ride Completed!');
                resetBooking();
            }
        })
        .subscribe();
}

function resetBooking() {
    currentRideId = null;
    btnBookRide.disabled = false;
    btnBookRide.innerText = "Book Ride";
    bookingContainer.classList.add('hidden');
    // Ideally clear map markers too
}
