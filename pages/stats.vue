<template>
    <div class="wrapper stats-page">
      <!-- Navigation Bar -->
      <nav class="main-nav">
        <NuxtLink to="/elections">Election Management</NuxtLink>
        <NuxtLink to="/transport">Transport Management</NuxtLink>
        <NuxtLink to="/privatetransport">Private Transport</NuxtLink>
        <NuxtLink to="/stats">Voting Stats</NuxtLink>
      </nav>
  
      <h1 class="main-title">Voting Statistics Dashboard</h1>
  
      <!-- Loading State -->
      <div v-if="loading" class="loading-message">
        <span class="loading-spinner"></span> Loading dashboard data...
      </div>
  
      <!-- Error State -->
      <div v-else-if="errorMessage" class="message error-message">
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
         <span>{{ errorMessage }}</span>
      </div>
  
      <!-- Charts Container -->
      <div v-else class="charts-container">
  
        <!-- Overall Chart (Doughnut) - Remains the same -->
        <div class="chart-wrapper overall-chart-wrapper" v-if="overallChartData">
          <h2 class="chart-title">Overall Voting Status</h2>
          <Doughnut
              id="overall-chart"
              :options="doughnutChartOptions"
              :data="overallChartData"
              class="chart-canvas"
          />
          <div class="chart-summary">
              Total Records: {{ totalRecordsCount }}
          </div>
        </div>
        <div class="chart-wrapper" v-else>
            <h2 class="chart-title">Overall Voting Status</h2>
            <p class="error-text">Could not display overall voting data.</p>
        </div>
  
        <!-- Sijil Selector & Focused Chart -->
        <div class="chart-wrapper sijil-focus-wrapper">
           <h2 class="chart-title">Votes for Specific Sijil (السجل)</h2>
  
           <!-- Sijil Selector Dropdown -->
           <div class="sijil-selector form-group">
             <label for="sijilSelect">Select Sijil:</label>
             <select id="sijilSelect" v-model="selectedSijil" @change="updateSijilChart">
               <option value="">-- Select a Sijil --</option>
               <option v-for="sijil in availableSijils" :key="sijil" :value="sijil">
                 {{ sijil }}
               </option>
             </select>
           </div>
  
           <!-- Focused Sijil Chart Area -->
           <div class="focused-chart-area">
              <!-- Show prompt if no selection -->
              <div v-if="!selectedSijil" class="prompt-message">
                  Please select a Sijil number from the dropdown above to see details.
              </div>
              <!-- Show chart if selection made and data exists -->
              <Bar v-else-if="sijilChartData && sijilChartData.datasets[0]?.data.length > 0"
                id="sijil-focus-chart"
                :options="singleSijilChartOptions"
                :data="sijilChartData"
                class="chart-canvas"
              />
              <!-- Show message if selection made but no data (e.g., Sijil exists but no one voted/not-voted?) -->
               <div v-else class="error-text">
                  No voting data found for Sijil {{ selectedSijil }}.
               </div>
           </div>
  
        </div>
  
      </div>
  
      <!-- Copyright footer -->
      <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed, watch } from 'vue'; // Added watch
  import { Bar, Doughnut } from 'vue-chartjs';
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    ArcElement
  } from 'chart.js';
  
  // *** Ensure path is correct ***
  import allData from '@/db.json';
  
  ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);
  
  // --- Constants ---
  const POSITIVE_VOTE_VALUE = 'Yes';
  const UNKNOWN_SIJIL_LABEL = "Unknown Sijil";
  const colorVoted = '#34C759';
  const colorNotVoted = '#FF3B30';
  const colorVotedBorder = 'rgba(52, 199, 89, 0.7)';
  const colorNotVotedBorder = 'rgba(255, 59, 48, 0.7)';
  const colorTextLight = 'rgba(230, 230, 230, 0.85)';
  const colorTextMuted = 'rgba(230, 230, 230, 0.7)';
  const colorGridLines = 'rgba(255, 255, 255, 0.1)';
  const colorTooltipBg = 'rgba(0, 0, 0, 0.8)';
  
  // --- State Variables ---
  const loading = ref(true);
  const errorMessage = ref(null);
  const records = ref([]);
  const selectedSijil = ref(''); // CHANGE: State for the dropdown selection, start with empty string
  
  // Refs for Chart Data
  const overallChartData = ref(null);
  const sijilChartData = ref(null); // This will now hold data for the *selected* Sijil
  
  // --- Chart Options ---
  
  const doughnutChartOptions = ref({ // Options for the Doughnut chart (remains same)
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: colorTextLight, padding: 20, font: { size: 13 } } },
      tooltip: { bodyColor: colorTextLight, backgroundColor: colorTooltipBg, padding: 10, boxPadding: 4 },
    },
    cutout: '60%',
  });
  
  // CHANGE: Options specifically for the single Sijil Bar Chart
  const singleSijilChartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
     indexAxis: 'y', // Optional: Make bars horizontal for easier reading of labels if needed
    plugins: {
      legend: { display: false }, // Hide legend, bars are self-explanatory
      tooltip: {
         bodyColor: colorTextLight,
         backgroundColor: colorTooltipBg,
         padding: 10,
         boxPadding: 4,
         // Customize tooltip title or labels if needed
         // callbacks: { label: (context) => `${context.label}: ${context.formattedValue}` }
      },
       title: { // Add a dynamic title within the chart
          display: true,
          text: () => `Voting Breakdown for Sijil: ${selectedSijil.value}`, // Dynamic title!
          color: colorTextLight,
          font: { size: 14 },
          padding: { top: 0, bottom: 10 }
      }
    },
    scales: {
      y: { // Was X axis for vertical bars
          // Now represents the categories ('Voted', 'Not Voted') if indexAxis: 'y'
          ticks: { color: colorTextMuted, font: { size: 13 } },
          grid: { color: colorGridLines, drawOnChartArea: false } // Hide grid lines for categories
      },
      x: { // Was Y axis for vertical bars
         // Now represents the count
          beginAtZero: true,
          ticks: { color: colorTextMuted, precision: 0 }, // Integer ticks
          grid: { color: colorGridLines }
      }
    }
  });
  
  
  // --- Data Processing (Computed Properties) ---
  
  const totalRecordsCount = computed(() => records.value?.length ?? 0);
  
  // CHANGE: Computed property to get unique, sorted Sijil numbers for the dropdown
  const availableSijils = computed(() => {
    if (!records.value || records.value.length === 0) {
      return [];
    }
    // Use Set for unique values, filter out null/undefined registers
    const uniqueSijils = new Set(
      records.value
        .map(r => r.register)
        .filter(s => s !== null && s !== undefined)
        .map(s => s.toString()) // Ensure strings for consistency if mixed types
    );
  
    // Convert Set to array and sort numerically
    return Array.from(uniqueSijils).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      // Basic numeric sort, handles potential non-numeric values gracefully
      if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
      }
      return a.localeCompare(b); // Fallback to string sort
    });
  });
  
  // Overall Voting Data (remains the same)
  const overallVotingStats = computed(() => {
      // ... (keep the existing overallVotingStats computed logic) ...
      if (!records.value || records.value.length === 0) return { voted: 0, notVoted: 0 };
      let voted = 0, notVoted = 0;
      records.value.forEach(record => {
          if (record.elected && record.elected.toString().toLowerCase() === POSITIVE_VOTE_VALUE.toLowerCase()) voted++;
          else notVoted++;
      });
      return { voted, notVoted };
  });
  
  
  // CHANGE: Function to calculate and set data for the *selected* Sijil
  // We make this a function triggered by selection change, not a computed property that runs automatically
  // Or alternatively, keep it computed but make it depend on selectedSijil
  function calculateSelectedSijilData() {
    if (!selectedSijil.value || !records.value || records.value.length === 0) {
      sijilChartData.value = null; // Clear chart data if no selection
      return;
    }
  
    let voted = 0;
    let notVoted = 0;
    const currentSijil = selectedSijil.value; // Get the selected value
  
    records.value.forEach(record => {
      // Filter for the selected Sijil
      if (record.register !== null && record.register !== undefined && record.register.toString() === currentSijil) {
        if (record.elected && record.elected.toString().toLowerCase() === POSITIVE_VOTE_VALUE.toLowerCase()) {
          voted++;
        } else {
          notVoted++;
        }
      }
    });
  
    // Prepare data structure for the simple bar chart (Voted vs Not Voted)
    sijilChartData.value = {
      labels: ['Voted (انتخب)', 'Did Not Vote / No Data (لم ينتخب)'], // Categories for the bars
      datasets: [{
        label: `Sijil ${currentSijil} Votes`, // Dataset label (might show in tooltip)
        data: [voted, notVoted],
        backgroundColor: [colorVoted, colorNotVoted],
        borderColor: [colorVotedBorder, colorNotVotedBorder],
        borderWidth: 1,
        // Optional: adjust bar thickness
        // categoryPercentage: 0.6, // Takes 60% of the available space for the category
         barPercentage: 0.7, // Takes 70% of the category space for the bar itself
      }]
    };
     console.log(`Updated chart data for Sijil ${currentSijil}:`, sijilChartData.value);
  }
  
  // CHANGE: Use a watcher to react to changes in `selectedSijil`
  watch(selectedSijil, (newValue, oldValue) => {
      console.log(`Sijil selection changed from ${oldValue} to ${newValue}`);
      calculateSelectedSijilData(); // Recalculate when selection changes
  });
  
  
  // --- Lifecycle Hook (onMounted) ---
  onMounted(() => {
    console.log("Stats page mounted. Initializing...");
    loading.value = true;
    errorMessage.value = null;
  
    try {
      if (allData && Array.isArray(allData.records)) {
          records.value = allData.records;
          console.log(`Loaded ${records.value.length} records.`);
  
          // Prepare Doughnut Chart Data (only needs overall stats)
          overallChartData.value = {
              labels: ['Voted', 'Did Not Vote / No Data'],
              datasets: [{
                  label: 'Voter Status',
                  backgroundColor: [colorVoted, colorNotVoted],
                  borderColor: [colorVotedBorder, colorNotVotedBorder],
                  borderWidth: 1.5,
                  hoverOffset: 8,
                  data: [overallVotingStats.value.voted, overallVotingStats.value.notVoted]
              }]
          };
          console.log("Overall chart data prepared:", overallChartData.value);
  
          // Don't calculate Sijil data initially, wait for user selection
          sijilChartData.value = null;
  
      } else {
           console.error("Data loading error: 'private_transport_records_simplified' array not found or invalid in db.json");
           errorMessage.value = "Failed to load data: Invalid data structure in db.json.";
           records.value = []; overallChartData.value = null; sijilChartData.value = null;
      }
    } catch (error) {
      console.error("Error during initialization:", error);
      errorMessage.value = `An unexpected error occurred: ${error.message}`;
      records.value = []; overallChartData.value = null; sijilChartData.value = null;
    } finally {
      loading.value = false;
      console.log("Initialization finished.");
    }
  });
  
  // Optional: Method handler for @change if needed, but watcher covers it
  // function updateSijilChart() {
  //     calculateSelectedSijilData();
  // }
  
  </script>
  
  <style scoped>
  /* --- Component Specific Styles --- */
  :root { /* Define color variables (ideally globally) */
      --stats-bg-color: #1a233a; --stats-card-bg: #2a3b52; --stats-text-light: #f0f0f0;
      --stats-text-heading: #ffffff; --stats-text-muted: #a0a8c4; --stats-accent: #FF3B30;
      --stats-accent-hover: #E02E24; --stats-success: #34C759; --stats-success-border: rgba(52, 199, 89, 0.7);
      --stats-danger: #FF3B30; --stats-danger-border: rgba(255, 59, 48, 0.7); --stats-grid-lines: rgba(255, 255, 255, 0.1);
      --stats-tooltip-bg: rgba(20, 30, 50, 0.85); --stats-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
      --input-bg-color: rgba(30, 34, 53, 0.7); --input-border-color: rgba(255, 255, 255, 0.1);
       --input-focus-border: rgba(255, 59, 48, 0.5); --input-focus-shadow: rgba(255, 59, 48, 0.15);
  }
  
  .wrapper.stats-page { max-width: 1300px; margin: 0 auto; padding: 30px 20px 60px 20px; box-sizing: border-box; position: relative; color: var(--stats-text-light); background-color: var(--stats-bg-color); }
  .main-title { color: var(--stats-text-heading); text-align: center; margin-bottom: 40px; margin-top: 0; font-size: 2.2em; font-weight: 600; }
  .main-nav { text-align: center; padding: 12px; background-color: var(--stats-card-bg); border-radius: 10px; margin-bottom: 40px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; box-shadow: var(--stats-shadow); }
  .main-nav a { color: var(--stats-text-light); text-decoration: none; padding: 10px 18px; border-radius: 8px; transition: background-color 0.2s ease, color 0.2s ease, transform 0.1s ease; font-weight: 500; white-space: nowrap; font-size: 0.95em; }
  .main-nav a:hover { background-color: var(--stats-accent-hover); color: white; transform: translateY(-1px); }
  .main-nav a.router-link-exact-active { background-color: var(--stats-accent); color: white; font-weight: 600; }
  .loading-message { text-align: center; padding: 60px 20px; font-size: 1.3em; color: var(--stats-text-muted); display: flex; justify-content: center; align-items: center; gap: 15px; }
  .loading-spinner { width: 30px; height: 30px; border: 4px solid rgba(255, 255, 255, 0.2); border-radius: 50%; border-top-color: var(--stats-text-light); animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .message { padding: 15px 20px; margin: 30px 0; border-radius: 8px; display: flex; align-items: center; gap: 12px; font-size: 1em; border-left-width: 5px; border-left-style: solid; }
  .message svg { flex-shrink: 0; width: 18px; height: 18px;}
  .error-message { background-color: rgba(255, 59, 48, 0.1); color: var(--stats-danger); border-left-color: var(--stats-danger); }
  .error-text { text-align: center; color: var(--stats-text-muted); padding: 30px 10px; font-style: italic; font-size: 0.95em; flex-grow: 1; display: flex; align-items: center; justify-content: center; }
  .charts-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 450px), 1fr)); gap: 35px; margin-top: 30px; }
  .chart-wrapper { background-color: var(--stats-card-bg); padding: 30px; border-radius: 12px; box-shadow: var(--stats-shadow); min-height: 450px; /* Increased min-height */ display: flex; flex-direction: column; transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; }
  .chart-wrapper:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25); }
  .chart-title { margin-bottom: 20px; text-align: center; color: var(--stats-text-heading); font-size: 1.35em; font-weight: 600; border-bottom: 1px solid var(--stats-grid-lines); padding-bottom: 15px; }
  .chart-canvas { flex-grow: 1; max-height: 300px; min-height: 200px; /* Ensure minimum canvas height */ width: 100%; /* Ensure canvas tries to fill width */ }
  .chart-summary { text-align: center; margin-top: 15px; padding-top: 10px; font-size: 0.9em; color: var(--stats-text-muted); border-top: 1px solid var(--stats-grid-lines); }
  
  /* Sijil Selector Specific Styles */
  .sijil-focus-wrapper { /* Specific wrapper for the selector + chart */
      /* No extra styles needed unless you want to differentiate it */
  }
  .sijil-selector {
      margin-bottom: 25px; /* Space below selector */
      display: flex;
      align-items: center;
      justify-content: center; /* Center selector */
      gap: 10px;
      flex-wrap: wrap; /* Allow label/select to wrap */
  }
  .sijil-selector label {
      font-size: 1em;
      font-weight: 500;
      color: var(--stats-text-muted);
      white-space: nowrap;
  }
  .sijil-selector select {
      padding: 10px 15px;
      border-radius: 8px;
      border: 1px solid var(--input-border-color);
      background-color: var(--input-bg-color);
      font-size: 1em;
      color: var(--stats-text-light);
      outline: none;
      transition: all 0.2s ease;
      cursor: pointer;
      min-width: 200px; /* Give dropdown some width */
      flex-grow: 1; /* Allow it to grow if needed */
      max-width: 300px; /* Prevent it from getting too wide */
  }
  .sijil-selector select:focus {
      border-color: var(--input-focus-border);
      box-shadow: 0 0 0 3px var(--input-focus-shadow);
      background-color: var(--stats-card-bg); /* Darken on focus */
  }
  
  .focused-chart-area {
      flex-grow: 1; /* Takes remaining space in the wrapper */
      display: flex;
      justify-content: center;
      align-items: center; /* Center content vertically */
      min-height: 300px; /* Ensure area has height */
  }
  .prompt-message {
      color: var(--stats-text-muted);
      font-style: italic;
      text-align: center;
      padding: 20px;
  }
  
  .copyright { margin-top: 50px; font-size: 0.8em; color: rgba(255, 255, 255, 0.5); text-align: center; }
  
  </style>