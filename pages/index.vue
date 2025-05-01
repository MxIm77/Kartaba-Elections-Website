<template>
  <!-- ... your existing template ... -->
   <div>
    <!-- Intro transition remains the same -->
    <transition name="fade-intro" @after-leave="contentVisible = true">
      <div v-if="showIntro" class="intro-video-overlay">
        <p style="color: white; text-align: center; padding-top: 40vh;">Loading Intro...</p>
      </div>
    </transition>

    <!-- Content transition -->
     <transition name="fade-content">
      <div v-if="!showIntro" class="wrapper">
        <div class="text-logo">طالع الاحد؟</div>

        <div class="login-card">
          <h2 class="login-title">رَح تْصَوِّتْلِي؟</h2>
          <p class="login-subtitle">Shu el wade3 Shakla wel3ane el ossa</p>

          <form @submit.prevent="handleLogin" class="login-form">
            <!-- User ID Input -->
            <div class="input-group">
              <label for="userId">Ismak pls</label>
              <div class="input-wrapper">
                <span class="input-icon">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </span>
                <input
                  id="userId"
                  type="text"
                  placeholder="Enter your Name please"
                  v-model="userId"
                  class="login-input"
                  required
                  autocomplete="username"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="input-group">
              <label for="password">Passcode</label>
              <div class="input-wrapper">
                <span class="input-icon">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your Passcode"
                  v-model="password"
                  class="login-input"
                  required
                  autocomplete="current-password"
                />
              </div>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="login-btn" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              <span>{{ loading ? 'Authenticating...' : 'Sign In' }}</span>
            </button>
          </form>

          <!-- Error Message -->
          <transition name="fade">
            <div v-if="error" class="error-container">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <p class="error-message">{{ error }}</p>
            </div>
          </transition>
        </div>

        <p class="copyright">© 2025 Meshwar. All rights reserved.</p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from '#app';
// Removed: import { useCookie } from '#app'; // No longer using cookies here
import { jwtDecode } from 'jwt-decode'; // Ensure installed: npm install jwt-decode

// Import your service functions
import { login } from '~/login.js'; // Ensure this path is correct and login SETS the localStorage item
import { checkSession } from '~/home.js'; // Ensure this path is correct and validates the localStorage token

const router = useRouter();

// --- State ---
const userId = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);
const showIntro = ref(true);

// --- Configuration ---
// *** IMPORTANT: Verify this key matches the key used in login.js to store the token ***
const authTokenKey = 'authToken'; // The key used for storing the token in localStorage

// Removed: const authToken = useCookie(authTokenCookieName); // No longer using cookies

// --- Helper Functions ---

/**
 * Decodes the JWT token from localStorage and extracts the role.
 * @returns {string | null} The user role or null if token/role not found or invalid.
 */
function getUserRoleFromToken() {
    // Read token directly from localStorage
    const tokenValue = localStorage.getItem(authTokenKey);
    if (!tokenValue) {
        console.log(`No auth token found in localStorage with key '${authTokenKey}'.`);
        return null;
    }

    try {
        const decodedToken = jwtDecode(tokenValue);
        console.log('Decoded token payload from localStorage:', decodedToken);

        // CONFIRMED: Role claim name 'role' is correct
        const role = decodedToken.role;

        if (!role) {
             console.warn('Role claim not found or empty in the decoded token.');
             return null;
        }

        console.log('Found role:', role);
        return role;

    } catch (err) {
        console.error('Failed to decode token from localStorage:', err);
        // Clear the invalid token from localStorage
        localStorage.removeItem(authTokenKey);
        return null;
    }
}

/**
 * Routes the user based on their role.
 * (This function remains the same as the previous version - handles 'mandoob' etc.)
 * @param {string} role - The user role.
 */
