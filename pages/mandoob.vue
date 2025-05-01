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
            <th>Voted Status</th>
            <th>Update Vote</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="recordsLoading">
            <td colspan="9" style="text-align: center;">
              <span class="loading-spinner"></span> Loading data...
            </td>
          </tr>
          <tr v-else-if="!recordsLoading && mandoobRecords.length === 0">
            <td colspan="9" style="text-align: center;">No records found.</td>
          </tr>
          <tr v-else v-for="record in mandoobRecords" :key="record.id">
            <td>{{ record.id }}</td>
            <td>{{ record.name }}</td>
            <td>{{ record.family }}</td>
            <td>{{ record.father }}</td>
            <td>{{ record.mother }}</td>
            <td>{{ record.dob }}</td>
            <td>{{ record.register }}</td>
            <td>
              <select
                :value="record.voted ? 'yes' : 'no'"
                class="status-display-select"
                :class="{'is-voted': record.voted, 'is-not-voted': !record.voted}"
                @mousedown.prevent
                @focus="($event.target).blur()"
              >
                <option value="yes">صوت (Yes)</option>
                <option value="no">ما صوت (No)</option>
              </select>
            </td>
            <td class="action-cell">
               <button
                 v-if="!record.voted"
                 @click="triggerVoteUpdate(record.id)"
                 class="update-btn"
                 :disabled="updatingVoteId === record.id"
               >
                  <span v-if="updatingVoteId === record.id" class="loading-spinner small button-spinner"></span>
                  <span v-else>Update</span>
               </button>
               <span v-else class="already-voted-text">-</span>
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
import { ref, onMounted, computed } from 'vue';
import { useRouter } from '#app';
import { checkSession } from '~/home.js';
import { fetchMandoobRecords, updateMandoobVote } from '~/mandoob.js';

const router = useRouter();
const currentUser = ref(null);
const allMandoobRecords = ref([]);
const recordsLoading = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;
const currentPage = ref(1);
const itemsPerPage = ref(25);
const updatingVoteId = ref(null);

const totalRecords = computed(() => allMandoobRecords.value.length);
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value));

const mandoobRecords = computed(() => {
  if (recordsLoading.value || !allMandoobRecords.value.length) {
    return [];
  }
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return allMandoobRecords.value
    .map(r => ({ ...r, voted: r.voted === true || r.voted === 'true' || r.voted === 1 }))
    .slice(startIndex, endIndex);
});

function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  errorMessage.value = null;
  successMessage.value = null;
  if (type === 'success') {
    successMessage.value = message;
  } else if (type === 'error') {
    errorMessage.value = message;
  }
  if (type) {
      messageTimeout = setTimeout(() => {
        successMessage.value = null;
        errorMessage.value = null;
      }, duration);
  }
}

async function loadData() {
  recordsLoading.value = true;
  showMessage(null, '');
  try {
    const result = await fetchMandoobRecords();
    if (result.success && Array.isArray(result.data)) {
      allMandoobRecords.value = result.data;
      currentPage.value = 1;
    } else {
      showMessage('error', result.error?.message || 'Failed to load mandoob records.');
      allMandoobRecords.value = [];
    }
  } catch (err) {
    showMessage('error', `Error loading data: ${err.message}`);
    allMandoobRecords.value = [];
  } finally {
    recordsLoading.value = false;
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page;
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
    showMessage('error', 'Logout failed. Please try again.');
  }
}

async function triggerVoteUpdate(recordId) {
  const newVotedStatus = true;
  const recordIndex = allMandoobRecords.value.findIndex(r => r.id === recordId);
  if (recordIndex === -1) {
      console.error(`Record with ID ${recordId} not found in local data.`);
      return;
  }
  if (updatingVoteId.value === recordId) return;
  updatingVoteId.value = recordId;
  showMessage(null, '');
  try {
    const result = await updateMandoobVote(recordId, newVotedStatus);
    if (result.success) {
      showMessage('success', result.message || `Record ${recordId} marked as voted.`);
      // *** UPDATED STATE HANDLING ***
      // Create a new object with the updated status
      const updatedRecord = {
          ...allMandoobRecords.value[recordIndex],
          voted: newVotedStatus
      };
      // Replace the old record with the new one using splice for reactivity
      allMandoobRecords.value.splice(recordIndex, 1, updatedRecord);
    } else {
      showMessage('error', result.error?.message || `Failed to update vote for record ${recordId}.`);
    }
  } catch (err) {
    console.error("Error during vote update API call:", err);
    showMessage('error', `Error updating vote: ${err.message}`);
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
      showMessage('error', `Session invalid: ${sessionResult.error?.message || 'Please log in.'}`, 6000);
      await router.push('/');
      return;
    }
    await loadData();
  } catch (err) {
    console.error('Initialization error (session check failed):', err);
    showMessage('error', 'Session check failed. Redirecting to login.', 6000);
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
  --accent-color: #FF3B30;
  --accent-hover: #E02E24;
  --input-bg-color: rgba(30, 34, 53, 0.7);
  --input-border-color: rgba(255, 255, 255, 0.1);
  --input-focus-border: rgba(255, 59, 48, 0.5);
  --input-focus-shadow: rgba(255, 59, 48, 0.15);
  --error-color: #FF453A;
  --error-bg: rgba(255, 69, 58, 0.1);
  --success-color: #34C759;
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
th, td { border: 1px solid var(--table-border-color); padding: 10px 12px; font-size: 14px; vertical-align: middle; text-align: right; white-space: nowrap; }
th { background-color: var(--table-header-bg); color: var(--text-color-lighter); position: sticky; top: 0; z-index: 10; font-weight: 600; }
tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--card-bg-color); }

.status-display-select {
  appearance: none; -webkit-appearance: none;
  display: inline-block;
  width: auto;
  min-width: 115px;
  height: 32px;
  padding: 0 30px 0 12px;
  line-height: 30px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 5px;
  border: 1px solid var(--input-border-color);
  background-color: var(--input-bg-color);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239DA3B4' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px 12px;
  cursor: default;
  transition: border-color 0.2s ease;
  outline: none;
}

.status-display-select.is-voted {
  color: var(--success-color);
  border-color: rgba(52, 199, 89, 0.3);
}
.status-display-select.is-not-voted {
  color: var(--text-color-muted);
  border-color: var(--input-border-color);
}

.status-display-select option {
  background-color: var(--card-bg-color);
  color: var(--text-color-light);
}
.status-display-select option[value="yes"] { color: var(--success-color); font-weight: 500; }
.status-display-select option[value="no"] { color: var(--text-color-muted); }

td.action-cell { text-align: center; vertical-align: middle; min-width: 100px; }
.update-btn {
  padding: 6px 15px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 32px;
  line-height: 1;
}
.update-btn:hover:not(:disabled) { background-color: var(--accent-hover); }
.update-btn:disabled {
  background-color: var(--disabled-bg-color);
  color: var(--disabled-text-color);
  cursor: not-allowed;
  opacity: 0.7;
}
.button-spinner { margin-right: 5px; }
.already-voted-text {
    color: var(--text-color-muted);
    font-size: 13px;
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