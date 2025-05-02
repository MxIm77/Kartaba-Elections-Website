<template>
  <div class="wrapper private-transport-page" dir="rtl">
    <!-- Logout button stays on the left in RTL -->
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || 'admin' }})
    </button>

    <h1>إدارة النقل الخاص</h1>

    <transition name="fade">
      <VoteUpdate
        v-if="successMessage"
        title="نجاح"
        :message="successMessage"
        class="status-message"
      />
    </transition>
    <transition name="fade">
      <Warning
        v-if="errorMessage"
        title="خطأ"
        :message="errorMessage"
        class="status-message"
      />
    </transition>

    <div class="filter-container">
       <form @submit.prevent="applyFilters">
         <div class="form-group">
          <label for="routeNumber">رقم اللوحة:</label>
          <input type="text" id="routeNumber" v-model="selectedRouteNumber" @input="applyFiltersDebounced" placeholder="أدخل جزء من الرقم...">
        </div>
        <div class="form-group">
          <label for="passengersCountFilter">عدد الركاب (الحد الأدنى):</label>
          <input type="number" id="passengersCountFilter" v-model.number="selectedPassengersCountMin" min="0" @input="applyFiltersDebounced" placeholder="0">
        </div>
        <!-- Apply Filters Button -->
        <div class="form-group button-group">
           <button type="submit" :disabled="recordsLoading">
            <span v-if="recordsLoading" class="loading-spinner small"></span>
            {{ recordsLoading ? 'جاري التحميل...' : 'تطبيق الفلاتر' }}
          </button>
        </div>
      </form>
    </div>

    <div class="table-container">
       <table>
         <thead>
           <tr>
               <th>السجل</th>
               <th>الاسم</th>
               <th>العائلة</th>
               <th>اسم الأب</th>
               <th>اسم الأم</th>
               <th>تاريخ الولادة</th>
               <th>الجنس</th>
               <th>الديانة</th>
               <th>المنطقة</th>
               <th>انتخب</th>
               <th>سيارة خاصة</th>
               <th>رقم السيارة</th>
               <th>نوع السيارة</th>
               <th>عدد الركاب</th>
           </tr>
         </thead>
         <tbody>
           <tr v-if="recordsLoading">
             <td colspan="14" class="status-cell">
               <span class="loading-spinner"></span> جاري تحميل البيانات...
             </td>
           </tr>
           <tr v-else-if="!recordsLoading && displayedRecords.length === 0">
             <td colspan="14" class="status-cell">
                لم يتم العثور على سجلات تطابق الفلاتر الحالية.
             </td>
           </tr>
           <tr v-else v-for="record in displayedRecords" :key="record.id" class="data-row">
               <td>{{ record.register }}</td>
               <td>{{ record.name }}</td>
               <td>{{ record.family }}</td>
               <td>{{ record.father }}</td>
               <td>{{ record.mother }}</td>
               <td>{{ record.dob }}</td>
               <td>{{ record.sex }}</td>
               <td>{{ record.religion }}</td>
               <td>{{ record.district }}</td>
               <td>{{ record.voted ? 'نعم' : 'لا' }}</td>
               <td>{{ record.private_car }}</td>
               <td>{{ record.car_number }}</td>
               <td>{{ record.car_type }}</td>
               <td>{{ record.passaenger_count }}</td>
           </tr>
         </tbody>
       </table>
    </div>

    <div class="pagination" v-if="totalPages > 1 && !recordsLoading">
       <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">السابق</button>
       <span>صفحة {{ currentPage }} من {{ totalPages }}</span>
       <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">التالي</button>
    </div>

    <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 جميع الحقوق محفوظة.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from '#app'; // Assuming Nuxt 3 structure
import { useDebounceFn } from '@vueuse/core';

// Only import the function needed now
import { fetchPrivateTransportRecords } from '~/javascript/privatetransport.js';

import Warning from '~/components/warning.vue';
import VoteUpdate from '~/components/voteupdate.vue';

const router = useRouter();
const currentUser = ref(null);

// --- Filter State ---
// Removed selectedIsPrivateCar and selectedRouteType
const selectedRouteNumber = ref('');
const selectedPassengersCountMin = ref(null); // Use null for empty number input

// --- Dropdown State Removed ---
// Removed privateCarStatusOptions, routeTypeOptions, and their loading states

// --- Data & UI State ---
const displayedRecords = ref([]);
const recordsLoading = ref(false);
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;

// --- Pagination State ---
const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(50); // Keep consistent
const totalRecords = ref(0);

// --- Functions ---

