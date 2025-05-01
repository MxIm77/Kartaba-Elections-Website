<template>
  <div class="wrapper elections-page">
    <!-- Logout Button -->
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || '...' }})
    </button>

    <!-- Navigation -->
    <nav class="main-nav">
      <NuxtLink to="/elections">Election Management</NuxtLink>
      <NuxtLink to="/transport">Transport Management</NuxtLink>
    </nav>

    <!-- Title -->
    <h1 style="margin-top: 60px;">Election Management</h1>

    <!-- Messages -->
    <transition name="fade">
      <div v-if="successMessage" class="message success-message">
        <!-- SVG --> <span>{{ successMessage }}</span>
      </div>
    </transition>
    <transition name="fade">
       <div v-if="errorMessage" class="message error-message">
        <!-- SVG --> <span>{{ errorMessage }}</span>
       </div>
    </transition>

    <!-- Filters -->
    <div class="filter-container">
       <form @submit.prevent="applyFilters">
         <!-- District Select -->
        <div class="form-group">
          <label for="district">Select District:</label>
          <select id="district" v-model="selectedDistrict" @change="handleDistrictChange" :disabled="districtsLoading || recordsLoading">
             <option v-if="districtsLoading" value="" disabled>Loading districts...</option>
             <option v-else value="">All Districts</option>
             <option v-for="district in districtOptions" :key="district.value" :value="district.value">{{ district.text }}</option>
          </select>
        </div>
         <!-- Register Select -->
        <div class="form-group">
          <label for="register">Select Register:</label>
          <select id="register" v-model="selectedRegister" :disabled="registersLoading || recordsLoading || !selectedDistrict">
             <option value="">All Registers</option>
             <option v-if="registersLoading" value="" disabled>Loading registers...</option>
             <option v-for="register in registerOptions" :key="register" :value="register">Register {{ register }}</option>
          </select>
        </div>
        <!-- Sex Select -->
        <div class="form-group">
          <label for="sex">Select Sex:</label>
          <select id="sex" v-model="selectedSex" :disabled="sexesLoading || recordsLoading">
            <option value="">All Sexes</option>
            <option v-if="sexesLoading" value="" disabled>Loading sexes...</option>
            <option v-for="sexOption in sexOptions" :key="sexOption.value" :value="sexOption.value">{{ sexOption.text }}</option>
          </select>
        </div>
        <!-- Filter Button -->
        <button type="submit" :disabled="recordsLoading">
            <span v-if="recordsLoading" class="loading-spinner small"></span>
            Apply Filters
        </button>
      </form>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <!-- *** REMOVED Action/Update Headers *** -->
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
          <!-- Loading State -->
          <tr v-if="recordsLoading">
             <!-- *** Adjusted colspan *** -->
             <td colspan="10" style="text-align: center;">
               <span class="loading-spinner"></span> Loading election data...
             </td>
          </tr>
          <!-- No Records State -->
           <tr v-else-if="!recordsLoading && electionRecords.length === 0">
              <!-- *** Adjusted colspan *** -->
             <td colspan="10" style="text-align: center;">No records found.</td>
          </tr>
           <!-- Data Rows -->
          <tr v-else v-for="record in electionRecords" :key="record.id">
            <td>{{ record.orientation }}</td>
            <td>{{ record.register }}</td>
            <td>{{ record.family }}</td>
            <td>{{ record.name }}</td>
            <td>{{ record.father }}</td>
            <td>{{ record.mother }}</td>
            <td>{{ record.dob }}</td>
            <td>{{ record.sex }}</td>
            <td>{{ record.religion }}</td>
            <td>{{ record.voted ?? record.elected }}</td> <!-- Display 'voted' or 'elected' based on API field -->
            <!-- *** REMOVED Action/Update Cells *** -->
            <!-- <td> <select ... > </td> -->
            <!-- <td> <button ... > </td> -->
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
     <div class="pagination" v-if="totalPages > 1 && !recordsLoading">
       <!-- Pagination buttons -->
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Next</button>
    </div>

     <!-- Copyright -->
     <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from '#app';
