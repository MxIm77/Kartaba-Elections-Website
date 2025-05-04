// utils/sound.js
let audio = null

export const initVoteSound = () => {
  if (typeof window !== 'undefined' && !audio) {
    audio = new Audio('/sounds/votes.mp3')
    audio.volume = 0.5  // 50% volume
  }
}

export const playVoteSound = () => {
  if (typeof window !== 'undefined') {
    if (!audio) initVoteSound()
    try {
      audio.currentTime = 0  // Rewind if already playing
      audio.play().catch(e => console.warn("Sound error:", e))
    } catch (e) {
      console.error("Audio failed:", e)
    }
  }
}