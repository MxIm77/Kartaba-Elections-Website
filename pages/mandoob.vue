<template>
    <!-- Reusing the elections page wrapper class for consistent styling -->
    <div class="wrapper elections-page mandoob-page"> <!-- Added specific class -->

      <!-- Logout Button -->
      <button @click="handleLogout" class="logout-btn">
        Logout ({{ currentUser || '...' }})
      </button>

      <!-- Navigation (Adjust links if needed, ensure they point to correct pages) -->
      <nav class="main-nav">
        <NuxtLink to="/elections">Election Management</NuxtLink>
        <NuxtLink to="/transport">Transport Management</NuxtLink>
        <NuxtLink to="/mandoob">Mandoob List</NuxtLink> <!-- Link to self -->
      </nav>

      <!-- Title -->
      <h1 style="margin-top: 60px;">Mandoob List</h1> <!-- Changed Title -->

      <!-- Messages for Success/Error Feedback -->
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

      <!-- Filters Removed -->

      <!-- Table Container -->
      <div class="table-container" style="margin-top: 25px;"> <!-- Added margin-top as filters are gone -->
        <table>
          <thead>
            <tr>
              <!-- Adjusted Headers based on new Mandoob data -->
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
            <!-- Loading State Indicator -->
            <tr v-if="recordsLoading">
               <td colspan="8" style="text-align: center;"> <!-- Corrected colspan -->
                 <span class="loading-spinner"></span> Loading data...
               </td>
            </tr>
            <!-- No Records Found State -->
             <tr v-else-if="!recordsLoading && mandoobRecords.length === 0">
               <td colspan="8" style="text-align: center;">No records found.</td> <!-- Corrected colspan -->
            </tr>
             <!-- Data Rows - Iterating over computed property for current page -->
            <tr v-else v-for="record in mandoobRecords" :key="record.id">
               <!-- Displaying data based on Mandoob record structure -->
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

      <!-- Pagination Controls -->
       <div class="pagination" v-if="totalPages > 1 && !recordsLoading">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">Previous</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">Next</button>
      </div>

       <!-- Copyright Footer -->
       <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
    </div>
  </template>

  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useRouter } from '#app';

  // Import authentication and data fetching services
  // Make sure the paths are correct relative to your pages/mandoob.vue file
  import { checkSession } from '~/home.js'; // Assuming home.js is in root
  import { fetchMandoobRecords } from '~/mandoob.js'; // Assuming service is in services/

  // --- State ---
  const router = useRouter();
  const currentUser = ref(null); // For displaying logged-in user in logout button

  // Table Data & State
  const allMandoobRecords = ref([]); // Holds *all* fetched records from API
  const recordsLoading = ref(true); // Loading indicator state
  const errorMessage = ref(null);   // For displaying errors
  const successMessage = ref(null); // For displaying success messages
  let messageTimeout = null;      // Timeout ID for clearing messages

  // Pagination State
  const currentPage = ref(1);
  const itemsPerPage = ref(25); // Number of items per page (adjust as needed)

  // --- Computed Properties for Pagination ---
  // Calculate total records based on the fetched data
  const totalRecords = computed(() => allMandoobRecords.value.length);
  // Calculate total pages needed
  const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value));
  // Calculate the slice of records to display for the current page
  const mandoobRecords = computed(() => {
    // Prevent slicing if loading or no data
    if (recordsLoading.value || !allMandoobRecords.value.length) {
      return [];
    }
    // Calculate start and end index for the current page
    const startIndex = (currentPage.value - 1) * itemsPerPage.value;
    const endIndex = startIndex + itemsPerPage.value;
    // Return the sliced portion of the full record list
    return allMandoobRecords.value.slice(startIndex, endIndex);
  });

  // --- Utility Functions ---
  // Function to display success or error messages temporarily
  function showMessage(type, message, duration = 4000) {
    if (messageTimeout) clearTimeout(messageTimeout); // Clear existing timeout
    if (type === 'success') {
      successMessage.value = message;
      errorMessage.value = null;
    } else {
      errorMessage.value = message;
      successMessage.value = null;
    }
    // Set a timer to clear the message
    messageTimeout = setTimeout(() => {
      successMessage.value = null;
      errorMessage.value = null;
    }, duration);
  }

  // --- Data Loading Function ---
  // Fetches data using the mandoobService
  async function loadData() {
    recordsLoading.value = true; // Set loading state
    errorMessage.value = null;   // Clear previous errors

    try {
      console.log('Fetching mandoob records using service...');
      const result = await fetchMandoobRecords(); // Call the service function

      if (result.success && Array.isArray(result.data)) {
        console.log('Service returned mandoob records successfully.');
        allMandoobRecords.value = result.data; // Store the full list of records
        currentPage.value = 1; // Reset to the first page when new data is loaded
        // Optional: show success message
        // showMessage('success', 'Mandoob data loaded successfully.');
      } else {
        // Handle error from service or invalid data structure
        const errorMsg = result.error?.message || 'Failed to load mandoob records.';
        console.error('Failed to fetch mandoob data:', result.error || 'Invalid data structure');
        showMessage('error', errorMsg);
        allMandoobRecords.value = []; // Clear any potentially stale data
      }
    } catch (err) {
      // Handle unexpected errors during the fetch process
      showMessage('error', `An unexpected error occurred: ${err.message}`);
      console.error('Unexpected error in loadData:', err);
      allMandoobRecords.value = []; // Clear data
    } finally {
      recordsLoading.value = false; // Ensure loading indicator is turned off
    }
  }

  // --- Pagination Control ---
  // Function to navigate between pages
  function goToPage(page) {
    // Check if the target page is valid
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
      currentPage.value = page; // Update the current page ref
      // The `mandoobRecords` computed property will automatically update the display
      window.scrollTo(0, 0); // Scroll to top for better UX on page change
    }
  }

  // --- Logout Function ---
  async function handleLogout() {
      try {
          // Clear authentication data
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          currentUser.value = null;
          console.log('Logged out, auth token cleared.');
          // Redirect to the login page
          await router.push('/');
      } catch (error) {
          showMessage('error', 'Logout failed. Please try again.');
          console.error('Logout error:', error);
      }
  }

  // --- Lifecycle Hook ---
  // Runs when the component is mounted on the client-side
  onMounted(async () => {
      // Get username for display in logout button
      currentUser.value = localStorage.getItem('currentUser');
      console.log('Mandoob page: Checking session on component mount...');
      recordsLoading.value = true; // Start loading immediately

      try {
          // Verify the user's session using the stored token
          const sessionResult = await checkSession();
          if (!sessionResult.success) {
              // If session is invalid, show error and redirect to login
              console.warn('Session check failed:', sessionResult.error);
              showMessage('error', `Session invalid: ${sessionResult.error?.message || 'Please log in.'}`, 6000);
              await router.push('/');
              recordsLoading.value = false; // Stop loading if redirecting
              return; // Prevent further execution
          } else {
              // If session is valid, load the mandoob data
              console.log('Session check successful.');
              await loadData();
          }
      } catch(err) {
           // Handle unexpected errors during session check or initial load
           console.error('Error during initial check/load:', err);
           showMessage('error', 'Could not verify session or load data. Redirecting to login.', 6000);
           await router.push('/');
           recordsLoading.value = false; // Ensure loading stops on error
      }
      // Loading state is turned off within loadData's finally block
  });

  </script>

  <!-- Styles are copied directly from elections.vue for consistency -->
  <style>
  /* Global styles from elections.vue */
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
  /* Scoped styles from elections.vue */
  .wrapper.elections-page { /* Keep using this class or rename if needed */
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
    border-radius: 8px; position: relative; z-index: 50; /* Ensure nav is below logout */
  }
  .main-nav a {
    color: var(--text-color-light); text-decoration: none; margin: 0 15px; padding: 8px 12px;
    border-radius: 4px; transition: background-color 0.2s ease, color 0.2s ease; font-weight: 500;
  }
  .main-nav a:hover { background-color: var(--accent-hover); color: white; }
  /* Add active style for the current page link */
  .main-nav a.router-link-exact-active { background-color: var(--accent-color); color: white; }

  .message { padding: 12px 15px; margin: 15px 0; border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 14px; border-left-width: 4px; border-left-style: solid; }
  .message svg { flex-shrink: 0; }
  .success-message { background-color: var(--success-bg); color: var(--success-color); border-left-color: var(--success-color); }
  .error-message { background-color: var(--error-bg); color: var(--error-color); border-left-color: var(--error-color); }

  /* Filter container styles removed as it's not used */

  .table-container {
    margin-top: 25px; /* Add space above table since filters are gone */
    max-height: 65vh; /* Adjust as needed */
    overflow-y: auto;
    border: 1px solid var(--table-border-color);
    border-radius: 8px;
    background-color: var(--primary-bg-color); /* Match overall background */
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid var(--table-border-color);
    padding: 10px 12px;
    text-align: left;
    font-size: 14px;
    vertical-align: middle;
  }
  th {
    background-color: var(--table-header-bg);
    color: var(--text-color-lighter);
    position: sticky; /* Make headers stick */
    top: 0;
    z-index: 10;
    font-weight: 600;
  }
  tbody tr:nth-child(even) {
    background-color: var(--table-even-row-bg);
  }
  tbody tr:hover {
    background-color: var(--card-bg-color); /* Highlight on hover */
  }

  .pagination { text-align: center; margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 10px; }
  .pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
  .pagination button {
      padding: 8px 15px;
      border: none;
      border-radius: 6px;
      background-color: var(--accent-color);
      color: white;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px; /* Match other button heights */
  }
  .pagination button:hover:not(:disabled) { background-color: var(--accent-hover); }
  .pagination button:disabled {
      opacity: 0.6; /* More visible disabled state */
      cursor: not-allowed;
      background-color: var(--accent-color); /* Keep base color */
  }


  .loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite; }
  .loading-spinner.small { width: 14px; height: 14px; border-width: 2px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }

  .copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }
  </style>