<template>
    <!-- Renamed container class -->
    <div class="logistics-container">
      <!-- Renamed wrapper class -->
      <div class="logistics-icon-wrapper">
        <!-- Renamed icon class, updated icon -->
        <div class="logistics-icon">
          🚕
        </div>
      </div>
      <!-- Renamed text container class -->
      <div class="logistics-text">
        <!-- Renamed title class -->
        <h5 class="logistics-title">{{ title }}</h5>
        <!-- Renamed message class -->
        <p class="logistics-message">{{ message }}</p>
      </div>
    </div>
  </template>
  
  <script setup>
  // Props definition
  const props = defineProps({
    title: {
      type: String,
      // CHANGED: Default title relevant to logistics/movement
      default: 'Move Initiated'
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
  .logistics-container {
    display: flex;
    align-items: center;
    background-color: #0d1117; /* Kept dark background */
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    /* CHANGED: Blue top border */
    border-top: 6px solid #007bff;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    box-sizing: border-box;
  }
  
  /* Renamed selector */
  .logistics-icon-wrapper {
    flex-shrink: 0;
    margin-right: 16px;
  }
  
  /* Renamed selector */
  .logistics-icon {
    /* CHANGED: Blue background */
    background-color: #007bff;
    color: white; /* Emoji color is inherent, but keeps bg consistent */
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Adjusted font-size might be needed depending on emoji rendering */
    font-size: 24px; /* Adjust size for taxi emoji if needed */
    line-height: 1; /* Ensure centered */
  }
  
  /* Renamed selector */
  .logistics-text {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    text-align: start;
  }
  
  /* Renamed selector */
  .logistics-title {
    /* CHANGED: Blue title color */
    color: #007bff;
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 4px 0;
    line-height: 1.3;
  }
  
  /* Renamed selector */
  .logistics-message {
    color: #e1e4e8; /* Kept message color */
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
    line-height: 1.4;
    word-wrap: break-word;
  }
  </style>