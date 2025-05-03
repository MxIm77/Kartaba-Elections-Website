<template>
  <div class="wrapper elections-page">
    <!-- Notification Area -->
    <div class="notification-container">
        <!-- Vote Update Popup -->
        <transition name="fade">
          <div v-if="voteNotificationMessage" class="vote-notification-wrapper">
             <VotedUpdated :message="voteNotificationMessage" />
          </div>
        </transition>
        <!-- Logistics Update Popup -->
        <transition name="fade">
          <div v-if="logisticsNotificationMessage" class="logistics-notification-wrapper">
             <LogisticsUpdate :message="logisticsNotificationMessage" />
          </div>
        </transition>
        <!-- Warning Popup -->
        <transition name="fade">
          <div v-if="warningNotificationMessage" class="warning-notification-wrapper">
             <WarningPopup :message="warningNotificationMessage" />
          </div>
        </transition>
        <!-- Disconnect/Severe Warning Popup -->
        <transition name="fade">
          <div v-if="disconnectNotificationMessage" class="disconnect-notification-wrapper">
             <!-- Ensure correct component name -->
             <DisconnectPopup :message="disconnectNotificationMessage" />
          </div>
        </transition>
    </div>
    <!-- End Notification Area -->

    <div class="top-bar">
      <button @click="handleLogout" class="logout-btn">
        Logout ({{ currentUser || '...' }})
      </button>
      <button @click="toggleLiveConnection" :disabled="connecting || recordsLoading" class="live-btn" :class="{ 'live-active': isLive }">
        <span v-if="connecting" class="loading-spinner small"></span>
        {{ isLive ? 'Stop Live Updates' : 'Go Live' }}
      </button>
    </div>

    <nav class="main-nav">
      <NuxtLink to="/elections" exact-active-class="router-link-active">Election Management</NuxtLink>
      <!-- Add link to stats page -->
      <NuxtLink to="/stats" exact-active-class="router-link-active">Voting Statistics</NuxtLink>
      <!-- Add link to transport page if it exists -->
      <!-- <NuxtLink to="/transport" exact-active-class="router-link-active">Transport Management</NuxtLink> -->
    </nav>

    <h1 style="margin-top: 20px;">Election Management</h1>

    <transition name="fade">
      <div v-if="successMessage" class="message success-message">
        <span>{{ successMessage }}</span>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="errorMessage" class="message error-message">
        <span>{{ errorMessage }}</span>
      </div>
    </transition>

    <!-- Filters are currently disabled in the logic -->
    <div class="filter-container">
       <form @submit.prevent.stop>
        <div class="form-group">
          <label for="district">Select District:</label>
          <select id="district" v-model="selectedDistrict" @change="handleDistrictChange" :disabled="true">
            <option v-if="districtsLoading" value="" disabled>Loading...</option>
            <option v-else value="">All Districts</option>
            <option v-for="district in districtOptions" :key="district.value" :value="district.value">{{ district.text }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="register">Select Register:</label>
          <select id="register" v-model="selectedRegister" :disabled="true">
             <!-- Add disabled state based on loading or no district selected -->
            <option value="" :disabled="registersLoading || !selectedDistrict">All Registers</option>
            <option v-if="registersLoading" value="" disabled>Loading...</option>
            <!-- Only show options if not loading and registers are populated -->
            <template v-else-if="!registersLoading && registerOptions.length > 0">
              <option v-for="register in registerOptions" :key="register" :value="register">Register {{ register }}</option>
            </template>
             <option v-else-if="!registersLoading && selectedDistrict && registerOptions.length === 0" value="" disabled>No registers found</option>
              <option v-else-if="!registersLoading && !selectedDistrict" value="" disabled>Select district first</option>
          </select>
        </div>
        <div class="form-group">
          <label for="sex">Select Sex:</label>
          <select id="sex" v-model="selectedSex" :disabled="true">
            <option value="">All Sexes</option>
            <option v-if="sexesLoading" value="" disabled>Loading...</option>
            <option v-for="sexOption in sexOptions" :key="sexOption.value" :value="sexOption.value">{{ sexOption.text }}</option>
          </select>
        </div>
        <button type="submit" :disabled="true">
          Apply Filters (Disabled)
        </button>
      </form>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>ma3na</th>
            <th>السجل</th>
            <th>العائلة</th>
            <th>الاسم</th>
            <th>اسم الأب</th>
            <th>اسم الأم</th>
            <th>تاريخ الولادة</th>
            <th>الجنس</th>
            <th>الديانة</th>
            <th>انتخب</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="recordsLoading">
            <td colspan="10" class="status-cell">
              <span class="loading-spinner"></span> Loading page {{ currentPage }} data...
            </td>
          </tr>
          <tr v-else-if="!recordsLoading && electionRecords.length === 0">
             <td colspan="10" class="status-cell">No records found matching the criteria.</td>
          </tr>
           <tr v-else v-for="record in electionRecords" :key="record.id" :class="{ 'record-updated': record.updated }">
            <td>{{ record.orientation ?? 'N/A' }}</td>
            <td>{{ record.register ?? 'N/A' }}</td>
            <td>{{ record.family ?? 'N/A' }}</td>
            <td>{{ record.name ?? 'N/A' }}</td>
            <td>{{ record.father ?? 'N/A' }}</td>
            <td>{{ record.mother ?? 'N/A' }}</td>
            <td>{{ record.dob ?? 'N/A' }}</td>
            <td>{{ record.sex ?? 'N/A' }}</td>
            <td>{{ record.religion ?? 'N/A' }}</td> 
            <!-- Display 'نعم' (Yes) or 'لا' (No) based on the boolean 'voted' status -->
            <td>{{ record.voted ? 'نعم' : 'لا' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Controls -->
    <div class="pagination" v-if="!recordsLoading && totalPages > 1">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1 || recordsLoading">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages || recordsLoading">Next</button>
    </div>
     <div class="pagination-info" v-else-if="!recordsLoading && totalRecords > 0 && totalPages <= 1">
        <span>Total Records: {{ totalRecords }}</span>
    </div>
     <div class="pagination-info" v-else-if="!recordsLoading && totalRecords === 0">
        <!-- Optional: Message when no records exist at all -->
        <!-- <span>No records in the system.</span> -->
    </div>


    <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from '#app'; // Use useNuxtApp().$router in Nuxt 3 if needed
import { checkSession } from '~/javascript/home.js';
import { fetchInitialDataAndCount, fetchRecordsPage } from '~/javascript/electionservice.js';
import { createWebSocketConnection } from '~/javascript/socket.js';

// Import ALL popup components - Ensure paths and filenames are correct
import VotedUpdated from '~/components/voteupdate.vue';
import LogisticsUpdate from '~/components/logisticsmove.vue';
import WarningPopup from '~/components/warning.vue';
import DisconnectPopup from '~/components/disconnectwarning.vue'; // Verify this filename

const router = useRouter();
const currentUser = ref(null);
const electionRecords = ref([]);

// --- Audio Player Ref ---
const audioPlayer = ref(null);
// ------------------------

// Filter State
const selectedDistrict = ref('');
const selectedRegister = ref('');
const selectedSex = ref('');
const districtOptions = ref([]);
const registerOptions = ref([]);
const sexOptions = ref([]);
const allRegistersData = ref({}); // Stores { districtValue: [reg1, reg2], ... }

// Loading States
const districtsLoading = ref(true);
const sexesLoading = ref(true);
const registersLoading = ref(false); // Initially false, true when loading for a specific district
const recordsLoading = ref(true);

// Messages State
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;

// Pagination State
const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(25); // Define items per page
const totalRecords = ref(0);

// WebSocket State
const isLive = ref(false);
const connecting = ref(false);
const socketInstance = ref(null);
const recordUpdateTimers = ref({}); // Tracks timers for highlighting updated rows

// Notification State (Popups)
const voteNotificationMessage = ref(null);
let voteNotificationTimeout = null;
const logisticsNotificationMessage = ref(null);
let logisticsNotificationTimeout = null;
const warningNotificationMessage = ref(null);
let warningNotificationTimeout = null;
const disconnectNotificationMessage = ref(null);
let disconnectNotificationTimeout = null;

/**
 * Displays a temporary message (success, error, info).
 * @param {'success' | 'error' | 'info' | 'warning'} type - The type of message.
 * @param {string} message - The message content.
 * @param {number} [duration=4000] - How long the message stays visible (ms).
 */
function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  errorMessage.value = type === 'error' ? message : null;
  successMessage.value = (type === 'success' || type === 'info' || type === 'warning') ? message : null;
  // You might want different styling for info/warning later if needed
  messageTimeout = setTimeout(() => {
      successMessage.value = null;
      errorMessage.value = null;
  }, duration);
}

/**
 * Fetches records for a specific page.
 * @param {number} page - The page number to fetch.
 */
async function loadRecordsForPage(page) {
  if (page < 1 || page > totalPages.value) {
      console.warn(`Attempted to load invalid page: ${page}`);
      return;
  }
  recordsLoading.value = true;
  errorMessage.value = null; // Clear previous errors
  electionRecords.value = []; // Clear current records

  try {
    // Pass page and itemsPerPage to the service function
    const result = await fetchRecordsPage(page, itemsPerPage.value);
    if (result.success && result.records) {
      electionRecords.value = result.records.map(r => ({ ...r, voted: r.voted ?? false, updated: false }));
      currentPage.value = page;
      // Optional: Verify total count hasn't changed unexpectedly
       if (result.count !== undefined && totalRecords.value !== result.count) {
           console.warn("Total record count mismatch detected during page load. Updating.");
           totalRecords.value = result.count;
           totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value) || 1;
           // Adjust currentPage if it's now out of bounds (e.g., if total pages decreased)
            if (currentPage.value > totalPages.value) {
                currentPage.value = totalPages.value > 0 ? totalPages.value : 1;
                // Optionally reload the new last page if needed
                // await loadRecordsForPage(currentPage.value); // Be careful of loops
            }
       }
    } else {
      showMessage('error', result.error?.message || `Failed to load records for page ${page}.`);
      electionRecords.value = []; // Ensure empty on failure
    }
  } catch (err) {
     showMessage('error', `Critical error loading page ${page} data: ${err.message}`);
     console.error(`Critical error loading page ${page}:`, err);
     electionRecords.value = []; // Ensure empty on critical failure
  } finally {
     recordsLoading.value = false;
  }
}

/**
 * Fetches initial filter data (districts, sexes, all registers) and the total record count.
 * Loads the first page of records if any exist.
 */
async function loadInitialData() {
  // Reset all relevant states before fetching
  districtsLoading.value = true;
  sexesLoading.value = true;
  registersLoading.value = false; // Only true when populating specific district
  recordsLoading.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  districtOptions.value = [];
  sexOptions.value = [];
  allRegistersData.value = {};
  electionRecords.value = [];
  totalRecords.value = 0;
  totalPages.value = 1;
  currentPage.value = 1;
  selectedDistrict.value = ''; // Reset filters
  selectedRegister.value = '';
  selectedSex.value = '';
  registerOptions.value = []; // Clear register options

  let initialFetchSuccess = false;
  let fetchedCount = 0;

  try {
     // Fetch initial data (filters, count) and potentially the first page records
    const initialResult = await fetchInitialDataAndCount(itemsPerPage.value);

    if (initialResult.success) {
      fetchedCount = initialResult.count ?? 0;
      totalRecords.value = fetchedCount;
      totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value) || 1;

      // Populate filter options
      if(initialResult.districts) districtOptions.value = initialResult.districts;
      if(initialResult.sexes) sexOptions.value = initialResult.sexes;
      if(initialResult.registers) allRegistersData.value = initialResult.registers; // Store all register data

      districtsLoading.value = false;
      sexesLoading.value = false;
      initialFetchSuccess = true;

       // Load first page records if they were included OR if count > 0
       if (fetchedCount > 0 && initialResult.records && initialResult.records.length > 0) {
           // Records were included in the initial fetch
           electionRecords.value = initialResult.records.map(r => ({ ...r, voted: r.voted ?? false, updated: false }));
           currentPage.value = 1;
           recordsLoading.value = false; // Data is loaded
       } else if (fetchedCount > 0) {
           // Count > 0, but records weren't in the initial fetch, so load page 1
           console.log("Initial data had count > 0 but no records array, fetching page 1...");
           await loadRecordsForPage(1); // This will set recordsLoading to false inside
       } else {
           // No records exist in the system
           showMessage('info', 'No records found in the system.', 5000);
           recordsLoading.value = false; // No records to load
       }

    } else {
      showMessage('error', initialResult.error?.message || 'Failed to load initial data and count.');
      // Ensure loading states are false on failure
      districtsLoading.value = false;
      sexesLoading.value = false;
      recordsLoading.value = false;
    }
  } catch (err) {
    showMessage('error', `Critical error during initial data fetch: ${err.message}`);
    console.error("Critical error during initial fetch:", err);
    // Ensure loading states are false on critical failure
    districtsLoading.value = false;
    sexesLoading.value = false;
    recordsLoading.value = false;
  }
   // No finally needed here as loading states are handled within try/catch
}

