// ~/javascript/electionservice.js

import { $fetch } from 'ofetch';

const API_BASE_URL = 'http://192.168.10.103:4040';
const ITEMS_PER_PAGE = 25;

export async function fetchInitialDataAndCount() {
  const initialDataUrl = `${API_BASE_URL}/team/getrows`;
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return { success: false, error: { message: 'Auth token not found.' } };
    const responseData = await $fetch(initialDataUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    if (!responseData || typeof responseData !== 'object') return { success: false, error: { message: 'Invalid initial response (not an object).' } };
    if (typeof responseData.row_count !== 'number') return { success: false, error: { message: 'Invalid initial response (missing row_count number).' } };
    return { success: true, count: responseData.row_count, districts: responseData.districts, sexes: responseData.sexes, registers: responseData.registers };
  } catch (err) {
    const statusCode = err.response?.status;
    let errorMessage = 'Failed to fetch initial election data.';
    if (err.data?.message) errorMessage = `Server error: ${err.data.message}`;
    else if (err.data) errorMessage = `Server responded with error: ${JSON.stringify(err.data)}`;
    else if (err.message) errorMessage = err.message;
    return { success: false, error: { message: errorMessage, statusCode: statusCode } };
  }
}

export async function fetchRecordsPage(page = 1) {
  const endOffset = page * ITEMS_PER_PAGE;
  const pageDataUrl = `${API_BASE_URL}/team/getrows/${endOffset}`;
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return { success: false, error: { message: 'Auth token not found.' } };
    const responseData = await $fetch(pageDataUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    // --- >>> CORRECTED VALIDATION <<< ---
    // Check if the response ITSELF is the array of records
    if (Array.isArray(responseData)) {
      // If yes, return it directly
      return { success: true, records: responseData };
    }
    // Oherwise, check if it's an object containing a 'records' array (original check)
    else if (responseData && typeof responseData === 'object' && Array.isArray(responseData.records)) {
       return { success: true, records: responseData.records };
    }
    // If neither case matches, the structure is wrong
    else {
       console.error(`[electionService] Page ${page} response is not an array and not an object with a 'records' array:`, responseData);
       return { success: false, error: { message: `Invalid page ${page} response structure.` } };
    }
    // --- >>> END CORRECTION <<< ---

  } catch (err) {
    const statusCode = err.response?.status;
    let errorMessage = `Failed to fetch page ${page}.`;
    if (err.data?.message) errorMessage = `Server error: ${err.data.message}`;
    else if (err.data) errorMessage = `Server responded with error: ${JSON.stringify(err.data)}`;
    else if (err.message) errorMessage = err.message;
    return { success: false, error: { message: errorMessage, statusCode: statusCode } };
  }
}