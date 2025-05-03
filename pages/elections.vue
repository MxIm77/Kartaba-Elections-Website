<template>
  <div class="wrapper elections-page">
    <!-- Notification Area -->
    <div class="notification-container">
        <transition name="fade">
          <div v-if="voteNotificationMessage" class="vote-notification-wrapper">
             <VotedUpdated :message="voteNotificationMessage" />
          </div>
        </transition>
        <transition name="fade">
          <div v-if="logisticsNotificationMessage" class="logistics-notification-wrapper">
             <LogisticsUpdate :message="logisticsNotificationMessage" />
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
      <NuxtLink to="/elections">Election Management</NuxtLink>
      <NuxtLink to="/transport">Transport Management</NuxtLink>
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

    <div class="filter-container">
       <form @submit.prevent.stop>
        <div class="form-group">
          <label for="district">Select District:</label>
          <select id="district" v-model="selectedDistrict" :disabled="true">
            <option v-if="districtsLoading" value="" disabled>Loading...</option>
            <option v-else value="">All Districts</option>
            <option v-for="district in districtOptions" :key="district.value" :value="district.value">{{ district.text }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="register">Select Register:</label>
          <select id="register" v-model="selectedRegister" :disabled="true">
            <option value="">All Registers</option>
            <option v-if="registersLoading" value="" disabled>Loading...</option>
            <option v-for="register in registerOptions" :key="register" :value="register">Register {{ register }}</option>
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
             <td colspan="10" class="status-cell">No records found.</td>
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
            <td>{{ record.voted ? 'نعم' : 'لا' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1 || recordsLoading">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages || recordsLoading">Next</button>
    </div>
     <div class="pagination-info" v-else-if="!recordsLoading && totalRecords > 0 && totalPages === 1">
        <span>Total Records: {{ totalRecords }}</span>
    </div>

    <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from '#app';
import { checkSession } from '~/javascript/home.js';
import { fetchInitialDataAndCount, fetchRecordsPage } from '~/javascript/electionservice.js';
import { createWebSocketConnection } from '~/javascript/socket.js';
import VotedUpdated from '~/components/voteupdate.vue'; // Corrected path if needed
import LogisticsUpdate from '~/components/logisticsmove.vue'; // Import the logistics popup

const router = useRouter();
const currentUser = ref(null);
const electionRecords = ref([]);

const selectedDistrict = ref('');
const selectedRegister = ref('');
const selectedSex = ref('');
const districtOptions = ref([]);
const registerOptions = ref([]);
const sexOptions = ref([]);
const allRegistersData = ref({});

const districtsLoading = ref(true);
const sexesLoading = ref(true);
const registersLoading = ref(false);
const recordsLoading = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;

const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(25);
const totalRecords = ref(0);

const isLive = ref(false);
const connecting = ref(false);
const socketInstance = ref(null);
const recordUpdateTimers = ref({});

const voteNotificationMessage = ref(null);
let voteNotificationTimeout = null;
const logisticsNotificationMessage = ref(null); // State for logistics popup
let logisticsNotificationTimeout = null; // Timer for logistics popup

function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  errorMessage.value = type === 'error' ? message : null;
  successMessage.value = type === 'success' ? message : (type === 'info' ? `ℹ️ ${message}` : null);
  messageTimeout = setTimeout(() => { successMessage.value = null; errorMessage.value = null; }, duration);
}

async function loadRecordsForPage(page) {
  if (page < 1 || page > totalPages.value) return;
  recordsLoading.value = true;
  errorMessage.value = null;
  electionRecords.value = [];

  try {
    const result = await fetchRecordsPage(page);
    if (result.success && result.records) {
      electionRecords.value = result.records.map(r => ({ ...r, voted: r.voted ?? false, updated: false }));
      currentPage.value = page;
    } else {
      showMessage('error', result.error?.message || `Failed to load records for page ${page}.`);
      electionRecords.value = [];
    }
  } catch (err) {
     showMessage('error', `Critical error loading page ${page} data: ${err.message}`);
     electionRecords.value = [];
  } finally {
     recordsLoading.value = false;
  }
}

async function loadInitialData() {
  districtsLoading.value = true;
  sexesLoading.value = true;
  registersLoading.value = false;
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

  let initialFetchSuccess = false;
  let fetchedCount = 0;

  try {
    const initialResult = await fetchInitialDataAndCount();
    if (initialResult.success) {
      fetchedCount = initialResult.count ?? 0;
      totalRecords.value = fetchedCount;
      totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value) || 1;
      if(initialResult.districts) districtOptions.value = initialResult.districts;
      if(initialResult.sexes) sexOptions.value = initialResult.sexes;
      if(initialResult.registers) allRegistersData.value = initialResult.registers;
      districtsLoading.value = false;
      sexesLoading.value = false;
      populateRegistersForSelectedDistrict();
      initialFetchSuccess = true;
    } else {
      showMessage('error', initialResult.error?.message || 'Failed to load initial data/count.');
    }
  } catch (err) {
    showMessage('error', `Critical error during initial fetch: ${err.message}`);
  } finally {
     if (districtsLoading.value) districtsLoading.value = false;
     if (sexesLoading.value) sexesLoading.value = false;
  }

  if (initialFetchSuccess && fetchedCount > 0) {
      await loadRecordsForPage(1);
  } else {
      recordsLoading.value = false;
      if(initialFetchSuccess && fetchedCount === 0) {
           showMessage('info', 'No records found in the system.', 5000);
      }
  }
}

function populateRegistersForSelectedDistrict() {
  registersLoading.value = true;
  registerOptions.value = [];
  const districtKey = selectedDistrict.value;
  if (!districtKey || !allRegistersData.value || !allRegistersData.value[districtKey]) {
     registersLoading.value = false; return;
  }
  try {
    const registers = allRegistersData.value[districtKey] || [];
    registerOptions.value = [...registers].sort((a, b) => {
       const numA = parseInt(a, 10), numB = parseInt(b, 10);
       return !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a).localeCompare(String(b));
    });
  } catch (err) { showMessage('error', 'Failed to populate registers dropdown.'); }
  finally { registersLoading.value = false; }
}

