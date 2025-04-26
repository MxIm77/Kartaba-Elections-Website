// Remove googleapis import if it's not used elsewhere in this file
// import { google } from 'googleapis';
// import path from 'path';

// Using Nuxt 3's $fetch is generally preferred within Nuxt projects.
// If not in Nuxt 3 or if $fetch isn't available, you might need standard 'fetch'
// and potentially install 'node-fetch' for older Node versions.

export default defineEventHandler(async (event) => {
  let id: string | number | undefined; // Define id outside the try block for logging

  try {
    const body = await readBody(event);
    id = body.id; // Assign id from the request body

    // Target your specific deployed Apps Script Web App URL
    const webAppUrl = 'https://script.google.com/macros/s/AKfycbwnwn5FlV_JkDkGKXdF5rbg7xZNu9uMiYz4LQxzQKxBko_CO9W5sJ7VBouzHaZ5Uk83/exec'; // <<< YOUR DEPLOYED URL

    // --- Input Validation ---
    if (!id) {
      console.error('API Error: Missing ID in request body');
      event.node.res.statusCode = 400; // Bad Request
      return { success: false, message: 'Missing ID in request payload' };
    }

    // Ensure ID is a string for consistency, trim whitespace
    const idString = String(id).trim();
    if (idString === "") {
        console.error('API Error: Empty ID provided in request body');
        event.node.res.statusCode = 400; // Bad Request
        return { success: false, message: 'Empty ID provided' };
    }

    console.log(`[Website API] Received ID: ${idString}. Attempting POST to Web App: ${webAppUrl}`);

    // --- Send POST Request to Google Apps Script Web App ---
    // Using $fetch (Nuxt 3 helper)
    const webAppResponse = await $fetch<{ status: string; message: string; appendedRow?: number }>(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Body MUST be a JSON string containing the 'id' field
      body: JSON.stringify({ id: idString }),
      // $fetch throws errors on non-2xx responses by default, which is good here
    });

    /*
    // Alternative using standard fetch:
    const fetchResponse = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idString }),
    });

    if (!fetchResponse.ok) {
      // Handle HTTP errors (4xx, 5xx) from the Web App URL itself
      const errorText = await fetchResponse.text();
      console.error(`[Website API] Web App returned HTTP error ${fetchResponse.status}: ${errorText}`);
      throw new Error(`Google Apps Script Web App request failed with status ${fetchResponse.status}`);
    }
    const webAppResponse = await fetchResponse.json(); // Parse the JSON response from Apps Script
    */

    console.log('[Website API] Raw Web App Response:', webAppResponse);

    // --- Process Response from Web App ---
    if (webAppResponse && webAppResponse.status === 'success') {
      console.log(`[Website API] Successfully triggered Apps Script for ID ${idString}. Message: ${webAppResponse.message}`);
      // Return success to the original caller of *this* API endpoint
      return { success: true, message: `Apps Script Triggered Successfully for ID ${idString}. Detail: ${webAppResponse.message}`, row: webAppResponse.appendedRow };
    } else {
      // Handle cases where the Apps Script doPost function reported an error in its JSON response
      const errorMessage = webAppResponse ? webAppResponse.message : 'Unknown error structure from Web App';
      console.error(`[Website API] Apps Script processing failed for ID ${idString}. Error reported by script: ${errorMessage}`);
      event.node.res.statusCode = 502; // Bad Gateway (indicates upstream failure)
      return { success: false, message: `Apps Script failed: ${errorMessage}` };
    }

  } catch (error: any) {
    // --- Handle Errors during the fetch/POST process ---
    console.error(`[Website API] CRITICAL ERROR processing ID ${id || 'unknown'}. Error: ${error.message}`);

    // Log details if available (especially useful for $fetch errors)
    if (error.response) {
        console.error('[Website API] Error Response Status:', error.response.status);
        console.error('[Website API] Error Response Body:', error.response._data); // $fetch specific detail
    } else {
        console.error('[Website API] Full Error Object:', error); // Log the whole error if no specific response details
    }

    // Return a server error status to the original caller
    event.node.res.statusCode = 500; // Internal Server Error
    // Provide a generic error message to the client for security
    return { success: false, message: 'Internal server error while contacting Google Apps Script.' };
  }
});