function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  errorMessage.value = null;
  successMessage.value = null;

  if (type === 'success') {
    successMessage.value = message;
  } else if (type === 'error') {
    errorMessage.value = message;
  }

  if (message) { // Only set timeout if there's a message
    messageTimeout = setTimeout(() => {
      successMessage.value = null;
      errorMessage.value = null;
    }, duration);
  }
}

// Removed loadDropdownOptions function

// Updated data fetching function
async function fetchFilteredServerSide() {
    recordsLoading.value = true;
    showMessage(null, ''); // Clear previous messages

    // Build query parameters based ONLY on active filters
    const queryParams = {
        page: currentPage.value,
        limit: itemsPerPage.value,
        // Use _like for partial matching on car number (adjust if backend expects exact match)
        ...(selectedRouteNumber.value && { car_number_like: selectedRouteNumber.value.trim() }),
        // Use _gte for "greater than or equal to"
        ...(selectedPassengersCountMin.value !== null && selectedPassengersCountMin.value >= 0 && { passaenger_count_gte: selectedPassengersCountMin.value }),
    };

    // Clean up null/undefined/empty string params (optional, depends on backend handling)
    Object.keys(queryParams).forEach(key =>
        (queryParams[key] === null || queryParams[key] === undefined || queryParams[key] === '') && delete queryParams[key]
    );

    console.log("Fetching with params:", queryParams); // For debugging

    const result = await fetchPrivateTransportRecords(queryParams);

    if (result.success && Array.isArray(result.data)) {
        displayedRecords.value = result.data;
        // Adapt based on how your API returns total count/pages
        totalRecords.value = result.totalCount || result.meta?.total_count || 0; // Default to 0 if not provided
        totalPages.value = result.totalPages || result.meta?.total_pages || Math.ceil(totalRecords.value / itemsPerPage.value) || 1;

        // Adjust current page if it becomes invalid after filtering
        if (totalRecords.value === 0) {
            currentPage.value = 1;
            totalPages.value = 1;
        } else if (currentPage.value > totalPages.value) {
             currentPage.value = totalPages.value; // Go to last valid page
        } else if (currentPage.value < 1) {
             currentPage.value = 1; // Go to first page
        }

    } else {
        displayedRecords.value = [];
        totalPages.value = 1;
        currentPage.value = 1;
        totalRecords.value = 0;
        showMessage('error', result.error?.message || 'فشل تحميل سجلات النقل.');
        console.error("Fetch Error:", result.error);
    }
    recordsLoading.value = false;
}

// Use the server-side fetching function
const fetchData = fetchFilteredServerSide;

// Trigger fetch when filters change (reset page to 1)
function applyFilters() {
    currentPage.value = 1; // Reset to first page on new filter application
    fetchData();
}

// Debounced version for input fields
const applyFiltersDebounced = useDebounceFn(() => {
    applyFilters();
}, 500); // 500ms delay

// Navigate between pages
function goToPage(page) {
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value && !recordsLoading.value) {
        currentPage.value = page;
        fetchData();
        window.scrollTo(0, 0); // Scroll to top on page change
    }
}

// Logout handler
async function handleLogout() {
    try {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        currentUser.value = null;
        await router.push('/'); // Use await for cleaner async flow
    } catch (error) {
        showMessage('error', 'فشل تسجيل الخروج. الرجاء المحاولة مرة أخرى.');
        console.error('Logout error:', error);
    }
}

// --- Lifecycle Hook ---
onMounted(async () => {
    currentUser.value = localStorage.getItem('currentUser');
    const token = localStorage.getItem('authToken');

    if (!currentUser.value || !token) {
        // Don't show error message here, just redirect
        console.log('Not authenticated, redirecting...');
        await router.push('/');
        return; // Stop execution if not authenticated
    }

    // No need to load dropdowns anymore
    await fetchData(); // Fetch initial data
});

</script>

<style>
/* Keep the root variables */
:root {
  --primary-bg-color: #1a233a;
  --card-bg-color: #2a3b52;
  --text-color-light: #e0e0e0;
  --text-color-lighter: #f5f5f5;
  --text-color-muted: #9DA3B4;
  --accent-color: #FF3B30; /* iOS Red */
  --accent-hover: #E02E24;
  --input-bg-color: rgba(30, 34, 53, 0.7);
  --input-border-color: rgba(255, 255, 255, 0.1);
  --input-focus-border: rgba(255, 59, 48, 0.5);
  --input-focus-shadow: rgba(255, 59, 48, 0.15);
  --error-color: #FF453A; /* iOS Red */
  --error-bg: rgba(255, 69, 58, 0.1);
  --success-color: #34C759; /* iOS Green */
  --success-bg: rgba(52, 199, 89, 0.1);
  --table-header-bg: #00000085;
  --table-even-row-bg: #1f2940;
  --table-hover-row-bg: #31435e; /* Slightly different hover */
  --table-border-color: #3a4a63;
}

