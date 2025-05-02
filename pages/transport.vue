<template>
  <div class="wrapper transport-management">
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || 'admin' }})
    </button>

    <h1>إدارة النقل</h1>

    <!-- Status Messages -->
    <transition name="fade">
      <VoteUpdate v-if="successMessage" title="نجاح" :message="successMessage" style="margin: 15px auto; max-width: 800px;" />
    </transition>
    <transition name="fade">
      <Warning v-if="errorMessage" title="خطأ" :message="errorMessage" style="margin: 15px auto; max-width: 800px;" />
    </transition>

    <!-- Filters -->
    <div class="filter-container">
       <form @submit.prevent="applyFilters">
         <div class="form-group">
           <label for="routeNumber">رقم اللوحة (السيارة):</label>
           <input type="text" id="routeNumber" v-model="selectedCarNumber" @input="applyFiltersDebounced" placeholder="أدخل جزء من الرقم...">
         </div>
         <div class="form-group">
           <label for="passengersCountFilter">عدد الركاب (الحد الأدنى):</label>
           <input type="number" id="passengersCountFilter" v-model.number="selectedPassengersCountMin" min="0" @input="applyFiltersDebounced" placeholder="0">
         </div>
        <div class="form-group">
          <label for="date">اختر التاريخ:</label>
          <input type="date" id="date" v-model="selectedDate" @change="applyFilters">
        </div>
        <div class="form-group button-group">
           <button type="submit" :disabled="recordsLoading">
            <span v-if="recordsLoading" class="loading-spinner small"></span>
            {{ recordsLoading ? 'جاري التحميل...' : 'تطبيق الفلاتر' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Data Table -->
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
               <th>وقت المغادرة الفعلي</th> <!-- Using this column for actual time -->
               <th>مكان العودة</th>
               <th>وقت الوصول الفعلي</th> <!-- Using this column for actual time -->
               <th>انتخب</th>
               <th>المغادرة</th>
               <th>الوصول</th>
           </tr>
         </thead>
         <tbody>
           <tr v-if="recordsLoading">
             <td colspan="18" class="status-cell">
               <span class="loading-spinner"></span> جاري تحميل البيانات...
             </td>
           </tr>
           <tr v-else-if="!recordsLoading && displayedRecords.length === 0">
             <td colspan="18" class="status-cell">
                لم يتم العثور على سجلات تطابق الفلاتر الحالية.
             </td>
           </tr>
           <tr v-else v-for="record in displayedRecords" :key="record.id" class="data-row">
               <td>{{ record.register }}</td>
               <td>{{ record.name }}</td>
               <td>{{ record.family }}</td>
               <td>{{ record.father }}</td>
               <td>{{ record.mother }}</td>
               <td>{{ formatReadableDate(record.dob) }}</td>
               <td>{{ record.district }}</td>
               <td>{{ record.detailed_address }}</td>
               <td>{{ record.private_car }}</td>
               <td>{{ record.car_number }}</td>
               <td>{{ record.car_type }}</td>
               <td>{{ record.passaenger_count }}</td>
               <!-- Display actual departure time using 'departure_time' -->
               <td>{{ formatReadableTime(record.departure_time) }}</td>
               <td>{{ record.return_place }}</td>
               <!-- Display actual arrival time using 'return_time' -->
               <td>{{ formatReadableTime(record.return_time) }}</td>
               <td>{{ record.voted ? 'نعم' : 'لا' }}</td>
               <td>
                 <!-- Disable button based on 'departed' flag -->
                 <button @click="handleDeparture(record)"
                         :disabled="record.departing || record.arriving || record.departed"
                         class="action-btn depart-btn" :class="{ 'departed': record.departed }" :aria-busy="record.departing">
                    <span v-if="record.departing" class="loading-spinner small"></span>
                    <span v-else>{{ record.departed ? 'غادر' : 'تسجيل المغادرة' }}</span>
                 </button>
               </td>
               <td>
                  <!-- Disable button based on 'departed' and 'arrived' flags -->
                  <button @click="handleArrival(record)"
                          :disabled="record.departing || record.arriving || !record.departed || record.arrived"
                          class="action-btn arrive-btn" :class="{ 'arrived': record.arrived }" :aria-busy="record.arriving">
                     <span v-if="record.arriving" class="loading-spinner small"></span>
                     <span v-else>{{ record.arrived ? 'وصل' : 'تسجيل الوصول' }}</span>
                  </button>
               </td>
           </tr>
         </tbody>
       </table>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1 && !recordsLoading">
       <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">السابق</button>
       <span>صفحة {{ currentPage }} من {{ totalPages }}</span>
       <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">التالي</button>
    </div>

    <!-- Copyright -->
    <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 جميع الحقوق محفوظة.</p>
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
} from '~/javascript/transport.js'; // Adjust path if needed
import Warning from '~/components/warning.vue'; // Adjust path if needed
import VoteUpdate from '~/components/voteupdate.vue'; // Adjust path if needed

const router = useRouter();
const currentUser = ref(null);

// --- Component State ---
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

// --- Date Formatting Helpers ---
function formatReadableDateTime(isoString) {
  if (!isoString) return '--';
  try { const date = new Date(isoString); if (isNaN(date.getTime())) return 'Invalid Date'; return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); } catch (error) { console.error("Error formatting date/time:", isoString, error); return 'Error'; }
}
function formatReadableDate(dateString) {
  if (!dateString) return 'N/A';
  try { let date; if (!dateString.includes('T') && !dateString.includes(' ') && dateString.includes('-')) { const parts = dateString.split('-'); if (parts.length === 3) { date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))); if (!isNaN(date.getTime())) { return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }); } } } date = new Date(dateString); if (isNaN(date.getTime())) return 'Invalid Date'; return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (error) { console.error("Error formatting date:", dateString, error); return 'Error'; }
}
function formatReadableTime(timeString) {
  if (!timeString) return '--'; // Show '--' if time is not set
  try { let dateToParse; if (timeString.includes('T')) { dateToParse = new Date(timeString); } else if (timeString.includes(':')) { const today = new Date().toISOString().split('T')[0]; dateToParse = new Date(`${today}T${timeString}`); if (timeString.length <= 8 && !timeString.endsWith('Z') && !timeString.match(/[+-]\d{2}:?\d{2}$/)) { dateToParse = new Date(`${today}T${timeString}Z`); } } else { return 'Invalid Time Format'; } if (isNaN(dateToParse.getTime())) return 'Invalid Time Value'; return dateToParse.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }); } catch (error) { console.error("Error formatting time:", timeString, error); return 'Error'; }
}

