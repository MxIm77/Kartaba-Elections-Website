const API_BASE_URL = 'http://192.168.10.103:4040';
const MANDOOB_LIST_ENDPOINT = '/mandoob/getrows';
const MANDOOB_UPDATE_ENDPOINT = '/mandoob/updatevote';

export async function fetchMandoobRecords() {
    const mandoobDataUrl = `${API_BASE_URL}${MANDOOB_LIST_ENDPOINT}`;
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return { success: false, error: { message: 'Authentication token not found.' } };
        }
        const responseData = await $fetch(mandoobDataUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (Array.isArray(responseData)) {
            return { success: true, data: responseData };
        } else {
            return { success: false, error: { message: 'Invalid data format received (expected array).' } };
        }
    } catch (err) {
        const errorMessage = err.data?.message || err.statusMessage || err.message || 'Failed to fetch records.';
        const statusCode = err.response?.status || err.statusCode;
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}

export async function updateMandoobVote(id) {
    const updateUrl = `${API_BASE_URL}${MANDOOB_UPDATE_ENDPOINT}/${id}`;
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return { success: false, error: { message: 'Authentication token not found.' } };
        }

        const response = await $fetch(updateUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response && (response.success === true || response.message || typeof response !== 'object' || response === null)) {
             return { success: true, message: response?.message || `Vote status updated for ${id}.` };
        } else if (response === undefined || response === null) {
            return { success: true, message: `Vote status updated for ${id}.` };
        } else {
            const failureMsg = response?.message || response?.error || 'Backend reported an issue with the update.';
            return { success: false, error: { message: failureMsg } };
        }
    } catch (err) {
        const errorMessage = err.data?.message || err.statusMessage || err.message || 'Failed to update vote status.';
        const statusCode = err.response?.status || err.statusCode;
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}