function applyFilters() { /* Disabled */ }

function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value || isLive.value || recordsLoading.value) return;
  loadRecordsForPage(page);
}

function handleDistrictChange() {
  selectedRegister.value = '';
  populateRegistersForSelectedDistrict();
}

function handleWebSocketMessage(event) {
  try {
    const data = JSON.parse(event.data);
    const updateType = data.update_type;
    const recordId = data.voter_id;
    const wsMessage = data.message;

    if (recordId === undefined || recordId === null || !updateType) return;

    const displayIndex = electionRecords.value.findIndex(r => r.id === recordId);

    if (updateType === 'vote') {
       const newStatus = data.status; // status is specific to 'vote' type
       if (typeof newStatus !== 'boolean') return; // Validate status for vote

      if (displayIndex > -1) {
        const updatedRecord = { ...electionRecords.value[displayIndex], voted: newStatus, updated: true };
        updateRecordInDisplayList(displayIndex, updatedRecord, recordId);
      }

      if (newStatus === true) {
        if(voteNotificationTimeout) clearTimeout(voteNotificationTimeout);
        voteNotificationMessage.value = wsMessage || 'Vote Recorded!';
        voteNotificationTimeout = setTimeout(() => { voteNotificationMessage.value = null; }, 5000);
      }
    } else if (updateType === 'logistics') {
        // Handle logistics update - just show popup
        if(logisticsNotificationTimeout) clearTimeout(logisticsNotificationTimeout);
        logisticsNotificationMessage.value = wsMessage || 'Logistics Update Received';
        logisticsNotificationTimeout = setTimeout(() => {
            logisticsNotificationMessage.value = null;
        }, 5000); // Show logistics popup for 5 seconds
         // Optionally update some status on the record if needed, but not requested
         // if (displayIndex > -1) { ... update logistics status field ... }
    }

  } catch (err) { showMessage('error', 'Error processing live update.'); }
}

function updateRecordInDisplayList(index, updatedRecord, recordId) {
    electionRecords.value.splice(index, 1, updatedRecord);
    if (recordUpdateTimers.value[recordId]) clearTimeout(recordUpdateTimers.value[recordId]);
    recordUpdateTimers.value[recordId] = setTimeout(() => {
        const currentIndex = electionRecords.value.findIndex(r => r.id === recordId);
        if (currentIndex > -1 && electionRecords.value[currentIndex].updated) {
            const recordToClear = { ...electionRecords.value[currentIndex], updated: false };
            electionRecords.value.splice(currentIndex, 1, recordToClear);
        }
        delete recordUpdateTimers.value[recordId];
     }, 1500);
}

