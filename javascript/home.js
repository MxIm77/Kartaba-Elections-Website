import { useFetch } from '#app';

export async function checkSession() {
  const checkSessionUrl = 'http://192.168.10.103:4040/check-session';

  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      return {
        success: false,
        error: 'No authentication token found. Please log in.'
      };
    }

    const { data, error } = await useFetch(checkSessionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      ignoreResponseError: true,
      watch: false
    });

    if (!error.value) {
      return {
        success: true,
        data: data.value,
      };
    } else {
      return {
        success: false,
        error: error.value.data?.message
             || error.value.message
             || data.value?.message
             || (error.value.statusCode === 401 ? 'Session invalid or expired (Unauthorized)' : 'Session check failed (token auth).')
      };
    }

  } catch (err) {
    return {
      success: false,
      error: { message: 'An unexpected client-side error occurred during session checking (token auth).' }
    };
  }
}
