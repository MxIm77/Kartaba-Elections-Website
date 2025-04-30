// services/authService.js
// Removed: import { useRuntimeConfig } from '#app';

/**
 * Handles user login by sending credentials to the backend API.
 *
 * @param {string} username - The username (userId in your component).
 * @param {string} password - The user's password.
 * @returns {Promise<{success: boolean, data?: any, headers?: Headers, error?: any}>}
 */
export async function login(username, password) {
  // Removed: const runtimeConfig = useRuntimeConfig();
  // Removed: const apiBase = runtimeConfig.public.apiBase;

  // Define the backend URL directly here as a constant
  const backendUrl = 'http://192.168.3.98:4040'; // Or your specific backend IP and port

  try {
    // Use the hardcoded backendUrl to construct the full URL
    const { data, error, headers } = await useFetch(`${backendUrl}/login`, {
      method: 'POST',
      body: { username, password },
      // ignoreResponseError: true allows us to handle non-2xx statuses manually
      ignoreResponseError: true,
      watch: false
    });

    // If error.value is false, it means we received a 2xx HTTP status
    // We also check data.value to ensure there was a response body (expected for success)
    if (!error.value && data.value) {
        console.log('Login API successful (HTTP Status OK):', data.value);
        console.log('Response Headers:', headers.value);
        // Return success with data and headers
        return {
          success: true,
          data: data.value,
          headers: headers.value
        };
    } else {
        // If error.value is true, it means a non-2xx HTTP status was received,
        // or a network error occurred (handled by the first part of the condition)
        console.error('Login API failed (Non-OK HTTP Status or Network Error):', error.value);
        // error.value will contain details about the HTTP error if it was non-2xx
        return {
          success: false,
          // Use error.value.data?.message for server error message if available,
          // otherwise use a generic message based on error.value structure,
          // or a final fallback message.
          error: error.value?.data?.message // Message from server for non-2xx
                 || error.value?.message // Generic fetch error message
                 || data.value?.message // Message from server if data exists but error structure is unexpected
                 || 'Login failed with non-OK status or network error.' // Final fallback
        };
    }

  } catch (err) {
    console.error('Unexpected error in login service try-catch:', err);
    // Catch any other unexpected errors during the fetch setup or processing
    return {
      success: false,
      error: { message: 'An unexpected client-side error occurred during login.' }
    };
  }
}