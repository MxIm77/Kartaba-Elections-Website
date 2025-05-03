import { $fetch } from 'ofetch';

const API_BASE_URL = 'https://kartaba-2040.com/api';

export async function revokeVote(recordId) {
  const revokeUrl = `${API_BASE_URL}/team/revokevote/${recordId}`;

  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { success: false, error: { message: 'Auth token not found.' } };
    }

    await $fetch(revokeUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return { success: true };

  } catch (err) {
    const statusCode = err.response?.status;
    let errorMessage = 'Failed to revoke vote.';

    if (err.data?.message) {
      errorMessage = err.data.message;
    } else if (err.data) {
      errorMessage = JSON.stringify(err.data);
    } else if (err.message) {
      errorMessage = err.message;
    }

    return { success: false, error: { message: errorMessage, statusCode } };
  }
}
