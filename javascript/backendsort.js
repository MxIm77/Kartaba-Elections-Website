import { $fetch } from 'ofetch';
const API_BASE_URL = 'http://192.168.10.103:4040';

export async function fetchFilteredRecords(filters) {
  const filterUrl = `${API_BASE_URL}/team/find`;

  try {
    const token = localStorage.getItem('authToken');
    if (!token) return { success: false, error: { message: 'Auth token not found.' } };

    const requestBody = {
      name: filters.name,
      father: filters.father,
      family: filters.family,
      register: filters.register
    };
    console.log('[fetchFilteredRecords - No Pagination] Sending Request Body:', JSON.stringify(requestBody));

    const responseData = await $fetch(filterUrl, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
       },
      body: JSON.stringify(requestBody)
    });

    if (Array.isArray(responseData)) {
      console.log('[fetchFilteredRecords - No Pagination] Received direct array response.');
      return {
        success: true,
        records: responseData
      };
    } else {
      console.error('[fetchFilteredRecords - No Pagination] Invalid filter response structure. Expected Array, received:', responseData);
      return { success: false, error: { message: 'Invalid response structure from filter endpoint (expected array).' } };
    }

  } catch (err) {
    const statusCode = err.response?.status;
    let errorMessage = `Failed to fetch filtered records.`;
    if (err.data?.message) { errorMessage = `Server error: ${err.data.message}`; }
    else if (err.data) { errorMessage = `Server responded with error: ${JSON.stringify(err.data)}`; }
    else if (err.message) { errorMessage = err.message; }
    console.error(`[fetchFilteredRecords - No Pagination] Error fetching filtered records: ${errorMessage}`, err);
    return { success: false, error: { message: errorMessage, statusCode: statusCode } };
  }
}
