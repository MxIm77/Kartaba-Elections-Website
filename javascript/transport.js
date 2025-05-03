// ~/javascript/transport.js  (Ensure this path matches your project structure)

// Ensure the base URL is correct for your backend API
const API_BASE_URL = 'https://kartaba-2040.com/api';

// Define API endpoints using a structured object
const ENDPOINTS = {
    RECORDS: '/logistics/taxi/getrows',          // GET: Fetch transport records
    DEPART: (id) => `/logistics/update/departure/${id}`, // POST: Mark as departed
    ARRIVE: (id) => `/logistics/update/arrival/${id}`,   // POST: Mark as arrived
};

/**
 * Makes an authenticated API request using $fetch (Nuxt's fetch wrapper).
 * Handles Authorization header, JSON body, error parsing,
 * AND updates authToken from response header if present.
 *
 * @param {string} url - The full URL for the API endpoint.
 * @param {string} [method='GET'] - HTTP method ('GET', 'POST', 'PUT', 'DELETE', etc.).
 * @param {object} [options={}] - Additional options for $fetch (e.g., body, query, headers).
 * @returns {Promise<{ success: boolean, data?: any, error?: { message: string, statusCode?: number } }>} Result object.
 */
async function makeApiRequest(url, method = 'GET', options = {}) {
    // console.log(`[transport] Requesting: ${method} ${url}`); // Optional logging

    const currentToken = localStorage.getItem('authToken');
    if (!currentToken) {
        console.warn('[transport] No auth token found.');
        return { success: false, error: { message: 'Authentication token not found.', statusCode: 401 } };
    }

    let responseBody = null; // Variable to store the parsed response body
    let responseStatus = null; // Variable to store the response status

    try {
        await $fetch.raw(url, { // Use .raw to get the full Response object easily
            method: method,
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                ...(options.body && typeof options.body === 'object') && { 'Content-Type': 'application/json' },
                ...options.headers,
            },
            query: options.query,
            body: options.body,
        }).then(response => {
             // This block executes for successful responses (2xx status)
             // console.log(`[transport] Received response for ${method} ${url}: Status ${response.status}`);
             responseStatus = response.status;

             // Check for new token in header
             const authHeader = response.headers.get('Authorization');
             if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
                 const newToken = authHeader.substring(7);
                 if (newToken && newToken !== currentToken) {
                     localStorage.setItem('authToken', newToken);
                     console.log('[transport] New auth token updated from header.');
                 }
             } // Add else if for non-bearer token if needed

             // Store the parsed body data from the raw response object
             responseBody = response._data;
             // console.log(`[transport] Parsed successful response body:`, responseBody);

        }).catch(err => {
            // This .catch block specifically handles errors thrown by $fetch
            console.error(`[transport] API Request Failed ($fetch catch): ${method} ${url}`, err);
            responseStatus = err.response?.status || err.statusCode || 500;
            responseBody = err.data; // Parsed error body from $fetch
            console.error('[transport] Error details:', { status: responseStatus, statusMessage: err.statusMessage, data: responseBody, message: err.message });
            // Re-throw the error to be caught by the outer try...catch block
            throw err;
        });

        // --- Process Success Response ---
        if (responseBody !== undefined && responseBody !== null) {
            // Handle expected structure like { success: true, data: {...} } if applicable
            // Or just return the body if it contains the needed data directly (like the time)
            if (responseBody.success === true && typeof responseBody.data !== 'undefined') {
                return { success: true, data: responseBody.data };
            }
            return { success: true, data: responseBody }; // Return whole body as data
        } else {
            // console.warn(`[transport] Received empty successful response body from ${url}.`);
            return { success: true, data: (method === 'GET' ? [] : null) };
        }

    } catch (err) {
        // Outer catch handles re-thrown errors
        const errorMessage = responseBody?.message || responseBody?.error // Check error body first
                           || err.statusMessage     // Then status message
                           || err.message           // Then generic message
                           || `Failed ${method} request.`; // Fallback
        const statusCode = responseStatus || err.response?.status || err.statusCode || 500;
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}

// --- Exported API Service Functions ---

export async function fetchTransportRecords(params = {}) {
    const url = `${API_BASE_URL}${ENDPOINTS.RECORDS}`;
    return await makeApiRequest(url, 'GET', { query: params });
}

export async function markAsDeparted(id) {
    // Basic validation for ID
    if (!id && id !== 0) { console.error('[transport] Missing ID for markAsDeparted.'); return { success: false, error: { message: 'Record ID is required for departure.', statusCode: 400 } }; }
    const url = `${API_BASE_URL}${ENDPOINTS.DEPART(id)}`;
    // Expects response body like { departure_time: '...' } in data field
    return await makeApiRequest(url, 'POST');
}

export async function markAsArrived(id) {
    // Basic validation for ID
    if (!id && id !== 0) { console.error('[transport] Missing ID for markAsArrived.'); return { success: false, error: { message: 'Record ID is required for arrival.', statusCode: 400 } }; }
    const url = `${API_BASE_URL}${ENDPOINTS.ARRIVE(id)}`;
     // Expects response body like { return_time: '...' } in data field
    return await makeApiRequest(url, 'POST');
}