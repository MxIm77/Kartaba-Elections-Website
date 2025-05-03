<template>
  <div class="wrapper elections-page mandoob-page">

    <!-- Top Bar - Only Logout Button -->
    <div class="top-bar-mandoob">
        <button @click="handleLogout" class="logout-btn">
          تسجيل الخروج ({{ currentUser || '...' }})
        </button>
    </div>

    <h1 style="margin-top: 60px;">قائمة المناديب</h1>

    <!-- Success/Error Messages for Mandoob Actions -->
    <transition name="fade">
      <Warning
        v-if="successMessage"
        title="تحديث الحالة"
        :message="successMessage"
        style="margin: 15px auto; max-width: 600px;"
      />
    </transition>
    <transition name="fade">
      <Warning
        v-if="errorMessage"
        title="خطأ"
        :message="errorMessage"
        style="margin: 15px auto; max-width: 600px;"
      />
    </transition>

    <!-- Statistics Display Area - Simplified -->
    <div v-if="!statsLoading" class="stats-display-area simple">
        <div class="stat-item single-stat">
            <span class="stat-label">إجمالي الأصوات المسجلة حالياً:</span>
            <span class="stat-value">{{ overallVoted.toLocaleString() }}</span>
        </div>
         <p v-if="statsErrorMessage" class="stats-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            فشل تحميل إحصائية الأصوات: {{ statsErrorMessage }}
         </p>
    </div>
     <div v-else class="stats-display-area loading simple">
        <span class="loading-spinner small"></span> جاري تحميل إحصائية الأصوات...
    </div>
    <!-- End Statistics Display Area -->

    <!-- Filter Input -->
    <div class="filter-container">
      <input
        type="text"
        v-model="filterText"
        placeholder="ابحث بالاسم، العائلة، السجل..."
        class="filter-input"
        dir="rtl"
      />
    </div>

    <!-- Mandoob Table -->
    <div class="table-container" dir="rtl" style="margin-top: 15px;">      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>العائلة</th>
            <th>اسم الأب</th>
            <th>اسم الأم</th>
            <th>تاريخ الولادة</th>
            <th>السجل</th>
            <th class="status-update-header">تحديث حالة التصويت</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="recordsLoading">
            <td colspan="7" style="text-align: center;">
              <span class="loading-spinner"></span> جاري تحميل بيانات المناديب...
            </td>
          </tr>
          <!-- Updated No Records Message -->
          <tr v-else-if="!recordsLoading && allMandoobRecords.length === 0">
             <td colspan="7" style="text-align: center;">لم يتم العثور على سجلات مناديب بعد.</td>
          </tr>
           <tr v-else-if="!recordsLoading && displayedRecords.length === 0 && filterText">
             <td colspan="7" style="text-align: center;">لا توجد نتائج تطابق بحثك "{{ filterText }}".</td>
          </tr>
          <tr v-else v-for="record in displayedRecords" :key="record.id">
            <td>{{ record.name }}</td>
            <td>{{ record.family }}</td>
            <td>{{ record.father }}</td>
            <td>{{ record.mother }}</td>
            <td>{{ record.dob }}</td>
            <td>{{ record.register }}</td>
            <td class="action-cell">
               <span v-if="updatingVoteId === record.id" class="loading-spinner small action-cell-spinner"></span>
               <div v-else class="select-confirm-wrapper">
                <select
                  :value="record.selectedVoteStatus"
                  @change="onDropdownChange($event, record.id)"
                  class="vote-select"
                  :class="{'is-voted': record.selectedVoteStatus === 'yes', 'is-not-voted': record.selectedVoteStatus === 'no'}"
                  :disabled="record.voted === true"
                >
                  <option value="yes">صوت</option>
                  <option value="no">لم يصوت</option>
                </select>
                <button
                  v-if="hasSelectionChanged(record) && tempSelections[record.id] === 'yes'"
                  @click="confirmVoteUpdate(record)"
                  class="confirm-update-btn"
                  :disabled="updatingVoteId === record.id"
                >
                   <span>تأكيد التصويت</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination (remains the same, logic updated) -->
    <div class="pagination" v-if="totalPages > 1 && !recordsLoading">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">السابق</button>
      <span>صفحة {{ currentPage }} من {{ totalPages }}</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">التالي</button>
    </div>

    <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
  import { useRouter } from '#app';
  import { checkSession } from '~/javascript/home.js';
  import { fetchMandoobRecords, updateMandoobVote } from '~/javascript/mandoob.js';
  import { fetchInitialStats } from '~/javascript/mandoobstats.js'; // Ensure this path is correct
  import Warning from '~/components/voteupdate.vue';

  const router = useRouter();
  const currentUser = ref(null);

  // Mandoob Records State
  const allMandoobRecords = ref([]);
  const displayedRecords = ref([]); // Now holds paginated *filtered* records
  const recordsLoading = ref(true);
  const currentPage = ref(1);
  const itemsPerPage = ref(25);
  const updatingVoteId = ref(null);
  const tempSelections = ref({});
  const filterText = ref(''); // State for the filter input

  // Overall Statistics State
  const overallVoted = ref(0);
  const statsLoading = ref(true);
  const statsErrorMessage = ref(null);

  // General Message State
  const errorMessage = ref(null);
  const successMessage = ref(null);
  let messageTimeout = null;

  // --- Computed Properties ---

  // Filtered Records: Apply filter before pagination
  const filteredMandoobRecords = computed(() => {
    const searchTerm = filterText.value.trim().toLowerCase();
    if (!searchTerm) {
      return allMandoobRecords.value; // No filter applied
    }
    return allMandoobRecords.value.filter(record => {
      // Check multiple fields for the search term
      return (
        record.name?.toLowerCase().includes(searchTerm) ||
        record.family?.toLowerCase().includes(searchTerm) ||
        record.father?.toLowerCase().includes(searchTerm) ||
        record.mother?.toLowerCase().includes(searchTerm) ||
        record.register?.toString().toLowerCase().includes(searchTerm)
        // Add any other fields you want to filter by
      );
    });
  });

  const totalRecords = computed(() => filteredMandoobRecords.value.length); // Total is based on filtered results
  const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value));

  // --- Watchers ---

  // Watch for changes in filtered data or current page to update displayed records
  watch([filteredMandoobRecords, currentPage], () => {
      calculateDisplayedRecords();
  }, { deep: true }); // Use deep if record structure might change, though less critical now

  // Watch filter text to reset pagination to page 1
  watch(filterText, () => {
    if (currentPage.value !== 1) {
      currentPage.value = 1;
    }
     // Clear temporary selections when filter changes to avoid confusion
     tempSelections.value = {};
  });

  // --- Methods ---

  function calculateDisplayedRecords() {
      // Paginate the *filtered* records
      const recordsToPaginate = filteredMandoobRecords.value;

      if (!recordsToPaginate || recordsToPaginate.length === 0) {
          displayedRecords.value = []; return;
      }
      const startIndex = (currentPage.value - 1) * itemsPerPage.value;
      const endIndex = startIndex + itemsPerPage.value;

      // Map the sliced (paginated) records, applying temp selections logic
      displayedRecords.value = recordsToPaginate
          .slice(startIndex, endIndex)
          .map(record => {
              const originalVoted = record.voted === true || record.voted === 'true' || record.voted === 1;
              const tempSelection = tempSelections.value[record.id];
              // Important: Use the *current* temp selection if available, otherwise fallback to original voted status
              const currentSelectionValue = tempSelection !== undefined ? tempSelection : (originalVoted ? 'yes' : 'no');
              return {
                 ...record,
                 id: record.id,
                 voted: originalVoted, // Store the original DB state
                 selectedVoteStatus: currentSelectionValue // Reflects UI state (temp or original)
              };
          });
  }


  function hasSelectionChanged(record) {
    const tempValue = tempSelections.value[record.id];
    // If there's no temporary selection for this record, it hasn't changed
    if (tempValue === undefined) return false;
    // Convert the temporary selection ('yes'/'no') to a boolean
    const selectedBoolean = tempValue === 'yes';
    // Compare the temporary boolean state to the original 'voted' state
    return record.voted !== selectedBoolean;
  }


  function showMessage(type, message, duration = 4000) {
      // ... (implementation remains the same) ...
      if (messageTimeout) clearTimeout(messageTimeout);
      errorMessage.value = null; successMessage.value = null;
      if (type === 'success') successMessage.value = message;
      else if (type === 'error') errorMessage.value = message;
      if (type) {
          messageTimeout = setTimeout(() => { successMessage.value = null; errorMessage.value = null; }, duration);
      }
  }

  async function loadMandoobData() {
      // ... (implementation remains the same) ...
      try {
        const result = await fetchMandoobRecords();
        if (result.success && Array.isArray(result.data)) {
          // Sort by ID initially
          const sortedData = result.data.sort((a, b) => Number(a.id) - Number(b.id));
          return { success: true, data: sortedData };
        } else {
          return { success: false, error: result.error?.message || 'Failed to load Mandoob records.' };
        }
      } catch (err) {
        return { success: false, error: `Network error loading Mandoob data: ${err.message}` };
      }
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
      currentPage.value = page;
      // Clear temporary selections when changing page to avoid carrying over unsaved changes visually
      tempSelections.value = {};
      window.scrollTo(0, 0); // Scroll to top after page change
    }
  }


  async function handleLogout() {
      // ... (implementation remains the same) ...
      try {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        currentUser.value = null;
        await router.push('/');
      } catch (error) {
        console.error('Logout error:', error);
        showMessage('error', 'Logout failed.');
      }
  }

  function onDropdownChange(event, recordId) {
    const selectedValue = event.target.value;
    // Store the temporary selection
    tempSelections.value[recordId] = selectedValue;

    // Re-run calculateDisplayedRecords to update the UI immediately
    // This is needed because calculateDisplayedRecords reads from tempSelections
    // Note: This will only affect the *currently displayed* page. The underlying
    // filteredMandoobRecords remains unchanged until a save/update.
    calculateDisplayedRecords();
}


  async function confirmVoteUpdate(record) {
    const recordId = record.id;
    const selectedStatusString = tempSelections.value[recordId];

    // Double-check conditions: Must be changing to 'yes', and it must be an actual change from the original state.
    if (record.voted === true || selectedStatusString !== 'yes' || !hasSelectionChanged(record)) {
      // If conditions aren't met (e.g., already voted, trying to change to 'no', or no actual change),
      // simply remove the temporary selection and refresh the display for that record.
      delete tempSelections.value[recordId];
      calculateDisplayedRecords(); // Refresh UI to reflect removal of temp state
      return;
    }

    // Find the index in the *master* list (allMandoobRecords)
    const originalRecordIndex = allMandoobRecords.value.findIndex(r => r.id === recordId);
    if (originalRecordIndex === -1) {
         showMessage('error', `Internal error: Record ${recordId} not found in master list.`);
         return;
    }

    // Prevent multiple simultaneous updates
    if (updatingVoteId.value !== null) return;
    updatingVoteId.value = recordId; // Set loading state for this specific record
    showMessage(null, ''); // Clear previous messages

    try {
      const result = await updateMandoobVote(recordId);
      if (result.success) {
        showMessage('success', result.message || `تم تحديث حالة التصويت للسجل رقم ${recordId} بنجاح.`);

        // Update the record in the master list (allMandoobRecords)
        const updatedRecord = { ...allMandoobRecords.value[originalRecordIndex], voted: true };
        // Use splice for reactivity with the array
        allMandoobRecords.value.splice(originalRecordIndex, 1, updatedRecord);

        // Remove the temporary selection state for this record as it's now permanent
        delete tempSelections.value[recordId];

        // Recalculate displayed records - this ensures the updated 'voted' status
        // and removal of the confirm button are reflected immediately.
        // Note: This implicitly uses the updated allMandoobRecords via filteredMandoobRecords.
        calculateDisplayedRecords();

        // Re-fetch stats to show updated count immediately
        fetchInitialStats().then(statsResult => {
            if (statsResult.success) {
                overallVoted.value = statsResult.data.overallVoted;
            } else {
                 console.warn("Could not refresh stats after vote update:", statsResult.error);
                 // Optionally show a small, non-blocking warning about stats refresh failure
            }
        });


      } else {
        showMessage('error', result.error?.message || `فشل تحديث حالة التصويت للسجل رقم ${recordId}.`);
        // Do *not* remove the temp selection on failure, allow user to retry or change back
      }
    } catch (err) {
      console.error("Error during vote update API call:", err);
      showMessage('error', `حدث خطأ أثناء تحديث حالة التصويت: ${err.message}`);
      // Do *not* remove the temp selection on network/catch error
    } finally {
      updatingVoteId.value = null; // Clear loading state for this record
    }
  }


  // --- Component Lifecycle ---
  onMounted(async () => {
    currentUser.value = localStorage.getItem('currentUser');
    recordsLoading.value = true;
    statsLoading.value = true;
    filterText.value = ''; // Ensure filter is empty on mount
    tempSelections.value = {};
    showMessage(null, '');
    statsErrorMessage.value = null;

    try {
      // 1. Check Session
      const sessionResult = await checkSession();
      if (!sessionResult.success) {
        showMessage('error', `Session invalid: ${sessionResult.error?.message || 'Please log in again.'}`, 6000);
        await router.push('/');
        return;
      }
      currentUser.value = sessionResult.username || currentUser.value || 'User';

      // 2. Fetch Mandoob & Stats Data Concurrently
      const results = await Promise.allSettled([
          loadMandoobData(),
          fetchInitialStats() // Fetches only total_voted now
      ]);

      // 3. Process Mandoob Result
      const mandoobResult = results[0];
      if (mandoobResult.status === 'fulfilled' && mandoobResult.value.success) {
          allMandoobRecords.value = mandoobResult.value.data;
          currentPage.value = 1; // Start on page 1
          // Initial calculation of displayed records happens via the watcher
      } else {
          const errorMsg = mandoobResult.status === 'fulfilled' ? mandoobResult.value.error : `Network/fetch error: ${mandoobResult.reason?.message}`;
          showMessage('error', `Failed to load Mandoob records: ${errorMsg}`);
          allMandoobRecords.value = [];
      }
      recordsLoading.value = false; // Mandoob loading finished

      // 4. Process Stats Result (Simplified)
      const statsResult = results[1];
      if (statsResult.status === 'fulfilled' && statsResult.value.success) {
          overallVoted.value = statsResult.value.data.overallVoted; // Assign the fetched count
          statsErrorMessage.value = null;
          console.log("Total voted count loaded:", overallVoted.value);
      } else {
          const errorMsg = statsResult.status === 'fulfilled' ? statsResult.value.error : `Network/fetch error: ${statsResult.reason?.message}`;
          console.error("Failed to fetch overall statistics:", errorMsg);
          statsErrorMessage.value = errorMsg;
          overallVoted.value = 0; // Default to 0 on error
      }
      statsLoading.value = false; // Stats loading finished

    } catch (err) {
      console.error('Error during component initialization:', err);
      showMessage('error', `Initialization failed: ${err.message}. Redirecting...`, 6000);
      recordsLoading.value = false;
      statsLoading.value = false;
      await router.push('/');
    }
  });

  onUnmounted(() => {
    if (messageTimeout) { clearTimeout(messageTimeout); }
  });

