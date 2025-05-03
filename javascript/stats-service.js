// ~/javascript/stats-service.js

// Define the base URL for your API
const API_BASE_URL = 'http://192.168.10.103:4040'; // Use const for fixed values
const STATS_ENDPOINT = '/team/getrows/statistics';
const RECORDS_PER_ROW = 25; // Define the multiplier

/**
 * Fetches initial voting statistics from the backend API.
 * Requires an authentication token from localStorage.
 * @returns {Promise<{success: boolean, data?: {overallVoted: number, overallNotVoted: number, totalProcessed: number}, error?: string}>}
 */
export async function fetchInitialStats() {
    console.log("Fetching initial statistics from API...");
    const token = localStorage.getItem('authToken');

    if (!token) {
        console.error("Authentication token not found.");
        return { success: false, error: "Authentication required. Please log in again." };
    }

    try {
        const response = await fetch(`${API_BASE_URL}${STATS_ENDPOINT}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Assuming Bearer token authentication
                'Content-Type': 'application/json',
                 // Add other headers if required by your API
            },
        });

        if (!response.ok) {
            // Attempt to read error message from backend if available
            let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
            try {
                 const errorData = await response.json();
                 errorMsg = errorData.message || errorData.detail || errorMsg; // Common error field names
            } catch (e) {
                 // Ignore if response body isn't JSON or empty
            }
            console.error("API Error:", errorMsg);
            throw new Error(errorMsg); // Throw error to be caught below
        }

        const data = await response.json();

        // Validate the received data structure
        if (typeof data.total_voted !== 'number' || typeof data.total_rows !== 'number') {
             console.error("Invalid data structure received from statistics API:", data);
             throw new Error("Invalid data structure received from API.");
        }

        const totalVoted = data.total_voted;
        const totalRows = data.total_rows;
        const totalProcessed = totalRows;
        const totalNotVoted = totalProcessed - totalVoted;

        // Ensure notVoted isn't negative (data sanity check)
        if (totalNotVoted < 0) {
             console.warn(`Calculated 'notVoted' is negative (${totalNotVoted}). Clamping to 0. Check API data (total_voted: ${totalVoted}, total_rows: ${totalRows}).`);
        }
        const overallNotVoted = Math.max(0, totalNotVoted); // Clamp to zero if negative

        console.log("Initial stats fetched successfully:", { overallVoted: totalVoted, overallNotVoted, totalProcessed });
        return {
            success: true,
            data: {
                overallVoted: totalVoted,
                overallNotVoted,
                totalProcessed
            }
        };

    } catch (error) {
        console.error("Error fetching initial stats:", error);
        return {
            success: false,
            // Provide a user-friendly error message
            error: error.message || "An unexpected error occurred while fetching statistics."
        };
    }
}