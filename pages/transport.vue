<template>
  <div class="wrapper transport-management">
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || 'admin' }})
    </button>

    <h1>Transport Management</h1>

    <transition name="fade">
      <VoteUpdate v-if="successMessage" title="Success" :message="successMessage" style="margin: 15px auto; max-width: 800px;" />
    </transition>
    <transition name="fade">
      <Warning v-if="errorMessage" title="Error" :message="errorMessage" style="margin: 15px auto; max-width: 800px;" />
    </transition>

    <div class="filter-container">
       <form @submit.prevent="applyFilters">
         <div class="form-group">
           <label for="routeNumber">License Plate (Car Number):</label>
           <input type="text" id="routeNumber" v-model="selectedCarNumber" @input="applyFiltersDebounced">
         </div>
         <div class="form-group">
           <label for="passengersCountFilter">Passengers (Min):</label>
           <input type="number" id="passengersCountFilter" v-model.number="selectedPassengersCountMin" min="0" @input="applyFiltersDebounced">
         </div>
        <div class="form-group">
          <label for="date">Select Date:</label>
          <input type="date" id="date" v-model="selectedDate" @change="applyFilters">
        </div>
        <button type="submit" :disabled="recordsLoading">
          <span v-if="recordsLoading" class="loading-spinner small"></span>
          Apply Filters
        </button>
      </form>
    </div>

    <div class="table-container" dir="rtl">
       <table>
         <thead>
           <tr>
               <th>السجل</th>
               <th>الاسم</th>
               <th>العائلة</th>
               <th>اسم الأب</th>
               <th>اسم الأم</th>
               <th>تاريخ الولادة</th>
               <th>المنطقة</th>
               <th>العنوان التفصيلي</th>
               <th>سيارة خاصة</th>
               <th>رقم السيارة</th>
               <th>نوع السيارة</th>
               <th>عدد الركاب</th>
               <th>وقت المغادرة المطلوب</th>
               <th>مكان العودة</th>
               <th>وقت العودة المطلوب</th>
               <th>انتخب</th>
               <th>المغادرة</th>
               <th>الوصول</th>
           </tr>
         </thead>
         <tbody>
           <tr v-if="recordsLoading">
             <td colspan="18" style="text-align: center;">
               <span class="loading-spinner"></span> Loading data...
             </td>
           </tr>
           <tr v-else-if="!recordsLoading && displayedRecords.length === 0">
             <td colspan="18" style="text-align: center;">
                No records found matching the current filters.
             </td>
           </tr>
           <tr v-else v-for="record in displayedRecords" :key="record.id">
               <td>{{ record.register }}</td>
               <td>{{ record.name }}</td>
               <td>{{ record.family }}</td>
               <td>{{ record.father }}</td>
               <td>{{ record.mother }}</td>
               <td>{{ record.dob }}</td>
               <td>{{ record.district }}</td>
               <td>{{ record.detailed_address }}</td>
               <td>{{ record.private_car }}</td>
               <td>{{ record.car_number }}</td>
               <td>{{ record.car_type }}</td>
               <td>{{ record.passaenger_count }}</td>
               <td>{{ record.departure_time }}</td>
               <td>{{ record.return_place }}</td>
               <td>{{ record.return_time }}</td>
               <td>{{ record.voted ? 'نعم' : 'لا' }}</td>
               <td>
                 <button @click="handleDeparture(record)"
                         :disabled="record.departing || record.arriving || record.departed"
                         class="action-btn depart-btn"
                         :aria-busy="record.departing">
                    <span v-if="record.departing" class="loading-spinner small"></span>
                    <span v-else>{{ record.departed ? 'غادر' : 'ابدأ المغادرة' }}</span>
                 </button>
               </td>
               <td>
                  <button @click="handleArrival(record)"
                          :disabled="record.departing || record.arriving || !record.departed || record.arrived"
                          class="action-btn arrive-btn"
                          :aria-busy="record.arriving">
                     <span v-if="record.arriving" class="loading-spinner small"></span>
                     <span v-else>{{ record.arrived ? 'وصل' : 'تسجيل الوصول' }}</span>
                  </button>
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
import { ref, onMounted } from 'vue';
import { useRouter } from '#app';
import { useDebounceFn } from '@vueuse/core';

import {
  fetchTransportRecords,
  markAsDeparted,
  markAsArrived
} from '~/javascript/transport.js';

import Warning from '~/components/warning.vue';
import VoteUpdate from '~/components/voteupdate.vue';


