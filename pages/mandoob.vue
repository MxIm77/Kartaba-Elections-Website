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
            <th>voted?</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="recordsLoading">
            <td colspan="8" style="text-align: center;">
              <span class="loading-spinner"></span> Loading data...
            </td>
          </tr>
          <tr v-else-if="!recordsLoading && mandoobRecords.length === 0">
            <td colspan="8" style="text-align: center;">No records found.</td>
          </tr>
          <tr v-else v-for="record in mandoobRecords" :key="record.id">
            <td>{{ record.id }}</td>
            <td>{{ record.name }}</td>
            <td>{{ record.family }}</td>
            <td>{{ record.father }}</td>
            <td>{{ record.mother }}</td>
            <td>{{ record.dob }}</td>
            <td>{{ record.register }}</td>
            <td>{{ record.voted ? 'صوت' : 'ما صوت' }}</td>
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
import { fetchMandoobRecords } from '~/mandoob.js';

const router = useRouter();
const currentUser = ref(null);
const allMandoobRecords = ref([]);
const recordsLoading = ref(true);
const errorMessage = ref(null);
const successMessage = ref(null);
let messageTimeout = null;
const currentPage = ref(1);
const itemsPerPage = ref(25);

const totalRecords = computed(() => allMandoobRecords.value.length);
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value));
const mandoobRecords = computed(() => {
  if (recordsLoading.value || !allMandoobRecords.value.length) {
    return [];
  }
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return allMandoobRecords.value.slice(startIndex, endIndex);
});

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

async function loadData() {
  recordsLoading.value = true;
  errorMessage.value = null;

  try {
    const result = await fetchMandoobRecords();
    if (result.success && Array.isArray(result.data)) {
      allMandoobRecords.value = result.data;
      currentPage.value = 1;
    } else {
      const errorMsg = result.error?.message || 'Failed to load mandoob records.';
      showMessage('error', errorMsg);
      allMandoobRecords.value = [];
    }
  } catch (err) {
    showMessage('error', `An unexpected error occurred: ${err.message}`);
    allMandoobRecords.value = [];
  } finally {
    recordsLoading.value = false;
  }
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page;
    window.scrollTo(0, 0); // Scroll to top when changing page
  }
}

async function handleLogout() {
  try {
    // Basic frontend logout: clear storage and redirect
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken'); // Ensure token is cleared if used
    currentUser.value = null;
    // Optionally call a backend logout endpoint if you have one
    // await useFetch('/api/auth/logout', { method: 'POST' });
    await router.push('/'); // Redirect to login page
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('error', 'Logout failed. Please try again.');
  }
}

onMounted(async () => {
  currentUser.value = localStorage.getItem('currentUser');
  recordsLoading.value = true; // Start loading

  // Perform session check
  try {
    const sessionResult = await checkSession(); // Assuming checkSession verifies token validity
    if (!sessionResult.success) {
      // If session is invalid, show message and redirect
      showMessage('error', `Session invalid: ${sessionResult.error?.message || 'Please log in.'}`, 6000);
      await router.push('/'); // Redirect to login
      recordsLoading.value = false; // Stop loading indicator
      return; // Stop further execution in onMounted
    } else {
      // If session is valid, proceed to load data
      await loadData();
    }
  } catch (err) {
    // Handle errors during session check or initial data load
    console.error('Initialization error:', err);
    showMessage('error', 'Could not verify session or load data. Redirecting to login.', 6000);
    await router.push('/'); // Redirect to login
    recordsLoading.value = false; // Stop loading indicator
  }
  // Loading state is set to false inside loadData() or after error handling
});
</script>

<style>
/* --- GLOBAL STYLES (Apply across the app) --- */
:root {
--primary-bg-color: #1a233a;
--card-bg-color: #2a3b52;
--text-color-light: #e0e0e0;
--text-color-lighter: #f5f5f5;
--text-color-muted: #9DA3B4;
--accent-color: #FF3B30; /* Primary action color (e.g., buttons) */
--accent-hover: #E02E24; /* Hover state for primary actions */
--input-bg-color: rgba(30, 34, 53, 0.7);
--input-border-color: rgba(255, 255, 255, 0.1);
--input-focus-border: rgba(255, 59, 48, 0.5); /* Accent color for focus */
--input-focus-shadow: rgba(255, 59, 48, 0.15); /* Subtle glow on focus */
--error-color: #FF453A; /* Standard error color */
--error-bg: rgba(255, 69, 58, 0.1); /* Background for error messages */
--success-color: #34C759; /* Standard success color */
--success-bg: rgba(52, 199, 89, 0.1); /* Background for success messages */
--table-header-bg: #00000085; /* Dark semi-transparent header */
--table-even-row-bg: #1f2940; /* Slightly lighter than primary bg for rows */
--table-border-color: #3a4a63; /* Border color for table elements */
}

