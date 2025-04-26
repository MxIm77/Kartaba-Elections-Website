<template>
  <div class="wrapper">
    <!-- Logo above the card -->
    <div class="logo-text">صَوَّتلي؟</div>
    
    <!-- Login Card -->
    <div class="login-card">
      <form class="login-form">
        <input 
          type="text" 
          placeholder="Enter Session ID" 
          v-model="userId" 
          class="login-input">
        <input 
          type="password" 
          placeholder="Enter Passcode" 
          v-model="password" 
          class="login-input">
        <button type="button" class="login-btn" @click="handleLogin">Let's go!</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const userId = ref('');
const password = ref('');
const router = useRouter();

const handleLogin = () => {
  if (userId.value && password.value) {
    console.log(`Login successful (simulation) for ID: ${userId.value}`);
    // Optionally store userId in localStorage
    localStorage.setItem('currentUser', userId.value);
    router.push('/table');  // Redirect to the table page
  } else {
    alert('Please enter both ID and Password.');
  }
};
</script>

<style scoped>
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
}

.login-btn:active {
  box-shadow: 0px 0px var(--main-color);
  transform: translate(3px, 3px);
}
</style>