// Uses globally available $fetch
/**
 * Fetches election records from the backend API using the stored token.
 */
export async function fetchElectionData() { // Renamed for clarity
    const API_BASE_URL = 'https://nigga.free.beeceptor.com'; // Your API Base URL (NO TRAILING SLASH)
    const electionDataUrl = `${API_BASE_URL}/api/election-data`;
  
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('[electionService] No auth token in localStorage.');
        return { success: false, error: { message: 'Auth token not found.' } };
      }
  
      console.log(`[electionService] Fetching data via Authorization header from ${electionDataUrl} (GET request) using $fetch`);
      const responseData = await $fetch(electionDataUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      console.log('[electionService] /api/election-data successful:', responseData);
      // Basic validation: Ensure responseData has a 'records' array
      if (!responseData || !Array.isArray(responseData.records)) {
         console.error('[electionService] API response missing or has invalid "records" array.');
         return { success: false, error: { message: 'Invalid data structure received from API.' } };
      }
  
      return { success: true, data: responseData }; // Return the object { records: [...] }
  
    } catch (err) {
      console.error('[electionService] /api/election-data failed:', err);
      const errorMessage = err.data?.message || err.message || 'Failed to fetch election data.';
      const statusCode = err.response?.status;
      return { success: false, error: { message: errorMessage, statusCode: statusCode } };
    }
  }