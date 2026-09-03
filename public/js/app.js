document.addEventListener('DOMContentLoaded', () => {
  const coverPage = document.getElementById('cover-page');
  const diaryPage = document.getElementById('diary-page');
  const authModal = document.getElementById('auth-modal');
  const openDiaryBtn = document.getElementById('open-diary-btn');
  const closeBtn = document.querySelector('.close');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authMessage = document.getElementById('auth-message');
  const logoutBtn = document.getElementById('logout-btn');
  const welcomeUser = document.getElementById('welcome-user');
  const aiModeToggle = document.getElementById('ai-mode-toggle');
  const modeStatus = document.getElementById('mode-status');
  const diaryInput = document.getElementById('diary-input');
  const aiResponse = document.getElementById('ai-response');
  const saveBtn = document.getElementById('save-btn');
  const clearBtn = document.getElementById('clear-btn');
  const historyList = document.getElementById('history-list');

  let currentUser = null;
  let aiLanguage = 'cn';

  checkAuth();

  openDiaryBtn.addEventListener('click', () => {
    authModal.classList.add('active');
  });

  closeBtn.addEventListener('click', () => {
    authModal.classList.remove('active');
  });

  window.addEventListener('click', (e) => {
    if (e.target === authModal) {
      authModal.classList.remove('active');
    }
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tab = btn.dataset.tab;
      loginForm.classList.toggle('active', tab === 'login');
      registerForm.classList.toggle('active', tab === 'register');
      authMessage.textContent = '';
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (data.success) {
        currentUser = data.user;
        showDiaryPage();
        authModal.classList.remove('active');
      } else {
        showMessage(authMessage, data.error, 'error');
      }
    } catch (error) {
      showMessage(authMessage, 'Connection error', 'error');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    aiLanguage = document.getElementById('reg-lang').value;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (data.success) {
        currentUser = data.user;
        showDiaryPage();
        authModal.classList.remove('active');
      } else {
        showMessage(authMessage, data.error, 'error');
      }
    } catch (error) {
      showMessage(authMessage, 'Connection error', 'error');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      currentUser = null;
      coverPage.classList.add('active');
      diaryPage.classList.remove('active');
    } catch (error) {
      console.error('Logout error:', error);
    }
  });

  aiModeToggle.addEventListener('change', () => {
    const isOn = aiModeToggle.checked;
    modeStatus.textContent = isOn ? 'ON' : 'OFF';
    modeStatus.style.color = isOn ? '#4caf50' : '#f44336';
  });

  saveBtn.addEventListener('click', saveDiary);

  clearBtn.addEventListener('click', () => {
    diaryInput.value = '';
    aiResponse.classList.add('hidden');
  });

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      if (data.loggedIn) {
        currentUser = data.user;
        showDiaryPage();
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  }

  function showDiaryPage() {
    coverPage.classList.remove('active');
    diaryPage.classList.add('active');
    welcomeUser.textContent = `Welcome, ${currentUser.username}`;
    loadHistory();
  }

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = 'message ' + type;
    setTimeout(() => {
      element.textContent = '';
      element.className = 'message';
    }, 3000);
  }

  async function saveDiary() {
    const content = diaryInput.value.trim();
    if (!content) {
      alert('Please write something first');
      return;
    }

    const isAiMode = aiModeToggle.checked;
    let aiReply = null;

    if (isAiMode) {
      try {
        aiResponse.classList.remove('hidden');
        aiResponse.querySelector('.response-content').textContent = 'Thinking...';
        
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, language: aiLanguage })
        });
        const data = await response.json();

        if (data.success) {
          aiReply = data.reply;
          typewriterEffect(aiResponse.querySelector('.response-content'), aiReply);
        }
      } catch (error) {
        aiResponse.querySelector('.response-content').textContent = 'AI connection error';
      }
    } else {
      aiResponse.classList.add('hidden');
    }

    try {
      const response = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, aiReply, aiMode: isAiMode })
      });
      const data = await response.json();

      if (data.success) {
        diaryInput.value = '';
        loadHistory();
      }
    } catch (error) {
      alert('Save failed');
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch('/api/diary');
      const data = await response.json();

      if (data.success) {
        if (data.diaries.length === 0) {
          historyList.innerHTML = '<p class="no-history">No entries yet</p>';
        } else {
          historyList.innerHTML = data.diaries.map(diary => `
            <div class="history-item" data-id="${diary.id}">
              <div class="date">${new Date(diary.created_at).toLocaleString()}</div>
              <div class="preview">${escapeHtml(diary.content)}</div>
              ${diary.ai_mode ? '<span class="ai-badge">AI</span>' : ''}
            </div>
          `).join('');

          document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => loadDiary(parseInt(item.dataset.id)));
          });
        }
      }
    } catch (error) {
      console.error('Load history error:', error);
    }
  }

  async function loadDiary(id) {
    try {
      const response = await fetch(`/api/diary/${id}`);
      const data = await response.json();

      if (data.success) {
        diaryInput.value = data.diary.content;
        if (data.diary.ai_reply) {
          aiResponse.classList.remove('hidden');
          aiResponse.querySelector('.response-content').textContent = data.diary.ai_reply;
        } else {
          aiResponse.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('Load diary error:', error);
    }
  }

  function typewriterEffect(element, text) {
    element.textContent = '';
    let index = 0;
    const speed = 50;
    
    function type() {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    }
    type();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