/**
 * Populates the 'Register' dropdown based on the currently selected district.
 */
function populateRegistersForSelectedDistrict() {
  registersLoading.value = true;
  registerOptions.value = []; // Clear previous options
  const districtKey = selectedDistrict.value;

  if (!districtKey || !allRegistersData.value || !allRegistersData.value[districtKey]) {
     // No district selected, or no register data available for it
     registersLoading.value = false;
     return;
  }

  try {
    const registers = allRegistersData.value[districtKey] || [];
    // Sort registers numerically if possible, else alphabetically
    registerOptions.value = [...registers].sort((a, b) => {
       const numA = parseInt(a, 10);
       const numB = parseInt(b, 10);
       return !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a).localeCompare(String(b));
    });
  } catch (err) {
      showMessage('error', 'Failed to populate registers dropdown.');
      console.error("Error populating registers:", err);
  } finally {
      registersLoading.value = false;
  }
}

/**
 * Placeholder for applying filters (currently disabled).
 */
function applyFilters() {
  console.log("Apply Filters clicked (currently disabled)");
  // When enabled:
  // 1. Reset currentPage to 1
  // 2. Call a service function like `fetchFilteredRecordsAndCount(filters, itemsPerPage)`
  // 3. Update totalRecords, totalPages, electionRecords
  // showMessage('info', 'Filtering not yet implemented.');
}

