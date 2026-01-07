
import '../style.css';
import { supabase } from './supabase.js';
import { initAuth, showLogin } from './auth.js';
import { initMap } from './map.js';
import './ride.js'; // Init booking listeners

console.log('JSM RIDES Premium Initialized');

async function initApp() {
    initAuth(); // Setup event listeners for forms

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        console.log('Session active:', session.user.email);
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('btn-logout').classList.remove('hidden');

        // Load Map
        initMap();
    } else {
        console.log('No session, showing login');
        showLogin();
    }
}

initApp();

// Logout Handler
document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});
