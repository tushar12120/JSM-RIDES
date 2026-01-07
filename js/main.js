
import { supabase } from './supabase.js';
import './auth.js';
import './ride.js';

console.log('JSM RIDES initialized');

// Basic check
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session:', session);
    if (!session) {
        document.getElementById('auth-container').classList.remove('hidden');
    } else {
        // Init Map
        console.log('User logged in, init map...');
        import('./map.js').then(module => {
            module.initMap();
        });
    }
}

checkAuth();
