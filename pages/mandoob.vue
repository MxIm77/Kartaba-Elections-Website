<template>
  <div class="wrapper elections-page mandoob-page">
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || '...' }})
    </button>

    <nav class="main-nav">
      <NuxtLink to="/elections">Election Management</NuxtLink>
      <NuxtLink to="/transport">Transport Management</NuxtLink>
      <NuxtLink to="/mandoob">Mandoob List</NuxtLink>
    </nav>

    <h1 style="margin-top: 60px;">Mandoob List</h1>

    <transition name="fade">
      <div v-if="successMessage" class="message success-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span>{{ successMessage }}</span>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="errorMessage" class="message error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>{{ errorMessage }}</span>
      </div>
    </transition>

    <div class="table-container" style="margin-top: 25px;">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>الاسم</th>
            <th>العائلة</th>
            <th>اسم الأب</th>
            <th>اسم الأم</th>
            <th>تاريخ الولادة</th>
            <th>السجل</th>
            <th class="status-update-header">Update Vote Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="recordsLoading">
            <td colspan="8" style="text-align: center;">
              <span class="loading-spinner"></span> Loading data...
            </td>
          </tr>
          <!-- Use displayedRecords directly -->
          <tr v-else-if="!recordsLoading && displayedRecords.length === 0">
             <td colspan="8" style="text-align: center;">No records found.</td>
          </tr>
          <!-- Iterate over displayedRecords -->
          <tr v-else v-for="record in displayedRecords" :key="record.id">
            <td>{{ record.id }}</td>
            <td>{{ record.name }}</td>
            <td>{{ record.family }}</td>
            <td>{{ record.father }}</td>
            <td>{{ record.mother }}</td>
            <td>{{ record.dob }}</td>
            <td>{{ record.register }}</td>
            <td class="action-cell">
               <span v-if="updatingVoteId === record.id" class="loading-spinner small action-cell-spinner"></span>
               <div v-else class="select-confirm-wrapper">
                <select
                  :value="record.selectedVoteStatus"
                  @change="onDropdownChange($event, record.id)"
                  class="vote-select"
                  :class="{'is-voted': record.selectedVoteStatus === 'yes', 'is-not-voted': record.selectedVoteStatus === 'no'}"
                  :disabled="record.voted === true"
                >
                  <option value="yes">صوت</option>
                  <option value="no">ما صوت</option>
                </select>

                <button
                  v-if="hasSelectionChanged(record)"
                  @click="confirmVoteUpdate(record)"
                  class="confirm-update-btn"
                  :disabled="updatingVoteId === record.id"
                >
                   <span>Confirm</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" v-if="totalPages > 1 && !recordsLoading">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Next</button>
    </div>

    <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'; // Keep watch
import { useRouter } from '#app';
import { checkSession } from '~/home.js';
import { fetchMandoobRecords, updateMandoobVote } from '~/mandoob.js';

const router = useRouter();
const currentUser = ref(null);
const allMandoobRecords = ref([]); // Holds original full dataset
const displayedRecords = ref([]); // Holds records for the CURRENT page + temp state
const recordsLoading = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;
const currentPage = ref(1);
const itemsPerPage = ref(25);
const updatingVoteId = ref(null);
const tempSelections = ref({}); // Stores { recordId: 'yes' | 'no' } for changes

// Watch for changes in the source data or current page to update the display list
watch([allMandoobRecords, currentPage], () => {
    calculateDisplayedRecords();
}, { deep: true }); // Use deep watch if needed, though shouldn't be necessary here

// Function to calculate the records for the current page display
function calculateDisplayedRecords() {
    if (!allMandoobRecords.value || allMandoobRecords.value.length === 0) {
        displayedRecords.value = [];
        return;
    }
    const startIndex = (currentPage.value - 1) * itemsPerPage.value;
    const endIndex = startIndex + itemsPerPage.value;
    displayedRecords.value = allMandoobRecords.value
        .slice(startIndex, endIndex)
        .map(record => {
            const originalVoted = record.voted === true || record.voted === 'true' || record.voted === 1;
            const tempSelection = tempSelections.value[record.id];
            const currentSelectionValue = tempSelection !== undefined ? tempSelection : (originalVoted ? 'yes' : 'no');
            return {
                ...record,
                voted: originalVoted,
                selectedVoteStatus: currentSelectionValue
            };
        });
     // console.log("Updated displayedRecords:", displayedRecords.value); // Debug log
}

// Computed properties based on the *full* dataset for pagination
const totalRecords = computed(() => allMandoobRecords.value.length);
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value));

// Helper to check if temporary selection differs from original voted status
function hasSelectionChanged(record) {
    const tempValue = tempSelections.value[record.id];
    if (tempValue === undefined) return false;
    const selectedBoolean = tempValue === 'yes';
    return record.voted !== selectedBoolean;
}

