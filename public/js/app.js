(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ====== i18n ======
  const I18N = {
    zh: {
      cover_quote: '"我能让事情发生……当然，是在日记的世界里。"',
      open_diary: '打开日记',
      enter_diary: '进入日记',
      logout: '退出登录',
      tab_login: '登录',
      tab_register: '注册',
      label_username: '用户名',
      label_password: '密码',
      placeholder_username: '请输入用户名',
      placeholder_password: '请输入密码',
      placeholder_choose_username: '选择一个用户名',
      placeholder_choose_password: '设置密码',
      btn_login: '登录',
      btn_register: '注册',
      lang_label: '语言 / Language',
      my_diary: '我的日记',
      no_entries: '暂无日记',
      placeholder_write: '在这里书写你的日记……',
      footer_hint: '在羊皮纸上书写，按 Enter 提交给日记本',
      ai_settings: 'AI 设置',
      ai_desc: '填写 DeepSeek API Key 以启用真实的汤姆·里德尔对话。获取地址：platform.deepseek.com（免费注册送额度）。',
      label_apikey: 'DeepSeek API Key',
      placeholder_apikey: 'sk-...',
      btn_save_key: '保存',
      key_saved: 'API Key 已保存',
      key_cleared: 'API Key 已清除',
      ai_local: '本地回复（未关联API）',
      ai_connected: 'API 已关联',
      silent: '日记本沉默了……暂时。',
      err_empty: '请先写点什么',
      toast_saved: '已保存',
      toast_deleted: '已删除',
      toast_logged_out: '已退出登录'
    },
    en: {
      cover_quote: '"I can make things happen... in the world of the diary, of course."',
      open_diary: 'Open the Diary',
      enter_diary: 'Enter the Diary',
      logout: 'Logout',
      tab_login: 'Login',
      tab_register: 'Register',
      label_username: 'Username',
      label_password: 'Password',
      placeholder_username: 'Enter your username',
      placeholder_password: 'Enter your password',
      placeholder_choose_username: 'Choose a username',
      placeholder_choose_password: 'Set a password',
      btn_login: 'Login',
      btn_register: 'Register',
      lang_label: 'Language / 语言',
      my_diary: 'My Diary',
      no_entries: 'No entries yet',
      placeholder_write: 'Write your diary here...',
      footer_hint: 'Write on the parchment, press Enter to submit to the diary',
      ai_settings: 'AI Settings',
      ai_desc: 'Enter your DeepSeek API Key to enable the real Tom Riddle conversation. Get one at platform.deepseek.com (free).',
      label_apikey: 'DeepSeek API Key',
      placeholder_apikey: 'sk-...',
      btn_save_key: 'Save',
      key_saved: 'API Key saved',
      key_cleared: 'API Key cleared',
      ai_local: 'Local reply (API not connected)',
      ai_connected: 'API connected',
      silent: 'The diary remains silent... for now.',
      err_empty: 'Please write something first',
      toast_saved: 'Diary saved',
      toast_deleted: 'Diary entry deleted',
      toast_logged_out: 'You have logged out'
    }
  };

  let lang = localStorage.getItem('diary_lang') || 'zh';
  let dict = I18N[lang];

  function t(key) { return dict[key] || key; }

  function applyI18n() {
    dict = I18N[lang];
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    $$('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.placeholder = dict[key];
    });
    $$('.auth-tab').forEach(tab => {
      const key = tab.dataset.tab === 'login' ? 'tab_login' : 'tab_register';
      if (dict[key]) tab.textContent = dict[key];
    });
  }

  // ====== State ======
  let currentUser = null;
  let currentDiaryId = null;
  let aiEnabled = false;
  let chatMessages = []; // [{role:'user'|'ai', content, time}]
  let isGenerating = false;

  // ====== API ======
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
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function formatTime(d) {
    const date = new Date(d);
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function hasChinese(str) {
    return /[\u4e00-\u9fff\u3000-\u303f]/.test(str);
  }

  // ====== Cover ======
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
      greeting.textContent = currentUser;
      $('#open-diary-btn').querySelector('.btn-text').textContent = t('enter_diary');
    } else {
      status.classList.add('hidden');
      $('#open-diary-btn').querySelector('.btn-text').textContent = t('open_diary');
    }
  }

  // ====== Auth ======
  function showAuthModal() {
    $('#auth-modal').classList.remove('hidden');
    $$('.auth-tab').forEach(tab => tab.classList.remove('active'));
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

  async function handleLogin(e) {
    e.preventDefault();
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    const errEl = $('#login-error');
    errEl.classList.add('hidden');

    const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
    if (data.error) {
      errEl.textContent = data.error;
      errEl.classList.remove('hidden');
      return;
    }
    currentUser = data.username;
    hideAuthModal();
    updateCoverForUser();
    showToast('Welcome back');
  }

  async function handleRegister(e) {
    e.preventDefault();
    const username = $('#reg-username').value.trim();
    const password = $('#reg-password').value;
    const errEl = $('#register-error');
    errEl.classList.add('hidden');

    const data = await api('/api/auth/register', { method: 'POST', body: { username, password } });
    if (data.error) {
      errEl.textContent = data.error;
      errEl.classList.remove('hidden');
      return;
    }
    currentUser = data.username;
    hideAuthModal();
    updateCoverForUser();
    showToast('OK');
  }

  async function handleLogout() {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    currentDiaryId = null;
    chatMessages = [];
    updateCoverForUser();
    showToast(t('toast_logged_out'));
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
    const hList = $('#history-list');

    if (!diaries || diaries.length === 0) {
      const msg = `<p class="empty-msg">${t('no_entries')}</p>`;
      list.innerHTML = msg;
      hList.innerHTML = msg;
      return;
    }

    const html = diaries.map(d => {
      let preview = '';
      try {
        const msgs = JSON.parse(d.content);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const lastUser = msgs.filter(m => m.role === 'user').pop();
          preview = lastUser ? lastUser.content.substring(0, 40) : '';
        }
      } catch {
        preview = (d.content || '').substring(0, 40);
      }
      return `
        <div class="diary-item ${d.id === currentDiaryId ? 'active' : ''}" data-id="${d.id}">
          <div class="diary-item-date">${formatDate(d.created_at)}</div>
          <div class="diary-item-preview">${escapeHtml(preview || 'Empty')}</div>
          <span class="diary-item-mode ${d.mode === 'ai_on' ? 'ai' : 'normal'}">${d.mode === 'ai_on' ? 'AI' : 'Normal'}</span>
        </div>`;
    }).join('');

    list.innerHTML = html;
    hList.innerHTML = html;

    list.querySelectorAll('.diary-item').forEach(item => {
      item.addEventListener('click', () => loadDiary(parseInt(item.dataset.id)));
    });
    hList.querySelectorAll('.diary-item').forEach(item => {
      item.addEventListener('click', () => {
        loadDiary(parseInt(item.dataset.id));
        hideHistoryPanel();
      });
    });
  }

  async function loadDiary(id) {
    const diary = await api(`/api/diary/${id}`);
    if (diary.error) return;

    currentDiaryId = diary.id;
    aiEnabled = diary.mode === 'ai_on';
    $('#ai-toggle').checked = aiEnabled;
    $('#ai-status').textContent = aiEnabled ? 'ON' : 'OFF';
    $('#diary-date').textContent = formatDate(diary.created_at);

    chatMessages = [];
    try {
      const msgs = JSON.parse(diary.content);
      if (Array.isArray(msgs)) chatMessages = msgs;
    } catch {
      if (diary.content) chatMessages = [{ role: 'user', content: diary.content, time: diary.created_at }];
    }

    renderBlocks();
    $('#diary-content').textContent = '';
    $$('.diary-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.id) === id);
    });
  }

  function newDiary() {
    currentDiaryId = null;
    chatMessages = [];
    aiEnabled = false;
    $('#ai-toggle').checked = false;
    $('#ai-status').textContent = 'OFF';
    $('#diary-date').textContent = formatDate(new Date());
    $('#diary-blocks').innerHTML = '';
    $('#diary-content').textContent = '';
    $$('.diary-item').forEach(item => item.classList.remove('active'));
    focusParchment();
  }

  function focusParchment() {
    setTimeout(() => $('#diary-content').focus(), 50);
  }

  // ====== Render entry blocks ======
  function createBlock(msg) {
    const div = document.createElement('div');
    div.className = `entry-block ${msg.role === 'user' ? 'user-block' : 'ai-block'}`;

    if (msg.role === 'ai') {
      div.classList.add(hasChinese(msg.content) ? 'has-chinese' : 'has-english');
      const title = document.createElement('div');
      title.className = 'entry-title';
      title.textContent = '— T.M. Riddle';
      div.appendChild(title);
    }

    const text = document.createElement('div');
    text.className = 'entry-text';
    text.textContent = msg.content;
    div.appendChild(text);

    const time = document.createElement('div');
    time.className = 'entry-time';
    time.textContent = msg.time ? formatTime(msg.time) : '';
    div.appendChild(time);

    return div;
  }

  function renderBlocks() {
    const container = $('#diary-blocks');
    container.innerHTML = '';
    chatMessages.forEach(msg => container.appendChild(createBlock(msg)));
    scrollPaper();
  }

  function scrollPaper() {
    const scroll = $('.diary-scroll');
    requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
  }

  // ====== Submit entry ======
  async function submitEntry() {
    const contentEl = $('#diary-content');
    const content = contentEl.textContent.trim();
    if (!content) { showToast(t('err_empty')); return; }
    if (isGenerating) return;

    // Append user block
    const userMsg = { role: 'user', content, time: new Date().toISOString() };
    chatMessages.push(userMsg);
    $('#diary-blocks').appendChild(createBlock(userMsg));
    contentEl.textContent = '';
    scrollPaper();

    if (aiEnabled) {
      isGenerating = true;
      $('#submit-btn').disabled = true;
      const typingEl = $('#ai-typing');
      typingEl.classList.remove('hidden');
      scrollPaper();

      try {
        const apiMessages = chatMessages.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.content
        }));

        const data = await api('/api/ai/chat', {
          method: 'POST',
          body: { messages: apiMessages, language: lang }
        });

        typingEl.classList.add('hidden');

        updateLinkStatus(data.provider !== 'local');

        if (data.error) {
          appendAiBlock(t('silent'));
        } else {
          await typewriterAiBlock(data.reply);
        }
      } catch (err) {
        typingEl.classList.add('hidden');
        appendAiBlock(t('silent'));
      }

      isGenerating = false;
      $('#submit-btn').disabled = false;
      focusParchment();
    } else {
      await saveCurrentDiary();
      focusParchment();
    }
  }

  function appendAiBlock(text) {
    const aiMsg = { role: 'ai', content: text, time: new Date().toISOString() };
    chatMessages.push(aiMsg);
    $('#diary-blocks').appendChild(createBlock(aiMsg));
    scrollPaper();
    saveCurrentDiary();
  }

  // Typewriter: reveal AI reply character by character, left to right, line by line
  function typewriterAiBlock(text) {
    return new Promise(resolve => {
      const aiMsg = { role: 'ai', content: text, time: new Date().toISOString() };
      const block = createBlock({ ...aiMsg, content: '' });
      $('#diary-blocks').appendChild(block);

      const textEl = block.querySelector('.entry-text');
      const cursor = document.createElement('span');
      cursor.className = 'typing-cursor';
      textEl.appendChild(cursor);

      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          const ch = text[i];
          textEl.textContent = text.substring(0, i + 1);
          textEl.appendChild(cursor);
          i++;
          // scroll when new line appears
          if (ch === '\n') scrollPaper();
          if (i % 5 === 0) scrollPaper();
        } else {
          clearInterval(interval);
          cursor.remove();
          block.querySelector('.entry-time').textContent = formatTime(aiMsg.time);
          chatMessages.push(aiMsg);
          scrollPaper();
          saveCurrentDiary();
          resolve();
        }
      }, 55);
    });
  }

  async function saveCurrentDiary() {
    const content = JSON.stringify(chatMessages);
    const mode = aiEnabled ? 'ai_on' : 'ai_off';

    if (currentDiaryId) {
      await api(`/api/diary/${currentDiaryId}`, {
        method: 'PUT',
        body: { content, ai_reply: null, mode }
      });
    } else {
      const data = await api('/api/diary/save', {
        method: 'POST',
        body: { content, ai_reply: null, mode }
      });
      if (data.id) currentDiaryId = data.id;
    }
    loadDiaryList();
  }

  async function deleteDiary() {
    if (!currentDiaryId) return;
    if (!confirm('Delete this diary entry?')) return;
    await api(`/api/diary/${currentDiaryId}`, { method: 'DELETE' });
    currentDiaryId = null;
    showToast(t('toast_deleted'));
    newDiary();
    loadDiaryList();
  }

  // ====== AI status dot (read-only) ======
  function updateLinkStatus(connected) {
    const dot = $('#ai-link-status');
    if (!dot) return;
    dot.classList.toggle('connected', connected);
    dot.title = connected ? t('ai_connected') : t('ai_local');
  }

  // ====== History Panel (mobile) ======
  function showHistoryPanel() { $('#history-panel').classList.remove('hidden'); }
  function hideHistoryPanel() { $('#history-panel').classList.add('hidden'); }

  // ====== Init ======
  async function checkServerAi() {
    try {
      const data = await api('/api/ai/status');
      if (data.hasKey) updateLinkStatus(true);
    } catch (e) { /* ignore */ }
  }

  function init() {
    checkLogin();
    applyI18n();
    checkServerAi();

    // Cover
    $('#open-diary-btn').addEventListener('click', () => {
      currentUser ? showDiaryPage() : showAuthModal();
    });
    $('#logout-btn').addEventListener('click', handleLogout);

    // Auth
    $('#modal-close').addEventListener('click', hideAuthModal);
    $('.modal-backdrop').addEventListener('click', hideAuthModal);
    $$('.auth-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
    $('#login-form').addEventListener('submit', handleLogin);
    $('#register-form').addEventListener('submit', handleRegister);

    // Language
    $$('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        lang = btn.dataset.lang;
        localStorage.setItem('diary_lang', lang);
        applyI18n();
        updateCoverForUser();
      });
    });
    $$('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));

    // Diary page
    $('#back-cover').addEventListener('click', showCoverPage);
    $('#new-diary-btn').addEventListener('click', newDiary);
    $('#save-btn').addEventListener('click', async () => { await saveCurrentDiary(); showToast(t('toast_saved')); });
    $('#delete-btn').addEventListener('click', deleteDiary);
    $('#submit-btn').addEventListener('click', submitEntry);

    // AI toggle
    $('#ai-toggle').addEventListener('change', function () {
      aiEnabled = this.checked;
      $('#ai-status').textContent = aiEnabled ? 'ON' : 'OFF';
    });

    // AI settings modal removed — API key is server-side only

    // Mobile
    $('#mobile-new-btn').addEventListener('click', newDiary);
    $('#mobile-history-btn').addEventListener('click', showHistoryPanel);
    $('#history-close').addEventListener('click', hideHistoryPanel);
    $('.history-backdrop').addEventListener('click', hideHistoryPanel);

    // Parchment typing: Enter submits, Shift+Enter new line
    const contentEl = $('#diary-content');
    contentEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitEntry();
      }
    });
    // Clicking empty parchment area below focuses the contenteditable
    $('.diary-paper').addEventListener('click', (e) => {
      if (e.target.classList.contains('diary-paper') ||
          e.target.classList.contains('paper-lines') ||
          e.target.classList.contains('paper-texture') ||
          e.target.classList.contains('diary-scroll')) {
        focusParchment();
      }
    });

    // Ctrl+S
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentDiary().then(() => showToast(t('toast_saved')));
      }
    });
  }

  init();
})();