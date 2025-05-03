<template>
    <div class="voted-container">
      <div class="voted-wrapper">
        <!-- Using Unicode checkmark -->
        <div class="voted-icon">
          <svg width="34" height="29" viewBox="0 0 34 29" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.25 0.5H12.75C9.61917 0.5 7.08333 3.006 7.08333 6.1V20.1C7.08333 20.87 7.72083 21.5 8.5 21.5H25.5C26.2792 21.5 26.9167 20.87 26.9167 20.1V6.1C26.9167 3.006 24.3808 0.5 21.25 0.5ZM22.2558 11.084L18.4167 14.878C17.7225 15.564 16.8158 15.9 15.9092 15.9C15.0025 15.9 14.0958 15.564 13.4017 14.878L11.7442 13.24C11.1917 12.694 11.1917 11.812 11.7442 11.266C12.2967 10.72 13.1892 10.72 13.7417 11.266L15.3992 12.904C15.6825 13.184 16.1217 13.17 16.405 12.904L20.2442 9.11C20.7967 8.564 21.6892 8.564 22.2417 9.11C22.7942 9.656 22.7942 10.538 22.2417 11.084H22.2558ZM34 20.1V22.9C34 25.994 31.4642 28.5 28.3333 28.5H5.66667C2.53583 28.5 0 25.994 0 22.9V20.1C0 17.496 1.81333 15.326 4.25 14.696V20.1C4.25 22.41 6.1625 24.3 8.5 24.3H25.5C27.8375 24.3 29.75 22.41 29.75 20.1V14.696C32.1867 15.326 34 17.496 34 20.1Z" fill="#45AB4A"/>
</svg>
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
      default: 'Voter Update'
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
    border-top: 6px solid #45AB4A; /* Green */
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
    color: #45AB4A; /* Green */
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