// --- Standard Functions ---
function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  errorMessage.value = null;
  successMessage.value = null;
  if (type === 'success') successMessage.value = message;
  else if (type === 'error') errorMessage.value = message;
  if (type) messageTimeout = setTimeout(() => { successMessage.value = null; errorMessage.value = null; }, duration);
}

async function loadData() {
  recordsLoading.value = true;
  tempSelections.value = {};
  showMessage(null, '');
  try {
    const result = await fetchMandoobRecords();
    if (result.success && Array.isArray(result.data)) {
      allMandoobRecords.value = result.data; // This triggers the watcher
      currentPage.value = 1; // Ensure page is reset, watcher updates display
      // Explicitly call after setting data and page if watcher timing is off
      // calculateDisplayedRecords();
    } else {
      showMessage('error', result.error?.message || 'Failed to load records.');
      allMandoobRecords.value = [];
      displayedRecords.value = []; // Also clear display list
    }
  } catch (err) {
    showMessage('error', `Error loading data: ${err.message}`);
    allMandoobRecords.value = [];
    displayedRecords.value = [];
  } finally {
    recordsLoading.value = false;
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page; // This triggers the watcher
    tempSelections.value = {};
    window.scrollTo(0, 0);
  }
}

async function handleLogout() {
  try {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    currentUser.value = null;
    await router.push('/');
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('error', 'Logout failed.');
  }
}

// Update temporary selection state when dropdown changes
function onDropdownChange(event, recordId) {
    const selectedValue = event.target.value;
    tempSelections.value[recordId] = selectedValue;
    // Force displayedRecords to update for immediate visual feedback if needed
    // (though computed property on tempSelections might handle this implicitly)
     calculateDisplayedRecords(); // Re-run calculation to update selectedVoteStatus visually
}

// Send API request when confirm button is clicked
async function confirmVoteUpdate(record) {
  const recordId = record.id;
  const selectedStatusString = tempSelections.value[recordId];
  if (selectedStatusString !== 'yes') {
      delete tempSelections.value[recordId];
      console.warn(`Confirm clicked for ${recordId} but selection != 'yes'.`);
      calculateDisplayedRecords(); // Recalculate to reset dropdown visual
      return;
  }

  const originalRecordIndex = allMandoobRecords.value.findIndex(r => r.id === recordId);
  if (originalRecordIndex === -1) return;

  if (updatingVoteId.value === recordId) return;

  updatingVoteId.value = recordId;
  showMessage(null, '');

  try {
    const result = await updateMandoobVote(recordId); // Call with ID only

    if (result.success) {
      showMessage('success', result.message || `Record ${recordId} updated.`);
      // Update the original data - set voted to TRUE
      const updatedRecord = { ...allMandoobRecords.value[originalRecordIndex], voted: true };
      allMandoobRecords.value.splice(originalRecordIndex, 1, updatedRecord);
      // Clear the temporary state (watcher will update display)
      delete tempSelections.value[recordId];
    } else {
      showMessage('error', result.error?.message || `Failed to update vote for ${recordId}.`);
      // Keep temp state on failure
    }
  } catch (err) {
    console.error("Error during vote update API call:", err);
    showMessage('error', `Error updating vote: ${err.message}`);
    // Keep temp state on error
  } finally {
    if (updatingVoteId.value === recordId) {
        updatingVoteId.value = null;
    }
  }
}

onMounted(async () => {
  currentUser.value = localStorage.getItem('currentUser');
  recordsLoading.value = true;
  try {
    const sessionResult = await checkSession();
    if (!sessionResult.success) {
      showMessage('error', `Session invalid: ${sessionResult.error?.message || 'Log in.'}`, 6000);
      await router.push('/');
      return;
    }
    await loadData(); // Load data after session check
  } catch (err) {
    console.error('Init error:', err);
    showMessage('error', 'Init failed. Redirecting.', 6000);
    await router.push('/');
    recordsLoading.value = false;
  }
});
</script>

<style>
:root {
  --primary-bg-color: #1a233a;
  --card-bg-color: #2a3b52;
  --text-color-light: #e0e0e0;
  --text-color-lighter: #f5f5f5;
  --text-color-muted: #9DA3B4;
  --accent-color: #FF3B30; /* Confirm button */
  --accent-hover: #E02E24;
  --input-bg-color: rgba(42, 59, 82, 0.9);
  --input-border-color: rgba(255, 255, 255, 0.1);
  --input-focus-border: rgba(52, 199, 89, 0.6); /* Green focus */
  --input-focus-shadow: rgba(52, 199, 89, 0.15);
  --error-color: #FF453A;
  --error-bg: rgba(255, 69, 58, 0.1);
  --success-color: #34C759; /* Bright Green */
  --success-bg: rgba(52, 199, 89, 0.1);
  --table-header-bg: #00000085;
  --table-even-row-bg: #1f2940;
  --table-border-color: #3a4a63;
  --disabled-bg-color: #3a4a63;
  --disabled-text-color: #7e8a9e;
}
html, body, #__nuxt {
  height: 100%; margin: 0; padding: 0;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  color: var(--text-color-light);
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
</style>

