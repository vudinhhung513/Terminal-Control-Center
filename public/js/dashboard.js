/**
 * file: dashboard.js
 * Chuc nang: Logic trang dashboard — xac thuc, hien thi danh sach phien,
 *            tao/xoa phien, tu dong refresh.
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
  var btnCreate = document.getElementById('btn-create');
  var inputSessionName = document.getElementById('input-session-name');
  var sessionListEl = document.getElementById('session-list');

  // === Trang thai ===
  var authEnabled = false;
  var refreshTimer = null;

  // === Helpers ===

  /** Hien thi thong bao loi/info toan cuc */
  function showGlobalMsg(text, type) {
    msgGlobal.textContent = text;
    msgGlobal.className = 'message message--' + (type || 'error');
    msgGlobal.classList.remove('hidden');
  }

  /** An thong bao toan cuc */
  function hideGlobalMsg() {
    msgGlobal.classList.add('hidden');
  }

  /** Hien thi loi form dang nhap */
  function showLoginError(text) {
    msgLogin.textContent = text;
    msgLogin.classList.remove('hidden');
  }

  /** An loi form dang nhap */
  function hideLoginError() {
    msgLogin.classList.add('hidden');
  }

  /** Format unix timestamp (giay) sang chuoi local */
  function formatTime(unixSeconds) {
    if (!unixSeconds) return '—';
    var d = new Date(unixSeconds * 1000);
    return d.toLocaleString();
  }

  // === API calls ===

  /** Lay cau hinh server */
  function fetchConfig() {
    return fetch('/api/config')
      .then(function (res) { return res.json(); });
  }

  /** Dang nhap */
  function doLogin(password) {
    return fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  /** Dang xuat */
  function doLogout() {
    return fetch('/api/logout', { method: 'POST' })
      .then(function (res) { return res.json(); });
  }

  /** Lay danh sach phien */
  function fetchSessions() {
    return fetch('/api/sessions')
      .then(function (res) {
        if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
        return res.json();
      });
  }

  /** Tao phien moi */
  function createSession(name) {
    var body = {};
    if (name) body.name = name;
    return fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  /** Xoa phien */
  function deleteSession(name) {
    return fetch('/api/sessions/' + encodeURIComponent(name), {
      method: 'DELETE'
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (b) { return Promise.reject(b); });
      return res.json();
    });
  }

  // === Render ===

  /** Render danh sach phien ra DOM */
  function renderSessions(sessions) {
    sessionListEl.innerHTML = '';

    if (!sessions || sessions.length === 0) {
      sessionListEl.innerHTML = '<p style="color:var(--text-secondary)">Chưa có phiên nào. Tạo phiên mới để bắt đầu.</p>';
      return;
    }

    sessions.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'session-card';

      // Thong tin phien
      var info = document.createElement('div');
      info.className = 'session-card__info';

      var nameEl = document.createElement('div');
      nameEl.className = 'session-card__name';
      nameEl.textContent = s.name;

      var meta = document.createElement('div');
      meta.className = 'session-card__meta';
      meta.textContent = 'Tạo: ' + formatTime(s.created) + ' · Cửa sổ: ' + (s.windows || 0) + ' ';

      // Badge trang thai
      var badge = document.createElement('span');
      badge.className = 'badge ' + (s.attached ? 'badge--attached' : 'badge--detached');
      badge.textContent = s.attached ? 'Attached' : 'Detached';
      meta.appendChild(badge);

      info.appendChild(nameEl);
      info.appendChild(meta);

      // Cac nut hanh dong
      var actions = document.createElement('div');
      actions.className = 'session-card__actions';

      var btnOpen = document.createElement('a');
      btnOpen.className = 'btn btn--primary btn--small';
      btnOpen.textContent = 'Mở';
      btnOpen.href = 'terminal.html?name=' + encodeURIComponent(s.name);

      var btnKill = document.createElement('button');
      btnKill.className = 'btn btn--danger btn--small';
      btnKill.textContent = 'Kill';
      btnKill.addEventListener('click', function () {
        handleKill(s.name);
      });

      actions.appendChild(btnOpen);
      actions.appendChild(btnKill);

      card.appendChild(info);
      card.appendChild(actions);
      sessionListEl.appendChild(card);
    });
  }

  // === Handlers ===

  /** Xu ly xoa phien (xac nhan truoc) */
  function handleKill(name) {
    var confirmed = confirm('Bạn có chắc muốn xoá phiên "' + name + '"?');
    if (!confirmed) return;

    deleteSession(name)
      .then(function () {
        loadSessions();
      })
      .catch(function (err) {
        showGlobalMsg('Không thể xoá phiên: ' + (err.error || 'Lỗi không xác định'), 'error');
      });
  }

  /** Load va render danh sach phien */
  function loadSessions() {
    hideGlobalMsg();
    fetchSessions()
      .then(function (data) {
        renderSessions(data.sessions || []);
      })
      .catch(function (err) {
        showGlobalMsg('Không thể tải danh sách phiên: ' + (err.error || 'Lỗi kết nối'), 'error');
      });
  }

  /** Hien dashboard, bat dau auto-refresh */
  function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    if (authEnabled) {
      btnLogout.classList.remove('hidden');
    }
    loadSessions();
    startAutoRefresh();
  }

  /** Hien form dang nhap */
  function showLogin() {
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    stopAutoRefresh();
  }

  /** Bat auto refresh moi 5 giay */
  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(loadSessions, 5000);
  }

  /** Dung auto refresh */
  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  // === Khoi tao ===

  /** Kiem tra config va quyet dinh hien login hay dashboard */
  function init() {
    fetchConfig()
      .then(function (cfg) {
        authEnabled = cfg.authEnabled;
        if (authEnabled && !cfg.authed) {
          showLogin();
        } else {
          showDashboard();
        }
      })
      .catch(function () {
        showGlobalMsg('Không thể kết nối tới server.', 'error');
      });
  }

  // === Event listeners ===

  // Dang nhap
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hideLoginError();
    var pw = inputPassword.value;
    if (!pw) {
      showLoginError('Vui lòng nhập mật khẩu.');
      return;
    }
    doLogin(pw)
      .then(function () {
        inputPassword.value = '';
        showDashboard();
      })
      .catch(function (err) {
        showLoginError(err.error || 'Sai mật khẩu.');
      });
  });

  // Dang xuat
  btnLogout.addEventListener('click', function () {
    doLogout().then(function () {
      showLogin();
    });
  });

  // Refresh thu cong
  btnRefresh.addEventListener('click', function () {
    loadSessions();
  });

  // Tao phien moi
  btnCreate.addEventListener('click', function () {
    hideGlobalMsg();
    var name = inputSessionName.value.trim();
    createSession(name)
      .then(function () {
        inputSessionName.value = '';
        loadSessions();
      })
      .catch(function (err) {
        showGlobalMsg('Lỗi tạo phiên: ' + (err.error || 'Không xác định'), 'error');
      });
  });

  // Khoi chay
  init();
})();
