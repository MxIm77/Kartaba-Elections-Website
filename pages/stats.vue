<template>
    <div class="wrapper stats-page">
      <h1 class="main-title">Voting Statistics Dashboard</h1>
      <nav class="main-nav">
        <NuxtLink to="/elections" exact-active-class="router-link-active">Election Management</NuxtLink>
        <NuxtLink to="/stats" exact-active-class="router-link-active">Voting Statistics</NuxtLink>
      </nav>
      <!-- Live Status Indicator -->
      <div class="live-status-indicator">
        <span :class="['status-dot', liveStatusClass]"></span>
        {{ liveStatusText }}
        <button v-if="!isLive && !connecting" @click="startWebSocketConnection" class="connect-btn">Connect for Live Updates</button>
        <button v-if="isLive" @click="disconnectWebSocket" class="connect-btn disconnect">Disconnect Live Updates</button>
         <span v-if="connecting" class="loading-spinner small inline-spinner"></span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-message">
        <span class="loading-spinner"></span> Loading dashboard data...
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="message error-message">
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
         <span>{{ errorMessage }}</span>
         <button @click="loadData" class="retry-btn">Retry</button>
      </div>

      <!-- Data Display State -->
      <div v-else class="stats-content">

        <!-- Overall Bar Chart: Voted vs Not Voted Counts -->
        <div class="chart-wrapper full-width-chart" v-if="overallBarChartData">
          <h2 class="chart-title">Votes Cast vs Not Voted</h2>
          <Bar
              id="overall-bar-chart"
              :options="overallBarChartOptions"
              :data="overallBarChartData"
              class="chart-canvas"
           />
           <div class="chart-summary">
              Based on {{ totalProcessedRecords.toLocaleString() }} total processed records (rows).
           </div>
        </div>
         <div class="chart-wrapper full-width-chart" v-else>
            <h2 class="chart-title">Votes Cast vs Not Voted</h2>
            <p class="error-text">Could not display overall vote counts.</p>
        </div>

        <!-- Bottom Grid: Just the Doughnut Chart Now -->
        <div class="charts-grid-bottom single-item">

            <!-- Overall Doughnut Chart: Percentage -->
            <div class="chart-wrapper" v-if="overallDoughnutData">
              <h2 class="chart-title">Overall Voting Status (%)</h2>
              <Doughnut
                  id="overall-doughnut-chart"
                  :options="doughnutChartOptions"
                  :data="overallDoughnutData"
                  class="chart-canvas"
              />
              <div class="chart-summary">
                  Percentage based on {{ totalProcessedRecords.toLocaleString() }} total processed records (rows).
              </div>
            </div>
            <div class="chart-wrapper" v-else>
                <h2 class="chart-title">Overall Voting Status (%)</h2>
                <p class="error-text">Could not display overall voting percentages.</p>
            </div>

        </div>

      </div>

      <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
    import { Bar, Doughnut } from 'vue-chartjs';
    import {
      Chart as ChartJS,
      Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
      ArcElement
    } from 'chart.js';
    // Import service and the CORRECT socket connection function
    import { fetchInitialStats } from '~/javascript/stats-service.js';
    // --- Use the function from socket.js ---
    import { createWebSocketConnection } from '~/javascript/socket.js';
    // --- Remove import for stats-socket.js ---
    // import { createStatsWebSocketConnection } from '~/javascript/stats-socket.js'; // REMOVED

    ChartJS.register(
      Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
      ArcElement
    );

    // --- Configuration & Constants ---
    const FIXED_CHART_MAX = 6300; // Fixed maximum count for the bar chart Y-axis

    // Chart Colors
    const colorVoted = '#34C759';
    const colorNotVoted = '#FF3B30';
    // ... (other color constants remain the same) ...
    const colorVotedBorder = 'rgba(52, 199, 89, 0.7)';
    const colorNotVotedBorder = 'rgba(255, 59, 48, 0.7)';
    const colorTextLight = 'rgba(230, 230, 230, 0.85)';
    const colorTextMuted = 'rgba(230, 230, 230, 0.7)';
    const colorGridLines = 'rgba(255, 255, 255, 0.1)';
    const colorTooltipBg = 'rgba(0, 0, 0, 0.8)';


    // --- State Refs ---
    const loading = ref(true);
    const errorMessage = ref(null);
    const overallVotedCount = ref(0);
    const overallNotVotedCount = ref(0);
    const totalProcessedRecords = ref(0); // Represents total_rows from API
    const overallDoughnutData = ref(null);
    const overallBarChartData = ref(null);
    const isLive = ref(false);
    const connecting = ref(false);
    const socketInstance = ref(null);

    // --- Chart Options ---
    const doughnutChartOptions = ref({
        // ... (doughnut options remain the same) ...
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
            legend: { position: 'bottom', labels: { color: colorTextLight, padding: 20, font: { size: 13 } } },
            tooltip: { bodyColor: colorTextLight, backgroundColor: colorTooltipBg, padding: 10, boxPadding: 4 },
        },
        animation: { duration: 500 }
    });

    const overallBarChartOptions = computed(() => ({
        // ... (bar chart options use FIXED_CHART_MAX) ...
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                bodyColor: colorTextLight, backgroundColor: colorTooltipBg,
                padding: 10, boxPadding: 4,
                callbacks: { label: (context) => `Count: ${context.parsed.y.toLocaleString()}` }
            },
            title: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: FIXED_CHART_MAX, // Using the fixed constant
                title: { display: true, text: 'Number of Voters', color: colorTextMuted },
                ticks: { color: colorTextMuted, precision: 0, /* stepSize: 1000 */ }, // Adjust stepSize if needed
                grid: { color: colorGridLines }
            },
            x: { ticks: { color: colorTextMuted, font: { size: 13 } }, grid: { display: false } }
        },
         animation: { duration: 500 }
    }));

    // --- Computed Properties ---
    // totalRecordsCount is not strictly needed but kept for consistency if used elsewhere
    const totalRecordsCount = computed(() => totalProcessedRecords.value);

    const liveStatusText = computed(() => {
      if (connecting.value) return 'Connecting...';
      if (isLive.value) return 'Live Updates Active';
      return 'Updates Disconnected';
    });

     const liveStatusClass = computed(() => {
      if (connecting.value) return 'connecting';
      if (isLive.value) return 'live';
      return 'disconnected';
    });

    // --- Methods ---

    function updateOverallCharts() {
        // ... (update chart data logic remains the same) ...
        const voted = overallVotedCount.value;
        const notVoted = overallNotVotedCount.value;

        overallDoughnutData.value = {
            labels: ['Voted', 'Did Not Vote'],
            datasets: [{
                label: 'Voter Status',
                backgroundColor: [colorVoted, colorNotVoted],
                borderColor: [colorVotedBorder, colorNotVotedBorder],
                borderWidth: 1.5, hoverOffset: 8,
                data: [voted, notVoted]
            }]
        };

        overallBarChartData.value = {
            labels: ['Voted (انتخب)', 'Not Voted (لم ينتخب)'],
            datasets: [{
                label: 'Total Count',
                data: [voted, notVoted],
                backgroundColor: [colorVoted, colorNotVoted],
                borderColor: [colorVotedBorder, colorNotVotedBorder],
                borderWidth: 1,
                barPercentage: 0.6,
                categoryPercentage: 0.7
            }]
        };
    }

    function handleWebSocketMessage(event) {
        // ... (message handling logic remains the same) ...
        try {
            const data = JSON.parse(event.data);
            if (data.update_type !== 'vote' || typeof data.status !== 'boolean') {
                return;
            }
            const hasVoted = data.status;

            // Approximation logic
            if (hasVoted) {
                 overallVotedCount.value++;
                 overallNotVotedCount.value--;
             } else {
                 overallVotedCount.value--;
                 overallNotVotedCount.value++;
             }

             // Clamp counts >= 0
             overallVotedCount.value = Math.max(0, overallVotedCount.value);
             overallNotVotedCount.value = Math.max(0, overallNotVotedCount.value);

             // Sanity check: total count should ideally equal totalProcessedRecords if it represents people.
             // If totalProcessedRecords represents rows, this check might not be valid.
             // const currentTotal = overallVotedCount.value + overallNotVotedCount.value;
             // if (totalProcessedRecords.value > 0 && currentTotal !== totalProcessedRecords.value) {
             //     console.warn(`WS update resulted in inconsistent total count (${currentTotal}) vs processed records (${totalProcessedRecords.value}). This might be expected if processed is rows.`);
             // }

             nextTick(() => {
                 updateOverallCharts();
             });

        } catch (err) {
            console.error('Error processing WebSocket message:', err, event.data);
        }
    }

    // --- Updated WebSocket Connection Logic ---
    function startWebSocketConnection() {
        if (isLive.value || connecting.value) return;
        connecting.value = true;
        errorMessage.value = null; // Clear only WS/generic errors

        // Call the function imported from socket.js
        const socket = createWebSocketConnection();

        // Check if the function returned a socket (it returns null if no token)
        if (!socket) {
            // Do not overwrite existing fetch errors if any
             if (!errorMessage.value) {
                errorMessage.value = 'WebSocket connection failed: Authentication token missing or invalid.';
             } else {
                 console.warn('WebSocket connection failed (likely no token), keeping existing error message.');
             }
            connecting.value = false;
            return;
        }

        // Assign the successfully created socket
        socketInstance.value = socket;
        console.log("WebSocket object assigned, attaching listeners...");

        // --- Attach event listeners directly to the socket instance ---
        socketInstance.value.onopen = () => {
            isLive.value = true;
            connecting.value = false;
            console.log("Stats WS Connected (using socket.js logic).");
            // Optionally show success message for connection
            // showMessage('success', 'Live updates connected.');
        };

        socketInstance.value.onmessage = handleWebSocketMessage; // Re-use the existing handler

        socketInstance.value.onerror = (error) => {
            isLive.value = false;
            connecting.value = false;
            console.error("Stats WS Error:", error);
            // Avoid overwriting a more specific fetch error
            if (!errorMessage.value) {
                 errorMessage.value = "WebSocket connection error.";
            }
            // Clear the instance ref on error
            socketInstance.value = null;
        };

        socketInstance.value.onclose = (event) => {
            const wasLive = isLive.value; // Check status before resetting
            isLive.value = false;
            connecting.value = false;
            socketInstance.value = null; // Clear the instance ref

            // 1000: Normal closure; 1005: No status received (often normal); 1006: Abnormal closure
            if (wasLive && event.code !== 1000 && event.code !== 1005) {
                console.warn(`Stats WS Closed unexpectedly: Code=${event.code}, Reason=${event.reason}`);
                if (!errorMessage.value) { // Don't overwrite fetch errors
                     // Optionally show a warning to the user
                    // showMessage('warning', `Live connection closed unexpectedly (Code: ${event.code}).`);
                }
            } else {
                 console.log(`Stats WS Closed: Code=${event.code}`);
            }
        };
        // --------------------------------------------------------------
    }

    function disconnectWebSocket() {
        // ... (disconnect logic remains the same - closes socketInstance.value) ...
        if (socketInstance.value) {
            console.log("Disconnecting stats WebSocket...");
            socketInstance.value.onopen = null; // Remove listeners before closing
            socketInstance.value.onmessage = null;
            socketInstance.value.onerror = null;
            socketInstance.value.onclose = null;
             if (socketInstance.value.readyState === WebSocket.OPEN || socketInstance.value.readyState === WebSocket.CONNECTING) {
                socketInstance.value.close(1000, "User disconnected");
             }
        }
         isLive.value = false;
         connecting.value = false;
         socketInstance.value = null;
    }

    async function loadData() {
        // ... (loadData logic remains the same - calls fetchInitialStats) ...
        loading.value = true;
        errorMessage.value = null;
        disconnectWebSocket(); // Disconnect before fetching new data

        try {
            const result = await fetchInitialStats();
            if (result.success && result.data) {
                const stats = result.data;
                overallVotedCount.value = stats.overallVoted;
                overallNotVotedCount.value = stats.overallNotVoted;
                totalProcessedRecords.value = stats.totalProcessed; // = total_rows

                console.log("Initial Stats Loaded:", {
                    voted: stats.overallVoted,
                    notVoted: stats.overallNotVoted,
                    processed_rows: stats.totalProcessed
                });

                updateOverallCharts();
                // Attempt WS connection after successful data load
                startWebSocketConnection();

            } else {
                 errorMessage.value = result.error || "Failed to load initial statistics data.";
            }
        } catch (error) {
          console.error("Error during loadData:", error);
          errorMessage.value = `An critical error occurred during data load: ${error.message}`;
        } finally {
          loading.value = false;
        }
    }

    // --- Lifecycle Hooks ---
    onMounted(() => { loadData(); });
    onUnmounted(() => { disconnectWebSocket(); });

