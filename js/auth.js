
import { supabase } from './supabase.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');
const authContainer = document.getElementById('auth-container');

// Inputs
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');

const regName = document.getElementById('reg-name');
const regEmail = document.getElementById('reg-email');
const regPassword = document.getElementById('reg-password');
const btnRegister = document.getElementById('btn-register');

// Toggle Forms
linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Login Function
btnLogin.addEventListener('click', async () => {
    const email = loginEmail.value;
    const password = loginPassword.value;

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        console.log('Logged in:', data);
        authContainer.classList.add('hidden');
        // Main.js will detect session change or we can reload
        window.location.reload();

    } catch (error) {
        alert(error.message);
    }
});

// Register Function
btnRegister.addEventListener('click', async () => {
    const name = regName.value;
    const email = regEmail.value;
    const password = regPassword.value;
    const role = 'rider'; // Default to rider for this app

    if (!email || !password || !name) {
        alert('Please fill all fields');
        return;
    }

    try {
        // 1. Sign up
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role
                }
            }
        });

        if (error) throw error;

        // 2. Create Profile in DB (Optional if Supabase trigger handles it, but good for manual now)
        // For now, rely on metadata or user creation. 
        // We will insert into 'profiles' table later if needed.

        alert('Registration successful! Please login.');
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');

    } catch (error) {
        alert(error.message);
    }
});

export async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
}
