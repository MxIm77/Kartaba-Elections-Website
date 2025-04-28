<template>
  <div class="wrapper">
    <!-- Logo text outside the card -->
    <div class="logo-text">مين عم يصوّت؟</div>

    <!-- Personalized greeting for the logged-in user -->
    <div v-if="username" class="greeting-text">
      مرحباً "{{ username }}"
    </div>

    <div class="vote-card">
      <form @submit.prevent="sendToSheet" class="vote-form">
        <div class="input-group">
          <label for="voterId" class="sr-only">Voter ID</label> <!-- Accessibility label -->
          <input
            id="voterId"
            v-model.trim="id"
            type="number"
            placeholder="Sa2it el ID tab3ulo"
            class="vote-input" 
            :disabled="loading"
            required
            aria-describedby="messageArea"
          />
        </div>
        <button
          type="submit"
          class="vote-btn" 
          :disabled="loading"
        >
          <span v-if="loading" class="spinner"></span>
          <span>{{ loading ? 'Sending...' : 'Yalla' }}</span>
        </button>
      </form>

      <transition name="fade">
        <div
          v-if="message"
          :class="['message-area', messageType]"
          role="alert"
          id="messageArea"
        >
          <!-- Optional: Add icon like in login -->
          <!-- <svg>...</svg> -->
          <p class="message-text">{{ message }}</p>
        </div>
      </transition>
    </div>
     <!-- Optional: Add copyright like login page -->
     <p class="copyright">© 2025 Meshwar. All rights reserved.</p> <!-- Uncommented for consistency -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// --- State ---
const id = ref('')
const loading = ref(false)
const message = ref('')
const messageType = ref('') // 'success' or 'error'
const username = ref('')
const router = useRouter()
let messageTimeout = null; // Store timeout ID

// Get the username from localStorage on component mount
onMounted(() => {
  const storedUser = localStorage.getItem('currentUser')
  if (storedUser) {
    username.value = storedUser
  } else {
    console.warn('No logged in user found, redirecting to login.')
    router.push('/') // Adjust route if your login is not at '/'
  }
})

// --- Function to Clear Message ---
function clearMessage() {
    if (messageTimeout) {
        clearTimeout(messageTimeout); // Clear existing timeout if any
    }
    message.value = '';
    messageType.value = '';
}

// --- Function to Set Message with Autoclear ---
function setMessage(newMessage, type = 'error', duration = 4000) {
    clearMessage(); // Clear previous message and timeout
    message.value = newMessage;
    messageType.value = type;
    messageTimeout = setTimeout(() => {
        clearMessage();
    }, duration);
}


// --- Function to Send Data ---
async function sendToSheet() {
  if (!id.value) {
     setMessage('Sa2it el ID tab3ulo'); // Use helper function
    return
  }
  if (loading.value) return;

  loading.value = true
  clearMessage(); // Clear any previous messages immediately

  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id.value, username: username.value })
    })
    const result = await res.json()
    console.log('API Response:', result)

    if (!res.ok || !result.success) {
        setMessage(`Error: ${result.message || `Request failed (${res.status})`}`); // Use helper
    } else {
        setMessage('Sayavneha'); // Use helper
        id.value = '' // Clear input on success
    }
  } catch (err) {
    console.error('Fetch Error:', err)
    setMessage('Network Error'); // Use helper
  } finally {
    loading.value = false
    // Autoclear is handled by the setMessage function now
  }
}
</script>

<style scoped>
/* --- Import Variables and Base Styles from Login Page --- */
.wrapper {
  /* Copy variables directly from login page's .wrapper */
  --primary-bg-color: #1a233a;
  --card-bg-color: #2a3b52;
  --text-color-light: #e0e0e0;
  --text-color-lighter: #f5f5f5;
  --text-color-muted: #9DA3B4;
  --accent-color: #FF3B30;
  --accent-hover: #E02E24;
  --input-bg-color: rgba(30, 34, 53, 0.7);
  --input-border-color: rgba(255, 255, 255, 0.1);
  --input-focus-border: rgba(255, 59, 48, 0.5);
  --input-focus-shadow: rgba(255, 59, 48, 0.15);
  --error-color: #FF453A;
  --error-bg: rgba(255, 69, 58, 0.1);
  /* Add success colors */
  --success-color: #34C759; /* iOS Green */
  --success-bg: rgba(52, 199, 89, 0.1);

  /* Apply base layout and font styles */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1A1E2E 0%, #1D2135 100%);
  font-family: 'Cairo', 'Tajawal', 'SF Pro Display', 'Inter', system-ui, sans-serif;
  padding: 20px;
  box-sizing: border-box;
  color: var(--text-color-light);
}

