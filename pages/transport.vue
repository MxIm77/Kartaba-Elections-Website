<template>
    <div class="wrapper transport-management">
      <!-- Logout Button -->
      <button @click="handleLogout" class="logout-btn">
        Logout ({{ currentUser || 'admin' }})
      </button>
  
      <!-- Navigation -->
      <nav class="main-nav">
        <NuxtLink to="/privatetransport">Private Management</NuxtLink>
        <NuxtLink to="/transport">Taxi Management</NuxtLink>
      </nav>
  
      <!-- Main Title -->
      <h1 style="margin-top: 60px;">Transport Management</h1>
  
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
            <label for="vehicleType">Select Vehicle Type:</label>
            <select id="vehicleType" v-model="selectedVehicleType">
              <option value="">All Types</option>
              <option v-if="vehicleTypesLoading" value="" disabled>Loading types...</option>
              <option v-for="type in vehicleTypeOptions" :key="type.value" :value="type.value">
                {{ type.text }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="route">Select Route:</label>
            <select id="route" v-model="selectedRoute">
              <option value="">All Routes</option>
              <option v-if="routesLoading" value="" disabled>Loading routes...</option>
              <option v-for="route in routeOptions" :key="route.value" :value="route.value">
                {{ route.text }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="date">Select Date:</label>
            <input type="date" id="date" v-model="selectedDate">
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
              <th>النقل</th>
              <th>العنوان</th>
              <th>توقيت المغادرة</th>
              <th>عدد الركاب</th>
              <th>مكان العودة</th>
              <th>توقيت العودة</th>
              <th>الإجراء</th>

            </tr>
          </thead>
          <tbody>
  <tr v-if="recordsLoading">
    <!-- FIX: Update colspan to match the total number of headers (17) -->
    <td colspan="17" style="text-align: center;">
      <span class="loading-spinner"></span> Loading data...
    </td>
  </tr>
  <tr v-else-if="!recordsLoading && transportRecords.length === 0">
    <!-- FIX: Update colspan to match the total number of headers (17) -->
    <td colspan="17" style="text-align: center;">No records found for the selected filters.</td>
  </tr>
  <!-- Add ALL 17 data cells in the correct order -->
  <tr v-else v-for="record in transportRecords" :key="record.id">

    <!-- === NEW Data Cells (Added in correct order) === -->
    <td>{{ record.with_us }}</td>      <!-- Header 1: ma3na -->
    <td>{{ record.register }}</td>     <!-- Header 2: السجل -->
    <td>{{ record.family }}</td>       <!-- Header 3: العائلة -->
    <td>{{ record.name }}</td>         <!-- Header 4: الاسم -->
    <td>{{ record.father }}</td>       <!-- Header 5: اسم الأب -->
    <td>{{ record.mother }}</td>       <!-- Header 6: اسم الأم -->
    <td>{{ record.dob }}</td>          <!-- Header 7: تاريخ الولادة -->
    <td>{{ record.sex }}</td>          <!-- Header 8: الجنس -->
    <td>{{ record.religion }}</td>     <!-- Header 9: الديانة -->
    <td>{{ record.elected }}</td>      <!-- Header 10: انتخب -->

    <!-- === EXISTING Data Cells (Kept in correct order) === -->
    <td>{{ record.vehicle_type }}</td>  <!-- Header 11: النقل -->
    <td>{{ record.address }}</td>       <!-- Header 12: العنوان -->
    <td>{{ record.departure_time }}</td> <!-- Header 13: توقيت المغادرة -->
    <td>                             <!-- Header 14: عدد الركاب -->
      <input type="number" v-model="record.passengers_count" min="0" class="passenger-input" />
    </td>
    <td>{{ record.return_location }}</td> <!-- Header 15: مكان العودة -->
    <td>{{ record.return_time }}</td>    <!-- Header 16: توقيت العودة -->
    <td>                             <!-- Header 17: الإجراء -->
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
  
  // 1. Import the JSON file directly for Transport data
  // Ensure transport_db.json is in your assets directory and has the correct structure.
  import transportData from '@/db.json';
  
  // --- State ---
  const router = useRouter();
  const currentUser = ref(null);
  
  // Filters
  const selectedVehicleType = ref('');
  const selectedRoute = ref('');
  const selectedDate = ref(''); // Date filter UI state
  
  // Dropdown Options & Loading States
  const vehicleTypeOptions = ref([]);
  const vehicleTypesLoading = ref(false); // Simulates loading state
  const routeOptions = ref([]);
  const routesLoading = ref(false); // Simulates loading state
  
  // Table Data & State
  const transportRecords = ref([]); // Holds displayed (paginated) records
  const allJsonTransportRecords = ref([]); // Holds all records from JSON
  const recordsLoading = ref(false); // Indicates table loading state
  const errorMessage = ref(null);
  const successMessage = ref(null);
  let messageTimeout = null;
  
  // Pagination
  const currentPage = ref(1);
  const totalPages = ref(1);
  const itemsPerPage = ref(50); // Records per page
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
  async function loadInitialTransportData() {
    vehicleTypesLoading.value = true;
    routesLoading.value = true;
    recordsLoading.value = true;
  
    try {
      // Simulate async delay if needed
      // await new Promise(resolve => setTimeout(resolve, 300));
  
      vehicleTypeOptions.value = transportData.vehicle_types || [];
      routeOptions.value = transportData.routes || [];
      allJsonTransportRecords.value = transportData.transport_records || [];
  
      // Set a default date for the input field
      const today = new Date();
      selectedDate.value = today.toISOString().split('T')[0];
  
      // Apply initial filtering and pagination
      filterAndPaginateTransportRecords();
  
    } catch (err) {
      showMessage('error', err.message || 'Failed to load initial transport data from JSON.');
      console.error(err);
      vehicleTypeOptions.value = [];
      routeOptions.value = [];
      allJsonTransportRecords.value = [];
      transportRecords.value = [];
      selectedVehicleType.value = '';
      selectedRoute.value = '';
      selectedDate.value = '';
    } finally {
      vehicleTypesLoading.value = false;
      routesLoading.value = false;
      // recordsLoading is set false within filterAndPaginateTransportRecords
    }
  }
  
  
  // Filter and Paginate the records from allJsonTransportRecords
  function filterAndPaginateTransportRecords() {
    recordsLoading.value = true;
    try {
      let filtered = [...allJsonTransportRecords.value];
  
      // Apply filters
      if (selectedVehicleType.value) {
        filtered = filtered.filter(record => record.vehicle_type === selectedVehicleType.value);
      }
      if (selectedRoute.value) {
        filtered = filtered.filter(record => record.route === selectedRoute.value);
      }
      // Date filtering logic (if needed and 'date' exists in JSON records)
      // if (selectedDate.value) {
      //   filtered = filtered.filter(record => record.date === selectedDate.value);
      // }
  
      // Update pagination state based on filtered results
      totalRecords.value = filtered.length;
      totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value);
  
      // Adjust currentPage if it becomes invalid after filtering
      if (currentPage.value > totalPages.value) {
        currentPage.value = totalPages.value > 0 ? 1 : 1;
      }
      if (currentPage.value < 1 && totalPages.value >= 1) {
          currentPage.value = 1;
      }
  
      // Apply pagination slicing
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;
  
      // Update the displayed records array
      transportRecords.value = (currentPage.value >= 1 && filtered.length > 0)
                               ? filtered.slice(startIndex, endIndex).map(r => ({ ...r, updating: false }))
                               : [];
  
      // Simulate delay if needed
      // await new Promise(resolve => setTimeout(resolve, 100));
  
    } catch (err) {
      showMessage('error', 'Error filtering or paginating transport records.');
      console.error(err);
      transportRecords.value = [];
      totalPages.value = 1; // Reset to default
      totalRecords.value = 0;
      currentPage.value = 1; // Reset to default
    } finally {
      recordsLoading.value = false;
    }
  }
  
  
  // Update a single transport record's passengers (in memory)
  async function updateRecord(record) {
    record.updating = true;
    errorMessage.value = null;
    successMessage.value = null;
  
    try {
      // Find the record in the original full list to modify it
      const recordInDb = allJsonTransportRecords.value.find(r => r.id === record.id);
  
      if (recordInDb) {
        // Update the passenger count (ensure it's a number)
        recordInDb.passengers_count = Number(record.passengers_count);
  
        // Simulate async delay (like saving to backend)
        await new Promise(resolve => setTimeout(resolve, 300));
  
        showMessage('success', `Transport record ${record.id} updated successfully (in memory).`);
      } else {
        throw new Error(`Record with ID ${record.id} not found in JSON data.`);
      }
  
    } catch (err) {
      showMessage('error', err.message || `An unexpected error occurred while updating record ${record.id}.`);
      console.error(err);
      // Optional: Revert UI change on error
    } finally {
      record.updating = false;
    }
  }
  
  // --- Event Handlers ---
  
  // Apply all current filters and reset to page 1
  function applyFilters() {
    currentPage.value = 1;
    filterAndPaginateTransportRecords();
  }
  
  // Go to a specific page
  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
      currentPage.value = page;
      filterAndPaginateTransportRecords(); // Re-apply pagination
    }
  }
  
  // Logout (still interacts with backend API if configured)
  async function handleLogout() {
    try {
      // Assumes /api/auth/logout endpoint exists
      await useFetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('currentUser');
      currentUser.value = null;
      router.push('/'); // Redirect to login page
    } catch (error) {
      showMessage('error', 'Logout failed. Please try again.');
      console.error('Logout error:', error);
    }
  }
  
  // --- Lifecycle Hooks ---
  onMounted(() => {
    currentUser.value = localStorage.getItem('currentUser');
    // Load all initial data from JSON
    loadInitialTransportData();
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
    --table-header-bg: #000000; /* Default header bg set in scoped styles */
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
  .wrapper.transport-management {
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
  select, input[type="date"], input[type="number"], button {
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
  th, td { border: 1px solid var(--table-border-color); padding: 10px 12px; font-size: 14px; vertical-align: middle; }
  .table-container[dir="rtl"] table th,
  .table-container[dir="rtl"] table td {
    text-align: right;
  }
  th {
    color: var(--text-color-lighter); /* Default text color */
    position: sticky; top: 0; z-index: 10; font-weight: 600;
  }
  /* Specific header style */
  thead th {
    background-color: #00000065; /* Amber/yellow color */
    color: #ffffff; /* Black text for contrast */
  }
  
  tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
  tbody tr:hover { background-color: var(--card-bg-color); }
  
  .passenger-input {
    width: 80px; text-align: center; padding: 4px 8px; height: 36px;
  }
  
  td .update-btn {
    padding: 6px 12px; font-size: 13px; background-color: #4CAF50;
    height: 36px; min-width: 70px;
  }
  td .update-btn:hover:not(:disabled) { background-color: #45a049; }
  td .update-btn:disabled { background-color: #4CAF50; opacity: 0.65; cursor: not-allowed;}
  
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