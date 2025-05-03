export async function login(username, password) {
  const backendUrl = 'https://kartaba-2040.com/api';
  const loginUrl = `${backendUrl}/login`;

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    let responseData = {};
    try {
      responseData = await response.clone().json();
    } catch (jsonError) {}

    if (response.ok) {
      const authHeader = response.headers.get('Authorization');

      let extractedToken = null;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        extractedToken = authHeader.substring(7);
      }

      if (extractedToken) {
        localStorage.setItem('authToken', extractedToken);
        return {
          success: true,
          data: { username: responseData?.username || username },
        };
      } else {
        return {
          success: false,
          error: { message: 'Login succeeded but the authentication token was missing or invalid in the response headers.' }
        };
      }

    } else {
      return {
        success: false,
        error: { message: responseData?.message || `Login failed with status: ${response.status}` }
      };
    }

  } catch (err) {
    return {
      success: false,
      error: { message: 'An unexpected client-side error occurred during login.' }
    };
  }
}
