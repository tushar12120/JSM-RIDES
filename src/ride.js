import { supabase } from './supabase.js';
import { getRideDetails } from './map.js';
import { showToast } from './ui.js';

let selectedVehicle = null;

// Bind UI
const vehicleCards = document.querySelectorAll('.vehicle-card');
const btnBookRide = document.getElementById('btn-book-ride');

const RATES = { bike: 12, auto: 18, car: 30 }; // Slight adjustment

// Select Vehicle
vehicleCards.forEach(card => {
    card.addEventListener('click', () => {
        vehicleCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedVehicle = card.dataset.type;

        // Notify Map to switch profile (Bike vs Car)
        window.dispatchEvent(new CustomEvent('vehicle-selected', {
            detail: { type: selectedVehicle }
        }));
    });
});

// Real-time Route Data Listener
window.addEventListener('route-calculated', (e) => {
    const { distanceKm, durationMin } = e.detail;

    // Update Global State for booking
    // Note: We might want to store this to send to DB

    // Update Distance Display
    const distEl = document.getElementById('ride-distance');
    if (distEl) distEl.innerText = distanceKm;

    // Update UI Prices
    const priceBikeEl = document.getElementById('price-bike');
    if (priceBikeEl) priceBikeEl.innerText = Math.round(distanceKm * RATES.bike);
    const priceAutoEl = document.getElementById('price-auto');
    if (priceAutoEl) priceAutoEl.innerText = Math.round(distanceKm * RATES.auto);
    const priceCarEl = document.getElementById('price-car');
    if (priceCarEl) priceCarEl.innerText = Math.round(distanceKm * RATES.car);

    // Update Times (Mock calculation logic update)
    // Update vehicle cards with real duration (approx difference based on speed)
    // For simplicity, showing same duration or scaled. 
    // Bike: base, Auto: x1.2, Car: x0.8? Or just use the OSRM time for car.

    // Simplification: Update all time labels to the OSRM duration (Assuming Car speed)
    // Ideally we'd scale: Bike is faster in city, Car faster on highway.
    document.querySelectorAll('.v-time').forEach(el => el.innerText = durationMin + " min");
});

// Deprecated local distance
/*
window.addEventListener('location-updated', () => {
    if (selectedVehicle) {
        updatePrices();
    }
});
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
*/

function calculateDistance(lat1, lon1, lat2, lon2) {
    // kept for fallback only
    return 0;
}