const router = useRouter();
const currentUser = ref(null);

const selectedCarNumber = ref('');
const selectedPassengersCountMin = ref(null);
const selectedDate = ref('');

const displayedRecords = ref([]);
const recordsLoading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;

const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(50);
const totalRecords = ref(0);

function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  errorMessage.value = null;
  successMessage.value = null;
  if (type === 'success') successMessage.value = message;
  else if (type === 'error') errorMessage.value = message;
  if (type) messageTimeout = setTimeout(() => { successMessage.value = null; errorMessage.value = null; }, duration);
}

async function fetchData() {
  recordsLoading.value = true;
  showMessage(null, '');

  const queryParams = {
    page: currentPage.value,
    limit: itemsPerPage.value,
    ...(selectedCarNumber.value && { car_number_like: selectedCarNumber.value }),
    ...(selectedPassengersCountMin.value !== null && selectedPassengersCountMin.value >= 0 && { passaenger_count_gte: selectedPassengersCountMin.value }),
    ...(selectedDate.value && { date: selectedDate.value }),
  };

  Object.keys(queryParams).forEach(key =>
    (queryParams[key] === null || queryParams[key] === undefined || queryParams[key] === '') && delete queryParams[key]
  );

  const result = await fetchTransportRecords(queryParams);

  if (result.success && Array.isArray(result.data)) {
    displayedRecords.value = result.data.map(record => ({
      ...record,
      departed: record.departed || false,
      arrived: record.arrived || false,
      departing: false,
      arriving: false,
    }));
    totalRecords.value = result.totalCount || result.meta?.total_count || result.data.length || 0;
    totalPages.value = result.totalPages || result.meta?.total_pages || Math.ceil(totalRecords.value / itemsPerPage.value) || 1;

    if (currentPage.value > totalPages.value && totalPages.value > 0) { currentPage.value = totalPages.value; }
    else if (currentPage.value < 1 && totalPages.value >= 1) { currentPage.value = 1; }
    else if (totalPages.value === 0) { currentPage.value = 1; }

  } else {
    displayedRecords.value = [];
    totalPages.value = 1;
    currentPage.value = 1;
    totalRecords.value = 0;
    showMessage('error', result.error?.message || 'Failed to load transport records.');
  }
  recordsLoading.value = false;
}

async function handleDeparture(record) {
    if (record.departing || record.arriving || record.departed) return;
    record.departing = true;
    showMessage(null, '');
    try {
        const result = await markAsDeparted(record.id);
        if (result.success) {
            record.departed = true;
            showMessage('success', `Record ${record.id} marked as departed.`);
        } else {
            showMessage('error', result.error?.message || `Failed to mark record ${record.id} as departed.`);
        }
    } catch (err) {
        showMessage('error', `An error occurred during departure: ${err.message}`);
        console.error("Departure Error:", err);
    } finally {
        record.departing = false;
    }
}

async function handleArrival(record) {
    if (record.departing || record.arriving || !record.departed || record.arrived) return;
    record.arriving = true;
    showMessage(null, '');
    try {
        const result = await markAsArrived(record.id);
        if (result.success) {
            record.arrived = true;
            showMessage('success', `Record ${record.id} marked as arrived.`);
        } else {
            showMessage('error', result.error?.message || `Failed to mark record ${record.id} as arrived.`);
        }
    } catch (err) {
        showMessage('error', `An error occurred during arrival: ${err.message}`);
        console.error("Arrival Error:", err);
    } finally {
        record.arriving = false;
    }
}

function applyFilters() {
    currentPage.value = 1;
    fetchData();
}

const applyFiltersDebounced = useDebounceFn(() => {
    applyFilters();
}, 500);

function goToPage(page) {
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value && !recordsLoading.value) {
        currentPage.value = page;
        fetchData();
        window.scrollTo(0, 0);
    }
}

async function handleLogout() {
    try {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        currentUser.value = null;
        router.push('/');
    } catch (error) {
        showMessage('error', 'Logout failed. Please try again.');
        console.error('Logout error:', error);
    }
}

