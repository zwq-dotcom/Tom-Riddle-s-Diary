(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentUser = null;
  let currentDiaryId = null;
  let selectedLanguage = 'zh';
  let aiEnabled = false;

  // ====== API Helpers ======
  async function api(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    return res.json();
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function formatDate(d) {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  }

  // ====== Cover Page ======
  async function checkLogin() {
    const data = await api('/api/auth/me');
    if (data.loggedIn) {
      currentUser = data.username;
      updateCoverForUser();
    }
  }

  function updateCoverForUser() {
    const status = $('#user-status');
    const greeting = $('#user-greeting');
    if (currentUser) {
      status.classList.remove('hidden');
      greeting.textContent = `Welcome, ${currentUser}`;
      $('#open-diary-btn').querySelector('.btn-text').textContent = 'Enter the Diary';
    } else {
      status.classList.add('hidden');
      $('#open-diary-btn').querySelector('.btn-text').textContent = 'Open the Diary';
    }
  }

  // ====== Auth Modal ======
  function showAuthModal() {
    $('#auth-modal').classList.remove('hidden');
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    $$('.auth-form').forEach(f => f.classList.remove('active'));
    $('.auth-tab[data-tab="login"]').classList.add('active');
    $('#login-form').classList.add('active');
    $('#login-username').focus();
  }

  function hideAuthModal() {
    $('#auth-modal').classList.add('hidden');
    $('#login-error').classList.add('hidden');
    $('#register-error').classList.add('hidden');
  }

  function switchTab(tab) {
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    $$('.auth-form').forEach(f => f.classList.remove('active'));
    $(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
    $(`#${tab === 'login' ? 'login' : 'register'}-form`).classList.add('active');
  }

  // ====== Login / Register ======
  async function handleLogin(e) {
    e.preventDefault();
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    const errEl = $('#login-error');
    errEl.classList.add('hidden');

    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });

    if (data.error) {
      errEl.textContent = data.error;
      errEl.classList.remove('hidden');
      return;
    }

    currentUser = data.username;
    hideAuthModal();
    updateCoverForUser();
    showToast('Welcome back to the diary');
  }

  async function handleRegister(e) {
    e.preventDefault();
    const username = $('#reg-username').value.trim();
    const password = $('#reg-password').value;
    const errEl = $('#register-error');
    errEl.classList.add('hidden');

    const data = await api('/api/auth/register', {
      method: 'POST',
      body: { username, password }
    });

    if (data.error) {
      errEl.textContent = data.error;
      errEl.classList.remove('hidden');
      return;
    }

    currentUser = data.username;
    hideAuthModal();
    updateCoverForUser();
    showToast('Your diary has been created');
  }

  async function handleLogout() {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    currentDiaryId = null;
    updateCoverForUser();
    showToast('You have logged out');
  }

  // ====== Diary Page ======
  function showDiaryPage() {
    $('#cover-page').classList.remove('active');
    $('#cover-page').classList.add('hidden');
    $('#diary-page').classList.remove('hidden');
    loadDiaryList();
    newDiary();
  }

  function showCoverPage() {
    $('#diary-page').classList.add('hidden');
    $('#cover-page').classList.remove('hidden');
    $('#cover-page').classList.add('active');
  }

  async function loadDiaryList() {
    const diaries = await api('/api/diary/list');
    const list = $('#diary-list');

    if (!diaries || diaries.length === 0) {
      list.innerHTML = '<p class="empty-msg">No entries yet</p>';
      return;
    }

    list.innerHTML = diaries.map(d => `
      <div class="diary-item ${d.id === currentDiaryId ? 'active' : ''}" data-id="${d.id}">
        <div class="diary-item-date">${formatDate(d.created_at)}</div>
        <div class="diary-item-preview">${escapeHtml(d.content || 'Empty entry')}</div>
        <span class="diary-item-mode ${d.mode === 'ai_on' ? 'ai' : 'normal'}">${d.mode === 'ai_on' ? 'AI' : 'Normal'}</span>
      </div>
    `).join('');

    list.querySelectorAll('.diary-item').forEach(item => {
      item.addEventListener('click', () => loadDiary(parseInt(item.dataset.id)));
    });
  }

  async function loadDiary(id) {
    const diary = await api(`/api/diary/${id}`);
    if (diary.error) {
      showToast('Failed to load diary');
      return;
    }

    currentDiaryId = diary.id;
    $('#diary-content').textContent = diary.content || '';
    $('#diary-date').textContent = formatDate(diary.created_at);

    aiEnabled = diary.mode === 'ai_on';
    $('#ai-toggle').checked = aiEnabled;
    $('#ai-status').textContent = aiEnabled ? 'ON' : 'OFF';

    const replyArea = $('#ai-reply-area');
    if (diary.ai_reply) {
      replyArea.classList.remove('hidden');
      $('#ai-reply').textContent = diary.ai_reply;
    } else {
      replyArea.classList.add('hidden');
      $('#ai-reply').textContent = '';
    }

    $$('.diary-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.id) === id);
    });
  }

  function newDiary() {
    currentDiaryId = null;
    $('#diary-content').textContent = '';
    const now = new Date();
    $('#diary-date').textContent = formatDate(now);
    $('#ai-reply-area').classList.add('hidden');
    $('#ai-reply').textContent = '';
    aiEnabled = false;
    $('#ai-toggle').checked = false;
    $('#ai-status').textContent = 'OFF';
    $$('.diary-item').forEach(item => item.classList.remove('active'));
  }

  async function saveDiary() {
    const content = $('#diary-content').textContent.trim();
    if (!content) {
      showToast('Please write something first');
      return;
    }

    const aiReply = $('#ai-reply').textContent || null;
    const mode = aiEnabled ? 'ai_on' : 'ai_off';

    if (currentDiaryId) {
      await api(`/api/diary/${currentDiaryId}`, {
        method: 'PUT',
        body: { content, ai_reply: aiReply, mode }
      });
      showToast('Diary saved');
    } else {
      const data = await api('/api/diary/save', {
        method: 'POST',
        body: { content, ai_reply: aiReply, mode }
      });
      if (data.id) {
        currentDiaryId = data.id;
        showToast('New diary entry created');
      }
    }
    loadDiaryList();
  }

  async function deleteDiary() {
    if (!currentDiaryId) return;
    if (!confirm('Delete this diary entry?')) return;

    await api(`/api/diary/${currentDiaryId}`, { method: 'DELETE' });
    currentDiaryId = null;
    showToast('Diary entry deleted');
    newDiary();
    loadDiaryList();
  }

  // ====== AI Chat ======
  async function submitToAI() {
    const content = $('#diary-content').textContent.trim();
    if (!content) {
      showToast('Please write something first');
      return;
    }

    const submitBtn = $('#submit-btn');
    submitBtn.disabled = true;
    submitBtn.querySelector('.submit-text').textContent = 'Thinking...';

    if (aiEnabled) {
      const replyArea = $('#ai-reply-area');
      replyArea.classList.remove('hidden');
      const replyEl = $('#ai-reply');
      replyEl.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';

      try {
        const data = await api('/api/ai/chat', {
          method: 'POST',
          body: { message: content, language: selectedLanguage }
        });

        if (data.error) {
          replyEl.textContent = 'The diary remains silent... for now.';
        } else {
          typeReply(replyEl, data.reply);
        }
      } catch (err) {
        replyEl.textContent = 'The diary remains silent... for now.';
      }
    } else {
      if (!currentDiaryId) {
        const data = await api('/api/diary/save', {
          method: 'POST',
          body: { content, ai_reply: null, mode: 'ai_off' }
        });
        if (data.id) currentDiaryId = data.id;
      } else {
        await api(`/api/diary/${currentDiaryId}`, {
          method: 'PUT',
          body: { content, ai_reply: null, mode: 'ai_off' }
        });
      }
      showToast('Diary saved');
      loadDiaryList();
    }

    submitBtn.disabled = false;
    submitBtn.querySelector('.submit-text').textContent = 'Submit to the Diary';
  }

  function typeReply(el, text) {
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    el.appendChild(cursor);

    const interval = setInterval(() => {
      if (i < text.length) {
        el.textContent = text.substring(0, i + 1);
        el.appendChild(cursor);
        i++;
      } else {
        clearInterval(interval);
        el.classList.remove('typing');
        cursor.remove();
      }
    }, 40);
  }

  // ====== Utility ======
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ====== Event Listeners ======
  function init() {
    checkLogin();

    $('#open-diary-btn').addEventListener('click', () => {
      if (currentUser) {
        showDiaryPage();
      } else {
        showAuthModal();
      }
    });

    $('#logout-btn').addEventListener('click', handleLogout);

    $('#modal-close').addEventListener('click', hideAuthModal);
    $('.modal-backdrop').addEventListener('click', hideAuthModal);

    $$('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    $('#login-form').addEventListener('submit', handleLogin);
    $('#register-form').addEventListener('submit', handleRegister);

    $$('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLanguage = btn.dataset.lang;
      });
    });

    $('#back-cover').addEventListener('click', showCoverPage);
    $('#new-diary-btn').addEventListener('click', newDiary);
    $('#save-btn').addEventListener('click', saveDiary);
    $('#delete-btn').addEventListener('click', deleteDiary);
    $('#submit-btn').addEventListener('click', submitToAI);

    $('#ai-toggle').addEventListener('change', function () {
      aiEnabled = this.checked;
      $('#ai-status').textContent = aiEnabled ? 'ON' : 'OFF';
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDiary();
      }
    });
  }

  init();
})();