async function routeUserBasedOnRole(role) {
    console.log(`Routing based on role: ${role}`);
    const lowerCaseRole = role ? role.toLowerCase() : '';

    try {
        switch (lowerCaseRole) {
            case 'team':
                await router.push('/stats');
                break;
            case 'mandoob':
                await router.push('/mandoob');
                break;
            case 'moderator':
                 await router.push('/elections');
                 break;
            default:
                console.warn(`Unrecognized role "${role}", routing to default.`);
                 // *** VERIFY/CHANGE '/privatetransport' TO THE CORRECT DEFAULT ROUTE ***
                await router.push('/privatetransport');
                break;
        }
    } catch (routingError) {
        console.error(`Error during routing for role ${role}:`, routingError);
        error.value = "Could not navigate to your dashboard. Please try again.";
    }
}

// --- Lifecycle Hooks ---
onMounted(async () => {
    // Hide intro
    setTimeout(() => {
        showIntro.value = false;
    }, 3000);

    // Check existing session
    console.log('Checking existing session on login page mount (using localStorage)...');
    try {
        // Assumption: checkSession() implicitly knows to look for the token
        // (e.g., reads from localStorage itself or uses an interceptor).
        // If checkSession *needs* the token passed explicitly, you would do:
        // const token = localStorage.getItem(authTokenKey);
        // const sessionResult = await checkSession(token); // If needed
        const sessionResult = await checkSession(); // Assuming implicit check

        if (sessionResult.success) {
            console.log('Valid session detected via checkSession.');
            // Session is valid according to checkSession, now get role from localStorage token
            const userRole = getUserRoleFromToken();

            if (userRole) {
                await routeUserBasedOnRole(userRole); // Route based on role
            } else {
                // checkSession succeeded, but couldn't get role from localStorage token.
                console.error('Session check ok, but failed to get user role from localStorage token.');
                localStorage.removeItem(authTokenKey); // Clear problematic token
                error.value = "Your session is active, but role information is missing. Please log in again.";
            }
        } else {
            console.log('No active session found or session invalid via checkSession.');
            // Ensure any potentially lingering invalid token in localStorage is cleared
            if (localStorage.getItem(authTokenKey)) {
                 console.log('Clearing potentially invalid token from localStorage.');
                 localStorage.removeItem(authTokenKey);
            }
            // Stay on login page
        }
    } catch (err) {
        console.error('Error during initial session check:', err);
        // If the check itself fails, assume logged out and clear token
        localStorage.removeItem(authTokenKey);
        // Stay on login page
    }
});

// --- Event Handlers ---
async function handleLogin() {
  loading.value = true;
  error.value = null;

  try {
    // Call login service - It's responsible for storing the token in localStorage.
    const result = await login(userId.value, password.value);

    if (result.success) {
      console.log('Login successful:', result.data); // Log from login.js confirmed this

      // Store username in localStorage (as before)
      const usernameToStore = result.data?.username || userId.value;
      localStorage.setItem('currentUser', usernameToStore);
      console.log(`Stored username: ${usernameToStore}`);

      // Token should now be in localStorage (set by login()). Decode it.
      const userRole = getUserRoleFromToken(); // Reads from localStorage

      if (userRole) {
          // Successfully got role, now route
          await routeUserBasedOnRole(userRole);
      } else {
          // Login succeeded, token *should* be in localStorage, but couldn't get role.
          // This addresses the error you saw in the logs.
          console.error('Login successful, but failed to get user role from the token in localStorage.');
          error.value = 'Login successful, but role information is missing or token is invalid. Please contact support.';
          // Clear potentially bad token and stored username
          localStorage.removeItem(authTokenKey);
          localStorage.removeItem('currentUser');
      }

    } else {
      // Login failed via API (wrong credentials, server error etc)
      console.error('Login failed:', result.error);
      error.value = result.error?.message || 'Login failed. Please check your credentials.';
       // No token to clear here as login failed before setting it
    }
  } catch (err) {
    // Catch unexpected JS errors during handleLogin
    console.error('Unexpected error during handleLogin:', err);
    error.value = 'An unexpected error occurred. Please try again.';
    // Clear token/user just in case something weird happened
    localStorage.removeItem(authTokenKey);
    localStorage.removeItem('currentUser');
  } finally {
    loading.value = false;
  }
}
</script>