/**
 * Navigates to a specific page number if valid.
 * @param {number} page - The target page number.
 */
function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value || recordsLoading.value) {
      return; // Prevent invalid navigation or navigating while loading
  }
  // Optional: Prevent pagination during live updates if desired
  // if (isLive.value) {
  //   showMessage('info', 'Pagination is disabled while live updates are active.');
  //   return;
  // }
  loadRecordsForPage(page);
}

/**
 * Handles changes to the selected district, clearing and repopulating the register dropdown.
 */
function handleDistrictChange() {
  selectedRegister.value = ''; // Reset selected register
  populateRegistersForSelectedDistrict();
  // If filters were active, you might call applyFilters() here
}

/**
 * Processes incoming WebSocket messages for different update types.
 * Plays audio on successful vote.
 * @param {MessageEvent} event - The WebSocket message event.
 */
function handleWebSocketMessage(event) {
  try {
    const data = JSON.parse(event.data);
    const updateType = data.update_type;
    const recordId = data.voter_id; // Can be undefined for non-record specific messages
    const wsMessage = data.message; // Message content from backend

    // Basic validation: update_type is essential
    if (!updateType) {
        console.warn("Received WebSocket message missing 'update_type':", data);
        return;
    }

    // Find index if recordId is present (for row highlighting/updates)
    const displayIndex = (recordId !== undefined && recordId !== null)
      ? electionRecords.value.findIndex(r => r.id === recordId)
      : -1;

    // --- Handle different update types ---

    if (updateType === 'vote') {
      const newStatus = data.status;
      // Vote updates require status (boolean) and voter_id
      if (typeof newStatus !== 'boolean' || recordId === undefined || recordId === null) {
         console.warn("Invalid 'vote' update received (missing status or voter_id):", data);
         return;
      }

      // Update the record in the table if it's currently displayed
      if (displayIndex > -1) {
        const updatedRecord = { ...electionRecords.value[displayIndex], voted: newStatus, updated: true };
        updateRecordInDisplayList(displayIndex, updatedRecord, recordId);
      }

      // Show notification and play sound ONLY when status becomes true
      if (newStatus === true) {
        if(voteNotificationTimeout) clearTimeout(voteNotificationTimeout);
        voteNotificationMessage.value = wsMessage || 'Vote Recorded!'; // Use backend message or default
        voteNotificationTimeout = setTimeout(() => { voteNotificationMessage.value = null; }, 5000);

        // --- Play Sound ---
        if (audioPlayer.value && audioPlayer.value.readyState >= 2) { // Check if audio is ready
          audioPlayer.value.currentTime = 0; // Rewind to start
          audioPlayer.value.play().catch(error => {
            console.warn("Audio playback failed (likely browser policy):", error);
            // Browsers often block audio play unless initiated by user action (click)
            // or if the site has prior interaction history.
          });
        } else if (audioPlayer.value) {
             console.warn("Audio player exists but is not ready to play.");
        }
        // ------------------
      }
    }
    else if (updateType === 'logistics') {
        // Show logistics popup
        if(logisticsNotificationTimeout) clearTimeout(logisticsNotificationTimeout);
        logisticsNotificationMessage.value = wsMessage || 'Logistics Update Received';
        logisticsNotificationTimeout = setTimeout(() => {
            logisticsNotificationMessage.value = null;
        }, 5000);
        // Optionally: Update record status if 'recordId' is provided and relevant
        // if (displayIndex > -1) { /* update record logistics status */ }
    }
    else if (updateType === 'warning') {
        // Show general warning popup
        if(warningNotificationTimeout) clearTimeout(warningNotificationTimeout);
        warningNotificationMessage.value = wsMessage || 'Warning Received';
        warningNotificationTimeout = setTimeout(() => {
            warningNotificationMessage.value = null;
        }, 5000);
    }
    else if (updateType === 'warning_severe') {
        // Show severe warning / potential disconnect popup
        if(disconnectNotificationTimeout) clearTimeout(disconnectNotificationTimeout);
        disconnectNotificationMessage.value = wsMessage || 'Severe Warning / Connection Issue';
        disconnectNotificationTimeout = setTimeout(() => {
            disconnectNotificationMessage.value = null;
        }, 7000); // Longer duration for severe warnings
    }
    else {
        // Log any unrecognized update types
        console.warn("Received unknown WebSocket update_type:", updateType, data);
    }

  } catch (err) {
      console.error('Error processing WebSocket message:', err, event.data);
      showMessage('error', 'Error processing live update from server.');
  }
}

