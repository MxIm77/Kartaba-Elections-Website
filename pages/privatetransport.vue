<template>
    <div class="wrapper private-transport-page">
      <!-- Logout Button -->
      <button @click="handleLogout" class="logout-btn">
        Logout ({{ currentUser || 'admin' }})
      </button>

      <!-- Navigation -->
      <nav class="main-nav">
        <NuxtLink to="/elections">Election Management</NuxtLink>
        <NuxtLink to="/transport">Transport Management</NuxtLink>
        <NuxtLink to="/privatetransport">Private Transport</NuxtLink>
        <NuxtLink to="/stats">Voting Stats</NuxtLink> 
      </nav>

      <!-- Main Title -->
      <h1>Private Transport Management</h1>

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
            <label for="isPrivateCar">Private Car:</label>
            <select id="isPrivateCar" v-model="selectedIsPrivateCar" @change="applyFilters">
              <option value="">All</option> <!-- Represents filtering for both true and false -->
              <option v-if="privateCarStatusesLoading" value="" disabled>Loading...</option>
              <option v-for="status in privateCarStatusOptions" :key="status.value" :value="status.value">
                {{ status.text }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="routeNumber">License Plate:</label>
            <!-- Use @input for immediate filtering as user types -->
            <input type="text" id="routeNumber" v-model="selectedRouteNumber" @input="applyFilters">
          </div>
          <div class="form-group">
            <label for="routeType">Car Type:</label>
            <select id="routeType" v-model="selectedRouteType" @change="applyFilters">
              <option value="">All Types</option>
              <option v-if="routeTypesLoading" value="" disabled>Loading...</option>
              <option v-for="type in routeTypeOptions" :key="type.value" :value="type.value">
                {{ type.text }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="passengersCountFilter">Passengers (Min):</label>
            <!-- Use @input for immediate filtering -->
            <input type="number" id="passengersCountFilter" v-model.number="selectedPassengersCountMin" min="0" @input="applyFilters">
          </div>
          <button type="submit" :disabled="recordsLoading">
            <span v-if="recordsLoading" class="loading-spinner small"></span>
            Apply Filters
          </button>
        </form>
      </div>

      <!-- Table Container -->
      <div class="table-container" dir="rtl">
        <table>
          <thead>
                <tr>
                    <th>السجل</th>
                    <th>العائلة</th>
                    <th>الاسم</th>
                    <th>اسم الأب</th>
                    <th>اسم الأم</th>
                    <th>تاريخ الولادة</th>
                    <th>الجنس</th>
                    <th>الديانة</th>     
                    <th>سيارة خاصة</th>
                    <th>رقم السيارة</th>
                    <th>نوع السيارة</th>
                    <th>عدد الركاب</th>
                    <th>انتخب</th>
                    <th>ma3na</th> 
                </tr>
          </thead>
          <tbody>
            <tr v-if="recordsLoading">
              <td colspan="14" style="text-align: center;"> <!-- Step 4: Changed to 13 -->
                <span class="loading-spinner"></span> Loading data...
              </td>
            </tr>
            <tr v-else-if="!recordsLoading && privateTransportRecords.length === 0">
              <td colspan="14" style="text-align: center;">No records found for the selected filters.</td> <!-- Step 4: Changed to 13 -->
            </tr>
            <!-- Display simplified data -->
            <tr v-else v-for="record in privateTransportRecords" :key="record.id">
                <td>{{ record.register }}</td>
                <td>{{ record.family }}</td>
                <td>{{ record.name }}</td>
                <td>{{ record.father }}</td>
                <td>{{ record.mother }}</td>
                <td>{{ record.dob }}</td>
                <td>{{ record.sex }}</td>
                <td>{{ record.religion }}</td>
                <td>{{ record.is_private_car ? 'نعم' : 'لا' }}</td>
                <td>{{ record.route_number }}</td>
                <td>{{ record.route_type }}</td>
                <td>{{ record.passengers_count }}</td>
                <td>{{ record.elected }}</td>
                <td>{{ record.with_us }}</td>  <!-- Step 3: Added Data Cell -->
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

  // 1. Import the SIMPLIFIED JSON file
  import privateTransportData from '@/db.json';

  // --- State ---
  const router = useRouter();
  const currentUser = ref(null);
  // In your <script setup> block, below your existing `ref()` declarations

// State for Voter Counts
const votedCount = ref(0);
const notVotedCount = ref(0);

// ... rest of your state variables (privateTransportRecords, etc.)

  // Filters
  const selectedIsPrivateCar = ref(''); // Use '' for 'All'
  const selectedRouteNumber = ref('');
  const selectedRouteType = ref('');
  const selectedPassengersCountMin = ref(null); // Use null for no min filter

  // Dropdown Options & Loading States
  const privateCarStatusOptions = ref([]);
  const privateCarStatusesLoading = ref(false); // For UI feedback
  const routeTypeOptions = ref([]);
  const routeTypesLoading = ref(false); // For UI feedback

  // Table Data & State
  const privateTransportRecords = ref([]); // Displayed records (paginated)
  const allJsonPrivateTransportRecords = ref([]); // All records from JSON
  const recordsLoading = ref(false); // Table loading indicator
  const errorMessage = ref(null);
  const successMessage = ref(null);
  let messageTimeout = null;

  // Pagination
  const currentPage = ref(1);
  const totalPages = ref(1);
  const itemsPerPage = ref(50);
  const totalRecords = ref(0); // Filtered record count

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
  function loadInitialPrivateTransportData() {
    privateCarStatusesLoading.value = true;
    routeTypesLoading.value = true;
    recordsLoading.value = true;

    try {
      // Load options from JSON
      privateCarStatusOptions.value = privateTransportData.private_car_statuses || [];
      routeTypeOptions.value = privateTransportData.route_types || [];

      // Load all records from JSON
      allJsonPrivateTransportRecords.value = privateTransportData.private_transport_records_simplified || [];

      // Apply initial filtering/pagination
      filterAndPaginatePrivateTransportRecords();

    } catch (err) {
      showMessage('error', err.message || 'Failed to load initial simplified private transport data from JSON.');
      console.error(err);
      // Reset state on error
      privateCarStatusOptions.value = [];
      routeTypeOptions.value = [];
      allJsonPrivateTransportRecords.value = [];
      privateTransportRecords.value = [];
      selectedIsPrivateCar.value = '';
      selectedRouteNumber.value = '';
      selectedRouteType.value = '';
      selectedPassengersCountMin.value = null;
    } finally {
      privateCarStatusesLoading.value = false;
      routeTypesLoading.value = false;
      // recordsLoading set in filterAndPaginate...
    }
  }

  // Filter and Paginate the records stored locally
  function filterAndPaginatePrivateTransportRecords() {
    recordsLoading.value = true;
    try {
      let filtered = [...allJsonPrivateTransportRecords.value];

      // Apply filters
      if (selectedIsPrivateCar.value !== '') {
        const filterBoolean = selectedIsPrivateCar.value === 'true'; // Convert string from select to boolean
        filtered = filtered.filter(record => record.is_private_car === filterBoolean);
      }
      if (selectedRouteNumber.value) {
        const searchTerm = selectedRouteNumber.value.toLowerCase();
        // Make sure route_number exists before calling toLowerCase()
        filtered = filtered.filter(record =>
           record.route_number && record.route_number.toLowerCase().includes(searchTerm)
        );
      }
      if (selectedRouteType.value) {
        filtered = filtered.filter(record => record.route_type === selectedRouteType.value);
      }
      // Apply passenger count minimum filter
      if (selectedPassengersCountMin.value !== null && selectedPassengersCountMin.value >= 0) {
          filtered = filtered.filter(record => record.passengers_count >= selectedPassengersCountMin.value);
      }


      // Update pagination state
      totalRecords.value = filtered.length;
      totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value);

      // Adjust current page if it's now invalid
      if (currentPage.value > totalPages.value) {
        currentPage.value = totalPages.value > 0 ? 1 : 1; // Reset to 1 if needed
      }
      if (currentPage.value < 1 && totalPages.value >= 1) {
        currentPage.value = 1;
      }

      // Apply pagination slicing
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
      privateTransportRecords.value = (currentPage.value >= 1 && filtered.length > 0)
                                      ? filtered.slice(startIndex, endIndex)
                                      : [];

    } catch (err) {
      showMessage('error', 'Error filtering or paginating private transport records.');
      console.error(err);
      privateTransportRecords.value = [];
      totalPages.value = 1;
      totalRecords.value = 0;
      currentPage.value = 1;
    } finally {
      recordsLoading.value = false;
    }
  }

  // --- Event Handlers ---

  // Apply filters and reset pagination
  function applyFilters() {
    currentPage.value = 1;
    filterAndPaginatePrivateTransportRecords();
  }

  // Navigate pagination
  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
      currentPage.value = page;
      filterAndPaginatePrivateTransportRecords();
    }
  }

  // Logout (Optional - uses backend)
  async function handleLogout() {
    try {
      // Assuming useFetch is globally available in Nuxt 3
      await useFetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('currentUser');
      currentUser.value = null;
      router.push('/');
    } catch (error) {
      showMessage('error', 'Logout failed. Please try again.');
      console.error('Logout error:', error);
    }
  }

  // --- Lifecycle Hooks ---
  onMounted(() => {
    currentUser.value = localStorage.getItem('currentUser');
    // Load initial data from JSON
    loadInitialPrivateTransportData();
  });

  </script>

  <style>
  /* --- GLOBAL STYLES --- */
  /* Assume :root variables and base styles are defined globally */
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
    --table-header-bg: #00000085; /* Header color from previous style */
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
  /* --- Component Specific Styles --- */
  .wrapper.private-transport-page {
    max-width: 1400px; margin: 0 auto; padding: 40px 20px 60px 20px;
    box-sizing: border-box; position: relative;
  }
  h1 {
    color: var(--text-color-lighter); margin-bottom: 25px; text-align: center;
    margin-top: 60px; /* Clears nav */
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
    border-radius: 8px; position: relative; z-index: 50; margin-bottom: 20px;
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
  select, input[type="text"], input[type="date"], input[type="number"], button {
    padding: 10px 12px; border-radius: 6px; border: 1px solid var(--input-border-color);
    background-color: var(--input-bg-color); font-size: 14px; color: var(--text-color-light);
    outline: none; transition: all 0.2s ease; box-sizing: border-box; height: 40px;
  }
  select:focus, input:focus { border-color: var(--input-focus-border); box-shadow: 0 0 0 2px var(--input-focus-shadow); background-color: rgba(30, 34, 53, 0.9); }
  select { cursor: pointer; }
  button[type="submit"], .pagination button { padding: 10px 20px; border: none; background-color: var(--accent-color); color: white; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; }
  button[type="submit"]:hover:not(:disabled), .pagination button:hover:not(:disabled) { background-color: var(--accent-hover); }
  button:disabled { opacity: 0.65; cursor: not-allowed; }

  /* Table Styles */
  .table-container {
    max-height: 65vh; overflow-y: auto; border: 1px solid var(--table-border-color);
    border-radius: 8px; background-color: var(--primary-bg-color);
  }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid var(--table-border-color); padding: 10px 12px; font-size: 14px; vertical-align: middle; white-space: nowrap; /* Prevent text wrapping */ }
  .table-container[dir="rtl"] table th,
  .table-container[dir="rtl"] table td {
    text-align: right;
  }
  thead th {
    background-color: #000000; /* Black header */
    color: #ffffff; /* White text */
    position: sticky; top: 0; z-index: 10; font-weight: 600;
  }
  tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
  tbody tr:hover { background-color: var(--card-bg-color); }

  /* Pagination */
  .pagination {
    text-align: center; margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 10px;
  }
  .pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
  .pagination button { padding: 8px 15px; }

  /* Loading Spinner */
  .loading-spinner {
    display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite;
  }
  .loading-spinner.small { width: 14px; height: 14px; border-width: 2px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Transitions */
  .fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }

  /* Copyright */
  .copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }
  </style>