<template>
  <div class="wrapper">
    <!-- Logo text outside the card -->
    <div class="logo-text">صَوَّتلي؟</div>
    
    <!-- Personalized greeting for the logged-in user -->
    <div v-if="username" class="greeting-text">
      مرحباً "{{ username }}"
    </div>
    
    <div class="vote-card">
      <form @submit.prevent="sendToSheet" class="vote-form">
        <input
          id="voterId"
          v-model.trim="id"
          type="number"
          placeholder="Enter Voter ID"
          class="vote-input"
          :disabled="loading"
          required
          aria-describedby="messageArea"
        />
        <button
          type="submit"
          class="vote-btn"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner"></span>
          <span v-if="loading">Sending...</span>
          <span v-else>Send ID</span>
        </button>
      </form>

      <div
        v-if="message"
        :class="['message-area', messageType]"
        role="alert"
        id="messageArea"
      >
        {{ message }}
      </div>
    </div>
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

// Get the username from localStorage on component mount
onMounted(() => {
  const currentUser = localStorage.getItem('currentUser')
  if (currentUser) {
    username.value = currentUser
  } else {
    // Redirect to login if no user is logged in
    router.push('/login')
  }
})

// --- Function to Send Data ---
async function sendToSheet() {
  if (!id.value || loading.value) {
     if(!id.value) {
        message.value = 'Please enter a valid ID.'
        messageType.value = 'error'
     }
    return
  }
  loading.value = true
  message.value = ''
  messageType.value = ''

  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id.value })
    })
    const result = await res.json()
    console.log('API Response:', result)

    if (!res.ok) {
        message.value = `Error: ${result.message || `Request failed (${res.status})`}`
        messageType.value = 'error'
    } else if (result.success) {
        message.value = result.message || 'ID processed successfully!'
        messageType.value = 'success'
        id.value = '' // Clear input on success
    } else {
        message.value = `Failed: ${result.message || 'Processing failed.'}`
        messageType.value = 'error'
    }
  } catch (err) {
    console.error('Fetch Error:', err)
    message.value = 'Network error. Please try again.'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.wrapper {
  --input-focus: #2d8cf0;
  --font-color: #fefefe;
  --font-color-sub: #7e7e7e;
  --bg-color: #111;
  --bg-color-alt: #7e7e7e;
  --main-color: #fefefe;
  --error-color: #f44336;
  --success-color: #4caf50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #000000;
  font-family: sans-serif;
  padding: 20px;
}

/* Logo text styling */
.logo-text {
  font-size: 120px;
  font-weight: 900;
  color: var(--main-color);
  margin-bottom: 10px;
  text-align: center;
  text-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

/* Greeting text styling */
.greeting-text {
  font-size: 28px;
  font-weight: 700;
  color: var(--main-color);
  margin-bottom: 30px;
  text-align: center;
  opacity: 0.9;
  animation: fadeIn 0.5s ease-in-out;
  direction: rtl; /* For proper Arabic text direction */
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 0.9; transform: translateY(0); }
}

/* Vote card */
.vote-card {
  width: 100%;
  max-width: 500px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  border-radius: 5px;
  border: 2px solid var(--main-color);
  box-shadow: 4px 4px var(--main-color);
}

/* Form styling */
.vote-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.vote-input {
  width: 100%;
  height: 50px;
  border-radius: 5px;
  border: 2px solid var(--main-color);
  background-color: var(--bg-color);
  box-shadow: 4px 4px var(--main-color);
  font-size: 16px;
  font-weight: 600;
  color: var(--font-color);
  padding: 5px 15px;
  outline: none;
}

.vote-input::placeholder {
  color: var(--font-color-sub);
  opacity: 0.8;
}

.vote-input:focus {
  border: 2px solid var(--input-focus);
}

.vote-input::-webkit-outer-spin-button,
.vote-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.vote-input[type=number] {
  -moz-appearance: textfield;
}

.vote-btn {
  width: 100%;
  height: 50px;
  border-radius: 5px;
  border: 2px solid var(--main-color);
  background-color: var(--bg-color);
  box-shadow: 4px 4px var(--main-color);
  font-size: 17px;
  font-weight: 600;
  color: var(--font-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vote-btn:active:not(:disabled) {
  box-shadow: 0px 0px var(--main-color);
  transform: translate(3px, 3px);
}

.vote-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Spinner */
.spinner {
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  width: 1em;
  height: 1em;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Message styling */
.message-area {
  padding: 15px;
  border-radius: 5px;
  margin-top: 20px;
  font-weight: 600;
  border: 2px solid;
  text-align: center;
}

.message-area.success {
  background-color: rgba(76, 175, 80, 0.1);
  border-color: var(--success-color);
  color: var(--success-color);
}

.message-area.error {
  background-color: rgba(244, 67, 54, 0.1);
  border-color: var(--error-color);
  color: var(--error-color);
}
</style>