<style scoped>
.wrapper.mandoob-page { max-width: 1600px; margin: 0 auto; padding: 40px 20px 60px 20px; box-sizing: border-box; position: relative; }
h1 { color: var(--text-color-lighter); margin-bottom: 25px; text-align: center; }
.logout-btn { position: absolute; top: 41px; right: 20px; padding: 8px 15px; background-color: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease; z-index: 100; }
.logout-btn:hover { background-color: var(--accent-hover); }
.main-nav { text-align: center; padding: 10px; background-color: var(--card-bg-color); border-radius: 8px; position: relative; z-index: 50; margin-bottom: 20px; }
.main-nav a { color: var(--text-color-light); text-decoration: none; margin: 0 15px; padding: 8px 12px; border-radius: 4px; transition: background-color 0.2s ease, color 0.2s ease; font-weight: 500; }
.main-nav a:hover { background-color: var(--accent-hover); color: white; }
.main-nav a.router-link-exact-active { background-color: var(--accent-color); color: white; }
.message { padding: 12px 15px; margin: 15px 0; border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 14px; border-left-width: 4px; border-left-style: solid; }
.message svg { flex-shrink: 0; }
.success-message { background-color: var(--success-bg); color: var(--success-color); border-left-color: var(--success-color); }
.error-message { background-color: var(--error-bg); color: var(--error-color); border-left-color: var(--error-color); }
.table-container { max-height: 65vh; overflow-y: auto; border: 1px solid var(--table-border-color); border-radius: 8px; background-color: var(--primary-bg-color); }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid var(--table-border-color); padding: 8px 10px; font-size: 14px; vertical-align: middle; text-align: right; white-space: nowrap; }
th { background-color: var(--table-header-bg); color: var(--text-color-lighter); position: sticky; top: 0; z-index: 10; font-weight: 600; }
th.status-update-header { text-align: center; }
tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--card-bg-color); }

td.action-cell {
  text-align: center;
  vertical-align: middle;
  padding: 5px;
  width: 220px;
  height: 52px;
  box-sizing: border-box;
}

.select-confirm-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.vote-select {
  appearance: none; -webkit-appearance: none;
  flex-basis: 130px;
  flex-grow: 0;
  flex-shrink: 0;
  height: 40px;
  padding: 0 35px 0 15px;
  line-height: 38px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--input-border-color);
  background-color: var(--input-bg-color);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239DA3B4' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 14px 14px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, opacity 0.2s ease, background-color 0.2s ease;
  outline: none;
  text-align: center;
  box-sizing: border-box;
}
.vote-select:focus {
    border-color: var(--input-focus-border);
    box-shadow: 0 0 0 3px var(--input-focus-shadow);
}
.vote-select.is-voted { color: var(--success-color); }
.vote-select.is-not-voted { color: var(--text-color-light); }
.vote-select option {
  background-color: var(--card-bg-color);
  font-weight: normal;
  padding: 5px 10px;
}
.vote-select option[value="yes"] { color: var(--success-color); }
.vote-select option[value="no"] { color: var(--text-color-light); }

.vote-select:disabled {
  background-color: var(--input-bg-color);
  color: var(--success-color);
  border-color: rgba(52, 199, 89, 0.3);
  cursor: not-allowed;
  opacity: 0.75;
   background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%237e8a9e' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
}

.confirm-update-btn {
  padding: 0 15px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  line-height: 1;
  flex-shrink: 0;
}
.confirm-update-btn:hover:not(:disabled) { background-color: var(--accent-hover); }
.confirm-update-btn:disabled {
  background-color: var(--disabled-bg-color);
  color: var(--disabled-text-color);
  cursor: not-allowed;
  opacity: 0.7;
}
.button-spinner { margin-right: 6px; } /* Spinner inside button */

.action-cell > .loading-spinner.small { /* Spinner replacing controls */
    margin: 0 auto;
    display: block;
    padding: 11px 0;
}
.action-cell > span + .select-confirm-wrapper {
    display: none;
}

.pagination { text-align: center; margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 10px; }
.pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
.pagination button { padding: 8px 15px; border: none; background-color: var(--accent-color); color: white; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; border-radius: 6px; height: 40px; display: inline-flex; align-items: center; justify-content: center; }
.pagination button:hover:not(:disabled) { background-color: var(--accent-hover); }
.pagination button:disabled { opacity: 0.65; cursor: not-allowed; }

.loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite; vertical-align: middle; }
.loading-spinner.small { width: 16px; height: 16px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }
</style>