// Removed: import { useCookie } from '#app';
// Removed: import dbData from '@/db.json'; // *** REMOVED ***

// Import authentication and data fetching services
import { checkSession } from '~/home.js'; // For initial auth check
import { fetchElectionData } from '~/electionservice.js'; // *** NEW IMPORT *** (adjust path if needed)

// --- State ---
const router = useRouter();
const currentUser = ref(null);

// Filters
const selectedDistrict = ref('');
const selectedRegister = ref('');
const selectedSex = ref('');

// Dropdown Options & Loading States
const districtOptions = ref([]);
const districtsLoading = ref(true);
const registerOptions = ref([]);
const registersLoading = ref(false);
const sexOptions = ref([]);
const sexesLoading = ref(true);
const allRegistersData = ref({}); // To store the registers structure from API

// Table Data & State
const electionRecords = ref([]); // Paginated records for display
const allJsonRecords = ref([]); // Holds *all* records fetched from API
const recordsLoading = ref(true); // Main loading state
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;

// Pagination
const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(50);
const totalRecords = ref(0);

// --- Utility Functions ---
// showMessage function remains the same...
function showMessage(type, message, duration = 4000) {
  if (messageTimeout) clearTimeout(messageTimeout);
  if (type === 'success') {
    successMessage.value = message;
    errorMessage.value = null;
  } else {
    errorMessage.value = message;
    successMessage.value = null;
  }
  messageTimeout = setTimeout(() => {
    successMessage.value = null;
    errorMessage.value = null;
  }, duration);
}

// --- Data Loading and Processing ---

// *** REWRITTEN: Uses fetchElectionData service ***
async function loadInitialData() {
  // Set all relevant loading states
  districtsLoading.value = true;
  sexesLoading.value = true;
  recordsLoading.value = true;
  errorMessage.value = null;

  try {
    console.log('Fetching initial election data using service...');
    const result = await fetchElectionData(); // Call the service function

    if (result.success && result.data) {
        console.log('Service returned data successfully:', result.data);
        const apiData = result.data;

        // Populate state from API response
        districtOptions.value = apiData.districts || [];
        sexOptions.value = apiData.sexes || [];
        allRegistersData.value = apiData.registers || {};
        allJsonRecords.value = apiData.records || [];

        // Set default district if needed
        if (districtOptions.value.length > 0 && !selectedDistrict.value) {
            selectedDistrict.value = districtOptions.value[0].value;
        } else if (districtOptions.value.length === 0) {
            selectedDistrict.value = '';
        }

        // Populate dependent parts
        populateRegistersForSelectedDistrict();
        filterAndPaginateRecords(); // This will also set recordsLoading = false

        showMessage('success', 'Election data loaded successfully.');

    } else {
         // Handle API error from service
         console.error('Failed to fetch initial data:', result.error);
         showMessage('error', result.error?.message || 'Failed to load election data.');
         // Clear potentially stale data
         districtOptions.value = [];
         sexOptions.value = [];
         allRegistersData.value = {};
         allJsonRecords.value = [];
         electionRecords.value = [];
         selectedDistrict.value = '';
         recordsLoading.value = false; // Ensure loading stops on error
    }

  } catch (err) {
      // Catch unexpected errors during the service call itself
      showMessage('error', `An unexpected error occurred: ${err.message}`);
      console.error('Unexpected error in loadInitialData:', err);
      // Clear state and stop loading on unexpected error
      districtOptions.value = [];
      sexOptions.value = [];
      allRegistersData.value = {};
      allJsonRecords.value = [];
      electionRecords.value = [];
      selectedDistrict.value = '';
      recordsLoading.value = false;
  } finally {
      // Ensure dropdown loading states are off
      // recordsLoading is handled by filterAndPaginateRecords or error cases above
      districtsLoading.value = false;
      sexesLoading.value = false;
  }
}

