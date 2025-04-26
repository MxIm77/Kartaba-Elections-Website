// server/api/login.post.ts (or .js)

import { defineEventHandler, readBody, H3Event } from 'h3'; // Import readBody and H3Event from h3
// No need to import $fetch explicitly, it's available globally in Nuxt server routes

export default defineEventHandler(async (event: H3Event) => { // Add type for event
  let userId: string | undefined;
  let password: string | undefined;

  try {
    // Read the body of the request (sent from the login form component)
    const body = await readBody(event);
    userId = body.userId;   // Get user ID (Session ID) from the client request body
    password = body.password; // Get password from the client request body

    // URL to the deployed Google Apps Script Web App
    // *** UPDATED THIS URL ***
    const webAppUrl = 'https://script.google.com/macros/s/AKfycbwg7lUaQUYnpq_ZB6zuOlnUD5tyV6ZMBZ8qvc6vWvvKd7K9jou6gUMOF8x7DZe4Qcb4/exec'; // Your NEW Google Apps Script Web App URL
    // Ensure this URL is correct and accessible

    // --- Input Validation ---
    if (!userId || !password) {
      console.error('API Error: Missing ID or Password in request body');
      // Set the response status code and return a structured error
      event.node.res.statusCode = 400; // Bad Request
      return { success: false, message: 'Missing Session ID or Passcode in request payload' };
    }

    // Ensure userId and password are treated as strings and trim whitespace
    const userIdString = String(userId).trim();
    const passwordString = String(password).trim();

    if (userIdString === "" || passwordString === "") {
      console.error('API Error: Empty ID or Password provided');
      event.node.res.statusCode = 400; // Bad Request
      return { success: false, message: 'Empty Session ID or Passcode provided' };
    }

    console.log(`[Website API] Received ID: ${userIdString}. Attempting POST to Web App: ${webAppUrl}`);

    // --- Send POST Request to Google Apps Script Web App ---
    // Define a type for the expected response from the Apps Script
    interface AppsScriptResponse {
        status: string;
        message: string;
        userExists: boolean; // Assuming your Apps Script returns this field
    }

    const webAppResponse = await $fetch<AppsScriptResponse>(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Send both ID and password to the Apps Script as the Apps Script expects
      body: JSON.stringify({ id: userIdString, password: passwordString }),
    });

    console.log('[Website API] Web App Response:', webAppResponse);

    // --- Process Response from Web App ---
    // Check the structure and values of the response from your Apps Script
    if (webAppResponse && webAppResponse.status === 'success' && webAppResponse.userExists) {
      console.log(`[Website API] Login successful for ID ${userIdString}. Message: ${webAppResponse.message}`);
      // Return a success response to the client
      event.node.res.statusCode = 200; // OK
      return { success: true, message: `Login successful for ID ${userIdString}.` };
    } else {
      // Handle cases where Apps Script indicates failure or user not found
      console.error(`[Website API] Login failed for ID ${userIdString}. Error reported by script: ${webAppResponse?.message || 'No message from script'}`);
      // Return an unauthorized response to the client
      event.node.res.statusCode = 401; // Unauthorized
      return { success: false, message: webAppResponse?.message || 'Invalid credentials.' }; // Use message from script if available
    }

  } catch (error: any) {
    // Handle errors that occur during the process (e.g., network issues, invalid JSON)
    console.error(`[Website API] CRITICAL ERROR processing login for ID ${userId || 'unknown'}. Error: ${error.message}`);

    // Log more details for specific errors like $fetch errors
    if (error.response) {
       // This is often available with $fetch errors for non-2xx responses
       console.error('[Website API] Error Response Status:', error.response.status);
       // access response body carefully, depends on the exact error structure
       // console.error('[Website API] Error Response Body:', await error.response.json());
    } else if (error.request) {
       // The request was made but no response was received
       console.error('[Website API] Error Request:', error.request);
    } else {
       // Something happened in setting up the request that triggered an Error
       console.error('[Website API] Full Error Object:', error);
    }


    // Return a generic server error response to the client
    event.node.res.statusCode = 500; // Internal Server Error
    return { success: false, message: 'An internal server error occurred during the login process.' };
  }
});