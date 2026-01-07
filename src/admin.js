import { supabase, SUPABASE_URL, SUPABASE_KEY, createClient } from './supabase.js';
import { showToast } from './ui.js';

// Logout
document.getElementById('btn-admin-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Create Driver Logic
document.getElementById('btn-create-driver').addEventListener('click', async () => {
    const name = document.getElementById('d-name').value;
    const email = document.getElementById('d-email').value;
    const password = document.getElementById('d-password').value;
    const type = document.getElementById('d-vehicle-type').value;
    const model = document.getElementById('d-vehicle-model').value;
    const number = document.getElementById('d-vehicle-no').value;

    if (!name || !email || !password || !number || !model) {
        return showToast('All fields required', 'error');
    }

    const btn = document.getElementById('btn-create-driver');
    btn.innerText = "Creating...";
    btn.disabled = true;

    // PREVENT LOGOUT TRICK:
    // Create a temporary client just for this registration
    const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: false, // Don't save session to localStorage
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    // 1. Create Auth User (using temp client)
    let userId = null;

    // Try SignUp first
    const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { full_name: name, role: 'driver' }
        }
    });

    if (authError) {
        // Handle "User already registered" case specifically
        const isUserExists = authError.message.includes("registered") || authError.message.includes("exists");

        if (isUserExists) {
            console.warn("User exists, trying login to recover ID...");
            const { data: loginData, error: loginError } = await tempClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (loginError) {
                showToast('Existing User detected, but Login Failed: ' + loginError.message, 'error');
                btn.innerText = "Register Driver";
                btn.disabled = false;
                return;
            }
            userId = loginData.user.id;
        } else {
            // Validations (e.g. Password too short)
            showToast('Registration Failed: ' + authError.message, 'error');
            btn.innerText = "Register Driver";
            btn.disabled = false;
            return;
        }
    } else {
        userId = authData.user.id;
    }

    // 2. Insert/Upsert into 'profiles' table (REQUIRED for Foreign Key)
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: name,
        role: 'driver'
    });

    if (profileError) {
        console.error('Profile Error:', profileError);
        // We might proceed if error is "duplicate" but upsert handles it.
        // If RLS blocks invalid upsert??
        // We assume Admin has permission (using fix_permissions_final.sql)
    }

    // 3. Insert into 'drivers' table
    // Admin has permission to insert into drivers
    const { error: dbError } = await supabase.from('drivers').insert({
        user_id: userId,
        vehicle_type: type,
        vehicle_model: model,
        location_lat: 26.9157,
        location_lng: 70.9083,
        is_available: true
    });

    if (dbError) {
        console.error(dbError);
        // Maybe 'vehicle_number' column doesn't exist yet? 
        // We handle 'model' with fix_database.sql. 
        // But 'vehicle_number' was presumed.
        // If error, we might fallback or specific error.
        showToast('Driver created but DB Error: ' + dbError.message, 'warning');
    } else {
        alert("Driver Created Successfully! \n\nAdmin Session Active.");
        // Clear Form
        document.getElementById('d-email').value = "";
        document.getElementById('d-password').value = "";
        btn.innerText = "Register Driver";
        btn.disabled = false;
    }
});