// *** Uses allRegistersData ref populated by API ***
function populateRegistersForSelectedDistrict() {
    registersLoading.value = true;
    if (!selectedDistrict.value || !allRegistersData.value || !allRegistersData.value[selectedDistrict.value]) {
        registerOptions.value = [];
        registersLoading.value = false;
        return;
    }
    try {
        const registersForDistrict = allRegistersData.value[selectedDistrict.value] || [];
        const sortedRegisters = [...registersForDistrict].sort((a, b) => {
            const numA = parseInt(a, 10); const numB = parseInt(b, 10);
            return !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a).localeCompare(String(b));
        });
        registerOptions.value = sortedRegisters;
    } catch (err) {
        showMessage('error', 'Failed to populate registers dropdown.');
        console.error(err); registerOptions.value = [];
    } finally {
        registersLoading.value = false;
    }
}

// *** Operates on allJsonRecords populated by API - No changes needed here ***
function filterAndPaginateRecords() {
    if (!recordsLoading.value) recordsLoading.value = true;
    try {
        let filtered = [...allJsonRecords.value];
        if (selectedDistrict.value) { filtered = filtered.filter(r => r.district === selectedDistrict.value); }
        if (selectedRegister.value) { filtered = filtered.filter(r => String(r.register) === String(selectedRegister.value)); }
        if (selectedSex.value) { filtered = filtered.filter(r => r.sex === selectedSex.value); }

        totalRecords.value = filtered.length;
        totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value);
        if (currentPage.value > totalPages.value) { currentPage.value = totalPages.value > 0 ? 1 : 0; }
        if (currentPage.value <= 0 && totalPages.value > 0) { currentPage.value = 1; }

        const startIndex = (currentPage.value - 1) * itemsPerPage.value;
        const endIndex = startIndex + itemsPerPage.value;
        // *** REMOVED 'updating: false' as we are not updating ***
        electionRecords.value = (currentPage.value > 0 && filtered.length > 0)
                              ? filtered.slice(startIndex, endIndex)
                              : [];
    } catch (err) {
        showMessage('error', 'Error filtering or paginating records.');
        console.error(err); electionRecords.value = []; totalPages.value = 0; totalRecords.value = 0; currentPage.value = 0;
    } finally {
         recordsLoading.value = false; // Stop loading after filtering/pagination
    }
}


// --- REMOVED: updateRecord Function ---
// async function updateRecord(record) { ... }


// --- Event Handlers ---
// handleDistrictChange, applyFilters, goToPage remain the same
function handleDistrictChange() {
    selectedRegister.value = '';
    populateRegistersForSelectedDistrict();
    applyFilters();
}
function applyFilters() {
    currentPage.value = 1;
    filterAndPaginateRecords();
}
function goToPage(page) {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page;
    filterAndPaginateRecords();
  }
}

// --- Logout ---
// handleLogout remains the same (clears localStorage token)
async function handleLogout() {
    try {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken'); // Remove the token
        currentUser.value = null;
        console.log('Logged out, auth token cleared from localStorage.');
        await router.push('/');
    } catch (error) {
        showMessage('error', 'Logout failed. Please try again.');
        console.error('Logout error:', error);
    }
}

// --- Lifecycle Hooks ---
// onMounted remains mostly the same, just calls the new loadInitialData
onMounted(async () => {
    currentUser.value = localStorage.getItem('currentUser');
    console.log('Checking session on component mount...');
    recordsLoading.value = true; // Start main loading indicator
    districtsLoading.value = true;
    sexesLoading.value = true;

    try {
        const sessionResult = await checkSession(); // Checks token from localStorage
        if (!sessionResult.success) {
            console.warn('Initial session check failed on mount:', sessionResult.error);
            showMessage('error', `Session invalid or expired: ${sessionResult.error?.message || 'Please log in.'}`, 6000);
            await router.push('/');
            // Stop loading indicators if redirecting early
            recordsLoading.value = false; districtsLoading.value = false; sexesLoading.value = false;
            return;
        } else {
            console.log('Initial session check successful on mount.');
            // Session valid, load data from API using the service
            await loadInitialData(); // Call the rewritten function
        }
    } catch(err) {
         console.error('Error during initial session check/load:', err);
         showMessage('error', 'Could not verify session or load data. Please try logging in.', 6000);
         await router.push('/');
         recordsLoading.value = false; districtsLoading.value = false; sexesLoading.value = false;
         return;
    }
    // Loading states are managed within loadInitialData and filterAndPaginateRecords
});