function startWebSocketConnection() {
  if (isLive.value || connecting.value) return;
  connecting.value = true; errorMessage.value = null; successMessage.value = null;
  const socket = createWebSocketConnection();
  if (!socket) { showMessage('error', 'WS Connection failed.'); connecting.value = false; return; }
  socketInstance.value = socket;
  socket.onopen = () => { isLive.value = true; connecting.value = false; showMessage('success', 'Live updates enabled.'); };
  socket.onmessage = handleWebSocketMessage;
  socket.onerror = (error) => { showMessage('error', 'Live connection error.'); disconnectWebSocket(); };
  socket.onclose = (event) => { if (isLive.value) showMessage('warning', `Live connection closed.`); disconnectWebSocket(); };
}
function disconnectWebSocket() {
  if (!socketInstance.value && !isLive.value) return;
  if (socketInstance.value) { socketInstance.value.onclose = null; socketInstance.value.close(1000); socketInstance.value = null; }
  Object.values(recordUpdateTimers.value).forEach(clearTimeout); recordUpdateTimers.value = {};
  if (voteNotificationTimeout) clearTimeout(voteNotificationTimeout);
  voteNotificationMessage.value = null;
  if (logisticsNotificationTimeout) clearTimeout(logisticsNotificationTimeout); // Clear logistics timer
  logisticsNotificationMessage.value = null; // Hide logistics popup
  isLive.value = false; connecting.value = false;
  electionRecords.value = electionRecords.value.map(r => ({ ...r, updated: false }));
}
function toggleLiveConnection() { if (isLive.value) { disconnectWebSocket(); showMessage('info', 'Live updates stopped.'); } else { startWebSocketConnection(); } }

function handleLogout() { disconnectWebSocket(); localStorage.removeItem('authToken'); router.push('/'); }

