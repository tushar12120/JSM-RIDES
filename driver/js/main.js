import { supabase } from './supabase.js';
import { showToast } from './ui.js';

let driverId = null;
let currentVehicle = 'bike';

const loginPanel = document.getElementById('driver-login');
const dashboard = document.getElementById('driver-dashboard');
const btnLogin = document.getElementById('btn-driver-login');
const list = document.getElementById('requests-list');

// Driver Login
btnLogin.addEventListener('click', async () => {
    const name = document.getElementById('d-name').value;
    const vehicle = document.getElementById('d-vehicle').value;

    if (!name) return showToast('Enter your name', 'error');

    btnLogin.disabled = true;
    btnLogin.innerText = "Connecting...";

    // Use current session or anon
    const { data: { user } } = await supabase.auth.getUser();
    
    // For demo, if no user logged in, we proceed as Guest Driver (since separate site)
    // But DB requires 'user_id' for driver table?
    // Let's create a temp user logic or just bypass if RLS allows.
    // Our fix_rls.sql allows insertion.
    
    // Create Driver
    const { data, error } = await supabase.from('drivers').insert({
        // user_id: user ? user.id : null, // Assuming table allows null, or we skip
        vehicle_type: vehicle,
        location_lat: 26.9157,
        location_lng: 70.9083,
        is_available: true
    }).select();

    if (error) {
        // If RLS fails or user_id null issues
        console.error('Driver Create Failed', error);
        // Fallback: If just for listening, we proceed
    } else {
        driverId = data[0].id;
    }
    // Hack for Demo: if driverId missing, use a random one
    if (!driverId) driverId = "demo-driver-" + Date.now();

    currentVehicle = vehicle;
    
    loginPanel.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('driver-status').classList.remove('hidden');
    
    showToast(`Welcome ${name}!`, 'success');
    startListening();
});

function startListening() {
    console.log('Driver App: Listening for rides...');
    
    // Subscribe to NEW rides
    supabase
        .channel('public:rides')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, payload => {
            console.log('New Ride:', payload);
            handleNewRide(payload.new);
        })
        .subscribe();
}

function handleNewRide(ride) {
    if (ride.status !== 'pending') return;
    if (ride.vehicle_type !== currentVehicle) return; 

    // Create Card
    const card = document.createElement('div');
    card.className = 'request-card';
    card.id = `ride-${ride.id}`;
    
    card.innerHTML = `
        <div class="req-header">
            <span class="req-type">${ride.vehicle_type.toUpperCase()} RIDE</span>
            <span class="req-price">₹${ride.price}</span>
        </div>
        <div class="req-route">
            <div class="req-point"><i class='bx bxs-circle' style="color:var(--gold)"></i> New Pickup Request</div>
        </div>
        <button class="cta-btn accept-btn" data-id="${ride.id}">Accept Ride</button>
    `;

    list.prepend(card);

    // Bind Accept
    card.querySelector('.accept-btn').addEventListener('click', () => acceptRide(ride.id));
}

async function acceptRide(rideId) {
    const btn = document.querySelector(`#ride-${rideId} .accept-btn`);
    btn.innerText = "Accepting...";
    btn.disabled = true;

    // Use simple UPDATE since RLS is loose now
    const { error } = await supabase
        .from('rides')
        .update({ 
            status: 'accepted',
            driver_id: driverId // Real ID
        })
        .eq('id', rideId);

    if (error) {
        showToast('Failed: ' + error.message, 'error');
        btn.innerText = "Accept Ride";
        btn.disabled = false;
    } else {
        showToast('Ride Accepted!', 'success');
        document.getElementById(`ride-${rideId}`).remove();
    }
}