// --- showMessage Helper ---
function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  errorMessage.value = null; successMessage.value = null;
  if (type === 'success') successMessage.value = message; else if (type === 'error') errorMessage.value = message;
  if (message) { messageTimeout = setTimeout(() => { successMessage.value = null; errorMessage.value = null; }, duration); }
}

// --- Core Data Fetching (Sets 'departed'/'arrived' based on time field presence) ---
async function fetchData() {
  recordsLoading.value = true;
  const queryParams = {
    page: currentPage.value, limit: itemsPerPage.value,
    ...(selectedCarNumber.value && { car_number_like: selectedCarNumber.value.trim() }),
    ...(selectedPassengersCountMin.value !== null && selectedPassengersCountMin.value >= 0 && { passaenger_count_gte: selectedPassengersCountMin.value }),
    ...(selectedDate.value && { date: selectedDate.value }),
  };
  Object.keys(queryParams).forEach(key => (queryParams[key] === null || queryParams[key] === undefined || queryParams[key] === '') && delete queryParams[key]);

  const result = await fetchTransportRecords(queryParams); // GET Request

  if (result.success && Array.isArray(result.data)) {
    displayedRecords.value = result.data.map(record => {
        // *** Use the EXACT field names from your API response ***
        const departureTimeField = 'departure_time'; // Field containing actual departure time from GET response
        const arrivalTimeField = 'return_time';     // Field containing actual arrival time from GET response
        // ***

        // Check if these fields exist and have a value in the record from the GET request
        const hasDepartedTime = record[departureTimeField] != null && record[departureTimeField] !== '';
        const hasArrivedTime = record[arrivalTimeField] != null && record[arrivalTimeField] !== '';

        return {
          ...record,
          // Store the actual times from GET to display them
          departure_time: record[departureTimeField] || null,
          return_time: record[arrivalTimeField] || null,
          // Set boolean flags based on presence of actual times for button locking
          departed: hasDepartedTime,
          arrived: hasArrivedTime,
          // Reset UI loading states
          departing: false,
          arriving: false,
        };
    });
    // Update pagination
    totalRecords.value = result.totalCount || result.meta?.total_count || 0;
    totalPages.value = result.totalPages || result.meta?.total_pages || Math.ceil(totalRecords.value / itemsPerPage.value) || 1;
    // Adjust page
    if (totalRecords.value === 0) { currentPage.value = 1; totalPages.value = 1; }
    else if (currentPage.value > totalPages.value) { currentPage.value = totalPages.value; }
    else if (currentPage.value < 1) { currentPage.value = 1; }
  } else {
    // Handle fetch failure
    displayedRecords.value = []; totalPages.value = 1; currentPage.value = 1; totalRecords.value = 0;
    showMessage('error', result.error?.message || 'فشل تحميل سجلات النقل.');
    console.error("[fetchData] Fetch Error:", result.error);
  }
  recordsLoading.value = false;
}