onMounted(async () => {
  const sessionUser = await checkSession();
  if (!sessionUser) { router.push('/'); }
  else { currentUser.value = sessionUser.username || sessionUser.email || 'User'; await loadInitialData(); }
});
onUnmounted(() => {
    disconnectWebSocket();
    if (messageTimeout) clearTimeout(messageTimeout);
    if (voteNotificationTimeout) clearTimeout(voteNotificationTimeout);
    if (logisticsNotificationTimeout) clearTimeout(logisticsNotificationTimeout); // Clear logistics timer
    Object.values(recordUpdateTimers.value).forEach(clearTimeout);
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

/* Individual notification wrappers */
.vote-notification-wrapper,
.logistics-notification-wrapper {
  min-width: 300px; /* Or your desired width */
}

/* Styles from previous version */
.wrapper.elections-page{max-width:1200px;margin:0 auto;padding:20px 20px 60px 20px;position:relative;font-family:sans-serif}h1{color:var(--text-color-lighter,#333);margin-bottom:30px;text-align:center;margin-top:20px;font-size:2rem;font-weight:600}.top-bar{display:flex;justify-content:flex-end;align-items:center;gap:15px;margin-bottom:10px;position:relative;height:40px}.logout-btn{padding:8px 12px;background-color:var(--error-bg,#f44336);color:var(--error-text,#fff);border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:background-color .2s ease;order:2}.logout-btn:hover{filter:brightness(.9)}.live-btn{padding:8px 15px;background-color:var(--accent-color,#4f46e5);color:#fff;border:none;border-radius:6px;cursor:pointer;transition:background-color .3s ease;display:inline-flex;align-items:center;gap:8px;order:1;font-size:14px;font-weight:500;height:36px}.live-btn:hover:not(:disabled){background-color:var(--accent-hover,#4338ca)}.live-btn:disabled{background-color:var(--text-color-muted,#9ca3af);opacity:.6;cursor:not-allowed}.live-btn.live-active{background-color:var(--error-bg,#f44336)}.live-btn.live-active:hover:not(:disabled){filter:brightness(.9)}.main-nav{display:flex;gap:20px;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid var(--table-border-color,#e5e7eb)}.main-nav a{text-decoration:none;color:var(--accent-color,#4f46e5);padding:5px 0;font-weight:500}.main-nav a.router-link-active{font-weight:700;border-bottom:2px solid var(--accent-color,#4f46e5)}.filter-container{margin-bottom:30px;padding:25px;background-color:var(--card-bg-color,#f9fafb);border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)}.filter-container form{display:flex;flex-wrap:wrap;gap:20px 25px;align-items:flex-end}.form-group{display:flex;flex-direction:column;gap:8px;flex:1;min-width:200px}.form-group label{font-size:14px;font-weight:500;color:var(--text-color-muted,#6b7280)}.form-group select{padding:10px 12px;border-radius:6px;border:1px solid var(--input-border-color,#d1d5db);background-color:var(--input-bg-color,#fff);font-size:14px;color:var(--text-color-light,#1f2937);outline:none;transition:all .2s ease;height:42px;width:100%;appearance:none;background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23a0aec0' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right .75rem center;background-size:16px 12px;padding-right:2.5rem}.form-group select:focus{border-color:var(--input-focus-border,#4f46e5);box-shadow:0 0 0 3px var(--input-focus-shadow,rgba(79,70,229,.2));background-color:var(--input-bg-color,#fff)}button[type=submit]{padding:0 25px;border:none;background-color:var(--accent-color,#4f46e5);color:#fff;cursor:pointer;font-weight:500;transition:background-color .2s ease;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;font-size:15px;flex-shrink:0}button[type=submit]:hover:not(:disabled){background-color:var(--accent-hover,#4338ca)}select:disabled{background-color:var(--input-bg-color-disabled,#f3f4f6)!important;color:var(--text-color-muted,#9ca3af)!important;border-color:var(--input-border-color,#d1d5db)!important;background-image:none!important;cursor:not-allowed!important;opacity:.7!important}button:disabled{background-color:var(--text-color-muted,#9ca3af)!important;opacity:.6!important;cursor:not-allowed!important}.table-container{max-height:70vh;overflow:auto;border:1px solid var(--table-border-color,#e5e7eb);border-radius:8px;background-color:var(--primary-bg-color,#fff);margin-top:25px;box-shadow:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06)}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid var(--table-border-color,#e5e7eb);padding:10px 12px;font-size:14px;vertical-align:middle;white-space:nowrap;text-align:left;color:var(--text-color-light,#374151)}thead th{background-color:var(--table-header-bg,#f9fafb);color:var(--text-color-lighter,#1f2937);position:sticky;top:0;z-index:10;font-weight:600;border-bottom-width:2px}tbody tr:nth-child(even){background-color:var(--table-even-row-bg,#f9fafb)}tbody tr:hover{background-color:var(--table-hover-row-bg,#f3f4f6)}td.status-cell{text-align:center;padding:30px 15px;color:var(--text-color-muted,#6b7280);font-style:italic}td.status-cell .loading-spinner{border-top-color:var(--accent-color,#4f46e5);border-left-color:var(--accent-color,#4f46e5);border-right-color:var(--accent-color,#4f46e5)}.record-updated td{background-color:rgba(252,211,77,.3);transition:background-color .5s ease-out}.pagination{text-align:center;margin-top:30px;display:flex;justify-content:center;align-items:center;gap:12px}.pagination-info{text-align:center;margin-top:30px;color:var(--text-color-muted,#6b7280);font-size:14px;font-weight:500}.pagination span{padding:8px 15px;color:var(--text-color-muted,#6b7280);font-size:14px;font-weight:500}.pagination button{padding:0 20px;height:40px;border:none;background-color:var(--accent-color,#4f46e5);color:#fff;cursor:pointer;font-weight:500;transition:background-color .2s ease;border-radius:6px;display:inline-flex;align-items:center;justify-content:center}.pagination button:hover:not(:disabled){background-color:var(--accent-hover,#4338ca)}.pagination button:disabled{opacity:.6;cursor:not-allowed;background-color:var(--text-color-muted,#9ca3af)!important}.loading-spinner{display:inline-block;width:20px;height:20px;border:3px solid rgba(150,150,150,.3);border-radius:50%;border-top-color:var(--text-color-lighter,#4f46e5);animation:spin .8s linear infinite;vertical-align:middle}.loading-spinner.small{width:14px;height:14px;border-width:2px}@keyframes spin{to{transform:rotate(360deg)}}.message{padding:15px;margin-bottom:15px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;opacity:1;transition:opacity .5s ease;border:1px solid transparent;font-size:14px;font-weight:500}.success-message{background-color:var(--success-bg-light,#ecfdf5);color:var(--success-text-dark,#065f46);border-color:var(--success-border,#a7f3d0)}.error-message{background-color:var(--error-bg-light,#fef2f2);color:var(--error-text-dark,#991b1b);border-color:var(--error-border,#fecaca)}.message span{flex-grow:1;padding-left:10px}.fade-enter-active,.fade-leave-active{transition:opacity .3s ease}.fade-enter-from,.fade-leave-to{opacity:0}.copyright{margin-top:40px;font-size:12px;color:var(--text-color-muted,#6b7280);text-align:center}
</style>