</script>

<style>
/* Root variables and global styles (keep as before) */
:root {
  --primary-bg-color: #1a233a;
  --card-bg-color: #2a3b52;
  --text-color-light: #e0e0e0;
  --text-color-lighter: #f5f5f5;
  --text-color-muted: #9DA3B4;
  --accent-color: #FF3B30; /* Red accent */
  --accent-hover: #E02E24;
  --input-bg-color: rgba(42, 59, 82, 0.9);
  --input-border-color: rgba(255, 255, 255, 0.1);
  --input-focus-border: rgba(52, 199, 89, 0.6); /* Green focus */
  --input-focus-shadow: rgba(52, 199, 89, 0.15);
  --error-color: #FF453A;
  --error-bg: rgba(255, 69, 58, 0.1);
  --success-color: #34C759; /* Green success */
  --success-bg: rgba(52, 199, 89, 0.1);
  --table-header-bg: #00000085;
  --table-even-row-bg: #1f2940;
  --table-border-color: #3a4a63;
  --disabled-bg-color: #3a4a63;
  --disabled-text-color: #7e8a9e;
}
html, body, #__nuxt {
  height: 100%; margin: 0; padding: 0;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  color: var(--text-color-light);
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
</style>

<style scoped>
/* --- Mandoob Page Specific Styles --- */
.wrapper.mandoob-page { max-width: 1600px; margin: 0 auto; padding: 40px 20px 60px 20px; box-sizing: border-box; position: relative; }
h1 { color: var(--text-color-lighter); margin-bottom: 25px; text-align: center; margin-top: 20px; }