</script>

<style>
/* Global styles remain unchanged */
 :root {
      --stats-bg-color: #1a233a; --stats-card-bg: #2a3b52; --stats-text-light: #f0f0f0;
      --stats-text-heading: #ffffff; --stats-text-muted: #a0a8c4; --stats-accent: #FF3B30;
      --stats-accent-hover: #E02E24; --stats-success: #34C759; --stats-success-border: rgba(52, 199, 89, 0.7);
      --stats-danger: #FF3B30; --stats-danger-border: rgba(255, 59, 48, 0.7); --stats-grid-lines: rgba(255, 255, 255, 0.1);
      --stats-tooltip-bg: rgba(20, 30, 50, 0.85); --stats-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
      --input-bg-color: rgba(30, 34, 53, 0.7); --input-border-color: rgba(255, 255, 255, 0.1);
       --input-focus-border: rgba(255, 59, 48, 0.5); --input-focus-shadow: rgba(255, 59, 48, 0.15);
       --live-color: #34C759; --disconnected-color: #FF9500; --connecting-color: #FFCC00;
  }
   html, body, #__nuxt {
      height: 100%; margin: 0; padding: 0;
      background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
      color: var(--stats-text-light);
      font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
  }
</style>

<style scoped>

    /* Main Navigation */
.main-nav {
  display: flex;
  gap: 25px;
  margin-bottom: 30px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--table-border-color, #dee2e6);
  justify-content: center;
}
.main-nav a {
  text-decoration: none;
  color: var(--accent-color, #007bff);
  padding: 8px 0;
  font-weight: 500;
  transition: color 0.2s ease, border-color 0.2s ease;
  border-bottom: 3px solid transparent;
}
.main-nav a:hover {
  color: var(--accent-hover, #0056b3);
}
.main-nav a.router-link-active {
  font-weight: 700;
  color: var(--accent-hover, #0056b3);
  border-bottom-color: var(--accent-color, #007bff);
}
  /* Scoped styles remain unchanged */
  .wrapper.stats-page { max-width: 1400px; margin: 0 auto; padding: 30px 20px 60px 20px; box-sizing: border-box; position: relative; color: var(--stats-text-light); }
  .main-title { color: var(--stats-text-heading); text-align: center; margin-bottom: 25px; margin-top: 10px; font-size: 2.2em; font-weight: 600; }

  .live-status-indicator {
    text-align: center;
    margin-bottom: 30px;
    font-size: 0.95em;
    color: var(--stats-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 30px;
  }
  .status-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: grey;
    transition: background-color 0.3s ease;
  }
  .status-dot.live { background-color: var(--live-color); box-shadow: 0 0 8px var(--live-color); }
  .status-dot.disconnected { background-color: var(--disconnected-color); }
  .status-dot.connecting { background-color: var(--connecting-color); animation: pulse 1.5s infinite ease-in-out; }
  .connect-btn {
      background: none; border: 1px solid var(--stats-text-muted); color: var(--stats-text-muted);
      padding: 3px 10px; border-radius: 5px; font-size: 0.85em; cursor: pointer; transition: all 0.2s ease;
      margin-left: 5px;
  }
  .connect-btn:hover { background-color: rgba(255, 255, 255, 0.1); border-color: var(--stats-text-light); color: var(--stats-text-light); }
  .connect-btn.disconnect { border-color: var(--stats-accent); color: var(--stats-accent); }
  .connect-btn.disconnect:hover { background-color: rgba(255, 59, 48, 0.1); }

  .loading-spinner.small { width: 16px; height: 16px; border-width: 2px; }
  .loading-spinner.inline-spinner { vertical-align: middle; margin-left: 5px;}

  @keyframes pulse {
      0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; }
  }


  .loading-message { text-align: center; padding: 60px 20px; font-size: 1.3em; color: var(--stats-text-muted); display: flex; justify-content: center; align-items: center; gap: 15px; }
  .loading-spinner { width: 30px; height: 30px; border: 4px solid rgba(255, 255, 255, 0.2); border-radius: 50%; border-top-color: var(--stats-text-light); animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .message { padding: 15px 20px; margin: 30px 0; border-radius: 8px; display: flex; align-items: center; gap: 12px; font-size: 1em; border-left-width: 5px; border-left-style: solid; }
  .message svg { flex-shrink: 0; width: 18px; height: 18px;}
  .error-message { background-color: rgba(255, 59, 48, 0.1); color: var(--stats-danger); border-left-color: var(--stats-danger); }
  .error-text { text-align: center; color: var(--stats-text-muted); padding: 30px 10px; font-style: italic; font-size: 0.95em; flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 100px; }

  .retry-btn {
      background: none; border: 1px solid var(--stats-danger); color: var(--stats-danger);
      padding: 5px 12px; border-radius: 5px; font-size: 0.9em; cursor: pointer; transition: all 0.2s ease;
      margin-left: auto;
  }
   .retry-btn:hover { background-color: rgba(255, 59, 48, 0.1); }

  .stats-content { margin-top: 10px; }
  .chart-wrapper.full-width-chart { margin-bottom: 30px; }
  .charts-grid-bottom.single-item {
     display: flex;
     justify-content: center;
   }
  .charts-grid-bottom { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)); gap: 30px; justify-items: center; }


  .chart-wrapper {
      background-color: var(--stats-card-bg); padding: 25px; border-radius: 12px; box-shadow: var(--stats-shadow);
      min-height: 380px; display: flex; flex-direction: column;
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      width: 100%;
      max-width: 600px;
  }
  .full-width-chart { max-width: none; }

  .chart-wrapper:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25); }
  .chart-title { margin-bottom: 20px; text-align: center; color: var(--stats-text-heading); font-size: 1.2em; font-weight: 600; border-bottom: 1px solid var(--stats-grid-lines); padding-bottom: 15px; }
  .chart-canvas { flex-grow: 1; max-height: 280px; min-height: 180px; width: 100%; }
  .full-width-chart .chart-canvas { max-height: 320px; }
  .chart-summary { text-align: center; margin-top: 15px; padding-top: 10px; font-size: 0.85em; color: var(--stats-text-muted); border-top: 1px solid var(--stats-grid-lines); line-height: 1.4; }

  .copyright { margin-top: 50px; font-size: 0.8em; color: rgba(255, 255, 255, 0.5); text-align: center; }

</style>