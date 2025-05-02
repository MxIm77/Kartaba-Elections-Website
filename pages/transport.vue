<template>
  <div class="wrapper transport-management">
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || 'admin' }})
    </button>

    <h1>Transport Management</h1>

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

    <div class="filter-container">
      <form @submit.prevent="applyFilters">
        <div class="form-group">
          <label for="vehicleType">Select Vehicle Type:</label>
          <select id="vehicleType" v-model="selectedVehicleType" @change="applyFilters">
            <option value="">All Types</option>
            <option v-if="vehicleTypesLoading" value="" disabled>Loading types...</option>
            <option v-for="type in vehicleTypeOptions" :key="type.value" :value="type.value">
              {{ type.text }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="route">Select Route:</label>
          <select id="route" v-model="selectedRoute" @change="applyFilters">
            <option value="">All Routes</option>
            <option v-if="routesLoading" value="" disabled>Loading routes...</option>
            <option v-for="route in routeOptions" :key="route.value" :value="route.value">
              {{ route.text }}
            </option>
          </select>
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
              <th>الجنس</th>
              <th>الديانة</th>
              <th>انتخب</th>
              <th>معنا</th>
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
            <td colspan="17" style="text-align: center;">
              <span class="loading-spinner"></span> Loading data...
            </td>
          </tr>
          <tr v-else-if="!recordsLoading && transportRecords.length === 0">
            <td colspan="17" style="text-align: center;">No records found for the selected filters.</td>
          </tr>
          <tr v-else v-for="record in transportRecords" :key="record.id">
              <td>{{ record.register }}</td>
              <td>{{ record.name }}</td>
              <td>{{ record.family }}</td>
              <td>{{ record.father }}</td>
              <td>{{ record.mother }}</td>
              <td>{{ record.dob }}</td>
              <td>{{ record.sex }}</td>
              <td>{{ record.religion }}</td>
              <td>{{ record.elected }}</td>
              <td>{{ record.with_us }}</td>
              <td>{{ record.vehicle_type }}</td>
              <td>{{ record.address }}</td>
              <td>{{ record.departure_time }}</td>
              <td>
                <input type="number" v-model.number="record.passengers_count" min="0" class="passenger-input" />
              </td>
              <td>{{ record.return_location }}</td>
              <td>{{ record.return_time }}</td>
              <td>
                <button @click="updateRecord(record)" :disabled="record.updating" class="update-btn">
                  <span v-if="record.updating" class="loading-spinner small"></span>
                  {{ record.updating ? '...' : 'تحديث' }}
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
import transportData from '@/db.json';

const router = useRouter();
const currentUser = ref(null);

const selectedVehicleType = ref('');
const selectedRoute = ref('');
const selectedDate = ref('');

const vehicleTypeOptions = ref([]);
const vehicleTypesLoading = ref(false);
const routeOptions = ref([]);
const routesLoading = ref(false);

const transportRecords = ref([]);
const allJsonTransportRecords = ref([]);
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

async function loadInitialTransportData() {
  vehicleTypesLoading.value = true;
  routesLoading.value = true;
  recordsLoading.value = true;

  try {
    vehicleTypeOptions.value = transportData.vehicle_types || [];
    routeOptions.value = transportData.routes || [];
    allJsonTransportRecords.value = transportData.transport_records || [];

    const today = new Date();
    selectedDate.value = today.toISOString().split('T')[0];

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
  }
}


function filterAndPaginateTransportRecords() {
  recordsLoading.value = true;
  try {
    let filtered = [...allJsonTransportRecords.value];

    if (selectedVehicleType.value) {
      filtered = filtered.filter(record => record.vehicle_type === selectedVehicleType.value);
    }
    if (selectedRoute.value) {
      filtered = filtered.filter(record => record.route === selectedRoute.value);
    }
    // Add date filtering if 'date' field exists in your transport_records
    // if (selectedDate.value) {
    //   filtered = filtered.filter(record => record.date === selectedDate.value); // Adjust field name if needed
    // }

    totalRecords.value = filtered.length;
    totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value);

    if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = totalPages.value;
    } else if (currentPage.value < 1 && totalPages.value >= 1) {
        currentPage.value = 1;
    } else if (totalPages.value === 0) {
        currentPage.value = 1; // Reset to 1 if no pages
    }

    const startIndex = (currentPage.value - 1) * itemsPerPage.value;
    const endIndex = startIndex + itemsPerPage.value;

    transportRecords.value = filtered.slice(startIndex, endIndex).map(r => ({ ...r, updating: false }));


  } catch (err) {
    showMessage('error', 'Error filtering or paginating transport records.');
    console.error(err);
    transportRecords.value = [];
    totalPages.value = 1;
    totalRecords.value = 0;
    currentPage.value = 1;
  } finally {
    recordsLoading.value = false;
  }
}