/* Top Bar */
.top-bar-mandoob { position: absolute; top: 41px; left: 20px; z-index: 100; }
.logout-btn { padding: 8px 15px; background-color: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease; }
.logout-btn:hover { background-color: var(--accent-hover); }

/* --- Statistics Display Area (Simplified) --- */
.stats-display-area.simple {
  background-color: var(--card-bg-color);
  padding: 15px 25px;
  border-radius: 8px;
  margin-bottom: 25px; /* Space before filter */
  border: 1px solid var(--table-border-color);
  box-shadow: 0 2px 5px rgba(0,0,0,0.15);
  text-align: center;
}
.stats-display-area.loading.simple {
    display: flex; align-items: center; justify-content: center;
    color: var(--text-color-muted); min-height: 60px;
    gap: 10px; font-size: 0.9em;
}
.stat-item.single-stat {
  background-color: transparent;
  padding: 0;
  display: inline-block;
  margin: 0 auto;
}
.stat-label { display: inline; font-size: 1.1em; color: var(--text-color-muted); margin-right: 10px; }
.stat-value { display: inline; font-size: 1.3em; font-weight: 700; color: var(--text-color-lighter); }
.stats-error { color: var(--error-color); margin-top: 10px; text-align: center; font-size: 0.9em; display: flex; align-items: center; justify-content: center; gap: 5px; }
.stats-error svg { flex-shrink: 0; }
/* --- End Simplified Stats Area --- */

