// ~/privatetransport.js

const API_BASE_URL = 'http://192.168.10.179:4040';

const ENDPOINTS = {
    RECORDS: '/logistics/private/getrows',
};

async function makeApiRequest(endpoint, method = 'GET', options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('[privatetransport] No authentication token found.');
        return { success: false, error: { message: 'Authentication token not found.', statusCode: 401 } };
    }

    try {
        const responseData = await $fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...(method === 'POST' || method === 'PUT' || method === 'PATCH') && { 'Content-Type': 'application/json' },
                ...options.headers,
            },
            ...options, 
        });

        if (responseData && responseData.success === true && typeof responseData.data !== 'undefined') {
            return { success: true, data: responseData.data };
        } else {
            return { success: true, data: responseData };
        }

    } catch (err) {
        console.error(`[privatetransport] API Request Failed: ${method} ${url}`, err);

        const statusCode = err.response?.status || err.statusCode;
        let message = `API request failed for ${method} ${endpoint}.`;

        if (err.data?.message) {
            message = err.data.message;
        } else if (err.statusMessage) {
            message = err.statusMessage;
        } else if (err.message) {
            message = err.message;
        }

        return { success: false, error: { message, statusCode } };
    }
}

export async function fetchPrivateTransportRecords(params = {}) {
    const options = Object.keys(params).length > 0 ? { query: params } : {};
    return await makeApiRequest(ENDPOINTS.RECORDS, 'GET', options);
}

export async function fetchPrivateCarStatuses() {
    return await makeApiRequest(ENDPOINTS.STATUSES, 'GET');
}

export async function fetchRouteTypes() {
    return await makeApiRequest(ENDPOINTS.TYPES, 'GET');
}
