// ~/javascript/stats-service.js

// Define the base URL for your API
const API_BASE_URL = 'http://192.168.10.103:4040'; // Use const for fixed values
const STATS_ENDPOINT = '/statistics/total';
// const RECORDS_PER_ROW = 25; // Not used if totalProcessed = total_rows
// ~/javascript/stats-service.js

/**
 * Fetches the total voted count from the backend API.
 * Requires an authentication token from localStorage.
 * Expects response like: {"total_voted": number}
 * @returns {Promise<{success: boolean, data?: {overallVoted: number}, error?: string}>}
 */
export async function fetchInitialStats() {
    console.log("Fetching total voted count from API...");
    const token = localStorage.getItem('authToken');

    if (!token) {
        console.error("Authentication token not found.");
        return { success: false, error: "Authentication required. Please log in again." };
    }

    try {
        const response = await fetch(`${API_BASE_URL}${STATS_ENDPOINT}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
            try {
                 const errorData = await response.json();
                 errorMsg = errorData.message || errorData.detail || errorMsg;
            } catch (e) { /* Ignore */ }
            console.error("API Error fetching stats:", errorMsg);
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // --- VALIDATION: Check only for total_voted ---
        if (typeof data.total_voted !== 'number') {
             console.error("Invalid data structure: 'total_voted' is missing or not a number.", data);
             throw new Error("Invalid statistics data received from API ('total_voted' missing or invalid).");
        }
        // --- END VALIDATION ---

        const totalVoted = data.total_voted;

        console.log("Total voted count fetched successfully:", totalVoted);

        // --- Return only the voted count ---
        return {
            success: true,
            data: {
                overallVoted: totalVoted
            }
        };
        // ----------------------------------

    } catch (error) {
        console.error("Error fetching/processing total voted count:", error);
        return {
            success: false,
            error: error.message || "An unexpected error occurred while fetching statistics."
        };
    }
}