/* --- Filter Input --- */
.filter-container {
  margin-bottom: 20px; /* Space before table */
  max-width: 600px; /* Limit width */
  margin-left: auto;
  margin-right: auto;
}
.filter-input {
  width: 100%;
  padding: 10px 15px;
  font-size: 1rem;
  color: var(--text-color-light);
  background-color: var(--input-bg-color);
  border: 1px solid var(--input-border-color);
  border-radius: 6px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.filter-input::placeholder {
  color: var(--text-color-muted);
  opacity: 0.7;
}
.filter-input:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-shadow);
}
/* --- End Filter Input --- */


/* Table Styles */
.table-container { max-height: 60vh; /* Adjusted height slightly if needed */ overflow-y: auto; border: 1px solid var(--table-border-color); border-radius: 8px; background-color: var(--primary-bg-color); }
table { width: 100%; border-collapse: collapse; table-layout: auto; }
th, td { border: 1px solid var(--table-border-color); padding: 8px 10px; font-size: 14px; vertical-align: middle; text-align: right; white-space: nowrap; }
th { background-color: var(--table-header-bg); color: var(--text-color-lighter); position: sticky; top: 0; z-index: 10; font-weight: 600; }
th.status-update-header { text-align: center; }
tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover { background-color: var(--card-bg-color); }
/* Style for loading/no-results rows */
tbody tr td[colspan="7"] {
    padding: 20px;
    color: var(--text-color-muted);
    font-style: italic;
}