html, body, #__nuxt {
height: 100%;
margin: 0;
padding: 0;
background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
color: var(--text-color-light);
font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
</style>

<style scoped>
/* --- Component Specific Styles --- */
.wrapper.mandoob-page {
max-width: 1400px; /* Adjust max-width as needed */
margin: 0 auto;
padding: 40px 20px 60px 20px;
box-sizing: border-box;
position: relative;
}

h1 {
color: var(--text-color-lighter);
margin-bottom: 25px;
text-align: center;
}

.logout-btn {
position: absolute;
top: 41px; /* Align with title potentially */
right: 20px;
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
.logout-btn:hover {
background-color: var(--accent-hover);
}

.main-nav {
text-align: center;
padding: 10px;
background-color: var(--card-bg-color);
border-radius: 8px;
position: relative;
z-index: 50;
margin-bottom: 20px; /* Space below nav */
}
.main-nav a {
color: var(--text-color-light);
text-decoration: none;
margin: 0 15px;
padding: 8px 12px;
border-radius: 4px;
transition: background-color 0.2s ease, color 0.2s ease;
font-weight: 500;
}
.main-nav a:hover {
background-color: var(--accent-hover);
color: white;
}
.main-nav a.router-link-exact-active { /* Style for the active link */
background-color: var(--accent-color);
color: white;
}

/* Messages (Success/Error) */
.message {
padding: 12px 15px;
margin: 15px 0;
border-radius: 6px;
display: flex;
align-items: center;
gap: 10px;
font-size: 14px;
border-left-width: 4px;
border-left-style: solid;
}
.message svg {
flex-shrink: 0;
}
.success-message {
background-color: var(--success-bg);
color: var(--success-color);
border-left-color: var(--success-color);
}
.error-message {
background-color: var(--error-bg);
color: var(--error-color);
border-left-color: var(--error-color);
}

/* Table Styles */
.table-container {
max-height: 65vh; /* Control table height and enable scroll */
overflow-y: auto;
border: 1px solid var(--table-border-color);
border-radius: 8px;
background-color: var(--primary-bg-color); /* Ensure container has bg */
}
table {
width: 100%;
border-collapse: collapse; /* Remove spacing between cells */
}
th, td {
border: 1px solid var(--table-border-color);
padding: 10px 12px; /* Adjust padding as needed */
font-size: 14px;
vertical-align: middle;
text-align: right; /* Default align for RTL */
white-space: nowrap; /* Prevent text wrapping */
}
th {
background-color: var(--table-header-bg);
color: var(--text-color-lighter);
position: sticky; /* Keep header visible on scroll */
top: 0;
z-index: 10;
font-weight: 600;
}
tbody tr:nth-child(even) {
background-color: var(--table-even-row-bg); /* Zebra striping */
}
tbody tr:hover {
background-color: var(--card-bg-color); /* Highlight row on hover */
}

/* Pagination */
.pagination {
text-align: center;
margin-top: 25px;
display: flex;
justify-content: center;
align-items: center;
gap: 10px;
}
.pagination span {
padding: 8px 12px;
color: var(--text-color-muted);
font-size: 14px;
}
.pagination button {
padding: 8px 15px;
border: none;
background-color: var(--accent-color);
color: white;
cursor: pointer;
font-weight: 500;
transition: background-color 0.2s ease;
border-radius: 6px; /* Match other button styles */
height: 40px; /* Match filter button height */
display: inline-flex;
align-items: center;
justify-content: center;
}
.pagination button:hover:not(:disabled) {
background-color: var(--accent-hover);
}
.pagination button:disabled {
opacity: 0.65;
cursor: not-allowed;
}

/* Loading Spinner */
.loading-spinner {
display: inline-block;
width: 20px;
height: 20px;
border: 3px solid rgba(255, 255, 255, 0.3);
border-radius: 50%;
border-top-color: var(--text-color-lighter);
animation: spin 0.8s linear infinite;
}
.loading-spinner.small { /* For smaller spinners if needed */
width: 14px;
height: 14px;
border-width: 2px;
}
@keyframes spin {
to { transform: rotate(360deg); }
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
opacity: 0;
}

/* Copyright */
.copyright {
margin-top: 30px;
font-size: 12px;
color: rgba(255, 255, 255, 0.4);
text-align: center;
}
</style>