/**
 * Updates a specific record in the electionRecords array and applies temporary highlighting.
 * @param {number} index - The index of the record in the array.
 * @param {object} updatedRecord - The new record data (including updated: true).
 * @param {string|number} recordId - The ID of the record to manage highlight timer.
 */
function updateRecordInDisplayList(index, updatedRecord, recordId) {
    // Replace the old record with the new one at the specific index
    electionRecords.value.splice(index, 1, updatedRecord);

    // Manage the highlight timer
    if (recordUpdateTimers.value[recordId]) {
        clearTimeout(recordUpdateTimers.value[recordId]); // Clear existing timer if any
    }
    recordUpdateTimers.value[recordId] = setTimeout(() => {
        // Find the record again (it might have moved if sorting was added)
        const currentIndex = electionRecords.value.findIndex(r => r.id === recordId);
        if (currentIndex > -1 && electionRecords.value[currentIndex].updated) {
            // Create a new object with updated set to false to trigger reactivity
            const recordToClear = { ...electionRecords.value[currentIndex], updated: false };
            electionRecords.value.splice(currentIndex, 1, recordToClear);
        }
        delete recordUpdateTimers.value[recordId]; // Clean up the timer reference
     }, 1500); // Highlight duration in milliseconds
}

/**
 * Initiates the WebSocket connection.
 */