/* Action Cell Styles */
td.action-cell { text-align: center; vertical-align: middle; padding: 5px; width: 230px; height: 52px; box-sizing: border-box; }
.select-confirm-wrapper { display: flex; align-items: center; gap: 8px; justify-content: center; width: 100%; height: 100%; }
.action-cell > .loading-spinner.small { margin: 0 auto; display: block; padding: 11px 0; }
.action-cell > span + .select-confirm-wrapper { display: none; } /* Hide controls when spinner is shown */

/* Vote Select Dropdown */
.vote-select { appearance: none; -webkit-appearance: none; flex-basis: 130px; flex-grow: 0; flex-shrink: 0; height: 40px; padding: 0 15px 0 35px; line-height: 38px; font-size: 1rem; font-weight: 600; border-radius: 6px; border: 1px solid var(--input-border-color); background-color: var(--input-bg-color); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%239DA3B4' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: left 12px center; background-size: 14px 14px; cursor: pointer; transition: all 0.2s ease; outline: none; text-align: center; box-sizing: border-box; }
.vote-select:focus { border-color: var(--input-focus-border); box-shadow: 0 0 0 3px var(--input-focus-shadow); }
.vote-select.is-voted { color: var(--success-color); }
.vote-select.is-not-voted { color: var(--text-color-light); }
.vote-select option { background-color: var(--card-bg-color); font-weight: normal; padding: 5px 10px; }
.vote-select option[value="yes"] { color: var(--success-color); }
.vote-select option[value="no"] { color: var(--text-color-light); }
.vote-select:disabled { background-color: var(--input-bg-color); color: var(--success-color); border-color: rgba(52, 199, 89, 0.3); cursor: not-allowed; opacity: 0.75; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%237e8a9e' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E"); }

/* Confirm Button */
.confirm-update-btn { padding: 0 15px; background-color: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: background-color 0.2s ease, opacity 0.2s ease; display: inline-flex; align-items: center; justify-content: center; height: 40px; line-height: 1; flex-shrink: 0; }
.confirm-update-btn:hover:not(:disabled) { background-color: var(--accent-hover); }
.confirm-update-btn:disabled { background-color: var(--disabled-bg-color); color: var(--disabled-text-color); cursor: not-allowed; opacity: 0.7; }

/* Pagination */
.pagination { text-align: center; margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 10px; }
.pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
.pagination button { padding: 8px 15px; border: none; background-color: var(--accent-color); color: white; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; border-radius: 6px; height: 40px; display: inline-flex; align-items: center; justify-content: center; }
.pagination button:hover:not(:disabled) { background-color: var(--accent-hover); }
.pagination button:disabled { opacity: 0.65; cursor: not-allowed; background-color: var(--disabled-bg-color) !important; }

/* Loading Spinner */
.loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite; vertical-align: middle; }
.loading-spinner.small { width: 16px; height: 16px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Fade Transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Copyright */
.copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }

</style>