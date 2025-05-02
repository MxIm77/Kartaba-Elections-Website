<template>
    <!-- Renamed container class -->
    <div class="arrival-container">
      <!-- Renamed wrapper class -->
      <div class="arrival-icon-wrapper">
        <!-- Renamed icon class, updated icon -->
        <div class="arrival-icon">
          🏁
        </div>
      </div>
      <!-- Renamed text container class -->
      <div class="arrival-text">
        <!-- Renamed title class -->
        <h5 class="arrival-title">{{ title }}</h5>
        <!-- Renamed message class -->
        <p class="arrival-message">{{ message }}</p>
      </div>
    </div>
  </template>
  
  <script setup>
  // Props definition
  const props = defineProps({
    title: {
      type: String,
      // CHANGED: Default title relevant to arrival
      default: 'Arrived at Destination'
    },
    message: {
      type: String,
      required: true
    }
  });
  </script>
  
  <style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
  
  /* Renamed selector */
  .arrival-container {
    display: flex;
    align-items: center;
    background-color: #0d1117; /* Kept dark background */
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    /* CHANGED: Green top border for success/arrival */
    border-top: 6px solid #34C759;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    box-sizing: border-box;
  }
  
  /* Renamed selector */
  .arrival-icon-wrapper {
    flex-shrink: 0;
    margin-right: 16px;
  }
  
  /* Renamed selector */
  .arrival-icon {
    /* CHANGED: Green background for success/arrival */
    background-color: #34C759;
    color: white; /* Emoji color is inherent */
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Font-size might need adjustment for flag emoji */
    font-size: 24px;
    line-height: 1;
  }
  
  /* Renamed selector */
  .arrival-text {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    text-align: start;
  }
  
  /* Renamed selector */
  .arrival-title {
    /* CHANGED: Green title color for success/arrival */
    color: #34C759;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 4px 0;
    line-height: 1.3;
  }
  
  /* Renamed selector */
  .arrival-message {
    color: #e1e4e8; /* Kept message color */
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
    line-height: 1.4;
    word-wrap: break-word;
  }
  </style>