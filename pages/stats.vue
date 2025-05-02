<template>
  <div class="wrapper stats-page">
    <h1 class="main-title">Voting Statistics Dashboard</h1>

    <div v-if="loading" class="loading-message">
      <span class="loading-spinner"></span> Loading dashboard data...
    </div>

    <div v-else-if="errorMessage" class="message error-message">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
       <span>{{ errorMessage }}</span>
    </div>

    <div v-else class="stats-content">

      <!-- Overall Voted vs Not Voted Bar Chart (Relative to Potential Total) -->
      <div class="chart-wrapper full-width-chart" v-if="overallBarChartData">
        <h2 class="chart-title">Votes Cast vs Potential Electorate</h2>
        <Bar
            id="overall-bar-chart"
            :options="overallBarChartOptions"
            :data="overallBarChartData"
            class="chart-canvas"
         />
         <div class="chart-summary">
            Shows actual counts relative to a potential electorate of {{ TOTAL_POTENTIAL_VOTERS.toLocaleString() }}.
         </div>
      </div>
       <div class="chart-wrapper full-width-chart" v-else>
          <h2 class="chart-title">Votes Cast vs Potential Electorate</h2>
          <p class="error-text">Could not display overall vote counts.</p>
      </div>

      <!-- Grid for Bottom Two Charts -->
      <div class="charts-grid-bottom">

          <!-- Overall Voting Status Doughnut Chart -->
          <div class="chart-wrapper" v-if="overallDoughnutData">
            <h2 class="chart-title">Overall Voting Status (%)</h2>
            <Doughnut
                id="overall-doughnut-chart"
                :options="doughnutChartOptions"
                :data="overallDoughnutData"
                class="chart-canvas"
            />
            <div class="chart-summary">
                Based on {{ totalRecordsCount.toLocaleString() }} processed records.
            </div>
          </div>
          <div class="chart-wrapper" v-else>
              <h2 class="chart-title">Overall Voting Status (%)</h2>
              <p class="error-text">Could not display overall voting data.</p>
          </div>

          <!-- Votes for Specific Sijil Bar Chart -->
          <div class="chart-wrapper sijil-focus-wrapper">
             <h2 class="chart-title">Votes by Specific Sijil (السجل)</h2>
             <div class="sijil-selector form-group">
               <label for="sijilSelect">Select Sijil:</label>
               <select id="sijilSelect" v-model="selectedSijil" @change="calculateSelectedSijilData">
                 <option value="">-- Select a Sijil --</option>
                 <option v-for="sijil in availableSijils" :key="sijil" :value="sijil">
                   {{ sijil }}
                 </option>
               </select>
             </div>
             <div class="focused-chart-area">
                <div v-if="!selectedSijil" class="prompt-message">
                    Select a Sijil to see details.
                </div>
                <Bar v-else-if="sijilChartData && sijilChartData.datasets[0]?.data.some(d => d > 0)"
                  id="sijil-focus-chart"
                  :options="singleSijilChartOptions"
                  :data="sijilChartData"
                  class="chart-canvas"
                />
                 <div v-else class="error-text">
                    No voting data for Sijil {{ selectedSijil }}.
                 </div>
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
    Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
    ArcElement
  } from 'chart.js';
  import allData from '@/db.json';

  ChartJS.register(
    Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
    ArcElement
  );

  const POSITIVE_VOTE_VALUE = 'Yes';
  const TOTAL_POTENTIAL_VOTERS = 6000;

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
  const availableSijils = ref([]);
  const selectedSijil = ref('');

  const overallDoughnutData = ref(null);
  const overallBarChartData = ref(null);
  const sijilChartData = ref(null);

  const doughnutChartOptions = ref({
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
          legend: { position: 'bottom', labels: { color: colorTextLight, padding: 20, font: { size: 13 } } },
          tooltip: { bodyColor: colorTextLight, backgroundColor: colorTooltipBg, padding: 10, boxPadding: 4 },
      },
  });

  // Options for the top Overall Voted/Not Voted Bar Chart
  const overallBarChartOptions = ref({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          legend: { display: false },
          tooltip: {
              bodyColor: colorTextLight, backgroundColor: colorTooltipBg,
              padding: 10, boxPadding: 4,
              callbacks: { label: (context) => `Count: ${context.parsed.y}` }
          },
          title: { display: false }
      },
      scales: {
          y: {
              beginAtZero: true,
              max: TOTAL_POTENTIAL_VOTERS,
              title: { display: true, text: 'Number of Records', color: colorTextMuted },
              ticks: {
                  color: colorTextMuted,
                  precision: 0,
                  // Add stepSize to force ticks every 500 units
                  stepSize: 500
              },
              grid: { color: colorGridLines }
          },
          x: {
              ticks: { color: colorTextMuted, font: { size: 13 } },
              grid: { display: false }
          }
      },
  });

  // Horizontal bar chart for specific Sijil
  const singleSijilChartOptions = ref({
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: {
          legend: { display: false },
          tooltip: { bodyColor: colorTextLight, backgroundColor: colorTooltipBg, padding: 10, boxPadding: 4 },
          title: {
              display: true, text: () => `Voting Breakdown for Sijil: ${selectedSijil.value || 'N/A'}`,
              color: colorTextLight, font: { size: 14 }, padding: { top: 0, bottom: 10 }
          }
      },
      scales: {
          x: { beginAtZero: true, ticks: { color: colorTextMuted, precision: 0 }, grid: { color: colorGridLines } },
          y: { ticks: { color: colorTextMuted, font: { size: 13 } }, grid: { drawOnChartArea: false } }
      }
  });

  const totalRecordsCount = computed(() => records.value?.length ?? 0);

  const overallVotingStats = computed(() => {
      if (!records.value || records.value.length === 0) return { voted: 0, notVoted: 0 };
      let voted = 0, notVoted = 0;
      records.value.forEach(record => {
          if (record.elected?.toString().toLowerCase() === POSITIVE_VOTE_VALUE.toLowerCase()) voted++;
          else notVoted++;
      });
      return { voted, notVoted };
  });

  function calculateSelectedSijilData() {
      if (!selectedSijil.value || !records.value || records.value.length === 0) {
          sijilChartData.value = null; return;
      }
      let voted = 0, notVoted = 0;
      const currentSijil = selectedSijil.value.toString();

      records.value.forEach(record => {
          if (record.register !== null && record.register !== undefined && record.register.toString() === currentSijil) {
              if (record.elected?.toString().toLowerCase() === POSITIVE_VOTE_VALUE.toLowerCase()) voted++;
              else notVoted++;
          }
      });
      sijilChartData.value = {
          labels: ['Voted (انتخب)', 'Did Not Vote / No Data (لم ينتخب)'],
          datasets: [{
              label: `Sijil ${currentSijil} Votes`, data: [voted, notVoted],
              backgroundColor: [colorVoted, colorNotVoted],
              borderColor: [colorVotedBorder, colorNotVotedBorder],
              borderWidth: 1,
          }]
      };
  }

  watch(selectedSijil, () => { calculateSelectedSijilData(); });

  onMounted(() => {
    loading.value = true;
    errorMessage.value = null;
    try {
      if (allData && Array.isArray(allData.records)) {
          records.value = allData.records;

          const uniqueSijils = new Set(
              records.value
                .map(r => r.register)
                .filter(s => s !== null && s !== undefined && s !== '')
                .map(s => s.toString())
          );
          availableSijils.value = Array.from(uniqueSijils).sort((a, b) => {
               const numA = parseInt(a, 10); const numB = parseInt(b, 10);
               return (!isNaN(numA) && !isNaN(numB)) ? numA - numB : a.localeCompare(b);
          });

          const stats = overallVotingStats.value;

          overallDoughnutData.value = {
              labels: ['Voted', 'Did Not Vote / No Data'],
              datasets: [{
                  label: 'Voter Status',
                  backgroundColor: [colorVoted, colorNotVoted],
                  borderColor: [colorVotedBorder, colorNotVotedBorder],
                  borderWidth: 1.5, hoverOffset: 8,
                  data: [stats.voted, stats.notVoted]
              }]
          };

          overallBarChartData.value = {
              labels: ['Voted (انتخب)', 'Not Voted (لم ينتخب)'],
              datasets: [{
                  label: 'Total Count',
                  data: [stats.voted, stats.notVoted],
                  backgroundColor: [colorVoted, colorNotVoted],
                  borderColor: [colorVotedBorder, colorNotVotedBorder],
                  borderWidth: 1,
                  barPercentage: 0.6,
                  categoryPercentage: 0.7
              }]
          };

          sijilChartData.value = null;

      } else {
           errorMessage.value = "Failed to load data: Structure is invalid or 'records' array is missing.";
           records.value = []; overallDoughnutData.value = null; sijilChartData.value = null; overallBarChartData.value = null; availableSijils.value = [];
      }
    } catch (error) {
      console.error("Error during initialization:", error);
      errorMessage.value = `An unexpected error occurred: ${error.message}`;
      records.value = []; overallDoughnutData.value = null; sijilChartData.value = null; overallBarChartData.value = null; availableSijils.value = [];
    } finally {
      loading.value = false;
    }
  });

