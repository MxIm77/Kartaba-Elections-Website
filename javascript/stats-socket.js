// ~/javascript/stats-socket.js
// (Content from previous answer - assumed correct)

const WEBSOCKET_URL = 'ws://localhost:8000/ws/updates/'; // !!! UPDATE THIS TO YOUR ACTUAL WS URL !!!
// If your stats updates use a different path, change it here.
// Example: const WEBSOCKET_URL = 'ws://192.168.10.103:4040/ws/stats';

/**
 * Creates and manages a WebSocket connection.
 * @param {Function} onMessageCallback - Function for received messages.
 * @param {Function} onOpenCallback - Function for connection open.
 * @param {Function} onErrorCallback - Function for WebSocket errors.
 * @param {Function} onCloseCallback - Function for connection close.
 * @returns {WebSocket | null} The WebSocket instance or null on failure.
 */
export function createStatsWebSocketConnection(onMessageCallback, onOpenCallback, onErrorCallback, onCloseCallback) {
    console.log(`Attempting WebSocket connection to: ${WEBSOCKET_URL}`);
    try {
        const socket = new WebSocket(WEBSOCKET_URL); // Use the configured URL

        socket.onopen = (event) => {
            console.log('WebSocket connection opened:', event);
            if (onOpenCallback) onOpenCallback(event);
        };

        socket.onmessage = (event) => {
            if (onMessageCallback) onMessageCallback(event);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (onErrorCallback) onErrorCallback(error);
        };

        socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            if (onCloseCallback) onCloseCallback(event);
        };

        return socket;

    } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        if (onErrorCallback) onErrorCallback(error);
        return null;
    }
}