async function updateRecord(record) {
  record.updating = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const recordInDb = allJsonTransportRecords.value.find(r => r.id === record.id);

    if (recordInDb) {
      // Update passenger count, ensuring it's a number
      recordInDb.passengers_count = Number(record.passengers_count);

      // Simulate saving delay
      await new Promise(resolve => setTimeout(resolve, 300));

      showMessage('success', `Transport record ${record.id} updated successfully (in memory).`);
    } else {
      throw new Error(`Record with ID ${record.id} not found in JSON data.`);
    }

  } catch (err) {
    showMessage('error', err.message || `An unexpected error occurred while updating record ${record.id}.`);
    console.error(err);
  } finally {
    record.updating = false;
  }
}

function applyFilters() {
  currentPage.value = 1;
  filterAndPaginateTransportRecords();
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page;
    filterAndPaginateTransportRecords();
  }
}

async function handleLogout() {
  try {
    // Optional: Call backend logout endpoint
    // await useFetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('currentUser');
    currentUser.value = null;
    router.push('/');
  } catch (error) {
    showMessage('error', 'Logout failed. Please try again.');
    console.error('Logout error:', error);
  }
}

onMounted(() => {
  currentUser.value = localStorage.getItem('currentUser');
  loadInitialTransportData();
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
  --table-header-bg: #000000;
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
.wrapper.transport-management {
  max-width: 1400px; margin: 0 auto; padding: 40px 20px 60px 20px;
  box-sizing: border-box; position: relative;
}
h1 {
  color: var(--text-color-lighter); margin-bottom: 25px; text-align: center;
  margin-top: 20px; /* Adjusted since nav removed */
}
.logout-btn {
  position: absolute; top: 41px; right: 20px; padding: 8px 15px;
      background-color: var(--accent-color); color: white; border: none;
  border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;
  transition: background-color 0.2s ease; z-index: 100;
}
.logout-btn:hover { background-color: var(--accent-hover); }

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

.table-container {
  max-height: 65vh; overflow-y: auto; border: 1px solid var(--table-border-color);
  border-radius: 8px; background-color: var(--primary-bg-color);
}
table { width: 100%; border-collapse: collapse; table-layout: auto; }
th, td { border: 1px solid var(--table-border-color); padding: 10px 12px; font-size: 14px; vertical-align: middle; white-space: nowrap; }
.table-container[dir="rtl"] table th,
.table-container[dir="rtl"] table td {
  text-align: right;
}
thead th {
  background-color: #000000;
  color: #ffffff;
  position: sticky; top: 0; z-index: 10; font-weight: 600;
}

tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--card-bg-color); }

.passenger-input {
  width: 80px; text-align: center; padding: 4px 8px; height: 36px;
}

td .update-btn {
  padding: 6px 12px; font-size: 13px; background-color: #4CAF50; color: white; border: none; border-radius: 4px;
  height: 36px; min-width: 70px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
td .update-btn:hover:not(:disabled) { background-color: #45a049; }
td .update-btn:disabled { background-color: #4CAF50; opacity: 0.65; cursor: not-allowed;}

.pagination {
  text-align: center; margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 10px;
}
.pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
.pagination button { padding: 8px 15px; }

.loading-spinner {
  display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite;
}
.loading-spinner.small { width: 14px; height: 14px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }
</style>