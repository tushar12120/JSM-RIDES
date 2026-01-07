// Helper to sleep
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Dispatch Loop
let isDispatching = false;

export async function startDispatchLoop(rideId, pickupLat, pickupLng) {
    if (isDispatching) return;
    isDispatching = true;

    console.log("Starting Dispatch Loop for Ride:", rideId);

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const { supabase } = await import('./supabase.js');

    // 1. Fetch Drivers
    const { data: drivers, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_available', true)
        .eq('vehicle_type', 'bike'); // Bike Only

    if (!drivers || drivers.length === 0) {
        console.warn("No drivers found. Retrying in 5s...");
        await wait(5000);
        isDispatching = false; // Reset to allow retry recursion if needed
        startDispatchLoop(rideId, pickupLat, pickupLng); // Simple retry
        return;
    }

    // 2. Filter 1km and Sort
    const nearbyDrivers = drivers.filter(d => {
        const dist = getDistanceFromLatLonInKm(pickupLat, pickupLng, d.location_lat || 26.9157, d.location_lng || 70.9083);
        console.log(`Driver ${d.id} Dist: ${dist}km`);
        return dist <= 2.0; // Margin > 1km for demo
    }).sort((a, b) => {
        // Sort by distance (mock logic or real if loc avail)
        return 0;
    });

    if (nearbyDrivers.length === 0) {
        // No match nearby
        console.warn("No drivers in range.");
        // Should we broaden search? For now retry loop.
    }

    // 3. Round Robin Loop
    let i = 0;
    while (isDispatching) {
        if (nearbyDrivers.length === 0) break;

        const targetDriver = nearbyDrivers[i];
        console.log(`Dispatching to Driver ${i}: ${targetDriver.id}`);

        // Update DB -> Target Driver
        await supabase.from('rides').update({ target_driver_id: targetDriver.id }).eq('id', rideId);

        // Wait 5s
        await wait(5000);

        // Check status
        const { data: currentRide } = await supabase.from('rides').select('status').eq('id', rideId).single();

        if (currentRide.status !== 'pending') {
            console.log("Ride accepted or cancelled, stopping dispatch.");
            isDispatching = false;
            break;
        }

        // Next Driver
        i++;
        if (i >= nearbyDrivers.length) i = 0; // Loop back to start
    }
}


function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}
function deg2rad(deg) { return deg * (Math.PI / 180) }
