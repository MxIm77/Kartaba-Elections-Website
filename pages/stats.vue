<template>
    <div class="wrapper stats-page">
      <h1 class="main-title">Voting Statistics Dashboard</h1>

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
          <!-- Add a retry button maybe? -->
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
              Based on {{ totalProcessedRecords.toLocaleString() }} total processed records.
           </div>
        </div>
         <div class="chart-wrapper full-width-chart" v-else>
            <h2 class="chart-title">Votes Cast vs Not Voted</h2>
            <p class="error-text">Could not display overall vote counts.</p>
        </div>

        <!-- Bottom Grid: Just the Doughnut Chart Now -->
        <div class="charts-grid-bottom single-item"> <!-- Modified class for potential styling -->

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
                  Percentage based on {{ totalProcessedRecords.toLocaleString() }} total processed records.
              </div>
            </div>
            <div class="chart-wrapper" v-else>
                <h2 class="chart-title">Overall Voting Status (%)</h2>
                <p class="error-text">Could not display overall voting percentages.</p>
            </div>

            <!-- Sijil Chart Removed -->

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
    // Import service and socket functions
    import { fetchInitialStats } from '~/javascript/stats-service.js'; // Updated service
    import { createStatsWebSocketConnection } from '~/javascript/stats-socket.js'; // Kept socket helper

    ChartJS.register(
      Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
      ArcElement
    );

    // --- Configuration & Constants ---
    // Chart Colors (can customize)
    const colorVoted = '#34C759'; // Green
    const colorNotVoted = '#FF3B30'; // Red
    const colorVotedBorder = 'rgba(52, 199, 89, 0.7)';
    const colorNotVotedBorder = 'rgba(255, 59, 48, 0.7)';
    const colorTextLight = 'rgba(230, 230, 230, 0.85)';
    const colorTextMuted = 'rgba(230, 230, 230, 0.7)';
    const colorGridLines = 'rgba(255, 255, 255, 0.1)';
    const colorTooltipBg = 'rgba(0, 0, 0, 0.8)';

    // --- State Refs ---
    const loading = ref(true);
    const errorMessage = ref(null);

    // Aggregated Data State from API/WebSocket
    const overallVotedCount = ref(0);
    const overallNotVotedCount = ref(0);
    const totalProcessedRecords = ref(0); // Calculated from total_rows * 25

    // Chart Data Refs
    const overallDoughnutData = ref(null);
    const overallBarChartData = ref(null);
    // Sijil chart data/options removed

    // WebSocket State
    const isLive = ref(false);
    const connecting = ref(false);
    const socketInstance = ref(null);

    // --- Chart Options ---
    const doughnutChartOptions = ref({
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
            legend: { position: 'bottom', labels: { color: colorTextLight, padding: 20, font: { size: 13 } } },
            tooltip: { bodyColor: colorTextLight, backgroundColor: colorTooltipBg, padding: 10, boxPadding: 4 },
        },
        animation: { duration: 500 }
    });

    const overallBarChartOptions = computed(() => ({ // Make options computed to react to totalProcessedRecords
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                bodyColor: colorTextLight, backgroundColor: colorTooltipBg,
                padding: 10, boxPadding: 4,
                callbacks: { label: (context) => `Count: ${context.parsed.y.toLocaleString()}` } // Format tooltip number
            },
            title: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                // Dynamically set max based on total processed records, add some buffer
                max: totalProcessedRecords.value > 0 ? Math.ceil(totalProcessedRecords.value * 1.1 / 100) * 100 : 100, // Add 10% buffer, round up
                title: { display: true, text: 'Number of Voters', color: colorTextMuted },
                ticks: {
                    color: colorTextMuted,
                    precision: 0,
                    // stepSize: 500 // Let chartjs decide stepSize based on max, or set dynamically
                },
                grid: { color: colorGridLines }
            },
            x: { ticks: { color: colorTextMuted, font: { size: 13 } }, grid: { display: false } }
        },
         animation: { duration: 500 }
    }));
    // Single Sijil Chart options removed

    // --- Computed Properties ---
    // totalRecordsCount now directly uses totalProcessedRecords
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

    // Update overall charts based on current aggregated counts
    function updateOverallCharts() {
        const voted = overallVotedCount.value;
        const notVoted = overallNotVotedCount.value;

        // Doughnut Chart Data
        overallDoughnutData.value = {
            labels: ['Voted', 'Did Not Vote'], // Simplified labels
            datasets: [{
                label: 'Voter Status',
                backgroundColor: [colorVoted, colorNotVoted],
                borderColor: [colorVotedBorder, colorNotVotedBorder],
                borderWidth: 1.5, hoverOffset: 8,
                data: [voted, notVoted]
            }]
        };

        // Overall Bar Chart Data
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
        console.log("Charts updated:", { voted, notVoted });
    }
    // updateSijilFocusChart removed

    // WebSocket Message Handler - Simplified
    function handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);

            // IMPORTANT: Only process 'vote' type messages relevant to stats
            // Assumes WS sends: { update_type: "vote", status: boolean, voter_id: ..., register: ... }
            if (data.update_type !== 'vote' || typeof data.status !== 'boolean') {
                // Ignore non-vote or messages without a boolean status
                return;
            }

            const hasVoted = data.status; // true if voted, false if vote removed/set to no

            console.log(`WS Update Received: Vote Status = ${hasVoted}`);

            // --- Update aggregated counts ---
            // This logic *approximates* the change by assuming the message reflects
            // a transition. If a 'true' vote comes, assume previous was 'false' & vice-versa.
            // This can drift if messages are lost or connection drops.
            // A backend sending deltas (+1 voted, -1 notVoted) is more robust.

            if (hasVoted) { // They just voted (or vote confirmed)
                 overallVotedCount.value++;
                 overallNotVotedCount.value--; // Assume they were previously 'not voted'
             } else { // Vote was removed or changed to 'no'
                 overallVotedCount.value--; // Assume they were previously 'voted'
                 overallNotVotedCount.value++;
             }

             // Clamp counts to be non-negative (important with approximation)
             overallVotedCount.value = Math.max(0, overallVotedCount.value);
             overallNotVotedCount.value = Math.max(0, overallNotVotedCount.value);

             // Ensure counts don't exceed total processed (another sanity check)
             const currentTotal = overallVotedCount.value + overallNotVotedCount.value;
             if (currentTotal > totalProcessedRecords.value) {
                 console.warn(`WS update resulted in total count (${currentTotal}) exceeding processed records (${totalProcessedRecords.value}). Adjusting 'notVoted'.`);
                 // Reduce 'notVoted' first as it's often the larger group
                 overallNotVotedCount.value = totalProcessedRecords.value - overallVotedCount.value;
                 overallNotVotedCount.value = Math.max(0, overallNotVotedCount.value); // Ensure not negative after adjustment
             }


            // --- Trigger chart updates ---
            // Use nextTick to ensure DOM updates after state changes
             nextTick(() => {
                 updateOverallCharts();
             });

        } catch (err) {
            console.error('Error processing WebSocket message:', err, event.data);
        }
    }

    // WebSocket Connection Management Functions (start, disconnect) - No change needed
    function startWebSocketConnection() {
        if (isLive.value || connecting.value) return;
        connecting.value = true;
        errorMessage.value = null; // Clear previous errors

        socketInstance.value = createStatsWebSocketConnection(
            handleWebSocketMessage, // onMessage
            () => { // onOpen
                isLive.value = true;
                connecting.value = false;
                 console.log("Stats WS Connected.");
            },
            (error) => { // onError
                isLive.value = false;
                connecting.value = false;
                // Keep the main error message, maybe add WS specific note?
                // errorMessage.value = "WebSocket connection error. Real-time updates unavailable.";
                 console.error("Stats WS Error Callback:", error);
                 socketInstance.value = null;
            },
            (event) => { // onClose
                isLive.value = false;
                connecting.value = false;
                 socketInstance.value = null;
                if (event.code !== 1000) { // Don't show error for normal close (code 1000)
                    console.warn("Stats WS Close Callback (unexpected):", event);
                    // Maybe show a less intrusive warning than overwriting a fetch error
                    // e.g., a small banner or just log it
                } else {
                     console.log("Stats WS Closed normally.");
                }
            }
        );

         if (!socketInstance.value) { // Handle immediate creation failure
             connecting.value = false;
             // Don't overwrite a potential fetch error
             if (!errorMessage.value) {
                 errorMessage.value = "Failed to initialize WebSocket connection.";
             }
         }
    }

    function disconnectWebSocket() {
        if (socketInstance.value) {
            console.log("Disconnecting stats WebSocket...");
            socketInstance.value.onclose = null; // Prevent close handler loop
            socketInstance.value.close(1000, "User disconnected");
        }
         isLive.value = false;
         connecting.value = false;
         socketInstance.value = null;
    }

    // Function to load initial data (can be called on mount and retry)
    async function loadData() {
      loading.value = true;
      errorMessage.value = null;
      disconnectWebSocket(); // Ensure WS is disconnected before fetching

      try {
          const result = await fetchInitialStats(); // Call the service function
          if (result.success && result.data) {
              const stats = result.data;
              overallVotedCount.value = stats.overallVoted;
              overallNotVotedCount.value = stats.overallNotVoted;
              totalProcessedRecords.value = stats.totalProcessed;

              console.log("Initial Stats Loaded:", stats);

              // Generate initial charts
              updateOverallCharts();

              // Attempt to connect WebSocket automatically after successful load
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
    onMounted(() => {
      loadData(); // Initial data load on component mount
    });

    onUnmounted(() => {
      disconnectWebSocket(); // Clean up WebSocket connection when component is destroyed
    });

    // --- Watchers ---
    // No watchers needed for Sijil anymore

</script>

<style>
/* Global styles from original - keep as is */
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
  /* Scoped styles from original - keep most, remove Sijil specific */
  .wrapper.stats-page { max-width: 1400px; /* Slightly narrower if only 2 charts */ margin: 0 auto; padding: 30px 20px 60px 20px; box-sizing: border-box; position: relative; color: var(--stats-text-light); }
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
    min-height: 30px; /* Ensure space even without buttons */
  }
  .status-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: grey; /* Default */
    transition: background-color 0.3s ease;
  }
  .status-dot.live { background-color: var(--live-color); box-shadow: 0 0 8px var(--live-color); }
  .status-dot.disconnected { background-color: var(--disconnected-color); }
  .status-dot.connecting { background-color: var(--connecting-color); animation: pulse 1.5s infinite ease-in-out; }
  .connect-btn {
      background: none; border: 1px solid var(--stats-text-muted); color: var(--stats-text-muted);
      padding: 3px 10px; border-radius: 5px; font-size: 0.85em; cursor: pointer; transition: all 0.2s ease;
      margin-left: 5px; /* Space between text and button */
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
      margin-left: auto; /* Push retry button to the right */
  }
   .retry-btn:hover { background-color: rgba(255, 59, 48, 0.1); }

  .stats-content { margin-top: 10px; }
  .chart-wrapper.full-width-chart { margin-bottom: 30px; }
  /* Adjust grid if only one item expected */
  .charts-grid-bottom.single-item {
     display: flex; /* Use flexbox */
     justify-content: center; /* Center the single item */
     /* Or keep grid and adjust columns: grid-template-columns: minmax(min(100%, 400px), 600px); justify-content: center; */
   }
  .charts-grid-bottom { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)); gap: 30px; justify-items: center; /* Center items within grid cells */}


  .chart-wrapper {
      background-color: var(--stats-card-bg); padding: 25px; border-radius: 12px; box-shadow: var(--stats-shadow);
      min-height: 380px; /* Can be slightly shorter */ display: flex; flex-direction: column;
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      width: 100%; /* Ensure wrapper takes space in grid/flex */
      max-width: 600px; /* Max width for doughnut chart perhaps */
  }
  .full-width-chart { max-width: none; } /* Allow bar chart to be wider */

  .chart-wrapper:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25); }
  .chart-title { margin-bottom: 20px; text-align: center; color: var(--stats-text-heading); font-size: 1.2em; font-weight: 600; border-bottom: 1px solid var(--stats-grid-lines); padding-bottom: 15px; }
  .chart-canvas { flex-grow: 1; max-height: 280px; min-height: 180px; width: 100%; }
  .full-width-chart .chart-canvas { max-height: 320px; } /* Allow bar chart to be taller */
  .chart-summary { text-align: center; margin-top: 15px; padding-top: 10px; font-size: 0.85em; color: var(--stats-text-muted); border-top: 1px solid var(--stats-grid-lines); line-height: 1.4; }

  /* Sijil selector and focused area styles removed */

  .copyright { margin-top: 50px; font-size: 0.8em; color: rgba(255, 255, 255, 0.5); text-align: center; }

</style>