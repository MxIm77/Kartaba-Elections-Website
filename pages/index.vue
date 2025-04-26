<template>
  <div class="wrapper">
    <div class="logo-text">صَوَّتلي؟</div>

    <div class="login-card">
      <form @submit.prevent="handleLogin" class="login-form">
        <input
          type="text"
          placeholder="Enter Session ID"
          v-model="userId"
          class="login-input"
          required
        />
        <input
          type="password"
          placeholder="Enter Passcode"
          v-model="password"
          class="login-input"
          required
        />
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Let\'s go!' }}
        </button>
      </form>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router'; // useRouter for client-side navigation

const userId = ref('');
const password = ref('');
const loading = ref(false); // State to indicate loading
const error = ref(null); // State to display errors
const router = useRouter();

const handleLogin = async () => {
  // Basic client-side validation
  if (!userId.value || !password.value) {
    error.value = 'Please enter both Session ID and Passcode.';
    return;
  }

  loading.value = true; // Start loading
  error.value = null; // Clear previous errors

  try {
    // Use useFetch to call your Nuxt server API route
    const { data, pending, error: fetchError } = await useFetch('/api/login', {
      method: 'POST',
      body: {
        userId: userId.value,
        password: password.value,
      },
    });

    if (data.value && data.value.success) {
      console.log('Login successful:', data.value.message);
      // Navigate to the desired page (e.g., /table)
      router.push('/table');
    } else {
      // Handle login failure response from the server
      console.error('Login failed:', data.value?.message || fetchError.value?.message || 'Unknown error');
      error.value = data.value?.message || fetchError.value?.message || 'Login failed. Please check your credentials.';
    }

  } catch (err) {
    // Handle unexpected errors during the fetch request
    console.error('API call failed:', err);
    error.value = 'An unexpected error occurred. Please try again later.';
  } finally {
    loading.value = false; // End loading
  }
};
</script>

<style scoped>
/* Your existing CSS styles here */
.wrapper {
  --input-focus: #2d8cf0;
  --font-color: #fefefe;
  --font-color-sub: #7e7e7e;
  --bg-color: #111;
  --bg-color-alt: #7e7e7e;
  --main-color: #fefefe;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #000000;
  font-family: sans-serif;
}

/* Logo text styling */
.logo-text {
  font-size: 120px;
  font-weight: 1100;
  color: var(--main-color);
  margin-bottom: 30px;
  text-align: center;
  text-shadow: 4px 4px 0px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

/* Login card */
.login-card {
  width: 300px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--bg-color);
  border-radius: 5px;
  border: 2px solid var(--main-color);
  box-shadow: 4px 4px var(--main-color);
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.login-input {
  width: 250px;
  height: 40px;
  border-radius: 5px;
  border: 2px solid var(--main-color);
  background-color: var(--bg-color);
  box-shadow: 4px 4px var(--main-color);
  font-size: 15px;
  font-weight: 600;
  color: var(--font-color);
  padding: 5px 10px;
  outline: none;
}

.login-input::placeholder {
  color: var(--font-color-sub);
  opacity: 0.8;
}

.login-input:focus {
  border: 2px solid var(--input-focus);
}

.login-btn {
  margin: 20px 0;
  width: 120px;
  height: 40px;
  border-radius: 5px;
  border: 2px solid var(--main-color);
  background-color: var(--bg-color);
  box-shadow: 4px 4px var(--main-color);
  font-size: 17px;
  font-weight: 600;
  color: var(--font-color);
  cursor: pointer;
  transition: all 0.1s ease; /* Add a small transition for active state */
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-btn:active {
  box-shadow: 0px 0px var(--main-color);
  transform: translate(3px, 3px);
}

/* New style for error message */
.error-message {
  color: #ff4d4f; /* A standard error color */
  text-align: center;
  margin-top: 10px;
  font-size: 14px;
}
</style>