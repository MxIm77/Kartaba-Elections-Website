<template>
  <div class="wrapper elections-page"> <!-- Renamed class for clarity -->
    <!-- Logout Button (Single instance, correctly placed) -->
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || 'admin' }})
    </button>

    <!-- Navigation -->
    <nav class="main-nav">
      <!-- Corrected link to self -->
      <NuxtLink to="/elections">Election Management</NuxtLink>
      <NuxtLink to="/transport">Transport Management</NuxtLink>
    </nav>

    <!-- Main Title (Single instance, correctly placed) -->
    <h1 style="margin-top: 60px;">Election Management</h1>

    <!-- Success/Error Messages -->
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

    <!-- Filter Container -->
    <div class="filter-container">
      <form @submit.prevent="applyFilters">
        <div class="form-group">
          <label for="district">Select District:</label>
          <select id="district" v-model="selectedDistrict" @change="handleDistrictChange"> <!-- Added specific handler -->
            <option v-if="districtsLoading" value="" disabled>Loading districts...</option>
            <option v-for="district in districtOptions" :key="district.value" :value="district.value">
              {{ district.text }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="register">Select Register:</label>
          <select id="register" v-model="selectedRegister">
            <option value="">All Registers</option>
             <option v-if="registersLoading" value="" disabled>Loading registers...</option>
            <option v-for="register in registerOptions" :key="register" :value="register">
              Register {{ register }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="sex">Select Sex:</label>
          <select id="sex" v-model="selectedSex">
            <option value="">All Sexes</option>
            <option v-if="sexesLoading" value="" disabled>Loading sexes...</option>
             <option v-for="sexOption in sexOptions" :key="sexOption.value" :value="sexOption.value">
               {{ sexOption.text }}
            </option>
          </select>
        </div>
        <button type="submit" :disabled="recordsLoading">
            <span v-if="recordsLoading" class="loading-spinner small"></span>
            Apply Filters
        </button>
      </form>
    </div>

    <!-- Table Container -->
    <div class="table-container">
      <table>
        <thead>
          <!-- Using Arabic Headers -->
          <tr>
            <th>السجل</th>
            <th>العائلة</th>
            <th>الاسم</th>
            <th>اسم الأب</th>
            <th>اسم الأم</th>
            <th>تاريخ الولادة</th>
            <th>الجنس</th>
            <th>الديانة</th>
            <th>انتخب</th>
            <th>إجراء</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="recordsLoading">
            <td colspan="10" style="text-align: center;">
              <span class="loading-spinner"></span> Loading data...
            </td>
          </tr>
          <tr v-else-if="!recordsLoading && electionRecords.length === 0">
             <td colspan="10" style="text-align: center;">No records found for the selected filters.</td>
          </tr>
          <tr v-else v-for="record in electionRecords" :key="record.id">
            <td>{{ record.register }}</td>
            <td>{{ record.family }}</td>
            <td>{{ record.name }}</td>
            <td>{{ record.father }}</td>
            <td>{{ record.mother }}</td>
            <td>{{ record.dob }}</td>
            <td>{{ record.sex }}</td>
            <td>{{ record.religion }}</td>
            <td>
              <select v-model="record.elected" class="elected-select">
                <option value="">-- Select --</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </td>
            <td>
              <button @click="updateRecord(record)" :disabled="record.updating" class="update-btn">
                 <span v-if="record.updating" class="loading-spinner small"></span>
                {{ record.updating ? '...' : 'Update' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
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

// 1. Import the JSON file directly
// Ensure db.json is in your assets directory and has the correct structure.
import dbData from '@/db.json';

// --- State ---
const router = useRouter();
const currentUser = ref(null);

// Filters
const selectedDistrict = ref(''); // Start empty or set default after loading
const selectedRegister = ref('');
const selectedSex = ref('');

// Dropdown Options & Loading States
const districtOptions = ref([]);
const districtsLoading = ref(true); // Set true initially
const registerOptions = ref([]);
const registersLoading = ref(false);
const sexOptions = ref([]);
const sexesLoading = ref(true); // Set true initially

// Table Data & State
const electionRecords = ref([]); // This will hold the *paginated* results from JSON
const allJsonRecords = ref([]); // Holds *all* records from JSON for filtering
const recordsLoading = ref(true); // Set true initially
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;

// Pagination
const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = ref(50);
const totalRecords = ref(0); // Total records *after* filtering

// --- Utility Functions ---
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

// --- Data Processing (from JSON) ---

// Load initial dropdown options and all records from JSON
function loadInitialData() {
  districtsLoading.value = true;
  sexesLoading.value = true;
  recordsLoading.value = true; // Also set records loading true initially

  try {
    // Simulate async delay if needed
    // await new Promise(resolve => setTimeout(resolve, 200));

    // Districts
    districtOptions.value = dbData.districts || [];
    if (districtOptions.value.length > 0 && !selectedDistrict.value) {
         // Set a default district if none is selected and options exist
         selectedDistrict.value = districtOptions.value[0].value;
    } else if (districtOptions.value.length === 0) {
        selectedDistrict.value = ''; // Clear if no districts
    }

    // Sexes
    sexOptions.value = dbData.sexes || [];

    // All Records (Store once)
    allJsonRecords.value = dbData.records || [];

    // Populate registers based on the potentially set default district
    populateRegistersForSelectedDistrict();

    // Apply initial filtering and pagination
    filterAndPaginateRecords();

  } catch (err) {
    showMessage('error', err.message || 'Failed to load initial data from JSON.');
    console.error(err);
    districtOptions.value = [];
    sexOptions.value = [];
    allJsonRecords.value = [];
    electionRecords.value = []; // Clear table data
    selectedDistrict.value = '';
  } finally {
    districtsLoading.value = false;
    sexesLoading.value = false;
    // recordsLoading will be set false in filterAndPaginateRecords
  }
}

// Populate register dropdown based on current selectedDistrict
function populateRegistersForSelectedDistrict() {
    if (!selectedDistrict.value || !dbData.registers) {
        registerOptions.value = [];
        // selectedRegister.value = ''; // Keep selected register if desired, or reset here
        return;
    }
    registersLoading.value = true;
    try {
        // Access registers based on the selected district value
        const registersForDistrict = dbData.registers[selectedDistrict.value] || [];

        // Sort registers
        const sortedRegisters = [...registersForDistrict].sort((a, b) => { // Use spread to avoid modifying original if needed
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            return !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a).localeCompare(String(b));
        });
        registerOptions.value = sortedRegisters;
    } catch (err) {
        showMessage('error', 'Failed to populate registers for the selected district.');
        console.error(err);
        registerOptions.value = [];
    } finally {
        registersLoading.value = false;
    }
}

// Filter and Paginate the records from allJsonRecords
function filterAndPaginateRecords() {
    recordsLoading.value = true;
    try {
        let filtered = [...allJsonRecords.value]; // Start with a copy of all records

        // Apply filters
        if (selectedDistrict.value) {
            filtered = filtered.filter(record => record.district === selectedDistrict.value);
        }
        if (selectedRegister.value) {
            // Ensure type comparison is robust (e.g., compare as strings)
            filtered = filtered.filter(record => String(record.register) === String(selectedRegister.value));
        }
        if (selectedSex.value) {
            filtered = filtered.filter(record => record.sex === selectedSex.value);
        }

        // Update total count *after* filtering
        totalRecords.value = filtered.length;
        totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value);

        // Reset to page 1 if current page is invalid after filtering
        if (currentPage.value > totalPages.value) {
            currentPage.value = totalPages.value > 0 ? 1 : 0; // Go to 1 if pages exist, 0 otherwise? Or 1 always?
        }
        // Handle case where currentPage might be 0 if totalPages is 0
        if (currentPage.value <= 0 && totalPages.value > 0) {
            currentPage.value = 1;
        }


        // Apply pagination
        const startIndex = (currentPage.value - 1) * itemsPerPage.value;
        const endIndex = startIndex + itemsPerPage.value;
        // Only slice if we have a valid page and records
        electionRecords.value = (currentPage.value > 0 && filtered.length > 0)
                              ? filtered.slice(startIndex, endIndex).map(r => ({ ...r, updating: false }))
                              : []; // Empty array if no valid page or no records

    } catch (err) {
        showMessage('error', 'Error filtering or paginating records.');
        console.error(err);
        electionRecords.value = [];
        totalPages.value = 0;
        totalRecords.value = 0;
        currentPage.value = 0; // Or 1?

    } finally {
         recordsLoading.value = false;
    }
}


// Update a single record's elected status (in memory)
async function updateRecord(record) {
  record.updating = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    // Find the record in the *original* allJsonRecords array to modify it
    // This makes the change persistent for the current session (until refresh)
    // across different filter/pagination views.
    const recordInDb = allJsonRecords.value.find(r => r.id === record.id);

    if (recordInDb) {
      // Update the property in the master list
      recordInDb.elected = record.elected;

      // Also update the currently displayed record instance immediately
      // (v-model already does this, but good practice if not using v-model)
      const recordInView = electionRecords.value.find(r => r.id === record.id);
      if (recordInView) {
          recordInView.elected = record.elected;
      }

      // Simulate async delay
      await new Promise(resolve => setTimeout(resolve, 300));

      showMessage('success', `Record ${record.id} (${record.name}) updated successfully (in memory).`);
    } else {
      throw new Error(`Record with ID ${record.id} not found in JSON data.`);
    }

  } catch (err) {
     showMessage('error', err.message || `An unexpected error occurred while updating record ${record.id}.`);
     console.error(err);
     // Optional: Add logic to revert the change if needed
  } finally {
    record.updating = false;
  }
}

// --- Event Handlers ---

// Handle district change: update registers and then filter records
function handleDistrictChange() {
    selectedRegister.value = ''; // Reset register filter when district changes
    populateRegistersForSelectedDistrict();
    applyFilters(); // Apply filters immediately after district change
}

// Apply all current filters and reset to page 1
function applyFilters() {
    currentPage.value = 1;
    filterAndPaginateRecords();
}

// Go to a specific page
function goToPage(page) {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page;
    filterAndPaginateRecords(); // Re-apply pagination
  }
}

// Logout (still interacts with backend API)
async function handleLogout() {
    try {
        await useFetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('currentUser');
        currentUser.value = null;
        router.push('/'); // Adjust if needed
    } catch (error) {
        showMessage('error', 'Logout failed. Please try again.');
        console.error('Logout error:', error);
    }
}

// --- Lifecycle Hooks ---
onMounted(() => {
    currentUser.value = localStorage.getItem('currentUser');
    // Load all initial data (districts, sexes, all records)
    // This will also trigger the first filterAndPaginateRecords call
    loadInitialData();
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
button:disabled { opacity: 0.65; cursor: not-allowed; }

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