// --- ACTION HANDLERS (Update local state & time immediately on POST success) ---

async function handleDeparture(record) {
    // Prevent action if already processing or departed
    if (record.departing || record.arriving || record.departed) return;

    const recordIndex = displayedRecords.value.findIndex(r => r.id === record.id);
    // Set loading state locally
    if (recordIndex !== -1) { displayedRecords.value[recordIndex].departing = true; }
    else { record.departing = true; } // Fallback

    showMessage(null, '');
    try {
        // POST request - Expects response body like { departure_time: '...' } in result.data
        const result = await markAsDeparted(record.id);
        if (result.success) {
            showMessage('success', `تم تسجيل مغادرة السجل ${record.id}.`);
            // *** Extract time from POST response data (use correct field name) ***
            const receivedDepartureTime = result.data?.departure_time;

            // Update local state IMMEDIATELY
            if (recordIndex !== -1) {
                 displayedRecords.value[recordIndex] = {
                    ...displayedRecords.value[recordIndex],
                    departed: true,                // Lock state locally
                    departing: false,              // Stop spinner
                    departure_time: receivedDepartureTime // Update displayed time
                 };
            } else { // Fallback
                record.departed = true;
                record.departing = false;
                record.departure_time = receivedDepartureTime;
            }
        } else {
            // Handle API error
            showMessage('error', result.error?.message || `فشل تسجيل مغادرة السجل ${record.id}.`);
            if (recordIndex !== -1) { displayedRecords.value[recordIndex].departing = false; }
            else { record.departing = false; }
        }
    } catch (err) {
        // Handle network/unexpected errors
        showMessage('error', `حدث خطأ أثناء تسجيل المغادرة: ${err.message}`);
        if (recordIndex !== -1) { displayedRecords.value[recordIndex].departing = false; }
        else { record.departing = false; }
        console.error("Departure Error:", err);
    }
}

