import { defineEventHandler, readBody, H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  try {
    const { userId, password } = await readBody(event);

    if (!userId || !password || String(userId).trim() === '' || String(password).trim() === '') {
      event.node.res.statusCode = 400;
      return { success: false, message: 'Session ID and Passcode are required.' };
    }

    const webAppUrl = 'https://elections.free.beeceptor.com/login';

    interface BeeceptorResponse {
      status: string;
      message: string;
      userExists: boolean;
    }

    const response = await $fetch<BeeceptorResponse>(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: String(userId).trim(), password: String(password).trim() }),
      responseType: 'json',
    });

    console.log('[Login] Beeceptor Response:', response);

    if (response.status === 'success' && response.userExists) {
      return { success: true, message: `Login successful for ID ${userId}` };
    } else {
      event.node.res.statusCode = 401;
      return { success: false, message: response.message || 'Invalid credentials.' };
    }

  } catch (error: any) {
    console.error('[Login] Server error:', error?.message || error);
    event.node.res.statusCode = 500;
    return { success: false, message: 'Internal server error during login.' };
  }
});
