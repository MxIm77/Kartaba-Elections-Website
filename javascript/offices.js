// ~/javascript/moderator.js

const API_BASE_URL = 'http://192.168.10.103:4040';
// *** NEW ENDPOINT ***
const MODERATOR_LIST_ENDPOINT = '/moderator/getrows';

// *** Renamed function for clarity ***
export async function fetchModeratorRecords() {
    const moderatorDataUrl = `${API_BASE_URL}${MODERATOR_LIST_ENDPOINT}`;
    console.log(`[moderator] Fetching data from ${moderatorDataUrl}`);
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[moderator] No auth token found.');
            // Standardize error response structure
            return { success: false, error: { message: 'Authentication token not found.' } };
        }
        const responseData = await $fetch(moderatorDataUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Basic check if response looks like an array (adjust if API returns object like { data: [...] })
        if (Array.isArray(responseData)) {
            console.log(`[moderator] Received ${responseData.length} records.`);
            return { success: true, data: responseData };
        } else if (responseData && Array.isArray(responseData.data)) {
            // Handle cases where data might be nested, e.g., { success: true, data: [...] }
             console.log(`[moderator] Received ${responseData.data.length} records (nested).`);
            return { success: true, data: responseData.data };
        } else {
            console.error('[moderator] API response not an array or expected format.', responseData);
             // Standardize error response structure
            return { success: false, error: { message: 'Invalid data format received.' } };
        }
    } catch (err) {
        console.error(`[moderator] Fetch failed:`, err);
        const errorMessage = err.data?.message || err.statusMessage || err.message || 'Failed to fetch records.';
        const statusCode = err.response?.status || err.statusCode;
         // Standardize error response structure
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}

// *** NO update function needed for this page ***