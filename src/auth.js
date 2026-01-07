import { supabase } from './supabase.js';
import { showToast } from './ui.js';

// DOM Elements
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');

const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');

export function initAuth() {
    // Toggles
    linkToRegister.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    linkToLogin.addEventListener('click', () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Login Action
    btnLogin.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showToast('Please enter both email and password.', 'error');
            return;
        }

        btnLogin.innerText = "Logging in...";
        btnLogin.disabled = true;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            showToast('Login Successful!', 'success');

            // ADMIN REDIRECT (By UUID)
            const adminId = '5a15b2f8-343f-4c87-9cd2-4b43b6b45f9b';
            if (data.user.id === adminId) {
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
                return;
            }

            // Normal User: Switch Panels
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Login Error:', error);
            if (error.message.includes("Invalid login credentials")) {
                showToast("Login Failed: Wrong password or Email not confirmed.", 'error');
            } else {
                showToast(`Login Failed: ${error.message}`, 'error');
            }
        } finally {
            btnLogin.innerText = "Login";
            btnLogin.disabled = false;
        }
    });

    // Register Action
    btnRegister.addEventListener('click', async () => {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        if (!name || !email || !password) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        btnRegister.innerText = "Creating Account...";
        btnRegister.disabled = true;

        try {
            // 1. Sign Up
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        role: 'rider' // Default role
                    }
                }
            });

            if (error) throw error;

            console.log('Registration success', data);

            showToast('Account created! Check email to confirm.', 'success');

            // Switch to login
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');

        } catch (error) {
            console.error('Registration Error:', error);
            showToast(`Registration Failed: ${error.message}`, 'error');
        } finally {
            btnRegister.innerText = "Register";
            btnRegister.disabled = false;
        }
    });
}

export function showLogin() {
    authContainer.classList.remove('hidden');
    loginForm.classList.remove('hidden');
}