async function handleArrival(record) {
    // Prevent action based on current state
    if (record.departing || record.arriving || !record.departed || record.arrived) return;

    const recordIndex = displayedRecords.value.findIndex(r => r.id === record.id);
    // Set loading state locally
    if (recordIndex !== -1) { displayedRecords.value[recordIndex].arriving = true; }
    else { record.arriving = true; } // Fallback

    showMessage(null, '');
    try {
        // POST request - Expects response body like { return_time: '...' } in result.data
        const result = await markAsArrived(record.id);
        if (result.success) {
            showMessage('success', `تم تسجيل وصول السجل ${record.id}.`);
            // *** Extract time from POST response data (use correct field name) ***
            const receivedArrivalTime = result.data?.return_time;

            // Update local state IMMEDIATELY
            if (recordIndex !== -1) {
                 displayedRecords.value[recordIndex] = {
                    ...displayedRecords.value[recordIndex],
                    arrived: true,             // Lock state locally
                    arriving: false,           // Stop spinner
                    return_time: receivedArrivalTime // Update displayed time
                 };
            } else { // Fallback
                record.arrived = true;
                record.arriving = false;
                record.return_time = receivedArrivalTime;
            }
        } else {
            // Handle API error
            showMessage('error', result.error?.message || `فشل تسجيل وصول السجل ${record.id}.`);
            if (recordIndex !== -1) { displayedRecords.value[recordIndex].arriving = false; }
            else { record.arriving = false; }
        }
    } catch (err) {
        // Handle network/unexpected errors
        showMessage('error', `حدث خطأ أثناء تسجيل الوصول: ${err.message}`);
        if (recordIndex !== -1) { displayedRecords.value[recordIndex].arriving = false; }
        else { record.arriving = false; }
        console.error("Arrival Error:", err);
    }
}


// --- Filtering, Pagination, Auth, Lifecycle (Remain the same) ---
function applyFilters() { currentPage.value = 1; fetchData(); }
const applyFiltersDebounced = useDebounceFn(() => { applyFilters(); }, 500);
function goToPage(page) { if (page >= 1 && page <= totalPages.value && page !== currentPage.value && !recordsLoading.value) { currentPage.value = page; fetchData(); window.scrollTo(0, 0); } }
async function handleLogout() { try { localStorage.removeItem('currentUser'); localStorage.removeItem('authToken'); currentUser.value = null; await router.push('/'); } catch (error) { showMessage('error', 'فشل تسجيل الخروج.'); console.error('Logout error:', error); } }
onMounted(async () => { currentUser.value = localStorage.getItem('currentUser'); const token = localStorage.getItem('authToken'); if (!currentUser.value || !token) { await router.push('/'); return; } await fetchData(); });

</script>

<style>
/* Root styles */
:root {
  --primary-bg-color: #1a233a; --card-bg-color: #2a3b52; --text-color-light: #e0e0e0;
  --text-color-lighter: #f5f5f5; --text-color-muted: #9DA3B4; --accent-color: #FF3B30;
  --accent-hover: #E02E24; --input-bg-color: rgba(30, 34, 53, 0.7); --input-border-color: rgba(255, 255, 255, 0.1);
  --input-focus-border: rgba(255, 59, 48, 0.5); --input-focus-shadow: rgba(255, 59, 48, 0.15); --error-color: #FF453A;
  --error-bg: rgba(255, 69, 58, 0.1); --success-color: #34C759; --success-bg: rgba(52, 199, 89, 0.1);
  --table-header-bg: #00000085; --table-even-row-bg: #1f2940; --table-hover-row-bg: #31435e;
  --table-border-color: #3a4a63; --button-success-bg: #34C759; --button-success-hover: #2aa148;
  --button-primary-bg: #0A84FF; --button-primary-hover: #0060df;
}
html, body, #__nuxt { height: 100%; margin: 0; padding: 0; background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%); color: var(--text-color-light); font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif; box-sizing: border-box; }
*, *:before, *:after { box-sizing: inherit; }
</style>

<style scoped>
/* Scoped styles */
.wrapper.transport-management { max-width: 1800px; margin: 0 auto; padding: 40px 20px 60px 20px; position: relative; direction: rtl; }
h1 { color: var(--text-color-lighter); margin-bottom: 30px; text-align: center; margin-top: 60px; font-size: 2rem; font-weight: 600; }
.logout-btn { position: absolute; top: 41px; left: 20px; right: auto; padding: 8px 15px; background-color: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease; z-index: 100; }
.logout-btn:hover { background-color: var(--accent-hover); }