function startWebSocketConnection() {
  if (isLive.value || connecting.value) return; // Prevent multiple connections

  connecting.value = true;
  errorMessage.value = null; // Clear errors before connecting
  successMessage.value = null;

  const socket = createWebSocketConnection(); // Use the function from socket.js

  if (!socket) {
      showMessage('error', 'WebSocket connection failed to initialize.');
      connecting.value = false;
      return;
  }

  socketInstance.value = socket;

  socket.onopen = () => {
    isLive.value = true;
    connecting.value = false;
    showMessage('success', 'Live updates enabled.');
    console.log("WebSocket connection opened.");
  };

  socket.onmessage = handleWebSocketMessage; // Assign the message handler

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    showMessage('error', 'Live connection error occurred.');
    // disconnectWebSocket will likely be called by onclose, but call here too for safety
    disconnectWebSocket();
  };

  socket.onclose = (event) => {
    console.log(`WebSocket closed - Code: ${event.code}, Reason: ${event.reason}, Was Clean: ${event.wasClean}`);
    // Only show a warning if it was an unexpected closure while we thought we were live
    if (isLive.value && event.code !== 1000) {
        showMessage('warning', `Live connection closed unexpectedly (Code: ${event.code}).`);
    }
    // Always ensure state is cleaned up
    disconnectWebSocket();
  };
}

/**
 * Closes the WebSocket connection and cleans up related state.
 */
function disconnectWebSocket() {
  if (!socketInstance.value && !isLive.value && !connecting.value) {
      // Already disconnected or wasn't connecting
      return;
  }

  const wasLive = isLive.value; // Store if we were live before resetting flags

  // Reset state flags immediately for UI responsiveness
  isLive.value = false;
  connecting.value = false;

  // Clean up the WebSocket instance
  if (socketInstance.value) {
    // Remove event listeners to prevent handlers firing after intentional close
    socketInstance.value.onopen = null;
    socketInstance.value.onmessage = null;
    socketInstance.value.onerror = null;
    socketInstance.value.onclose = null; // Crucial to prevent the close handler running again

    // Close only if open or connecting
    if (socketInstance.value.readyState === WebSocket.OPEN || socketInstance.value.readyState === WebSocket.CONNECTING) {
       try {
            socketInstance.value.close(1000, "User initiated disconnect"); // Normal closure code
       } catch (e) {
           console.error("Error closing WebSocket:", e);
       }
    }
    socketInstance.value = null; // Release the instance
  }

  // Clear all active highlight timers
  Object.values(recordUpdateTimers.value).forEach(clearTimeout);
  recordUpdateTimers.value = {};

  // Clear all notification timeouts and reset messages
  if (voteNotificationTimeout) clearTimeout(voteNotificationTimeout);
  voteNotificationMessage.value = null;
  if (logisticsNotificationTimeout) clearTimeout(logisticsNotificationTimeout);
  logisticsNotificationMessage.value = null;
  if (warningNotificationTimeout) clearTimeout(warningNotificationTimeout);
  warningNotificationMessage.value = null;
  if (disconnectNotificationTimeout) clearTimeout(disconnectNotificationTimeout);
  disconnectNotificationMessage.value = null;

  // Remove visual highlight from all records currently displayed
  electionRecords.value = electionRecords.value.map(r => ({ ...r, updated: false }));

  // Optional: Log disconnection
  // console.log("WebSocket disconnected cleanly. Was live:", wasLive);
}

