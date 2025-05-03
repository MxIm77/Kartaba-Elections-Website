const API_BASE_URL = 'https://kartaba-2040.com/api';
const MODERATOR_LIST_ENDPOINT = '/moderator/getrows';

export async function fetchModeratorRecords() {
    const moderatorDataUrl = `${API_BASE_URL}${MODERATOR_LIST_ENDPOINT}`;
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return { success: false, error: { message: 'Authentication token not found.' } };
        }
        const responseData = await $fetch(moderatorDataUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (Array.isArray(responseData)) {
            return { success: true, data: responseData };
        } else if (responseData && Array.isArray(responseData.data)) {
            return { success: true, data: responseData.data };
        } else {
            return { success: false, error: { message: 'Invalid data format received.' } };
        }
    } catch (err) {
        const errorMessage = err.data?.message || err.statusMessage || err.message || 'Failed to fetch records.';
        const statusCode = err.response?.status || err.statusCode;
        return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
}
