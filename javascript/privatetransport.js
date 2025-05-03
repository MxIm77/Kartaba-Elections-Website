const API_BASE_URL = 'https://kartaba-2040.com/api';

const ENDPOINTS = {
    RECORDS: '/logistics/private/getrows',
    STATUSES: '/logistics/private/statuses', // Add these if they exist in your backend
    TYPES: '/logistics/private/types'
};

async function makeApiRequest(endpoint, method = 'GET', options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');

    if (!token) {
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
        const statusCode = err.response?.status || err.statusCode;
        const message = err.data?.message || err.statusMessage || err.message || `API request failed for ${method} ${endpoint}.`;

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