/**
 * Toggles the WebSocket connection state (Connect/Disconnect).
 */
function toggleLiveConnection() {
  if (isLive.value) {
     disconnectWebSocket();
     showMessage('info', 'Live updates stopped.');
  } else {
     startWebSocketConnection(); // Will show connecting/success/error messages
  }
}

/**
 * Handles user logout: disconnects WebSocket, clears auth token, redirects to login.
 */
function handleLogout() {
  disconnectWebSocket(); // Ensure clean disconnect before leaving page
  localStorage.removeItem('authToken'); // Or your session clearing mechanism
  router.push('/'); // Redirect to login/home page
}

// --- Lifecycle Hooks ---

onMounted(async () => {
  // Check user session first
  const sessionUser = await checkSession();
  if (!sessionUser) {
      router.push('/'); // Redirect if not logged in
  } else {
      currentUser.value = sessionUser.username || sessionUser.email || 'User'; // Set current user display

      // --- Initialize Audio Player ---
      // Check if running in a browser context where Audio is available
      if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
          try {
              // Path relative to the 'public' directory
              audioPlayer.value = new Audio('votes.mp3');
              // Preload the audio file to improve playback responsiveness
              audioPlayer.value.preload = 'auto';
              // Optional: Add event listeners for debugging audio issues
              // audioPlayer.value.addEventListener('canplaythrough', () => console.log("Audio ready to play"));
              // audioPlayer.value.addEventListener('error', (e) => console.error("Audio player error:", e));
              console.log("Audio player initialized for /votes.mp3");
          } catch(e) {
               console.error("Failed to initialize audio player:", e);
               audioPlayer.value = null; // Ensure it's null on failure
          }
      } else {
          console.warn("Audio playback not supported in this environment (e.g., SSR).");
      }
      // ---------------------------

      // Load initial page data after session check and audio setup
      await loadInitialData();
  }
});

onUnmounted(() => {
    // --- Clean up WebSocket ---
    disconnectWebSocket(); // Essential for preventing memory leaks and errors

    // --- Clean up general message timer ---
    if (messageTimeout) clearTimeout(messageTimeout);

    // --- Clean up audio player ---
    if (audioPlayer.value) {
        audioPlayer.value.pause(); // Stop playback
        audioPlayer.value.removeAttribute('src'); // Remove the source URL
        audioPlayer.value.load(); // Abort pending loads/requests
        // Remove any event listeners if added during mount
        // audioPlayer.value.removeEventListener('canplaythrough', ...);
        // audioPlayer.value.removeEventListener('error', ...);
        audioPlayer.value = null; // Release the reference for garbage collection
        console.log("Audio player resources released.");
    }
    // ---------------------------

    // Note: Highlight and notification timers are cleared within disconnectWebSocket
});

</script>

<style scoped>
/* Position ALL notifications */
.notification-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1050;
  display: flex;
  flex-direction: column; /* Stack notifications vertically */
  gap: 10px; /* Space between notifications */
  align-items: flex-end; /* Align to the right */
}

/* Individual notification wrappers (can share styles or be specific) */
.vote-notification-wrapper,
.logistics-notification-wrapper,
.warning-notification-wrapper,
.disconnect-notification-wrapper {
  min-width: 300px; /* Minimum width for popups */
  max-width: 400px; /* Maximum width for popups */
  /* Add common styling like background, padding, shadow if needed */
  /* background-color: rgba(0,0,0,0.7); */
  /* border-radius: 8px; */
  /* padding: 15px; */
  /* box-shadow: 0 2px 10px rgba(0,0,0,0.2); */
}

/* General Page Styles */
.wrapper.elections-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 20px 60px 20px;
  position: relative;
  font-family: sans-serif; /* Consider using a more modern font stack */
  /* font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; */
  color: #333; /* Base text color */
  background-color: #f8f9fa; /* Light background for the page */
}

