<template>
    <div class="warning-container">
      <div class="warning-icon-wrapper">
        <div class="warning-icon">
            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 28.5C21.732 28.5 28 22.232 28 14.5C28 6.76801 21.732 0.5 14 0.5C6.26801 0.5 0 6.76801 0 14.5C0.00836719 22.2285 6.27145 28.4916 14 28.5ZM12.8334 7.5C12.8334 6.85567 13.3557 6.33335 14 6.33335C14.6443 6.33335 15.1666 6.85567 15.1666 7.5V16.8334C15.1666 17.4777 14.6443 18 14 18C13.3557 18 12.8334 17.4777 12.8334 16.8334V7.5ZM14 21.5C14.6443 21.5 15.1666 22.0223 15.1666 22.6666C15.1666 23.311 14.6443 23.8333 14 23.8333C13.3557 23.8333 12.8334 23.311 12.8334 22.6666C12.8334 22.0223 13.3557 21.5 14 21.5Z" fill="#FE3738"/>
</svg>
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
    border-top: 6px solid #FE3738; /* Red top border */
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
    color: #FE3738; /* Red color for title */
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