html, body, #__nuxt {
  height: 100%; margin: 0; padding: 0;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  color: var(--text-color-light);
  /* Prioritize Arabic fonts */
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
  box-sizing: border-box; /* Apply globally */
}
*, *:before, *:after {
  box-sizing: inherit;
}
</style>

<style scoped>
.wrapper.private-transport-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px 60px 20px;
  position: relative;
  direction: rtl; /* Set base direction */
}

h1 {
  color: var(--text-color-lighter);
  margin-bottom: 30px; /* More space below title */
  text-align: center;
  margin-top: 20px; /* Space above title */
  font-size: 2rem; /* Slightly larger */
  font-weight: 600;
}

.logout-btn {
  position: absolute;
  top: 41px;
  /* Adjust for RTL: place on the left */
  left: 20px;
  right: auto;
  padding: 8px 15px;
  background-color: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease;
  z-index: 100;
}
.logout-btn:hover { background-color: var(--accent-hover); }

.status-message {
  margin: 15px auto;
  max-width: 800px;
}

.filter-container {
  margin-bottom: 30px; /* More space below filters */
  padding: 25px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15); /* Slightly stronger shadow */
}

.filter-container form {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 25px; /* Adjust gaps */
  align-items: flex-end; /* Align items to the bottom */
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px; /* Space between label and input */
  flex: 1; /* Allow flexible growth */
  min-width: 200px; /* Minimum width */
}
/* Specific alignment for the button group */
.form-group.button-group {
    flex-grow: 0; /* Don't let button group grow */
    min-width: auto; /* Reset min-width */
    align-self: flex-end; /* Ensure it aligns with bottom of other inputs */
}

.form-group label {
  font-size: 14px; /* Slightly larger label */
  font-weight: 500;
  color: var(--text-color-muted);
  margin-right: 2px; /* RTL margin */
  margin-left: 0;
}

input[type="text"], input[type="number"] {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--input-border-color);
  background-color: var(--input-bg-color);
  font-size: 14px;
  color: var(--text-color-light);
  outline: none;
  transition: all 0.2s ease;
  height: 42px; /* Slightly taller */
  width: 100%;
  text-align: right; /* Align text right for RTL */
}
input::placeholder {
  color: var(--text-color-muted);
  opacity: 0.7;
}

input:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-shadow); /* Slightly larger focus shadow */
  background-color: rgba(30, 34, 53, 0.9);
}

button[type="submit"], .pagination button {
  padding: 0 25px; /* More padding */
  border: none;
  background-color: var(--accent-color);
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px; /* Match input height */
  font-size: 15px; /* Slightly larger button text */
  flex-shrink: 0;
}

button[type="submit"]:hover:not(:disabled), .pagination button:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--text-color-muted);
}

.table-container {
  max-height: 65vh; /* Limit height */
  overflow-y: auto; /* Enable vertical scroll */
  border: 1px solid var(--table-border-color);
  border-radius: 8px;
  background-color: var(--primary-bg-color);
  margin-top: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto; /* Let browser decide column widths */
}

th, td {
  border: 1px solid var(--table-border-color);
  padding: 12px 15px; /* More padding */
  font-size: 14px;
  vertical-align: middle;
  white-space: nowrap; /* Prevent text wrapping */
  text-align: right; /* RTL default alignment */
}

thead th {
  background-color: var(--table-header-bg);
  color: var(--text-color-lighter);
  position: sticky;
  top: 0; /* Stick to top */
  z-index: 10;
  font-weight: 600;
  border-bottom-width: 2px; /* Emphasize header bottom border */
}

tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--table-hover-row-bg); } /* Use hover variable */
tbody tr.data-row {
  cursor: default; /* Indicate rows are not interactive (unless you add click later) */
}

td.status-cell {
  text-align: center; /* Center align status messages */
  padding: 30px 15px; /* More padding for status cells */
  color: var(--text-color-muted);
  font-style: italic;
}
td.status-cell .loading-spinner {
    margin-left: 10px; /* RTL margin */
}

.pagination {
  text-align: center;
  margin-top: 30px; /* More space above pagination */
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px; /* More gap */
}

.pagination span {
  padding: 8px 15px; /* More padding */
  color: var(--text-color-muted);
  font-size: 14px;
  font-weight: 500;
}

.pagination button {
  padding: 0 20px; /* Adjust padding */
}

.loading-spinner {
  display: inline-block;
  width: 20px; height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: var(--text-color-lighter); /* Use lighter text color for spinner */
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
}
.loading-spinner.small {
  width: 14px; height: 14px;
  border-width: 2px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.copyright {
  margin-top: 40px; /* More space above copyright */
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}
</style>