onMounted(async () => {
    currentUser.value = localStorage.getItem('currentUser');
    if (!currentUser.value || !localStorage.getItem('authToken')) {
        showMessage('error', 'Not authenticated. Redirecting to login.');
        await router.push('/');
        return;
    }
    await fetchData();
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
  --button-success-bg: #4CAF50;
  --button-success-hover: #45a049;
  --button-primary-bg: #007bff;
  --button-primary-hover: #0056b3;
}

html, body, #__nuxt {
  height: 100%; margin: 0; padding: 0;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  color: var(--text-color-light);
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
</style>

<style scoped>
.wrapper.transport-management {
  max-width: 1800px;
  margin: 0 auto; padding: 40px 20px 60px 20px;
  box-sizing: border-box; position: relative;
}
h1 {
  color: var(--text-color-lighter); margin-bottom: 25px; text-align: center;
  margin-top: 20px;
}
.logout-btn {
  position: absolute; top: 41px; right: 20px; padding: 8px 15px;
  background-color: var(--accent-color); color: white; border: none;
  border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;
  transition: background-color 0.2s ease; z-index: 100;
}
.logout-btn:hover { background-color: var(--accent-hover); }

.filter-container {
  margin-bottom: 25px; padding: 20px; background-color: var(--card-bg-color);
  border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}
.filter-container form {
  display: flex; flex-wrap: wrap; gap: 15px 20px;
  align-items: flex-end;
}
.form-group {
  display: flex; flex-direction: column; gap: 6px;
  flex: 1;
  min-width: 180px;
  max-width: 300px;
}
.form-group label {
  font-size: 13px; font-weight: 500; color: var(--text-color-muted);
  margin-left: 2px;
}
select, input[type="date"], input[type="number"], input[type="text"], button {
  padding: 10px 12px; border-radius: 6px; border: 1px solid var(--input-border-color);
  background-color: var(--input-bg-color); font-size: 14px; color: var(--text-color-light);
  outline: none; transition: all 0.2s ease; box-sizing: border-box; height: 40px;
  width: 100%;
}
select:focus, input:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 2px var(--input-focus-shadow);
  background-color: rgba(30, 34, 53, 0.9);
}
select { cursor: pointer; }
button[type="submit"], .pagination button {
  padding: 0 20px;
  border: none; background-color: var(--accent-color); color: white;
  cursor: pointer; font-weight: 500; transition: background-color 0.2s ease;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; height: 40px;
  flex-shrink: 0;
}
button[type="submit"]:hover:not(:disabled), .pagination button:hover:not(:disabled) {
  background-color: var(--accent-hover);
}
button:disabled {
  opacity: 0.65; cursor: not-allowed;
  background-color: var(--text-color-muted);
}

.table-container {
  max-height: 70vh; overflow-y: auto; border: 1px solid var(--table-border-color);
  border-radius: 8px; background-color: var(--primary-bg-color);
  margin-top: 25px;
}
table {
  width: 100%; border-collapse: collapse; table-layout: auto;
}
th, td {
  border: 1px solid var(--table-border-color); padding: 9px 11px; font-size: 14px;
  vertical-align: middle; white-space: nowrap;
}
.table-container[dir="rtl"] table th,
.table-container[dir="rtl"] table td {
  text-align: right;
}
thead th {
  background-color: var(--table-header-bg);
  color: var(--text-color-lighter);
  position: sticky; top: 0; z-index: 10; font-weight: 600;
  border-bottom-width: 2px;
}
tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--card-bg-color); }

td .action-btn {
  padding: 6px 10px;
  font-size: 13px;
  color: white; border: none; border-radius: 4px;
  height: 32px;
  min-width: 110px;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  vertical-align: middle;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}
td .action-btn:disabled {
  opacity: 0.6; cursor: not-allowed;
}
.depart-btn { background-color: var(--button-primary-bg); }
.depart-btn:hover:not(:disabled) { background-color: var(--button-primary-hover); }
.depart-btn:disabled { background-color: var(--button-primary-bg); }
.depart-btn:disabled:not([aria-busy="true"]) {
   background-color: var(--text-color-muted);
}

.arrive-btn { background-color: var(--button-success-bg); }
.arrive-btn:hover:not(:disabled) { background-color: var(--button-success-hover); }
.arrive-btn:disabled { background-color: var(--button-success-bg); }
.arrive-btn:disabled:not([aria-busy="true"]) {
   background-color: var(--text-color-muted);
}

.pagination {
  text-align: center; margin-top: 25px; display: flex; justify-content: center;
  align-items: center; gap: 10px;
}
.pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
.pagination button { padding: 0 15px; }

.loading-spinner {
  display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite;
  vertical-align: middle;
}
.loading-spinner.small { width: 14px; height: 14px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }
</style>