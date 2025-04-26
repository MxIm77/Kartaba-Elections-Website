<template>
    <transition name="fade">
      <div v-if="isVisible" class="popup-overlay" @click="closePopup">
        <div class="popup-content" @click.stop>
          <h2>affirmation</h2>
          <p>he has voted</p>
          <button @click="closePopup">Close</button>
        </div>
      </div>
    </transition>
  </template>
  
  <script setup>
  import { ref, defineExpose } from 'vue'
  
  const isVisible = ref(false)
  
  const openPopup = () => {
    isVisible.value = true
  }
  
  const closePopup = () => {
    isVisible.value = false
  }
  
  // Expose the openPopup method so it can be accessed externally
  defineExpose({
    openPopup
  })
  </script>
  
  <style scoped>
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .popup-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  button {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #45a049;
  }
  </style>
  