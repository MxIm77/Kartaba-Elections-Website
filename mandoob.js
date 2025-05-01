// ~/services/mandoobService.js
// Uses the globally available $fetch utility provided by Nuxt 3/ofetch

/**
 * Fetches Mandoob records from the backend API using the stored
 * authentication token and the $fetch utility.
 * EXPECTS THE API TO RETURN THE ARRAY DIRECTLY: [ {record1}, {record2} ]
 *
 * @returns {Promise<{success: boolean, data?: Array<any>, error?: any}>}
 *          On success, `data` will be the array of mandoob records.
 *          On failure, `error` will contain error details.
 */
export async function fetchMandoobRecords() {
    // --- Backend URL Configuration ---
    const API_BASE_URL = 'http://192.168.1.102:4040'; // Use your actual Base URL (NO TRAILING SLASH)
    const mandoobDataUrl = `${API_BASE_URL}/mandoob/getrows`; // Adjust endpoint path if needed
  
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('[mandoobService] No auth token in localStorage.');
        return { success: false, error: { message: 'Auth token not found.' } };
      }
  
      console.log(`[mandoobService] Fetching data from ${mandoobDataUrl} (GET request) using $fetch`);
  
      const responseData = await $fetch(mandoobDataUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      console.log('[mandoobService] Raw response received:', responseData);
  
      // --- Process Successful Response ---
      // ** MODIFIED: Expecting the array directly **
  
      // Check if the response data IS an array
      if (Array.isArray(responseData)) {
          console.log('[mandoobService] Received array directly as expected.');
          return {
              success: true,
              data: responseData // Return the received array
          };
      }
      // Handle cases where the response was successful (2xx) but wasn't an array
      else {
         console.error('[mandoobService] API response was successful but was not an array.');
         return {
             success: false,
             error: { message: 'Invalid data format received from API (expected array).' }
         };
      }
      // --- End Response Processing ---
  
    } catch (err) {
      // --- Handle Errors (Network or non-2xx Status Codes) ---
      console.error('[mandoobService] Failed to fetch /api/mandoob-records:', err);
      const errorMessage = err.data?.message || err.statusMessage || err.message || 'Failed to fetch mandoob records.';
      const statusCode = err.response?.status || err.statusCode;
      return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
  }