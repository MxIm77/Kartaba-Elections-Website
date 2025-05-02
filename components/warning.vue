<template>
    <div class="warning-container">
      <div class="warning-icon-wrapper">
        <div class="warning-icon">
          !
        </div>
      </div>
      <div class="warning-text">
        <!-- Use the title prop, provide a default -->
        <h5 class="warning-title">{{ title }}</h5>
        <!-- Use the message prop -->
        <p class="warning-message">{{ message }}</p>
      </div>
    </div>
  </template>
  
  <script setup>
  // Define props to accept title and message
  const props = defineProps({
    title: {
      type: String,
      default: 'Warning' // Default title if none is provided via props
    },
    message: {
      type: String,
      required: true // A message must always be provided
    }
  });
  </script>
  
  <style scoped>
  /* Using a common sans-serif font stack - adjust if needed */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap'); /* Example font */
  
  .warning-container {
    display: flex;
    align-items: center; /* Vertically center icon and text */
    background-color: #0d1117; /* Dark background - feel free to adjust */
    color: white;
    padding: 16px 20px;
    border-radius: 12px; /* Rounded corners */
    border-top: 6px solid #e5484d; /* Red top border */
    font-family: 'Inter', sans-serif; /* Example font, adjust to your project */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); /* Subtle shadow */
    max-width: 600px; /* You can adjust this or remove it */
    box-sizing: border-box;
    /* margin: 15px auto; */ /* Example margin - apply where you use the component instead */
  }
  
  .warning-icon-wrapper {
    flex-shrink: 0; /* Prevent icon from shrinking */
    margin-right: 16px; /* Space between icon and text */
  }
  
  .warning-icon {
    background-color: #e5484d; /* Red background for icon */
    color: white;
    width: 40px; /* Icon size */
    height: 40px;
    border-radius: 50%; /* Make it circular */
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px; /* Exclamation mark size */
    font-weight: bold;
    line-height: 1; /* Ensure text is centered vertically */
  }
  
  .warning-text {
    display: flex;
    flex-direction: column; /* Stack title and message */
    flex-grow: 1; /* Allow text area to take remaining space */
    text-align: start; /* Explicitly set text alignment */
  }
  
  .warning-title {
    color: #e5484d; /* Red color for title */
    font-size: 1.1rem; /* Title font size */
    font-weight: 700; /* Bold title */
    margin: 0 0 4px 0; /* Spacing below title */
    line-height: 1.3;
  }
  
  .warning-message {
    color: #e1e4e8; /* Slightly off-white for message */
    font-size: 1rem; /* Message font size */
    font-weight: 500; /* Slightly bolder message text */
    margin: 0; /* Remove default paragraph margin */
    line-height: 1.4;
    word-wrap: break-word; /* Ensure long messages wrap */
  }
  </style>