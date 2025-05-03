// ~/javascript/socket.js

/**
 * Creates and returns a WebSocket connection instance.
 * Does not handle event listeners here, they should be attached
 * by the caller after the instance is created.
 *
 * @returns {WebSocket|null} The WebSocket instance or null on failure (e.g., no token).
 */
export function createWebSocketConnection() {
    const token = localStorage.getItem('authToken');

    if (!token) {
        console.warn('[socket.js] No auth token found in localStorage.');
        return null;
    }

    // Ensure ws:// protocol for standard WebSocket
    const wsUrl = `ws://kartaba-2040.com/api/team/broadcast/connect?token=${encodeURIComponent(token)}`;

    try {
        const socket = new WebSocket(wsUrl);
        console.log('[socket.js] WebSocket object created for URL:', wsUrl);
        return socket;
    } catch (error) {
        console.error('[socket.js] Error creating WebSocket:', error);
        return null;
    }
}