</script>

<style>
/* --- GLOBAL STYLES --- */
/* Ensure these are defined globally */
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
  --table-header-bg: #2a3b52;
  --table-even-row-bg: #1f2940;
  --table-border-color: #3a4a63;
}

html, body, #__nuxt {
  height: 100%; margin: 0; padding: 0;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  color: var(--text-color-light);
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
</style>

<style scoped>
/* --- Scoped Styles (remain largely the same) --- */
.wrapper.elections-page { /* Updated class name */
  max-width: 1400px; margin: 0 auto; padding: 40px 20px 60px 20px;
  box-sizing: border-box; position: relative;
}
h1 {
  color: var(--text-color-lighter); margin-bottom: 25px; text-align: center;
}
.logout-btn {
  position: absolute; top: 41px; right: 20px; padding: 8px 15px;
  background-color: var(--accent-color); color: white; border: none;
  border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;
  transition: background-color 0.2s ease; z-index: 100;
}
.logout-btn:hover { background-color: var(--accent-hover); }

.main-nav {
  text-align: center; padding: 10px; background-color: var(--card-bg-color);
  border-radius: 8px; position: relative; z-index: 50;
}
.main-nav a {
  color: var(--text-color-light); text-decoration: none; margin: 0 15px; padding: 8px 12px;
  border-radius: 4px; transition: background-color 0.2s ease, color 0.2s ease; font-weight: 500;
}
.main-nav a:hover { background-color: var(--accent-hover); color: white; }
.main-nav a.router-link-exact-active { background-color: var(--accent-color); color: white; }

.message { padding: 12px 15px; margin: 15px 0; border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 14px; border-left-width: 4px; border-left-style: solid; }
.message svg { flex-shrink: 0; }
.success-message { background-color: var(--success-bg); color: var(--success-color); border-left-color: var(--success-color); }
.error-message { background-color: var(--error-bg); color: var(--error-color); border-left-color: var(--error-color); }

.filter-container { margin-bottom: 25px; padding: 20px; background-color: var(--card-bg-color); border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); }
.filter-container form { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 180px; }
.form-group label { font-size: 13px; font-weight: 500; color: var(--text-color-muted); margin-left: 2px; }
select, input, button { padding: 10px 12px; border-radius: 6px; border: 1px solid var(--input-border-color); background-color: var(--input-bg-color); font-size: 14px; color: var(--text-color-light); outline: none; transition: all 0.2s ease; box-sizing: border-box; height: 40px; }
select:focus, input:focus { border-color: var(--input-focus-border); box-shadow: 0 0 0 2px var(--input-focus-shadow); background-color: rgba(30, 34, 53, 0.9); }
select { cursor: pointer; }
button[type="submit"], .pagination button { padding: 10px 20px; border: none; background-color: var(--accent-color); color: white; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; }
button[type="submit"]:hover:not(:disabled), .pagination button:hover:not(:disabled) { background-color: var(--accent-hover); }
button:disabled { opacity: 1.5; cursor: not-allowed; }

.table-container { max-height: 65vh; overflow-y: auto; border: 1px solid var(--table-border-color); border-radius: 8px; background-color: var(--primary-bg-color); }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid var(--table-border-color); padding: 10px 12px; text-align: left; font-size: 14px; vertical-align: middle; }
th { background-color: var(--table-header-bg); color: var(--text-color-lighter); position: sticky; top: 0; z-index: 10; font-weight: 600; }
tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--card-bg-color); }
td .elected-select { width: 100%; min-width: 100px; height: 36px; padding: 6px 8px; }
td .update-btn { padding: 6px 12px; font-size: 13px; background-color: #4CAF50; height: 36px; min-width: 70px; }
td .update-btn:hover:not(:disabled) { background-color: #45a049; }
td .update-btn:disabled { background-color: #4CAF50; }

.pagination { text-align: center; margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 10px; }
.pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
.pagination button { padding: 8px 15px; }

.loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite; }
.loading-spinner.small { width: 14px; height: 14px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }
</style>