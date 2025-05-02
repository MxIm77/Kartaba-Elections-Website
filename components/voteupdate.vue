<template>
    <div class="voted-container">
      <div class="voted-wrapper">
        <!-- Using Unicode checkmark -->
        <div class="voted-icon">
            🗳️
        </div>
      </div>
      <div class="votetext">
        <h5 class="voted-title">{{ title }}</h5>
        <p class="voted-message">{{ message }}</p>
      </div>
    </div>
  </template>
  
  <script setup>
  // Props definition remains the same
  const props = defineProps({
    title: {
      type: String,
      default: 'updated'
    },
    message: {
      type: String,
      required: true
    }
  });
  </script>
  
  <style scoped>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
  
  .voted-container {
    display: flex;
    align-items: center;
    background-color: #0d1117;
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    border-top: 6px solid #34C759; /* Green */
    font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    box-sizing: border-box;
  }
  
  .voted-wrapper {
    flex-shrink: 0;
    margin-right: 16px;
  }
  
  .voted-icon {
    background-color: #34C759; /* Green */
    color: white; /* Checkmark color */
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Adjusted styles for the character */
    font-size: 28px; /* Adjust size */
    font-weight: bold;
    line-height: 1; /* Ensure centered */
  }
  
  .votetext { /* Consider renaming to voted-text */
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    text-align: start;
  }
  
  .voted-title {
    color: #34C759; /* Green */
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 4px 0;
    line-height: 1.3;
  }
  
  .voted-message {
    color: #e1e4e8;
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
    line-height: 1.4;
    word-wrap: break-word;
  }
  </style>