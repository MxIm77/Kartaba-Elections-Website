/**
 * Handles user login, sends credentials, reads the token from the response HEADER,
 * and stores it in localStorage.
 *
 * @param {string} username - The username.
 * @param {string} password - The user's password.
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function login(username, password) {
  const backendUrl = 'http://192.168.10.179:4040'; // Using Beeceptor endpoint
  const loginUrl = `${backendUrl}/login`;

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    // Try parsing JSON body anyway, maybe it contains user info like username
    let responseData = {};
    try {
        // Use clone() in case you need to read the body again later, though unlikely here.
        // It's safer if there might be other processing.
        responseData = await response.clone().json();
    } catch (jsonError) {
        console.warn('Login response body was not valid JSON or empty.');
        // It's okay if the body isn't JSON if the token is in the header
    }


    if (response.ok) { // Check if HTTP status is 2xx
      console.log('Login API successful (HTTP Status OK). Response Body:', responseData);

      // --- Read token from HEADER ---
      // Adjust 'Authorization' if your backend uses a different header name (e.g., 'X-Auth-Token')
      const authHeader = response.headers.get('Authorization');
      console.log('Received Authorization header:', authHeader); // Log the raw header value

      let extractedToken = null;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
         // Extract the token part after "Bearer "
         extractedToken = authHeader.substring(7); // "Bearer ".length is 7
      } else if (authHeader) {
         // Maybe the backend sends the token directly without "Bearer "? Adapt if necessary.
         // Or maybe it's in a different header like 'X-Auth-Token'
         // Example for a different header: extractedToken = response.headers.get('X-Auth-Token');
         console.warn(`Authorization header found but doesn't start with 'Bearer ': ${authHeader}`);
         // If the token is directly in the header without 'Bearer ', uncomment below:
         // extractedToken = authHeader;
      }

      // --- Store token if found ---
      if (extractedToken) {
        localStorage.setItem('authToken', extractedToken);
        console.log('Auth token extracted from header and stored in localStorage:', extractedToken);

        return {
          success: true,
          // Include username from body if available, otherwise fallback
          data: { username: responseData?.username || username },
        };
      } else {
        // Login was OK, but the expected header/token was missing or invalid
        console.error('Login successful, but token was missing or invalid in response headers.');
        return {
          success: false,
          error: { message: 'Login succeeded but the authentication token was missing or invalid in the response headers.' }
        };
      }
      // --- End token processing ---

    } else {
      // Handle failed login (Non-2xx status)
      console.error(`Login API failed (HTTP Status ${response.status}):`, responseData);
      return {
        success: false,
        error: { message: responseData?.message || `Login failed with status: ${response.status}` }
      };
    }

  } catch (err) {
    // Handle network or unexpected errors
    console.error('Unexpected error in login service try-catch:', err);
    return {
      success: false,
      error: { message: 'An unexpected client-side error occurred during login.' }
    };
  }
}