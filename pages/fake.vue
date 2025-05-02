<template>
  <div class="fake-page-container">
    <h1>Fake Test Page (Now for Vote Update)</h1>
    <p>Click the button below to show the vote update component.</p>

    <!-- Keep old function name for now, but triggers the same ref -->
    <button @click="showTheWarning" class="trigger-button">
      Trigger Vote Update Popup
    </button>

    <transition name="fade">
      <!-- *** Use the <voted> tag instead of <Warning> *** -->
      <voted
        v-if="isWarningVisible"  
        :title="warningPopupTitle"  
        :message="warningPopupMessage"
        style="margin-top: 20px;"
      />
    </transition>

    <!-- Keep old function name for now -->
    <button
        v-if="isWarningVisible"
        @click="hideTheWarning"
        class="hide-button"
        style="margin-top: 10px;"
     >
        Hide Popup
    </button>

  </div>
</template>

<script setup>
import { ref } from 'vue';

// Correctly imported as 'voted'
import voted from '~/components/voteupdate.vue';

// --- STATE (Using old names, but component will display 'updated' title by default) ---
const isWarningVisible = ref(false); // Controls visibility of <voted>

const warningPopupTitle = ref("Vote Status"); // New default title for context
const warningPopupMessage = ref("The vote status was successfully updated!"); // New message

// --- METHODS (Using old names) ---
function showTheWarning() {
  isWarningVisible.value = true; // This now shows the <voted> component
}

function hideTheWarning() {
    isWarningVisible.value = false; // This now hides the <voted> component
}
</script>

<style scoped>
/* Styles remain the same */
.fake-page-container { max-width: 800px; margin: 40px auto; padding: 30px; text-align: center; background-color: #f4f4f9; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); color: #333; font-family: sans-serif; }
h1 { color: #1a233a; margin-bottom: 15px; }
p { margin-bottom: 25px; color: #555; }
.trigger-button, .hide-button { padding: 10px 20px; font-size: 16px; cursor: pointer; border: none; border-radius: 5px; transition: background-color 0.2s ease; }
.trigger-button { background-color: #28a745; /* Changed to green */ color: white; }
.trigger-button:hover { background-color: #218838; }
.hide-button { background-color: #6c757d; color: white; }
.hide-button:hover { background-color: #5a6268; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>