<style>
/* --- Global Styles --- */
html, body, #__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
}
</style>

<style scoped>
/* --- All your existing scoped styles --- */
/* (Includes intro overlay, transitions, wrapper, logo, card, form, inputs, button, error, copyright) */

/* --- Styles for Intro Video --- */
.intro-video-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  z-index: 9999;
  overflow: hidden;
  display: flex; /* Optional: for centering content inside */
  justify-content: center; /* Optional */
  align-items: center; /* Optional */
}
.intro-video { /* If you add a video */
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* --- Transitions --- */
/* Intro Fade Out */
.fade-intro-leave-active {
  transition: opacity 0.5s ease-out;
}
.fade-intro-leave-to {
  opacity: 0;
}

/* Content Fade In */
.fade-content-enter-active {
  transition: opacity 0.5s ease-in;
}
.fade-content-enter-from {
  opacity: 0;
}
.fade-content-enter-to {
  opacity: 1;
}

/* Error Message Fade */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}


/* --- Component Styles (Variables & Layout) --- */
.wrapper {
  /* CSS Variables */
  --primary-bg-color: #1a233a;
  --card-bg-color: #2a3b52;
  --text-color-light: #e0e0e0;
  --text-color-lighter: #f5f5f5;
  --text-color-muted: #9DA3B4;
  --accent-color: #FF3B30;
  --accent-hover: #E02E24;
  --input-bg-color: rgba(30, 34, 53, 0.7);
  --input-border-color: rgba(255, 255, 255, 0.1);
  --input-focus-border: rgba(255, 59, 48, 0.5);
  --input-focus-shadow: rgba(255, 59, 48, 0.15);
  --error-color: #FF453A;
  --error-bg: rgba(255, 69, 58, 0.1);

  /* Layout */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
  padding: 20px;
  box-sizing: border-box;
  color: var(--text-color-light);
}

/* --- Logo, Card, Form elements --- */
.text-logo {
  color: var(--accent-color);
  font-size: 48px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 36px;
  text-align: center;
}

.login-card {
  width: 100%;
  max-width: 360px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  background: var(--card-bg-color);
  border-radius: 14px;
  box-shadow: 0 15px 25px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.1);
  color: var(--text-color-light);
  overflow: visible;
}
.login-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: var(--text-color-lighter);
}
.login-subtitle {
  margin: 0 0 28px 0;
  font-size: 14px;
  color: var(--text-color-muted);
  text-align: center;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.input-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color-muted);
  margin-left: 2px;
}
.input-wrapper {
  position: relative;
  width: 100%;
}
.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-color-muted);
  line-height: 0;
}
.login-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 12px 12px 36px;
  border-radius: 8px;
  border: 1px solid var(--input-border-color);
  background-color: var(--input-bg-color);
  font-size: 14px;
  color: var(--text-color-light);
  outline: none;
  transition: all 0.2s ease;
}
.login-input::placeholder {
  color: var(--text-color-muted);
  opacity: 0.7;
}
.login-input:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 2px var(--input-focus-shadow);
  background-color: rgba(30, 34, 53, 0.9);
}
.login-btn {
  width: 100%;
  padding: 12px 0;
  border-radius: 8px;
  border: none;
  background-color: var(--accent-color);
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}
.login-btn:hover:not(:disabled) {
  background-color: var(--accent-hover);
}
.login-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.error-container {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 10px;
  border-radius: 6px;
  background-color: var(--error-bg);
  border-left: 3px solid var(--error-color);
  box-sizing: border-box;
  width: 100%;
}
.error-container svg {
  color: var(--error-color);
  flex-shrink: 0;
  margin-top: 1px;
}
.error-message {
  color: var(--error-color);
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
   width: calc(100% - 24px);
   word-wrap: break-word;
}
.copyright {
  margin-top: 24px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}
</style>