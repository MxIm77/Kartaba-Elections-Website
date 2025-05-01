// ~/mandoob.js

const API_BASE_URL = 'http://192.168.10.103:4040';
const MANDOOB_LIST_ENDPOINT = '/mandoob/getrows';
const MANDOOB_UPDATE_ENDPOINT = '/mandoob/updatevote'; // Base path for update

export async function fetchMandoobRecords() {
    const mandoobDataUrl = `${API_BASE_URL}${MANDOOB_LIST_ENDPOINT}`;
    console.log(`[mandoob] Fetching data from ${mandoobDataUrl}`);
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[mandoob] No auth token found.');
            return { success: false, error: { message: 'Authentication token not found.' } };
        }
        const responseData = await $fetch(mandoobDataUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (Array.isArray(responseData)) {
            console.log(`[mandoob] Received ${responseData.length} records.`);
            return { success: true, data: responseData };
        } else {
            console.error('[mandoob] API response not an array.', responseData);
            return { success: false, error: { message: 'Invalid data format received (expected array).' } };
        }
    } catch (err) {
        console.error(`[mandoob] Fetch failed:`, err);
        const errorMessage = err.data?.message || err.statusMessage || err.message || 'Failed to fetch records.';
        const statusCode = err.response?.status || err.statusCode;
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}

// *** UPDATED updateMandoobVote function ***
// Accepts only 'id'. Assumes the backend endpoint infers setting 'voted' to true.
export async function updateMandoobVote(id) {
    // Construct the URL by appending the ID
    const updateUrl = `${API_BASE_URL}${MANDOOB_UPDATE_ENDPOINT}/${id}`;
    console.log(`[mandoob] Updating vote for ID ${id} via POST to ${updateUrl} (no body)`);

    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[mandoob] No auth token for update.');
            return { success: false, error: { message: 'Authentication token not found.' } };
        }

        const method = 'POST'; // Or PUT, check your API

        // Make the $fetch call: only method, headers (Auth only), no body
        const response = await $fetch(updateUrl, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
                // No Content-Type header needed
            }
            // No body property
        });

        console.log("[mandoob] Update API Response:", response);

        // Adjust success check based on expected response (might be empty 2xx or JSON)
        if (response && (response.success === true || response.message || typeof response !== 'object' || response === null)) {
             return { success: true, message: response?.message || `Vote status updated for ${id}.` };
        } else if (response === undefined || response === null) { // Handle successful empty responses
            console.log(`[mandoob] Received successful empty response for ID ${id}`);
            return { success: true, message: `Vote status updated for ${id}.` };
        } else {
            const failureMsg = response?.message || response?.error || 'Backend reported an issue with the update.';
            console.warn("[mandoob] Update failed (backend response):", response);
            return { success: false, error: { message: failureMsg } };
        }
    } catch (err) {
        console.error(`[mandoob] Update API call failed for ID ${id}:`, err);
        const errorMessage = err.data?.message || err.statusMessage || err.message || 'Failed to update vote status.';
        const statusCode = err.response?.status || err.statusCode;
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}