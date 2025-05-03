<template>
    <div class="wrapper elections-page moderator-page">

      <div class="top-bar-mandoob">
          <button @click="handleLogout" class="logout-btn">
            تسجيل الخروج ({{ currentUser || '...' }})
          </button>
          <button @click="toggleLiveConnection" :disabled="connecting || recordsLoading" class="live-btn" :class="{ 'live-active': isLive }">
            <span v-if="connecting" class="loading-spinner small"></span>
            {{ isLive ? 'إيقاف التحديث المباشر' : 'تحديث مباشر' }}
          </button>
      </div>

      <h1 style="margin-top: 60px;">قائمة المراقبين</h1>

      <transition name="fade">
        <Warning
          v-if="errorMessage"
          title="خطأ تحميل القائمة"
          :message="errorMessage"
          style="margin: 15px auto; max-width: 600px;"
        />
      </transition>
      <transition name="fade">
         <Warning
          v-if="successMessage"
          title="نجاح"
          :message="successMessage"
          style="margin: 15px auto; max-width: 600px;"
        />
      </transition>

      <div class="stats-display-area multi-stats">
          <div v-if="statsLoading" class="stats-loading-overlay">
              <span class="loading-spinner small"></span> جاري تحميل الإحصائيات...
          </div>
          <div v-else-if="statsErrorMessage" class="stats-error-message">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
               <span>فشل تحميل الإحصائيات: {{ statsErrorMessage }}</span>
          </div>
          <template v-else>
              <div class="stat-item">
                  <span class="stat-label">مع:</span>
                  <span class="stat-value with">{{ countWith.toLocaleString() }}</span>
              </div>
              <div class="stat-item">
                  <span class="stat-label">ضد:</span>
                  <span class="stat-value against">{{ countAgainst.toLocaleString() }}</span>
              </div>
              <div class="stat-item">
                  <span class="stat-label">غير معروف:</span>
                  <span class="stat-value unknown">{{ countUnknown.toLocaleString() }}</span>
              </div>
              <div class="stat-item">
                  <span class="stat-label">إجمالي المصوتين (API):</span>
                  <span class="stat-value total-voted">{{ backendOverallVoted.toLocaleString() }}</span>
              </div>
          </template>
      </div>

      <div class="filter-container">
        <input
          type="text"
          v-model="filterText"
          placeholder="ابحث بالاسم، العائلة، السجل..."
          class="filter-input"
          dir="rtl"
        />
      </div>

      <div class="table-container" dir="rtl" style="margin-top: 15px;">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>العائلة</th>
              <th>اسم الأب</th>
              <th>اسم الأم</th>
              <th>تاريخ الولادة</th>
              <th>السجل</th>
              <th>انتخب</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="recordsLoading">
              <td colspan="8" style="text-align: center;">
                <span class="loading-spinner"></span> جاري تحميل بيانات المراقبين...
              </td>
            </tr>
            <tr v-else-if="!recordsLoading && allModeratorRecords.length === 0">
               <td colspan="8" style="text-align: center;">لم يتم العثور على سجلات مراقبين بعد.</td>
            </tr>
             <tr v-else-if="!recordsLoading && displayedRecords.length === 0 && filterText">
               <td colspan="8" style="text-align: center;">لا توجد نتائج تطابق بحثك "{{ filterText }}".</td>
            </tr>
            <tr v-else v-for="record in displayedRecords" :key="record.id"
                :class="{ 'row-orientation-with': record.orientation && record.orientation.toString().toLowerCase().trim() === 'with' }">
              <td>{{ record.name }}</td>
              <td>{{ record.family }}</td>
              <td>{{ record.father }}</td>
              <td>{{ record.mother }}</td>
              <td>{{ record.dob }}</td>
              <td>{{ record.register }}</td>
              <td>{{ record.voted ? 'نعم' : 'لا' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

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
    import { fetchInitialStats } from '~/javascript/mandoobstats.js';
    import { fetchModeratorRecords } from '~/javascript/offices.js';
    import { createWebSocketConnection } from '~/javascript/socket.js';
    import Warning from '~/components/voteupdate.vue';

    const router = useRouter();
    const currentUser = ref(null);

    const allModeratorRecords = ref([]);
    const displayedRecords = ref([]);
    const recordsLoading = ref(true);
    const currentPage = ref(1);
    const itemsPerPage = ref(25);
    const filterText = ref('');

    const countWith = ref(0);
    const countAgainst = ref(0);
    const countUnknown = ref(0);

    const backendOverallVoted = ref(0);
    const statsLoading = ref(true);
    const statsErrorMessage = ref(null);

    const errorMessage = ref(null);
    const successMessage = ref(null);
    let messageTimeout = null;

    const isLive = ref(false);
    const connecting = ref(false);
    const socketInstance = ref(null);

    const filteredModeratorRecords = computed(() => {
      const searchTerm = filterText.value.trim().toLowerCase();
      if (!searchTerm) {
        return allModeratorRecords.value;
      }
      return allModeratorRecords.value.filter(record => {
        const votedText = record.voted ? 'نعم' : 'لا';
        const orientationText = formatOrientation(record.orientation)?.toLowerCase();
        return (
          record.name?.toLowerCase().includes(searchTerm) ||
          record.family?.toLowerCase().includes(searchTerm) ||
          record.father?.toLowerCase().includes(searchTerm) ||
          record.mother?.toLowerCase().includes(searchTerm) ||
          record.register?.toString().toLowerCase().includes(searchTerm) ||
          (orientationText && orientationText.includes(searchTerm)) ||
          votedText.includes(searchTerm)
        );
      });
    });

    const totalRecords = computed(() => filteredModeratorRecords.value.length);
    const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value));

    watch([filteredModeratorRecords, currentPage], () => {
        calculateDisplayedRecords();
    }, { deep: true });

    watch(filterText, () => {
      if (currentPage.value !== 1) {
        currentPage.value = 1;
      }
    });

    function calculateDisplayedRecords() {
        const recordsToPaginate = filteredModeratorRecords.value;
        if (!recordsToPaginate || recordsToPaginate.length === 0) {
            displayedRecords.value = []; return;
        }
        const startIndex = (currentPage.value - 1) * itemsPerPage.value;
        const endIndex = startIndex + itemsPerPage.value;
        displayedRecords.value = recordsToPaginate.slice(startIndex, endIndex);
    }

    function calculateOrientationStats() {
      let withCount = 0;
      let againstCount = 0;
      let unknownCount = 0;
      if (allModeratorRecords.value && allModeratorRecords.value.length > 0) {
          for (const record of allModeratorRecords.value) {
            const orientation = record.orientation?.toString().toLowerCase().trim();
            if (orientation === 'with') withCount++;
            else if (orientation === 'against') againstCount++;
            else unknownCount++;
          }
      }
      countWith.value = withCount;
      countAgainst.value = againstCount;
      countUnknown.value = unknownCount;
      console.log(`[moderator] Orientation Stats Calculated: With=${withCount}, Against=${againstCount}, Unknown=${unknownCount}`);
    }

    function formatOrientation(orientationValue) {
        const orientation = orientationValue?.toString().toLowerCase().trim();
         if (orientation === 'with') return 'مع';
         if (orientation === 'against') return 'ضد';
         return 'غير معروف';
    }

    function showMessage(type, message, duration = 4000) {
        if (messageTimeout) clearTimeout(messageTimeout);
        errorMessage.value = null; successMessage.value = null;
        if (type === 'success') successMessage.value = message;
        else if (type === 'error') errorMessage.value = message;
        else if (type === 'info' || type === 'warning') successMessage.value = message;

        if (type) {
            messageTimeout = setTimeout(() => { successMessage.value = null; errorMessage.value = null; }, duration);
        }
    }

    async function fetchModeratorList() {
        try {
          const result = await fetchModeratorRecords();
          if (result.success && Array.isArray(result.data)) {
            const sortedData = result.data.sort((a, b) => Number(a.register) - Number(b.register));
            return { success: true, data: sortedData };
          } else {
            return { success: false, error: result.error?.message || 'Failed to load Moderator records.' };
          }
        } catch (err) {
          return { success: false, error: `Network error loading Moderator data: ${err.message}` };
        }
    }

    function goToPage(page) {
        if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
            currentPage.value = page;
            window.scrollTo(0, 0);
        }
    }

    function handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const updateType = data.update_type;
            const recordId = data.voter_id;
            const newStatus = data.status;

            if (updateType === 'vote' && typeof newStatus === 'boolean' && recordId !== undefined && recordId !== null) {
                const recordIndex = allModeratorRecords.value.findIndex(r => r.id === recordId);

                if (recordIndex > -1) {
                    const currentRecord = allModeratorRecords.value[recordIndex];
                    const wasAlreadyVoted = currentRecord.voted === true || currentRecord.voted === 'true' || currentRecord.voted === 1;

                    if (newStatus === true && !wasAlreadyVoted) {
                         backendOverallVoted.value++;
                    }

                    const updatedRecord = { ...currentRecord, voted: newStatus };
                    allModeratorRecords.value.splice(recordIndex, 1, updatedRecord);


                    calculateDisplayedRecords();
                } else {
                     console.log(`[WS] Received vote update for record ID ${recordId}, but it's not in the current master list.`);
                     if (newStatus === true) {
                        backendOverallVoted.value++;
                     }
                }
            } else {
                console.warn("[WS] Received non-vote or invalid message:", data);
            }
        } catch (err) {
            console.error('[WS] Error processing WebSocket message:', err, event.data);
            showMessage('error', 'خطأ في معالجة التحديث المباشر.');
        }
    }

    function startWebSocketConnection() {
        if (isLive.value || connecting.value) return;

        connecting.value = true;
        errorMessage.value = null;
        successMessage.value = null;

        const socket = createWebSocketConnection();

        if (!socket) {
            showMessage('error', 'فشل تهيئة اتصال التحديث المباشر.');
            connecting.value = false;
            return;
        }

        socketInstance.value = socket;

        socket.onopen = () => {
            isLive.value = true;
            connecting.value = false;
            showMessage('success', 'تم تفعيل التحديث المباشر.');
            console.log("[WS] WebSocket connection opened.");
        };

        socket.onmessage = handleWebSocketMessage;

        socket.onerror = (error) => {
            console.error('[WS] WebSocket error:', error);
            showMessage('error', 'حدث خطأ في الاتصال المباشر.');
            disconnectWebSocket();
        };

        socket.onclose = (event) => {
            console.log(`[WS] WebSocket closed - Code: ${event.code}, Reason: ${event.reason}, Was Clean: ${event.wasClean}`);
            if (isLive.value && event.code !== 1000) {
                showMessage('warning', `تم إغلاق الاتصال المباشر بشكل غير متوقع (Code: ${event.code}).`);
            }
            disconnectWebSocket();
        };
    }

    function disconnectWebSocket() {
        if (!socketInstance.value && !isLive.value && !connecting.value) {
            return;
        }

        isLive.value = false;
        connecting.value = false;

        if (socketInstance.value) {
            socketInstance.value.onopen = null;
            socketInstance.value.onmessage = null;
            socketInstance.value.onerror = null;
            socketInstance.value.onclose = null;

            if (socketInstance.value.readyState === WebSocket.OPEN || socketInstance.value.readyState === WebSocket.CONNECTING) {
                try {
                    socketInstance.value.close(1000, "User initiated disconnect");
                } catch (e) {
                    console.error("[WS] Error closing WebSocket:", e);
                }
            }
            socketInstance.value = null;
        }
        console.log("[WS] WebSocket disconnected.");
    }

    function toggleLiveConnection() {
        if (isLive.value) {
            disconnectWebSocket();
            showMessage('info', 'تم إيقاف التحديث المباشر.');
        } else {
            startWebSocketConnection();
        }
    }

    async function handleLogout() {
        disconnectWebSocket();
        try {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          currentUser.value = null;
          await router.push('/');
        } catch (error) {
          console.error('Logout error:', error);
          errorMessage.value = 'Logout failed.';
        }
    }

    onMounted(async () => {
      currentUser.value = localStorage.getItem('currentUser');
      recordsLoading.value = true;
      statsLoading.value = true;
      filterText.value = '';
      showMessage(null, '');
      statsErrorMessage.value = null;

      countWith.value = 0;
      countAgainst.value = 0;
      countUnknown.value = 0;
      backendOverallVoted.value = 0;

      try {
        const sessionResult = await checkSession();
        if (!sessionResult.success) {
          showMessage('error', `Session invalid: ${sessionResult.error?.message || 'Please log in again.'}`, 6000);
          recordsLoading.value = false;
          statsLoading.value = false;
          await router.push('/');
          return;
        }
        currentUser.value = sessionResult.username || currentUser.value || 'User';

        const results = await Promise.allSettled([
            fetchModeratorList(),
            fetchInitialStats()
        ]);

        const listResult = results[0];
        const statsApiResult = results[1];

        if (listResult.status === 'fulfilled' && listResult.value.success) {
            allModeratorRecords.value = listResult.value.data;
            currentPage.value = 1;
            calculateOrientationStats();
            errorMessage.value = null;
        } else {
            const listErrorMsg = listResult.status === 'fulfilled'
                               ? listResult.value.error
                               : listResult.reason?.message || 'Unknown error fetching list.';
            errorMessage.value = `فشل تحميل قائمة المراقبين: ${listErrorMsg}`;
            allModeratorRecords.value = [];
            countWith.value = 0;
            countAgainst.value = 0;
            countUnknown.value = 0;
        }
        recordsLoading.value = false;

        if (statsApiResult.status === 'fulfilled' && statsApiResult.value.success) {
            backendOverallVoted.value = statsApiResult.value.data.overallVoted;
            statsErrorMessage.value = null;
        } else {
            const statsErrorMsg = statsApiResult.status === 'fulfilled'
                                 ? statsApiResult.value.error
                                 : statsApiResult.reason?.message || 'Unknown error fetching stats.';
            statsErrorMessage.value = statsErrorMsg;
            backendOverallVoted.value = 0;
        }
        statsLoading.value = false;

      } catch (err) {
        console.error('Error during component initialization:', err);
        errorMessage.value = `Initialization failed: ${err.message}. Redirecting...`;
        recordsLoading.value = false;
        statsLoading.value = false;
      }
       calculateDisplayedRecords();
    });

    onUnmounted(() => {
      disconnectWebSocket();
      if (messageTimeout) { clearTimeout(messageTimeout); }
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
    --input-bg-color: rgba(42, 59, 82, 0.9);
    --input-border-color: rgba(255, 255, 255, 0.1);
    --input-focus-border: rgba(52, 199, 89, 0.6);
    --input-focus-shadow: rgba(52, 199, 89, 0.15);
    --error-color: #FF453A;
    --error-bg: rgba(255, 69, 58, 0.1);
    --success-color: #34C759;
    --success-bg: rgba(52, 199, 89, 0.1);
    --table-header-bg: #00000085;
    --table-even-row-bg: #1f2940;
    --table-border-color: #3a4a63;
    --disabled-bg-color: #3a4a63;
    --disabled-text-color: #7e8a9e;
    --stat-with-color: #34C759;
    --stat-against-color: #FF453A;
    --stat-unknown-color: #9DA3B4;
    --stat-voted-color: var(--text-color-lighter);
    --row-with-bg-color: rgba(52, 199, 89, 0.15);
    --row-with-bg-hover-color: rgba(52, 199, 89, 0.25);
}
html, body, #__nuxt {
    height: 100%; margin: 0; padding: 0;
    background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
    color: var(--text-color-light);
    font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
</style>

<style scoped>
.wrapper.moderator-page { max-width: 1600px; margin: 0 auto; padding: 40px 20px 60px 20px; box-sizing: border-box; position: relative; }
h1 { color: var(--text-color-lighter); margin-bottom: 25px; text-align: center; margin-top: 20px; }

.top-bar-mandoob {
    position: absolute;
    top: 41px;
    left: 20px;
    z-index: 100;
    display: flex;
    gap: 15px;
    align-items: center;
 }
.logout-btn { padding: 8px 15px; background-color: var(--accent-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s ease; }
.logout-btn:hover { background-color: var(--accent-hover); }
.live-btn {
    padding: 8px 15px;
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.3s ease, opacity 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    height: 36px;
}
.live-btn:hover:not(:disabled) {
    background-color: #0056b3;
}
.live-btn:disabled {
    background-color: #6c757d;
    opacity: 0.65;
    cursor: not-allowed;
}
.live-btn.live-active {
    background-color: #dc3545;
}
.live-btn.live-active:hover:not(:disabled) {
    background-color: #c82333;
}


.stats-display-area.multi-stats {
    background-color: var(--card-bg-color);
    padding: 15px 25px;
    border-radius: 8px;
    margin-bottom: 25px;
    border: 1px solid var(--table-border-color);
    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    text-align: center;
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    position: relative;
    min-height: 60px;
}
.stats-loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(42, 59, 82, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text-color-muted);
    font-size: 0.9em;
    gap: 10px;
    border-radius: 8px;
    z-index: 5;
}
.stats-error-message {
    width: 100%;
    text-align: center;
    color: var(--error-color);
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-size: 0.95em;
}
.stats-error-message svg {
    flex-shrink: 0;
}

.stat-item { background-color: transparent; padding: 0; text-align: center; flex-basis: auto; min-width: 100px; }
.stat-label { display: block; font-size: 1em; color: var(--text-color-muted); margin-bottom: 5px; }
.stat-value { display: block; font-size: 1.4em; font-weight: 700; }
.stat-value.with { color: var(--stat-with-color); }
.stat-value.against { color: var(--stat-against-color); }
.stat-value.unknown { color: var(--stat-unknown-color); }
.stat-value.total-voted { color: var(--stat-voted-color); }

.filter-container { margin-bottom: 20px; max-width: 600px; margin-left: auto; margin-right: auto; }
.filter-input { width: 100%; padding: 10px 15px; font-size: 1rem; color: var(--text-color-light); background-color: var(--input-bg-color); border: 1px solid var(--input-border-color); border-radius: 6px; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.filter-input::placeholder { color: var(--text-color-muted); opacity: 0.7; }
.filter-input:focus { outline: none; border-color: var(--input-focus-border); box-shadow: 0 0 0 3px var(--input-focus-shadow); }

.table-container { max-height: 60vh; overflow-y: auto; border: 1px solid var(--table-border-color); border-radius: 8px; background-color: var(--primary-bg-color); }
table { width: 100%; border-collapse: collapse; table-layout: auto; }
th, td { border: 1px solid var(--table-border-color); padding: 8px 10px; font-size: 14px; vertical-align: middle; text-align: right; white-space: nowrap; transition: background-color 0.15s ease; }
th { background-color: var(--table-header-bg); color: var(--text-color-lighter); position: sticky; top: 0; z-index: 10; font-weight: 600; }
tbody tr:nth-child(even) { background-color: var(--table-even-row-bg); }
tbody tr:hover td { background-color: var(--card-bg-color); }

tbody tr.row-orientation-with td {
    background-color: var(--row-with-bg-color);
    color: var(--text-color-lighter);
}
tbody tr.row-orientation-with:hover td {
    background-color: var(--row-with-bg-hover-color);
}

tbody tr td[colspan="8"] {
    padding: 20px;
    color: var(--text-color-muted);
    font-style: italic;
    background-color: transparent !important;
}
tbody tr:hover td[colspan="8"] {
    background-color: transparent !important;
}

.pagination { text-align: center; margin-top: 25px; display: flex; justify-content: center; align-items: center; gap: 10px; }
.pagination span { padding: 8px 12px; color: var(--text-color-muted); font-size: 14px; }
.pagination button { padding: 8px 15px; border: none; background-color: var(--accent-color); color: white; cursor: pointer; font-weight: 500; transition: background-color 0.2s ease; border-radius: 6px; height: 40px; display: inline-flex; align-items: center; justify-content: center; }
.pagination button:hover:not(:disabled) { background-color: var(--accent-hover); }
.pagination button:disabled { opacity: 0.65; cursor: not-allowed; background-color: var(--disabled-bg-color) !important; }

.loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: var(--text-color-lighter); animation: spin 0.8s linear infinite; vertical-align: middle; }
.loading-spinner.small { width: 16px; height: 16px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.copyright { margin-top: 30px; font-size: 12px; color: rgba(255, 255, 255, 0.4); text-align: center; }

</style>