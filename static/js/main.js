// Example starter JavaScript for disabling form submissions if there are invalid fields
(function () {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.prototype.slice.call(forms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }

        form.classList.add('was-validated')
      }, false)
    })
})()

// Custom Phone Number Validation helper
document.addEventListener('DOMContentLoaded', function () {
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function (e) {
      // Allow only numbers
      var x = e.target.value.replace(/\D/g, '').match(/(\d{0,10})/);
      e.target.value = x[1];
    });
  }
});

// ================= AI CHATBOT LOGIC =================
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
let audioUnlocked = false;

// Function to unlock audio context on dedicated page
function unlockAudio() {
  if (!audioUnlocked && 'speechSynthesis' in window) {
    const unlockAudio = new SpeechSynthesisUtterance(' ');
    unlockAudio.volume = 0;
    window.speechSynthesis.speak(unlockAudio);
    audioUnlocked = true;
    console.log('Audio context unlocked');
  }
}

function appendMessage(sender, text, isError = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `d-flex w-100 flex-column align-items-${sender === 'user' ? 'end' : 'start'} mb-2`;

  const innerDiv = document.createElement('div');

  if (sender === 'user') {
    innerDiv.className = 'bg-success text-white p-3 rounded-4 rounded-bottom-0 shadow-sm';
    innerDiv.style.maxWidth = '85%';
    innerDiv.style.fontSize = '0.95rem';
    innerDiv.style.borderBottomRightRadius = '0 !important';
    innerDiv.style.background = 'linear-gradient(135deg, #2c5540, #1e3a2b)';
  } else {
    innerDiv.className = `glass-panel ${isError ? 'text-danger fw-bold' : 'text-white'} p-3 rounded-4 rounded-top-0 mb-1 shadow-sm`;
    innerDiv.style.maxWidth = '85%';
    innerDiv.style.fontSize = '0.95rem';
    innerDiv.style.borderTopLeftRadius = '0 !important';
  }

  // Basic markdown to HTML (for bold text mostly)
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formattedText = formattedText.replace(/\n/g, '<br>');

  innerDiv.innerHTML = formattedText;

  // Add manual play button for AI messages
  if (sender === 'ai' && !isError) {
    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn-link text-white text-opacity-50 p-0 ms-2 mt-2';
    playBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    playBtn.style.fontSize = '0.8rem';
    playBtn.onclick = (e) => {
      e.preventDefault();
      speakAIResponse(text);
    };
    innerDiv.appendChild(playBtn);
  }

  msgDiv.appendChild(innerDiv);
  chatMessages.appendChild(msgDiv);

  // Auto scroll
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const typingId = 'typing-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.id = typingId;
  msgDiv.className = `d-flex w-100 flex-column align-items-start mb-2`;
  msgDiv.innerHTML = `
          <div class="glass-panel p-3 rounded-4 rounded-top-0 mb-1 shadow-sm d-flex align-items-center" style="max-width: 85%; border-top-left-radius: 0 !important;">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
          </div>
      `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return typingId;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function sendChatMessage(e) {
  e.preventDefault();

  // Unlock audio on first user interaction (reliable across browsers)
  unlockAudio();

  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage('user', message);
  chatInput.value = '';

  const typingId = showTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message })
    });

    removeTypingIndicator(typingId);

    const data = await response.json();
    if (response.ok) {
      appendMessage('ai', data.response);
      speakAIResponse(data.response);
    } else {
      appendMessage('ai', data.error || "Sorry, an error occurred.", true);
    }
  } catch (error) {
    removeTypingIndicator(typingId);
    appendMessage('ai', "Network error. Please try again.", true);
  }
}

// --- Web Speech API (Voice Recognition Tamil/English) ---
const voiceBtn = document.getElementById('voiceBtn');
let recognition = null;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  // Primary language Tamil, with English fallback implicitly handled by modern browsers
  recognition.lang = 'ta-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = function () {
    isRecording = true;
    voiceBtn.classList.remove('btn-dark');
    voiceBtn.classList.add('btn-danger', 'pulse-animation');
    chatInput.placeholder = "Listening / பேசுகிறார்...";
  };

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;

    // Manual send requested: transcibe text but don't auto-submit. 
    // Focus the input so the user can easily review or edit before sending.
    chatInput.focus();
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error", event.error);
    resetVoiceBtn();
    chatInput.placeholder = "Error recognizing voice. Please type.";
    setTimeout(() => chatInput.placeholder = "Ask a question...", 3000);
  };

  recognition.onend = function () {
    resetVoiceBtn();
  };
} else {
  // Hide max btn if unsupported
  if (voiceBtn) voiceBtn.style.display = 'none';
}

function startVoiceRecognition() {
  // Unlock audio on interaction
  unlockAudio();

  if (!recognition) {
    alert("Audio voice recognition is not supported in this browser.");
    return;
  }

  if (isRecording) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function resetVoiceBtn() {
  if (!voiceBtn) return;
  isRecording = false;
  voiceBtn.classList.remove('btn-danger', 'pulse-animation');
  voiceBtn.classList.add('btn-dark');
  chatInput.placeholder = "Ask a question...";
}

// Add pulse animation CSS dynamically if required
$("<style>")
  .prop("type", "text/css")
  .html("\
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); } }\
    .pulse-animation { animation: pulse 1.5s infinite; }\
    ")
  .appendTo("head");

let isVoiceOutputEnabled = true;

function toggleVoiceOutput() {
  isVoiceOutputEnabled = !isVoiceOutputEnabled;
  const voiceToggleBtn = document.getElementById('voiceToggleBtn');
  if (voiceToggleBtn) {
    voiceToggleBtn.innerHTML = isVoiceOutputEnabled ?
      '<i class="fas fa-volume-up"></i>' :
      '<i class="fas fa-volume-mute"></i>';
    voiceToggleBtn.classList.toggle('text-opacity-50', !isVoiceOutputEnabled);
  }
  console.log(`Voice output ${isVoiceOutputEnabled ? 'enabled' : 'disabled'}`);
}

function speakAIResponse(text) {
  if (!isVoiceOutputEnabled || !('speechSynthesis' in window)) {
    console.warn("Speech synthesis not supported or disabled.");
    return;
  }

  // Cancel any current speech
  window.speechSynthesis.cancel();

  // Short delay to ensure cancel() takes effect and browser is ready
  setTimeout(() => {
    try {
      const cleanText = text.replace(/[*#_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Detect language
      const tamilRegex = /[\u0B80-\u0BFF]/;
      if (tamilRegex.test(cleanText)) {
        utterance.lang = 'ta-IN';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Event listeners for debugging and reliability
      utterance.onstart = () => console.log("AI starting to speak...");
      utterance.onend = () => console.log("AI finished speaking.");
      utterance.onerror = (event) => console.error("SpeechSynthesisUtterance error:", event.error);

      window.speechSynthesis.speak(utterance);

      // Store utterance globally to prevent garbage collection in Chrome
      if (!window._utterances) window._utterances = [];
      window._utterances.push(utterance);
      if (window._utterances.length > 10) window._utterances.shift();

    } catch (err) {
      console.error("Error during speech synthesis setup:", err);
    }
  }, 150);
}