</script>

<style>
 :root {
    --stats-bg-color: #1a233a; --stats-card-bg: #2a3b52; --stats-text-light: #f0f0f0;
    --stats-text-heading: #ffffff; --stats-text-muted: #a0a8c4; --stats-accent: #FF3B30;
    --stats-accent-hover: #E02E24; --stats-success: #34C759; --stats-success-border: rgba(52, 199, 89, 0.7);
    --stats-danger: #FF3B30; --stats-danger-border: rgba(255, 59, 48, 0.7); --stats-grid-lines: rgba(255, 255, 255, 0.1);
    --stats-tooltip-bg: rgba(20, 30, 50, 0.85); --stats-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
    --input-bg-color: rgba(30, 34, 53, 0.7); --input-border-color: rgba(255, 255, 255, 0.1);
     --input-focus-border: rgba(255, 59, 48, 0.5); --input-focus-shadow: rgba(255, 59, 48, 0.15);
}
 html, body, #__nuxt {
    height: 100%; margin: 0; padding: 0;
    background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
    color: var(--stats-text-light);
    font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
}
</style>

<style scoped>
.wrapper.stats-page { max-width: 1600px; margin: 0 auto; padding: 40px 20px 60px 20px; box-sizing: border-box; position: relative; color: var(--stats-text-light); }
.main-title { color: var(--stats-text-heading); text-align: center; margin-bottom: 40px; margin-top: 20px; font-size: 2.2em; font-weight: 600; }

