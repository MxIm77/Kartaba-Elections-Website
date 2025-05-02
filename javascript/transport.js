// ~/transport.js

const API_BASE_URL = 'http://192.168.10.103:4040';

const RECORDS_ENDPOINT = '/logistics/taxi/getrows';
const DEPART_ENDPOINT = '/transport/depart';
const ARRIVE_ENDPOINT = '/transport/arrive';

async function makeApiRequest(url, method = 'GET', options = {}) {
    console.log(`[transport] Requesting ${method} ${url}`);
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[transport] No auth token found.');
            return { success: false, error: { message: 'Authentication token not found.', statusCode: 401 } };
        }

        const responseData = await $fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...(options.body && typeof options.body === 'object' && { 'Content-Type': 'application/json' }),
                ...options.headers,
            },
            body: (options.body && typeof options.body === 'object') ? JSON.stringify(options.body) : options.body,
            query: options.query,
            ...options,
        });

        if (responseData !== undefined && responseData !== null) {
             console.log(`[transport] Received successful response from ${url}.`);
             if (responseData.success === true && responseData.data) {
                 return { success: true, data: responseData.data };
             }
             return { success: true, data: responseData };
        } else {
             console.warn(`[transport] Received potentially empty but successful response from ${url}.`);
             return { success: true, data: (method === 'GET' ? [] : null) };
        }
    } catch (err) {
        console.error(`[transport] API Request Failed for ${method} ${url}:`, err);
        const errorMessage = err.data?.message || err.data?.error || err.statusMessage || err.message || `Failed ${method} request.`;
        const statusCode = err.response?.status || err.statusCode || 500;
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}

export async function fetchTransportRecords(params = {}) {
    const url = `${API_BASE_URL}${RECORDS_ENDPOINT}`;
    return await makeApiRequest(url, 'GET', { query: params });
}

export async function markAsDeparted(id) {
    const url = `${API_BASE_URL}${DEPART_ENDPOINT}/${id}`;
    return await makeApiRequest(url, 'POST');
}

export async function markAsArrived(id) {
    const url = `${API_BASE_URL}${ARRIVE_ENDPOINT}/${id}`;
    return await makeApiRequest(url, 'POST');
}