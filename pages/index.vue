<template>
  <div>
    <transition name="fade-content">
      <div v-if="!showIntro" class="wrapper">
        <div class="text-logo">طالع الاحد؟</div>

        <div class="login-card">
          <h2 class="login-title">رَح تْصَوِّتْلِي؟</h2>
          <p class="login-subtitle">Shu el wade3 Shakla wel3ane el ossa</p>

          <form @submit.prevent="handleLogin" class="login-form">
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

            <button type="submit" class="login-btn" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              <span>{{ loading ? 'Authenticating...' : 'Sign In' }}</span>
            </button>
          </form>

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
import { useCookie } from '#app'; // Import useCookie if needed for checks

// Import the login service function
import { login } from '~/login.js'; // Make sure this path is correct

// Import checkSession IF you want to redirect if already logged in
import { checkSession } from '~/home.js'; // Path relative to root as requested

const router = useRouter();

// --- State specifically for the Login Page ---
const userId = ref(''); // Corresponds to v-model="userId" in template (used as username)
const password = ref(''); // Corresponds to v-model="password"
const loading = ref(false); // For the button's loading state
const error = ref(null); // To display login errors
const showIntro = ref(true); // Or false, depending on how you manage the intro video/animation

// --- Optional: Logic to hide intro after a delay or video end ---
onMounted(async () => {
    // Example: Hide intro after 3 seconds
    setTimeout(() => {
        showIntro.value = false;
    }, 3000); // Adjust timing as needed

    // --- Optional: Check if already logged in ---
    // This prevents showing the login page if a valid session cookie exists
    console.log('Checking existing session on login page mount...');
    try {
        const sessionResult = await checkSession();
        if (sessionResult.success) {
            console.log('Valid session found, redirecting to elections...');
            // Optionally store username if returned by checkSession
            // localStorage.setItem('currentUser', sessionResult.data?.username || 'user');
            await router.push('/mandoob'); // Redirect to the main app page
        } else {
            console.log('No active session found or session invalid.');
             // Clear any potential leftover cookie if check fails but cookie exists
             const tokenCookie = useCookie('authToken');
             if (tokenCookie.value) {
                 console.log('Clearing potentially invalid auth token cookie.');
                 tokenCookie.value = null;
             }
        }
    } catch (err) {
        console.error('Error checking session on login page mount:', err);
        // Proceed to show login form
    }
     // --- End Optional Check ---
});


// --- Login Handler ---
async function handleLogin() {
  loading.value = true;
  error.value = null; // Clear previous errors

  try {
    // Call the login service function from authService.js
    // Pass the userId ref's value as the 'username'
    const result = await login(userId.value, password.value);

    if (result.success) {
      console.log('Login successful:', result.data);

      // Store username for display purposes (optional, get it from result.data if available)
      localStorage.setItem('currentUser', result.data?.username || userId.value); // Use response data or input

      // Redirect to the elections page upon successful login
      // The cookie should have been set by the login service itself
      await router.push('/mandoob'); // Or your desired protected route

    } else {
      // Login failed (API returned error, non-2xx status, etc.)
      console.error('Login failed:', result.error);
      // Use the error message from the service response, or a default
      error.value = result.error?.message || 'Login failed. Please check your credentials.';
    }
  } catch (err) {
    // Catch unexpected errors during the login process itself
    console.error('Unexpected error during handleLogin:', err);
    error.value = 'An unexpected error occurred. Please try again.';
  } finally {
    loading.value = false; // Ensure loading indicator stops
  }
}
</script>

<style>
html, body, #__nuxt { /* Target Nuxt root element too */
  height: 100%; /* Ensure full height */
  margin: 0;
  padding: 0;
  /* Apply the dark background globally */
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%) !important; /* Use !important cautiously, but often needed here */
}
</style>

<style scoped>
/* --- Styles for Intro Video --- */
.intro-video-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  /* Match the global background for consistency */
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  z-index: 9999;
  overflow: hidden;
}
.intro-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* --- Transitions --- */
.fade-intro-leave-active {
  transition: opacity 0.5s ease-out;
}
.fade-intro-leave-to {
  opacity: 0;
}
.fade-content-enter-active {
  transition: opacity 0.5s ease-in; /* No delay */
}
.fade-content-enter-from {
  opacity: 0;
}
.fade-content-enter-to {
  opacity: 1;
}

/* --- General Wrapper & Variables --- */
.wrapper {
  /* Variables can stay defined here for scoped styles */
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

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  /* Background here ensures the wrapper itself is correct */
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
  padding: 20px;
  box-sizing: border-box;
  color: var(--text-color-light);
}

/* --- Other scoped styles remain unchanged --- */
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
.fade-enter-active, .fade-leave-active { /* General fade for error */
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

</style>