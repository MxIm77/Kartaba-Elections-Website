// services/home.js
import { useFetch } from '#app';

/**
 * Checks the session validity with the backend using a Bearer token
 * stored in localStorage and sent via Authorization header.
 *
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function checkSession() {
  // --- Hardcoded backend URL ---
  const checkSessionUrl = 'http://192.168.1.102:4040/check-session';

  try {
    const token = localStorage.getItem('authToken'); // Get token from storage

    if (!token) {
      console.warn('[home.js] No auth token found in localStorage.');
      return {
        success: false,
        error: 'No authentication token found. Please log in.'
      };
    }

    console.log(`[home.js] Checking session via Authorization header at ${checkSessionUrl} (GET request)`);

    const { data, error } = await useFetch(checkSessionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      ignoreResponseError: true,
      watch: false
    });

    if (!error.value) {
      console.log('[home.js] /check-session successful (token auth):', data.value);
      return {
        success: true,
        data: data.value,
      };
    } else {
      console.error('[home.js] /check-session failed (token auth):', error.value);
      return {
        success: false,
        error: error.value.data?.message
             || error.value.message
             || data.value?.message
             || (error.value.statusCode === 401 ? 'Session invalid or expired (Unauthorized)' : 'Session check failed (token auth).')
      };
    }

  } catch (err) {
    console.error('[home.js] Unexpected error in checkSession try-catch:', err);
    return {
      success: false,
      error: { message: 'An unexpected client-side error occurred during session checking (token auth).' }
    };
  }
}
