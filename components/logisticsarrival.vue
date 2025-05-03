<template>
    <!-- Renamed container class -->
    <div class="arrival-container">
      <!-- Renamed wrapper class -->
      <div class="arrival-icon-wrapper">
        <!-- Renamed icon class, updated icon -->
        <div class="arrival-icon">
          <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M28 12.1667C28 11.7025 27.8156 11.2574 27.4874 10.9292C27.1592 10.601 26.7141 10.4167 26.25 10.4167H24.5373L23.6285 7.34833C23.2606 6.15466 22.5499 5.09551 21.5846 4.30268C20.6194 3.50985 19.4424 3.01835 18.2 2.88933C17.7957 2.16624 17.2062 1.56379 16.4921 1.14388C15.778 0.723972 14.9649 0.501735 14.1365 0.5H13.8635C13.0354 0.500421 12.2223 0.721598 11.5081 1.14075C10.7938 1.5599 10.2042 2.16187 9.8 2.88467C8.54247 3.00398 7.34869 3.494 6.37 4.29261C5.39131 5.09123 4.67179 6.16246 4.30267 7.3705L3.402 10.4167H1.75C1.28587 10.4167 0.840752 10.601 0.512563 10.9292C0.184374 11.2574 0 11.7025 0 12.1667C0 12.6308 0.184374 13.0759 0.512563 13.4041C0.840752 13.7323 1.28587 13.9167 1.75 13.9167H2.366L1.8095 15.816C1.11614 16.4128 0.592327 17.1818 0.29086 18.0455C-0.0106072 18.9092 -0.0790813 19.8372 0.0923385 20.7358C0.263758 21.6344 0.669015 22.472 1.26727 23.1641C1.86552 23.8562 2.63564 24.3784 3.5 24.678V26.1667C3.5 26.7855 3.74583 27.379 4.18342 27.8166C4.621 28.2542 5.2145 28.5 5.83333 28.5C6.45217 28.5 7.04566 28.2542 7.48325 27.8166C7.92083 27.379 8.16667 26.7855 8.16667 26.1667V25H19.8333V26.1667C19.8333 26.7855 20.0792 27.379 20.5168 27.8166C20.9543 28.2542 21.5478 28.5 22.1667 28.5C22.7855 28.5 23.379 28.2542 23.8166 27.8166C24.2542 27.379 24.5 26.7855 24.5 26.1667V24.678C25.372 24.3759 26.148 23.8472 26.7484 23.1463C27.3487 22.4454 27.7518 21.5974 27.9164 20.6893C28.081 19.7812 28.0011 18.8457 27.6849 17.9786C27.3687 17.1116 26.8275 16.3443 26.117 15.7553L25.5733 13.9167H26.25C26.7141 13.9167 27.1592 13.7323 27.4874 13.4041C27.8156 13.0759 28 12.6308 28 12.1667ZM7.65333 8.38433C7.8359 7.78884 8.20525 7.26791 8.70676 6.89855C9.20827 6.52919 9.81532 6.33102 10.4382 6.33333H17.5C18.1194 6.32997 18.7236 6.52532 19.2238 6.8907C19.724 7.25608 20.0938 7.77223 20.279 8.36333L22.0955 14.5H5.84267L7.65333 8.38433ZM22.75 21.5H5.25C4.78587 21.5 4.34075 21.3156 4.01256 20.9874C3.68437 20.6592 3.5 20.2141 3.5 19.75C3.5 19.2859 3.68437 18.8408 4.01256 18.5126C4.34075 18.1844 4.78587 18 5.25 18H5.83333V18.5833C5.83333 19.0475 6.01771 19.4926 6.3459 19.8208C6.67409 20.149 7.1192 20.3333 7.58333 20.3333C8.04746 20.3333 8.49258 20.149 8.82077 19.8208C9.14896 19.4926 9.33333 19.0475 9.33333 18.5833V18H18.6667V18.5833C18.6667 19.0475 18.851 19.4926 19.1792 19.8208C19.5074 20.149 19.9525 20.3333 20.4167 20.3333C20.8808 20.3333 21.3259 20.149 21.6541 19.8208C21.9823 19.4926 22.1667 19.0475 22.1667 18.5833V18H22.75C23.2141 18 23.6592 18.1844 23.9874 18.5126C24.3156 18.8408 24.5 19.2859 24.5 19.75C24.5 20.2141 24.3156 20.6592 23.9874 20.9874C23.6592 21.3156 23.2141 21.5 22.75 21.5Z" fill="#00CAEE"/>
</svg>
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