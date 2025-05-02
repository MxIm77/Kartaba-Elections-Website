<template>
  <div class="wrapper elections-page">
    <button @click="handleLogout" class="logout-btn">
      Logout ({{ currentUser || '...' }})
    </button>

    <nav class="main-nav">
      <NuxtLink to="/elections">Election Management</NuxtLink>
      <NuxtLink to="/transport">Transport Management</NuxtLink>
    </nav>

    <h1 style="margin-top: 60px;">Election Management</h1>

    <transition name="fade">
      <div v-if="successMessage" class="message success-message">
        <span>{{ successMessage }}</span>
      </div>
    </transition>
    <transition name="fade">
      <div v-if="errorMessage" class="message error-message">
        <span>{{ errorMessage }}</span>
      </div>
    </transition>

    <div class="filter-container">
      <form @submit.prevent="applyFilters">
        <div class="form-group">
          <label for="district">Select District:</label>
          <select id="district" v-model="selectedDistrict" @change="handleDistrictChange" :disabled="districtsLoading || recordsLoading">
            <option v-if="districtsLoading" value="" disabled>Loading districts...</option>
            <option v-else value="">All Districts</option>
            <option v-for="district in districtOptions" :key="district.value" :value="district.value">{{ district.text }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="register">Select Register:</label>
          <select id="register" v-model="selectedRegister" :disabled="registersLoading || recordsLoading || !selectedDistrict">
            <option value="">All Registers</option>
            <option v-if="registersLoading" value="" disabled>Loading registers...</option>
            <option v-for="register in registerOptions" :key="register" :value="register">Register {{ register }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="sex">Select Sex:</label>
          <select id="sex" v-model="selectedSex" :disabled="sexesLoading || recordsLoading">
            <option value="">All Sexes</option>
            <option v-if="sexesLoading" value="" disabled>Loading sexes...</option>
            <option v-for="sexOption in sexOptions" :key="sexOption.value" :value="sexOption.value">{{ sexOption.text }}</option>
          </select>
        </div>
        <button type="submit" :disabled="recordsLoading">
          <span v-if="recordsLoading" class="loading-spinner small"></span>
          Apply Filters
        </button>
      </form>
    </div>

    <div class="table-container">
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
          </tr>
        </thead>
        <tbody>
          <tr v-if="recordsLoading">
            <td colspan="10" style="text-align: center;">
              <span class="loading-spinner"></span> Loading election data...
            </td>
          </tr>
          <tr v-else-if="!recordsLoading && electionRecords.length === 0">
            <td colspan="10" style="text-align: center;">No records found.</td>
          </tr>
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
            <td>{{ record.voted ?? record.elected }}</td>
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
import { checkSession } from '~/home.js';
import { fetchElectionData } from '~/electionservice.js';

const router = useRouter();
const currentUser = ref(null);
const selectedDistrict = ref('');
const selectedRegister = ref('');
const selectedSex = ref('');
const districtOptions = ref([]);
const districtsLoading = ref(true);
const registerOptions = ref([]);
const registersLoading = ref(false);
const sexOptions = ref([]);
const sexesLoading = ref(true);
const allRegistersData = ref({});
const electionRecords = ref([]);
const allJsonRecords = ref([]);
const recordsLoading = ref(true);
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

async function loadInitialData() {
  districtsLoading.value = true;
  sexesLoading.value = true;
  recordsLoading.value = true;
  errorMessage.value = null;

  try {
    const result = await fetchElectionData();
    if (result.success && result.data) {
      const apiData = result.data;
      districtOptions.value = apiData.districts || [];
      sexOptions.value = apiData.sexes || [];
      allRegistersData.value = apiData.registers || {};
      allJsonRecords.value = apiData.records || [];

      if (districtOptions.value.length > 0 && !selectedDistrict.value) {
        selectedDistrict.value = districtOptions.value[0].value;
      } else if (districtOptions.value.length === 0) {
        selectedDistrict.value = '';
      }

      populateRegistersForSelectedDistrict();
      filterAndPaginateRecords();
      showMessage('success', 'Election data loaded successfully.');
    } else {
      showMessage('error', result.error?.message || 'Failed to load election data.');
      districtOptions.value = [];
      sexOptions.value = [];
      allRegistersData.value = {};
      allJsonRecords.value = [];
      electionRecords.value = [];
      selectedDistrict.value = '';
      recordsLoading.value = false;
    }
  } catch (err) {
    showMessage('error', `An unexpected error occurred: ${err.message}`);
    districtOptions.value = [];
    sexOptions.value = [];
    allRegistersData.value = {};
    allJsonRecords.value = [];
    electionRecords.value = [];
    selectedDistrict.value = '';
    recordsLoading.value = false;
  } finally {
    districtsLoading.value = false;
    sexesLoading.value = false;
  }
}

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
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a).localeCompare(String(b));
    });
    registerOptions.value = sortedRegisters;
  } catch (err) {
    showMessage('error', 'Failed to populate registers dropdown.');
    registerOptions.value = [];
  } finally {
    registersLoading.value = false;
  }
}

function filterAndPaginateRecords() {
  if (!recordsLoading.value) recordsLoading.value = true;
  try {
    let filtered = [...allJsonRecords.value];
    if (selectedDistrict.value) filtered = filtered.filter(r => r.district === selectedDistrict.value);
    if (selectedRegister.value) filtered = filtered.filter(r => String(r.register) === String(selectedRegister.value));
    if (selectedSex.value) filtered = filtered.filter(r => r.sex === selectedSex.value);

    totalRecords.value = filtered.length;
    totalPages.value = Math.ceil(totalRecords.value / itemsPerPage.value);
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    electionRecords.value = filtered.slice(start, end);
  } catch (err) {
    showMessage('error', 'Error filtering or paginating records.');
    electionRecords.value = [];
  } finally {
    recordsLoading.value = false;
  }
}

function applyFilters() {
  currentPage.value = 1;
  filterAndPaginateRecords();
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  filterAndPaginateRecords();
}

function handleDistrictChange() {
  selectedRegister.value = '';
  populateRegistersForSelectedDistrict();
}

function handleLogout() {
  router.push('/');
}

onMounted(async () => {
  const sessionUser = await checkSession();
  if (!sessionUser) {
    router.push('/');
  } else {
    currentUser.value = sessionUser.username || sessionUser.email || 'User';
    await loadInitialData();
  }
});
</script>
