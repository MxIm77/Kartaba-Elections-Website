<template>
    <div class="wrapper stats-page">
      <nav class="main-nav">
        <NuxtLink to="/elections">Election Management</NuxtLink>
        <NuxtLink to="/transport">Transport Management</NuxtLink>
        <NuxtLink to="/privatetransport">Private Transport</NuxtLink>
        <NuxtLink to="/stats">Voting Stats</NuxtLink>
      </nav>

      <h1 class="main-title">Voting Statistics Dashboard</h1>

      <div v-if="loading" class="loading-message">
        <span class="loading-spinner"></span> Loading dashboard data...
      </div>

      <div v-else-if="errorMessage" class="message error-message">
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
         <span>{{ errorMessage }}</span>
      </div>

      <div v-else class="charts-container">

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

        <div class="chart-wrapper sijil-focus-wrapper">
           <h2 class="chart-title">Votes for Specific Sijil (السجل)</h2>

           <div class="sijil-selector form-group">
             <label for="sijilSelect">Select Sijil:</label>
             <select id="sijilSelect" v-model="selectedSijil" @change="updateSijilChart">
               <option value="">-- Select a Sijil --</option>
               <option v-for="sijil in availableSijils" :key="sijil" :value="sijil">
                 {{ sijil }}
               </option>
             </select>
           </div>

           <div class="focused-chart-area">
              <div v-if="!selectedSijil" class="prompt-message">
                  Please select a Sijil number from the dropdown above to see details.
              </div>
              <Bar v-else-if="sijilChartData && sijilChartData.datasets[0]?.data.length > 0"
                id="sijil-focus-chart"
                :options="singleSijilChartOptions"
                :data="sijilChartData"
                class="chart-canvas"
              />
               <div v-else class="error-text">
                  No voting data found for Sijil {{ selectedSijil }}.
               </div>
           </div>

        </div>

      </div>

      <p class="copyright">© {{ new Date().getFullYear() }} Kartaba 2040 All rights reserved.</p>
    </div>
  </template>

  <script setup>
  import { ref, onMounted, computed, watch } from 'vue';
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

  import allData from '@/db.json';

  ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

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

  const loading = ref(true);
  const errorMessage = ref(null);
  const records = ref([]);
  const selectedSijil = ref('');

  const overallChartData = ref(null);
  const sijilChartData = ref(null);

  const doughnutChartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: colorTextLight, padding: 20, font: { size: 13 } } },
      tooltip: { bodyColor: colorTextLight, backgroundColor: colorTooltipBg, padding: 10, boxPadding: 4 },
    },
    cutout: '60%',
  });

  const singleSijilChartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
     indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
         bodyColor: colorTextLight,
         backgroundColor: colorTooltipBg,
         padding: 10,
         boxPadding: 4,
      },
       title: {
          display: true,
          text: () => `Voting Breakdown for Sijil: ${selectedSijil.value}`,
          color: colorTextLight,
          font: { size: 14 },
          padding: { top: 0, bottom: 10 }
      }
    },
    scales: {
      y: {
          ticks: { color: colorTextMuted, font: { size: 13 } },
          grid: { color: colorGridLines, drawOnChartArea: false }
      },
      x: {
          beginAtZero: true,
          ticks: { color: colorTextMuted, precision: 0 },
          grid: { color: colorGridLines }
      }
    }
  });


  const totalRecordsCount = computed(() => records.value?.length ?? 0);

  const availableSijils = computed(() => {
    if (!records.value || records.value.length === 0) {
      return [];
    }
    const uniqueSijils = new Set(
      records.value
        .map(r => r.register)
        .filter(s => s !== null && s !== undefined)
        .map(s => s.toString())
    );

    return Array.from(uniqueSijils).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
      }
      return a.localeCompare(b);
    });
  });

  const overallVotingStats = computed(() => {
      if (!records.value || records.value.length === 0) return { voted: 0, notVoted: 0 };
      let voted = 0, notVoted = 0;
      records.value.forEach(record => {
          if (record.elected && record.elected.toString().toLowerCase() === POSITIVE_VOTE_VALUE.toLowerCase()) voted++;
          else notVoted++;
      });
      return { voted, notVoted };
  });


  function calculateSelectedSijilData() {
    if (!selectedSijil.value || !records.value || records.value.length === 0) {
      sijilChartData.value = null;
      return;
    }

    let voted = 0;
    let notVoted = 0;
    const currentSijil = selectedSijil.value;

    records.value.forEach(record => {
      if (record.register !== null && record.register !== undefined && record.register.toString() === currentSijil) {
        if (record.elected && record.elected.toString().toLowerCase() === POSITIVE_VOTE_VALUE.toLowerCase()) {
          voted++;
        } else {
          notVoted++;
        }
      }
    });

    sijilChartData.value = {
      labels: ['Voted (انتخب)', 'Did Not Vote / No Data (لم ينتخب)'],
      datasets: [{
        label: `Sijil ${currentSijil} Votes`,
        data: [voted, notVoted],
        backgroundColor: [colorVoted, colorNotVoted],
        borderColor: [colorVotedBorder, colorNotVotedBorder],
        borderWidth: 1,
         barPercentage: 0.7,
      }]
    };
     console.log(`Updated chart data for Sijil ${currentSijil}:`, sijilChartData.value);
  }

  watch(selectedSijil, (newValue, oldValue) => {
      console.log(`Sijil selection changed from ${oldValue} to ${newValue}`);
      calculateSelectedSijilData();
  });


  onMounted(() => {
    console.log("Stats page mounted. Initializing...");
    loading.value = true;
    errorMessage.value = null;

    try {
      if (allData && Array.isArray(allData.records)) {
          records.value = allData.records;
          console.log(`Loaded ${records.value.length} records.`);

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

          sijilChartData.value = null;

      } else {
           console.error("Data loading error: 'records' array not found or invalid in db.json");
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

  </script>

  <style scoped>
  :root {
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
  .chart-wrapper { background-color: var(--stats-card-bg); padding: 30px; border-radius: 12px; box-shadow: var(--stats-shadow); min-height: 450px; display: flex; flex-direction: column; transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; }
  .chart-wrapper:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25); }
  .chart-title { margin-bottom: 20px; text-align: center; color: var(--stats-text-heading); font-size: 1.35em; font-weight: 600; border-bottom: 1px solid var(--stats-grid-lines); padding-bottom: 15px; }
  .chart-canvas { flex-grow: 1; max-height: 300px; min-height: 200px; width: 100%; }
  .chart-summary { text-align: center; margin-top: 15px; padding-top: 10px; font-size: 0.9em; color: var(--stats-text-muted); border-top: 1px solid var(--stats-grid-lines); }

  .sijil-selector {
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
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
      min-width: 200px;
      flex-grow: 1;
      max-width: 300px;
  }
  .sijil-selector select:focus {
      border-color: var(--input-focus-border);
      box-shadow: 0 0 0 3px var(--input-focus-shadow);
      background-color: var(--stats-card-bg);
  }

  .focused-chart-area {
      flex-grow: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
  }
  .prompt-message {
      color: var(--stats-text-muted);
      font-style: italic;
      text-align: center;
      padding: 20px;
  }

  .copyright { margin-top: 50px; font-size: 0.8em; color: rgba(255, 255, 255, 0.5); text-align: center; }

  </style>