/* Logo text styling - Use style from login */
.logo-text {
  color: var(--accent-color);
  font-size: 52px; /* Slightly larger than login */
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 20px; /* Reduced margin */
  text-align: center;
}

/* Greeting text styling */
.greeting-text {
  font-size: 22px; /* Adjusted size */
  font-weight: 500; /* Medium weight */
  color: var(--text-color-lighter);
  margin-bottom: 30px;
  text-align: center;
  opacity: 0.95;
  animation: fadeIn 0.5s ease-in-out;
  direction: rtl; /* For proper Arabic text display */
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 0.95; transform: translateY(0); }
}

/* Vote card - Use style from login card */
.vote-card {
  width: 100%;
  max-width: 400px; /* Adjusted max-width */
  padding: 32px;
  display: flex;
  flex-direction: column;
  background: var(--card-bg-color);
  border-radius: 14px;
  box-shadow: 0 15px 25px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.1);
  color: var(--text-color-light);
}

/* Form styling */
.vote-form {
  display: flex;
  flex-direction: column;
  gap: 20px; /* Consistent gap */
  width: 100%; /* Ensure form takes full width of card */
}

/* Input Group for structure (optional but good practice) */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px; /* Matches login */
  width: 100%;
}

/* Sr-only class for hidden labels (Accessibility) */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}


/* Vote Input - Use style from login input */
.vote-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 15px; /* Adjusted padding (no icon) */
  border-radius: 8px;
  border: 1px solid var(--input-border-color);
  background-color: var(--input-bg-color);
  font-size: 16px; /* Kept slightly larger for ID input */
  color: var(--text-color-light);
  outline: none;
  transition: all 0.2s ease;
  text-align: left; /* Ensure LTR input for numbers */
  direction: ltr;
}

.vote-input::placeholder {
  color: var(--text-color-muted);
  opacity: 0.7;
}

.vote-input:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 2px var(--input-focus-shadow);
  background-color: rgba(30, 34, 53, 0.9); /* Slightly darker on focus */
}

/* Hide number input arrows */
.vote-input::-webkit-outer-spin-button,
.vote-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.vote-input[type=number] {
  -moz-appearance: textfield; /* Firefox */
}

/* Vote Button - Use style from login button */
.vote-btn {
  width: 100%;
  padding: 12px 0;
  border-radius: 8px;
  border: none;
  background-color: var(--accent-color);
  font-size: 16px; /* Adjusted size */
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px; /* Space between spinner and text */
  margin-top: 10px; /* Add some space above button */
}

.vote-btn:hover:not(:disabled) { /* Added :not(:disabled) */
  background-color: var(--accent-hover);
}

.vote-btn:disabled {
  opacity: 0.65; /* Consistent disabled opacity */
  cursor: not-allowed;
}

/* Spinner - Use style from login spinner */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Message Area - Use style from login error container */
.message-area {
  display: flex; /* To align icon and text if needed */
  align-items: flex-start;
  gap: 8px;
  margin-top: 20px; /* Consistent margin */
  padding: 10px 12px; /* Adjusted padding */
  border-radius: 6px;
  background-color: var(--error-bg); /* Default to error background */
  border-left: 3px solid var(--error-color); /* Default to error border */
  box-sizing: border-box;
  width: 100%;
}

/* Specific styles for message types */
.message-area.success {
  background-color: var(--success-bg);
  border-left-color: var(--success-color);
  /* color: var(--success-color); /* Color is set on message-text now */
}

.message-area.error {
  background-color: var(--error-bg);
  border-left-color: var(--error-color);
 /* color: var(--error-color); /* Color is set on message-text now */
}

/* Style for the text inside message area */
.message-text {
 /* Use specific variable colors instead of inherit */
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
  width: 100%; /* Take remaining width */
  word-wrap: break-word;
  text-align: left; /* Align text left within the container */
  direction: ltr; /* Keep message text LTR usually */
}
/* Apply color based on parent class */
.message-area.success .message-text {
    color: var(--success-color);
}
.message-area.error .message-text {
    color: var(--error-color);
}


/* Fade transition for message area */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Copyright */
.copyright {
  margin-top: 30px; /* Adjusted margin */
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}
</style>