.filter-container { margin-bottom: 30px; padding: 25px; background-color: var(--card-bg-color); border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15); }
.filter-container form { display: flex; flex-wrap: wrap; gap: 20px 25px; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
.form-group.button-group { flex-grow: 0; min-width: auto; align-self: flex-end; }
.form-group label { font-size: 14px; font-weight: 500; color: var(--text-color-muted); margin-right: 2px; margin-left: 0; }
input[type="text"], input[type="number"], input[type="date"] { padding: 10px 12px; border-radius: 6px; border: 1px solid var(--input-border-color); background-color: var(--input-bg-color); font-size: 14px; color: var(--text-color-light); outline: none; transition: all 0.2s ease; height: 42px; width: 100%; text-align: right; }
input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; opacity: 0.8; }
input::placeholder { color: var(--text-color-muted); opacity: 0.7; }
input:focus, input[type="date"]:focus { border-color: var(--input-focus-border); box-shadow: 0 0 0 3px var(--input-focus-shadow); background-color: rgba(30, 34, 53, 0.9); }
button[type="submit"] { padding: 0 25px; border: none; background-color: var(--accent-color); color: white; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; font-size: 15px; flex-shrink: 0; }
button[type="submit"]:hover:not(:disabled) { background-color: var(--accent-hover); }
button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; background-color: var(--text-color-muted); }

.table-container { max-height: 70vh; overflow-y: auto; border: 1px solid var(--table-border-color); border-radius: 8px; background-color: var(--primary-bg-color); margin-top: 25px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
table { width: 100%; border-collapse: collapse; table-layout: auto; }
th, td { border: 1px solid var(--table-border-color); padding: 10px 12px; font-size: 14px; vertical-align: middle; white-space: nowrap; text-align: right; }
thead th { background-color: var(--table-header-bg); color: var(--text-color-lighter); position: sticky; top: 0; z-index: 10; font-weight: 600; border-bottom-width: 2px; }
tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--table-hover-row-bg); }
tbody tr.data-row { cursor: default; }
td.status-cell { text-align: center; padding: 30px 15px; color: var(--text-color-muted); font-style: italic; }
td.status-cell .loading-spinner { margin-left: 10px; }

/* Action Buttons Styling */
td .action-btn { padding: 6px 12px; font-size: 13px; color: white; border: none; border-radius: 5px; height: 34px; min-width: 120px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; vertical-align: middle; cursor: pointer; transition: background-color 0.2s ease, opacity 0.2s ease; font-weight: 500; }
td .action-btn .loading-spinner.small { margin: 0; }

.depart-btn { background-color: var(--button-primary-bg); }
.depart-btn:hover:not(:disabled) { background-color: var(--button-primary-hover); }
.depart-btn.departed, .depart-btn:disabled:not([aria-busy="true"]) { background-color: var(--text-color-muted); opacity: 0.7; cursor: not-allowed; }
.depart-btn:disabled[aria-busy="true"] { background-color: var(--button-primary-bg); opacity: 0.8; cursor: wait; }

.arrive-btn { background-color: var(--button-success-bg); }
.arrive-btn:hover:not(:disabled) { background-color: var(--button-success-hover); }
.arrive-btn.arrived, .arrive-btn:disabled:not([aria-busy="true"]) { background-color: var(--text-color-muted); opacity: 0.7; cursor: not-allowed; }
.arrive-btn:disabled[aria-busy="true"] { background-color: var(--button-success-bg); opacity: 0.8; cursor: wait; }

/* General disabled styling for action buttons */
.action-btn:disabled:not([aria-busy="true"]) {
   background-color: var(--text-color-muted) !important;
   opacity: 0.7 !important;
   cursor: not-allowed !important;
}

.pagination { text-align: center; margin-top: 30px; display: flex; justify-content: center; align-items: center; gap: 12px; }
.pagination span { padding: 8px 15px; color: var(--text-color-muted); font-size: 14px; font-weight: 500; }
.pagination button { padding: 0 20px; height: 40px; border: none; background-color: var(--accent-color); color: white; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
.pagination button:hover:not(:disabled) { background-color: var(--accent-hover); }
.pagination button:disabled { opacity: 0.6; cursor: not-allowed; background-color: var(--text-color-muted); }

.loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite; vertical-align: middle; }
.loading-spinner.small { width: 14px; height: 14px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.copyright { margin-top: 40px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }
</style>