/**
 * file: dashboard.js
 * Chuc nang: Logic trang dashboard — xac thuc, hien thi danh sach phien,
 *            tao/xoa/doi ten/ghi chu phien, keo-tha sap xep, cai dat (settings),
 *            tu dong refresh. Gui CSRF token theo moi request doi trang thai.
 */

(function () {
  'use strict';

  // === Tham chieu DOM ===
  var msgGlobal = document.getElementById('msg-global');
  var loginSection = document.getElementById('login-section');
  var dashboardSection = document.getElementById('dashboard-section');
  var loginForm = document.getElementById('login-form');
  var msgLogin = document.getElementById('msg-login');
  var inputPassword = document.getElementById('input-password');
  var btnLogout = document.getElementById('btn-logout');
  var btnRefresh = document.getElementById('btn-refresh');
  var btnSettings = document.getElementById('btn-settings');
  var btnCreate = document.getElementById('btn-create');
  var inputSessionName = document.getElementById('input-session-name');
  var inputShell = document.getElementById('input-shell');
  var sessionListEl = document.getElementById('session-list');
  var appVersionEl = document.getElementById('app-version');
  var securityWarning = document.getElementById('security-warning');

  // Settings modal
  var settingsModal = document.getElementById('settings-modal');
  var settingsForm = document.getElementById('settings-form');
  var msgSettings = document.getElementById('msg-settings');
  var btnSettingsClose = document.getElementById('btn-settings-close');
  var btnSettingsCancel = document.getElementById('btn-settings-cancel');
  var settingsBackdrop = document.getElementById('settings-backdrop');
  var settingsConfirmGroup = document.getElementById('settings-confirm-group');

  // === Trang thai ===
  var authEnabled = false;
  var refreshTimer = null;

  // === CSRF helper ===

  /** Shorthand dich i18n. */
  function t(key, vars) { return window.I18N.t(key, vars); }

  /** Doc CSRF token tu cookie (do auth plugin set, httpOnly=false). */
  function getCsrfToken() {
    var match = document.cookie.match(/(?:^|;\s*)tcc_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  /** Tao headers JSON kem CSRF token cho request doi trang thai. */
  function mutHeaders() {
    return { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() };
  }

  // === Helpers UI ===

  function showGlobalMsg(text, type) {
    msgGlobal.textContent = text;
    msgGlobal.className = 'message message--' + (type || 'error');
    msgGlobal.classList.remove('hidden');
  }
  function hideGlobalMsg() { msgGlobal.classList.add('hidden'); }
  function showLoginError(text) { msgLogin.textContent = text; msgLogin.classList.remove('hidden'); }
  function hideLoginError() { msgLogin.classList.add('hidden'); }

  /** Format unix timestamp (giay) sang chuoi local. */
  function formatTime(unixSeconds) {
    if (!unixSeconds) return '—';
    return new Date(unixSeconds * 1000).toLocaleString();
  }

  /** Format epoch ms (lastAccess) sang chuoi local. */
  function formatMs(ms) {
    if (!ms) return t('card.neverAccessed');
    return new Date(ms).toLocaleString();
  }

  // === API calls ===

  function fetchConfig() {
    return fetch('/api/config').then(function (res) { return res.json(); });
  }

  function doLogin(password) {
    return fetch('/api/login', {
      method: 'POST', headers: mutHeaders(),
      body: JSON.stringify({ password: password })
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  function doLogout() {
    return fetch('/api/logout', { method: 'POST', headers: mutHeaders() })
      .then(function (res) { return res.json(); });
  }

  function fetchSessions() {
    return fetch('/api/sessions').then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  function createSession(name, shell) {
    var body = {};
    if (name) body.name = name;
    if (shell) body.shell = shell;
    return fetch('/api/sessions', {
      method: 'POST', headers: mutHeaders(), body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  function deleteSession(name) {
    return fetch('/api/sessions/' + encodeURIComponent(name), {
      method: 'DELETE', headers: mutHeaders()
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  function touchSession(name) {
    // keepalive: request song sot qua dieu huong trang (nut "Mo" la <a> dieu
    // huong ngay), tranh bi huy giua chung khien lastAccess khong duoc ghi.
    return fetch('/api/sessions/' + encodeURIComponent(name) + '/touch', {
      method: 'POST', headers: mutHeaders(), keepalive: true
    });
  }

  function saveNote(name, note) {
    return fetch('/api/sessions/' + encodeURIComponent(name) + '/note', {
      method: 'PUT', headers: mutHeaders(), body: JSON.stringify({ note: note })
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  function renameSessionApi(name, newName) {
    return fetch('/api/sessions/' + encodeURIComponent(name) + '/rename', {
      method: 'PUT', headers: mutHeaders(), body: JSON.stringify({ newName: newName })
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  function saveOrder(orderedNames) {
    return fetch('/api/sessions/order', {
      method: 'PUT', headers: mutHeaders(), body: JSON.stringify({ order: orderedNames })
    });
  }

  function fetchSettings() {
    return fetch('/api/settings').then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  function saveSettings(payload) {
    return fetch('/api/settings', {
      method: 'PUT', headers: mutHeaders(), body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  // === Render danh sach phien ===

  function renderSessions(sessions) {
    sessionListEl.innerHTML = '';

    if (!sessions || sessions.length === 0) {
      sessionListEl.innerHTML = '<p style="color:var(--text-secondary)">' + t('card.empty') + '</p>';
      return;
    }

    sessions.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'session-card';
      card.setAttribute('draggable', 'true');
      card.dataset.name = s.name;

      // Tay cam keo-tha
      var handle = document.createElement('div');
      handle.className = 'session-card__handle';
      handle.textContent = '⠿';
      handle.title = t('card.dragHint');

      // Thong tin phien
      var info = document.createElement('div');
      info.className = 'session-card__info';

      var nameEl = document.createElement('div');
      nameEl.className = 'session-card__name';
      nameEl.textContent = s.name;

      var meta = document.createElement('div');
      meta.className = 'session-card__meta';
      meta.textContent = t('card.created') + formatTime(s.created) + t('card.windows') + (s.windows || 0) + ' ';

      var badge = document.createElement('span');
      badge.className = 'badge ' + (s.attached ? 'badge--attached' : 'badge--detached');
      badge.textContent = s.attached ? t('card.attached') : t('card.detached');
      meta.appendChild(badge);

      // Lan truy cap cuoi
      var lastEl = document.createElement('div');
      lastEl.className = 'session-card__meta';
      lastEl.textContent = t('card.lastAccess') + formatMs(s.lastAccess);

      // Ghi chu (input chinh sua truc tiep)
      var noteWrap = document.createElement('div');
      noteWrap.className = 'session-card__note';
      var noteInput = document.createElement('input');
      noteInput.className = 'input input--note';
      noteInput.type = 'text';
      noteInput.placeholder = t('card.notePlaceholder');
      noteInput.value = s.note || '';
      noteInput.maxLength = 500;
      // Luu ghi chu khi roi focus neu co thay doi
      noteInput.addEventListener('blur', function () {
        if (noteInput.value === (s.note || '')) return;
        saveNote(s.name, noteInput.value)
          .then(function () { s.note = noteInput.value; })
          .catch(function (err) { showGlobalMsg(t('msg.noteFail') + (err.error || ''), 'error'); });
      });
      noteWrap.appendChild(noteInput);

      info.appendChild(nameEl);
      info.appendChild(meta);
      info.appendChild(lastEl);
      info.appendChild(noteWrap);

      // Cac nut hanh dong
      var actions = document.createElement('div');
      actions.className = 'session-card__actions';

      var btnOpen = document.createElement('a');
      btnOpen.className = 'btn btn--primary btn--small';
      btnOpen.textContent = t('card.open');
      btnOpen.href = 'terminal.html?name=' + encodeURIComponent(s.name);
      // Danh dau lan truy cap khi mo
      btnOpen.addEventListener('click', function () { touchSession(s.name); });

      var btnRename = document.createElement('button');
      btnRename.className = 'btn btn--ghost btn--small';
      btnRename.textContent = t('card.rename');
      btnRename.addEventListener('click', function () { handleRename(s.name); });

      var btnKill = document.createElement('button');
      btnKill.className = 'btn btn--danger btn--small';
      btnKill.textContent = t('card.kill');
      btnKill.addEventListener('click', function () { handleKill(s.name); });

      actions.appendChild(btnOpen);
      actions.appendChild(btnRename);
      actions.appendChild(btnKill);

      card.appendChild(handle);
      card.appendChild(info);
      card.appendChild(actions);

      attachDragHandlers(card);
      sessionListEl.appendChild(card);
    });
  }

  // === Keo-tha sap xep ===

  function attachDragHandlers(card) {
    card.addEventListener('dragstart', function () {
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', function () {
      card.classList.remove('dragging');
      persistOrder();
    });
    card.addEventListener('dragover', function (e) {
      e.preventDefault(); // cho phep drop
      var dragging = sessionListEl.querySelector('.dragging');
      if (!dragging || dragging === card) return;
      // Chen truoc/sau tuy vi tri con tro
      var rect = card.getBoundingClientRect();
      var after = e.clientY > rect.top + rect.height / 2;
      sessionListEl.insertBefore(dragging, after ? card.nextSibling : card);
    });
  }

  /** Luu thu tu hien tai cua DOM xuong server. */
  function persistOrder() {
    var names = Array.prototype.map.call(
      sessionListEl.querySelectorAll('.session-card'),
      function (c) { return c.dataset.name; }
    );
    if (names.length) saveOrder(names);
  }

  // === Handlers ===

  function handleKill(name) {
    if (!confirm(t('msg.killConfirm', { name: name }))) return;
    deleteSession(name)
      .then(loadSessions)
      .catch(function (err) {
        showGlobalMsg(t('msg.killFail') + (err.error || t('msg.unknownError')), 'error');
      });
  }

  function handleRename(name) {
    var newName = prompt(t('msg.renamePrompt', { name: name }), name);
    if (!newName || newName === name) return;
    renameSessionApi(name, newName)
      .then(loadSessions)
      .catch(function (err) {
        showGlobalMsg(t('msg.renameFail') + (err.error || t('msg.unknownError')), 'error');
      });
  }

  function loadSessions() {
    hideGlobalMsg();
    fetchSessions()
      .then(function (data) { renderSessions(data.sessions || []); })
      .catch(function (err) {
        showGlobalMsg(t('msg.loadSessionsFail') + (err.error || t('msg.connError')), 'error');
      });
  }

  function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    btnSettings.classList.remove('hidden');
    if (authEnabled) btnLogout.classList.remove('hidden');
    loadSessions();
    startAutoRefresh();
  }

  function showLogin() {
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    btnSettings.classList.add('hidden');
    stopAutoRefresh();
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(loadSessions, 5000);
  }
  function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  // === Settings modal ===

  function showSettingsMsg(text, type) {
    msgSettings.textContent = text;
    msgSettings.className = 'message message--' + (type || 'info');
    msgSettings.classList.remove('hidden');
  }
  function hideSettingsMsg() { msgSettings.classList.add('hidden'); }

  function openSettings() {
    hideSettingsMsg();
    fetchSettings()
      .then(function (cfg) {
        document.getElementById('set-auth-enabled').checked = cfg.authEnabled;
        document.getElementById('set-password').value = '';
        document.getElementById('set-host').value = cfg.host;
        document.getElementById('set-port').value = cfg.port;
        document.getElementById('set-font-family').value = cfg.termFontFamily;
        document.getElementById('set-font-size').value = cfg.termFontSize;
        document.getElementById('set-encoding').value = cfg.termEncoding || 'utf-8';
        document.getElementById('set-language').value = cfg.language || 'en';
        document.getElementById('set-theme').value = cfg.theme || 'dark';
        document.getElementById('set-rl-enabled').checked = cfg.loginRateLimit.enabled;
        document.getElementById('set-rl-max').value = cfg.loginRateLimit.maxAttempts;
        document.getElementById('set-rl-window').value = Math.round(cfg.loginRateLimit.windowMs / 1000);
        // Hien o xac nhan mat khau hien tai neu auth dang bat
        settingsConfirmGroup.classList.toggle('hidden', !authEnabled);
        settingsModal.classList.remove('hidden');
      })
      .catch(function (err) {
        showGlobalMsg(t('msg.loadSettingsFail') + (err.error || ''), 'error');
      });
  }

  function closeSettings() { settingsModal.classList.add('hidden'); }

  function submitSettings(e) {
    e.preventDefault();
    hideSettingsMsg();

    var payload = {
      authEnabled: document.getElementById('set-auth-enabled').checked,
      host: document.getElementById('set-host').value.trim(),
      port: Number(document.getElementById('set-port').value),
      termFontFamily: document.getElementById('set-font-family').value.trim(),
      termFontSize: Number(document.getElementById('set-font-size').value),
      termEncoding: document.getElementById('set-encoding').value,
      language: document.getElementById('set-language').value,
      theme: document.getElementById('set-theme').value,
      loginRateLimit: {
        enabled: document.getElementById('set-rl-enabled').checked,
        maxAttempts: Number(document.getElementById('set-rl-max').value),
        windowMs: Number(document.getElementById('set-rl-window').value) * 1000
      }
    };
    var newPw = document.getElementById('set-password').value;
    if (newPw) payload.password = newPw;
    var curPw = document.getElementById('set-current-password').value;
    if (curPw) payload.currentPassword = curPw;

    saveSettings(payload)
      .then(function (res) {
        // Ap ngon ngu moi ngay lap tuc (re-render UI tinh + danh sach phien)
        window.I18N.setLang(payload.language);
        window.I18N.apply();
        // Ap theme moi ngay lap tuc
        document.documentElement.setAttribute('data-theme', payload.theme);
        loadSessions();
        showSettingsMsg(res.message || t('settings.saved'), 'info');
        // Cap nhat trang thai auth cuc bo
        authEnabled = payload.authEnabled;
        if (!res.needsRestart) {
          setTimeout(closeSettings, 1200);
        }
      })
      .catch(function (err) {
        showSettingsMsg(t('msg.saveSettingsFail') + (err.error || t('msg.unknownError')), 'error');
      });
  }

  // === Khoi tao ===

  function init() {
    fetchConfig()
      .then(function (cfg) {
        authEnabled = cfg.authEnabled;
        // Ap ngon ngu truoc khi hien UI
        window.I18N.setLang(cfg.language || 'en');
        window.I18N.apply();
        // Ap theme
        document.documentElement.setAttribute('data-theme', cfg.theme || 'dark');
        if (cfg.version && appVersionEl) appVersionEl.textContent = 'v' + cfg.version;
        // Nap danh sach shell vao select
        if (cfg.shells && cfg.shells.length && inputShell) {
          inputShell.innerHTML = '';
          cfg.shells.forEach(function (sh) {
            var opt = document.createElement('option');
            opt.value = sh;
            opt.textContent = sh;
            inputShell.appendChild(opt);
          });
        }
        // Hien canh bao bao mat neu co
        if (cfg.warnings && cfg.warnings.length && securityWarning) {
          var msgs = cfg.warnings.map(function (code) {
            if (code === 'defaultSecret') return t('warn.defaultSecret');
            if (code === 'exposedNoAuth') return t('warn.exposedNoAuth');
            return code;
          });
          securityWarning.textContent = msgs.join(' | ');
          securityWarning.classList.remove('hidden');
        } else if (securityWarning) {
          securityWarning.classList.add('hidden');
        }
        if (authEnabled && !cfg.authed) showLogin();
        else showDashboard();
      })
      .catch(function () {
        showGlobalMsg(t('msg.connectFail'), 'error');
      });
  }

  // === Event listeners ===

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hideLoginError();
    var pw = inputPassword.value;
    if (!pw) { showLoginError(t('login.needPassword')); return; }
    doLogin(pw)
      .then(function () { inputPassword.value = ''; showDashboard(); })
      .catch(function (err) { showLoginError(err.error || t('login.wrong')); });
  });

  btnLogout.addEventListener('click', function () {
    doLogout().then(showLogin);
  });

  btnRefresh.addEventListener('click', loadSessions);

  btnCreate.addEventListener('click', function () {
    hideGlobalMsg();
    var name = inputSessionName.value.trim();
    var shell = inputShell ? inputShell.value : '';
    createSession(name, shell)
      .then(function () { inputSessionName.value = ''; loadSessions(); })
      .catch(function (err) {
        showGlobalMsg(t('msg.createFail') + (err.error || t('msg.unknownError')), 'error');
      });
  });

  btnSettings.addEventListener('click', openSettings);
  btnSettingsClose.addEventListener('click', closeSettings);
  btnSettingsCancel.addEventListener('click', closeSettings);
  settingsBackdrop.addEventListener('click', closeSettings);
  settingsForm.addEventListener('submit', submitSettings);

  init();
})();
