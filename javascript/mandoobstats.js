const API_BASE_URL = 'http://192.168.10.103:4040';
const STATS_ENDPOINT = '/statistics/total';

export async function fetchInitialStats() {
    const token = localStorage.getItem('authToken');

    if (!token) {
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
            } catch (e) {}
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (typeof data.total_voted !== 'number') {
            throw new Error("Invalid statistics data received from API ('total_voted' missing or invalid).");
        }

        return {
            success: true,
            data: {
                overallVoted: data.total_voted
            }
        };

    } catch (error) {
        return {
            success: false,
            error: error.message || "An unexpected error occurred while fetching statistics."
        };
    }
}