h1 {
  color: var(--text-color-lighter, #212529); /* Darker heading color */
  margin-bottom: 30px;
  text-align: center;
  margin-top: 20px;
  font-size: 2rem;
  font-weight: 600;
}

/* Top Bar (Logout, Live Button) */
.top-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px; /* Increased spacing */
  position: relative;
  height: 40px;
}

.logout-btn {
  padding: 8px 12px;
  background-color: var(--error-bg, #dc3545); /* Bootstrap danger red */
  color: var(--error-text, #fff);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease, filter 0.2s ease;
  order: 2; /* Logout button on the right */
}
.logout-btn:hover {
  filter: brightness(0.9);
  background-color: #c82333; /* Darker red on hover */
}

.live-btn {
  padding: 8px 15px;
  background-color: var(--accent-color, #007bff); /* Bootstrap primary blue */
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease, opacity 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  order: 1; /* Live button before logout */
  font-size: 14px;
  font-weight: 500;
  height: 36px;
}
.live-btn:hover:not(:disabled) {
  background-color: var(--accent-hover, #0056b3); /* Darker blue on hover */
}
.live-btn:disabled {
  background-color: var(--text-color-muted, #6c757d); /* Bootstrap secondary grey */
  opacity: 0.65; /* Standard disabled opacity */
  cursor: not-allowed;
}
.live-btn.live-active {
  background-color: var(--error-bg, #dc3545); /* Use danger color when active (Stop button) */
}
.live-btn.live-active:hover:not(:disabled) {
  background-color: #c82333; /* Darker red on hover when active */
  filter: brightness(1); /* Reset brightness filter */
}

/* Main Navigation */
.main-nav {
  display: flex;
  gap: 25px; /* Slightly increased gap */
  margin-bottom: 30px; /* Increased spacing */
  padding-bottom: 10px;
  border-bottom: 1px solid var(--table-border-color, #dee2e6); /* Bootstrap light grey border */
  justify-content: center; /* Center align navigation */
}
.main-nav a {
  text-decoration: none;
  color: var(--accent-color, #007bff);
  padding: 8px 0; /* Added vertical padding */
  font-weight: 500;
  transition: color 0.2s ease, border-color 0.2s ease;
  border-bottom: 3px solid transparent; /* Thicker underline space */
}
.main-nav a:hover {
  color: var(--accent-hover, #0056b3);
}
.main-nav a.router-link-active { /* Style for the active link */
  font-weight: 700;
  color: var(--accent-hover, #0056b3);
  border-bottom-color: var(--accent-color, #007bff);
}

/* Filter Container */
.filter-container {
  margin-bottom: 30px;
  padding: 25px;
  background-color: var(--card-bg-color, #ffffff); /* White background for filters */
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  border: 1px solid #e9ecef; /* Subtle border */
}
.filter-container form {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 25px;
  align-items: flex-end; /* Align items to bottom */
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1; /* Allow groups to grow */
  min-width: 200px; /* Minimum width before wrapping */
}
.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-muted, #6c757d); /* Muted label color */
}
.form-group select {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--input-border-color, #ced4da); /* Standard input border */
  background-color: var(--input-bg-color, #fff);
  font-size: 14px;
  color: var(--text-color-light, #495057); /* Standard input text color */
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  height: 42px;
  width: 100%;
  appearance: none; /* Remove default appearance */
  /* Custom arrow */
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem; /* Space for arrow */
}
.form-group select:focus {
  border-color: var(--input-focus-border, #80bdff); /* Focus border color */
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); /* Focus shadow */
}
/* Disabled state for selects and buttons */
select:disabled, button:disabled {
    background-color: var(--input-bg-color-disabled, #e9ecef) !important;
    color: var(--text-color-muted, #6c757d) !important;
    border-color: var(--input-border-color, #ced4da) !important;
    cursor: not-allowed !important;
    opacity: 0.7 !important;
}
select:disabled {
    background-image: none !important; /* Remove arrow when disabled */
}
button[type=submit] { /* Filter Apply Button */
  padding: 0 25px;
  border: none;
  background-color: var(--accent-color, #28a745); /* Bootstrap success green */
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  font-size: 15px;
  flex-shrink: 0; /* Prevent button shrinking */
}
button[type=submit]:hover:not(:disabled) {
  background-color: var(--accent-hover, #218838); /* Darker green */
}
button[type=submit]:disabled { /* Specific style override for submit button disabled */
    background-color: var(--text-color-muted, #6c757d) !important;
}


/* Table Styles */
.table-container {
  max-height: 70vh; /* Max height before scrolling */
  overflow: auto; /* Enable scrollbars when needed */
  border: 1px solid var(--table-border-color, #dee2e6);
  border-radius: 8px;
  background-color: var(--primary-bg-color, #fff);
  margin-top: 25px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
}
table {
  width: 100%;
  border-collapse: collapse; /* Collapse borders */
  table-layout: auto; /* Auto layout is usually fine */
}
th, td {
  border: 1px solid var(--table-border-color, #dee2e6);
  padding: 10px 12px; /* Cell padding */
  font-size: 14px;
  vertical-align: middle; /* Align content vertically */
  white-space: nowrap; /* Prevent text wrapping */
  text-align: left; /* Default alignment */
  color: var(--text-color-light, #495057);
}
thead th {
  background-color: var(--table-header-bg, #f8f9fa); /* Light header */
  color: var(--text-color-lighter, #212529); /* Darker header text */
  position: sticky; /* Make header sticky */
  top: 0;
  z-index: 10;
  font-weight: 600; /* Bold header text */
  border-bottom-width: 2px; /* Thicker bottom border for header */
}
tbody tr:nth-child(even) {
  background-color: var(--table-even-row-bg, #f8f9fa); /* Zebra striping */
}
tbody tr:hover {
  background-color: var(--table-hover-row-bg, #e9ecef); /* Hover effect */
}
/* Status Cell (Loading/No Records) */
td.status-cell {
  text-align: center;
  padding: 30px 15px;
  color: var(--text-color-muted, #6c757d);
  font-style: italic;
}
td.status-cell .loading-spinner { /* Spinner within status cell */
  border-top-color: var(--accent-color, #007bff);
  border-left-color: var(--accent-color, #007bff);
  border-right-color: var(--accent-color, #007bff);
}
/* Row Highlighting for Updates */
.record-updated td {
  background-color: rgba(255, 193, 7, 0.3); /* Bootstrap warning color, semi-transparent */
  transition: background-color 0.5s ease-out;
}

/* Pagination Styles */
.pagination {
  text-align: center;
  margin-top: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
.pagination-info { /* For 'Total Records' message */
  text-align: center;
  margin-top: 30px;
  color: var(--text-color-muted, #6c757d);
  font-size: 14px;
  font-weight: 500;
}
.pagination span { /* Page X of Y text */
  padding: 8px 15px;
  color: var(--text-color-muted, #6c757d);
  font-size: 14px;
  font-weight: 500;
}
.pagination button {
  padding: 0 20px;
  height: 40px;
  border: 1px solid var(--accent-color, #007bff); /* Border matching accent */
  background-color: var(--accent-color, #007bff);
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pagination button:hover:not(:disabled) {
  background-color: var(--accent-hover, #0056b3);
  border-color: var(--accent-hover, #0056b3);
}
/* Override disabled style specifically for pagination buttons */
.pagination button:disabled {
  background-color: var(--text-color-muted, #6c757d) !important;
  border-color: var(--text-color-muted, #6c757d) !important;
  opacity: 0.65 !important; /* Consistent disabled opacity */
  cursor: not-allowed !important;
}


/* Loading Spinner */
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(108, 117, 125, 0.3); /* Muted border */
  border-radius: 50%;
  border-top-color: var(--text-color-lighter, #007bff); /* Accent color for top */
  animation: spin 0.8s linear infinite;
  vertical-align: middle; /* Align nicely with text */
}
.loading-spinner.small { /* Smaller version for buttons etc. */
  width: 14px;
  height: 14px;
  border-width: 2px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Message Boxes (Success/Error) */
.message {
  padding: 15px;
  margin-bottom: 20px; /* Increased spacing */
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 1;
  transition: opacity 0.5s ease;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 500;
}
.success-message {
  background-color: var(--success-bg-light, #d4edda); /* Bootstrap success light */
  color: var(--success-text-dark, #155724); /* Bootstrap success dark text */
  border-color: var(--success-border, #c3e6cb); /* Bootstrap success border */
}
.error-message {
  background-color: var(--error-bg-light, #f8d7da); /* Bootstrap danger light */
  color: var(--error-text-dark, #721c24); /* Bootstrap danger dark text */
  border-color: var(--error-border, #f5c6cb); /* Bootstrap danger border */
}
.message span { /* Text within message box */
  flex-grow: 1;
  padding-left: 10px;
}

/* Fade Transition for Messages and Popups */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Copyright Footer */
.copyright {
  margin-top: 40px;
  font-size: 12px;
  color: var(--text-color-muted, #6c757d);
  text-align: center;
}
</style>