.loading-message { text-align: center; padding: 60px 20px; font-size: 1.3em; color: var(--stats-text-muted); display: flex; justify-content: center; align-items: center; gap: 15px; }
.loading-spinner { width: 30px; height: 30px; border: 4px solid rgba(255, 255, 255, 0.2); border-radius: 50%; border-top-color: var(--stats-text-light); animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.message { padding: 15px 20px; margin: 30px 0; border-radius: 8px; display: flex; align-items: center; gap: 12px; font-size: 1em; border-left-width: 5px; border-left-style: solid; }
.message svg { flex-shrink: 0; width: 18px; height: 18px;}
.error-message { background-color: rgba(255, 59, 48, 0.1); color: var(--stats-danger); border-left-color: var(--stats-danger); }
.error-text { text-align: center; color: var(--stats-text-muted); padding: 30px 10px; font-style: italic; font-size: 0.95em; flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 100px; }

.stats-content { margin-top: 30px; }
.chart-wrapper.full-width-chart { margin-bottom: 40px; }
.charts-grid-bottom { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 450px), 1fr)); gap: 30px; }

.chart-wrapper {
    background-color: var(--stats-card-bg); padding: 25px; border-radius: 12px; box-shadow: var(--stats-shadow);
    min-height: 420px; display: flex; flex-direction: column;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}
.chart-wrapper:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25); }
.chart-title { margin-bottom: 20px; text-align: center; color: var(--stats-text-heading); font-size: 1.25em; font-weight: 600; border-bottom: 1px solid var(--stats-grid-lines); padding-bottom: 15px; }
.chart-canvas { flex-grow: 1; max-height: 300px; min-height: 200px; width: 100%; }
.chart-summary { text-align: center; margin-top: 15px; padding-top: 10px; font-size: 0.85em; color: var(--stats-text-muted); border-top: 1px solid var(--stats-grid-lines); line-height: 1.4; }

 .full-width-chart .chart-canvas { max-height: 350px; }

.sijil-selector {
    margin-bottom: 25px; display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;
}
.sijil-selector label { font-size: 0.95em; font-weight: 500; color: var(--stats-text-muted); white-space: nowrap; }
.sijil-selector select {
    padding: 9px 14px; border-radius: 8px; border: 1px solid var(--input-border-color); background-color: var(--input-bg-color);
    font-size: 0.95em; color: var(--stats-text-light); outline: none; transition: all 0.2s ease; cursor: pointer;
    min-width: 180px; flex-grow: 1; max-width: 250px; height: 40px;
}
.sijil-selector select:focus { border-color: var(--input-focus-border); box-shadow: 0 0 0 3px var(--input-focus-shadow); background-color: var(--stats-card-bg); }

.focused-chart-area { flex-grow: 1; display: flex; justify-content: center; align-items: center; min-height: 280px; }
.prompt-message { color: var(--stats-text-muted); font-style: italic; text-align: center; padding: 20px; }

.copyright { margin-top: 50px; font-size: 0.8em; color: rgba(255, 255, 255, 0.5); text-align: center; }

</style>