// Booking
if (btnBookRide) {
    btnBookRide.addEventListener('click', async () => {
        if (!selectedVehicle) {
            showToast('Please select a vehicle type', 'error');
            return;
        }

        const details = getRideDetails();
        if (!details) {
            showToast('Please set Pickup and Drop locations', 'error');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showToast('Please login to book a ride', 'error');
            return;
        }

        const price = document.getElementById(`price-${selectedVehicle}`).innerText;

        btnBookRide.innerText = "Requesting Driver...";
        btnBookRide.disabled = true;

        const otp = Math.floor(1000 + Math.random() * 9000); // 4 Digit

        const { data, error } = await supabase.from('rides').insert({
            user_id: user.id,
            pickup_lat: details.pickup.lat,
            pickup_lng: details.pickup.lng,
            drop_lat: details.drop.lat,
            drop_lng: details.drop.lng,
            vehicle_type: selectedVehicle,
            price: parseFloat(price),
            status: 'pending',
            otp: otp.toString()
        }).select();

        if (error) {
            console.error(error);
            showToast('Booking Failed! ' + error.message, 'error');
            btnBookRide.innerText = "Book Ride";
            btnBookRide.disabled = false;
        } else {
            showToast('Ride Requested! Looking for nearby drivers...', 'success');

            // REALTIME: Listen for Ride Updates
            const rideId = data[0].id; // Defined here

            // Start Dispatcher
            import('./dispatch.js').then(d => {
                d.startDispatchLoop(rideId, details.pickup.lat, details.pickup.lng);
            });

            // Helper to Handle Status Change
            const handleRideUpdate = async (newRide) => {
                console.log("Ride Update:", newRide.status);
                if (newRide.status === 'accepted' || newRide.status === 'in_progress') {
                    // Clear Polling if active
                    if (window.ridePoll) clearInterval(window.ridePoll);

                    showRideStatusPanel(price, selectedVehicle, newRide.otp);

                    const otpEl = document.getElementById('otp-val');
                    if (otpEl) otpEl.innerText = newRide.otp;

                    // Fetch Real Driver Details
                    if (newRide.driver_id) {
                        // ... existing fetch logic ...
                        // To keep code DRY, we can copy the fetch logic here or refactor. 
                        // For minimal edit risk, I will re-implement the fetch here cleanly.
                        const { data: drv } = await supabase.from('drivers').select('*').eq('id', newRide.driver_id).single();
                        if (drv) {
                            const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', drv.user_id).single();

                            const nameEl = document.getElementById('driver-name');
                            if (nameEl) nameEl.innerText = prof?.full_name || "Driver Found";
                            const carEl = document.getElementById('driver-car');
                            if (carEl) carEl.innerText = `${drv.vehicle_model || 'Bike'} • ${drv.vehicle_number || ''}`;
                            const rateEl = document.getElementById('driver-rating');
                            if (rateEl) rateEl.innerText = "⭐ 4.9";
                        }
                    }

                    if (newRide.status === 'in_progress') {

                        if (newRide.status === 'in_progress') {
                            const statusHeader = document.getElementById('status-text'); // Fixed ID
                            if (statusHeader) statusHeader.innerText = "Ride In Progress";

                            const pulse = document.querySelector('.pulse-dot');
                            if (pulse) pulse.style.background = "#00ff88";

                            // Hide OTPs
                            const otpDisp = document.querySelector('.otp-display');
                            if (otpDisp) otpDisp.style.display = 'none';

                            const otpHeader = document.getElementById('ride-otp');
                            if (otpHeader) otpHeader.style.display = 'none';
                        }
                    }
                } else if (newRide.status === 'completed') {
                    if (window.ridePoll) clearInterval(window.ridePoll);
                    showToast('Ride Completed.', 'success');
                    alert(`Ride Completed! Pay ₹${newRide.price}`);
                    window.location.reload();
                }
            };

            // 1. Realtime Sub
            const channel = supabase
                .channel(`ride:${rideId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
                    async (payload) => handleRideUpdate(payload.new)
                )
                .subscribe();

            // 2. Polling Fallback (Every 3s)
            window.ridePoll = setInterval(async () => {
                const { data: rides } = await supabase.from('rides').select('*').eq('id', rideId).single();
                if (rides && (rides.status === 'accepted' || rides.status === 'in_progress' || rides.status === 'completed')) {
                    handleRideUpdate(rides);
                }
            }, 3000);

            // End of Booking Block (Listeners attached)

        }
    });

    document.getElementById('btn-cancel-ride').addEventListener('click', () => {
        // Hide panel, reset everything
        document.getElementById('ride-status-panel').classList.add('hidden');
        document.getElementById('vehicle-selection').classList.add('hidden'); // Or make visible?
        // Actually reset map to restart flow
        import('./map.js').then(m => m.resetMap());
        btnBookRide.disabled = false;
        btnBookRide.innerText = "Book Ride";
    });
}



function showRideStatusPanel(price, vehicleType, otp) {
    // Hide Booking UI (Check both potential IDs to be safe)
    const vehSel = document.getElementById('vehicle-selection');
    if (vehSel) vehSel.classList.add('hidden');

    const bookPanel = document.getElementById('booking-panel');
    if (bookPanel) bookPanel.classList.add('hidden');

    const statusPanel = document.getElementById('ride-status-panel');
    if (statusPanel) {
        statusPanel.classList.remove('hidden');
        statusPanel.classList.add('active');
    }

    const amountEl = document.getElementById('payment-amount');
    if (amountEl) amountEl.innerText = `₹${price}`;

    const totalEl = document.getElementById('total-pay');
    if (totalEl) totalEl.innerText = `₹${price}`;

    const otpEl = document.getElementById('ride-otp');
    if (otpEl) otpEl.innerText = `OTP: ${otp}`;

    const otpVal = document.getElementById('otp-val');
    if (otpVal) otpVal.innerText = otp;

    // Reset Driver Info to Search State (until update arrives)
    const dName = document.getElementById('driver-name');
    if (dName) dName.innerText = "Searching...";

    const dCar = document.getElementById('driver-car');
    if (dCar) dCar.innerText = "Finding Driver...";
}
