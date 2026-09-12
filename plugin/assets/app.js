// GameAP WebMonitoring Frontend Script

const AUTO_REFRESH_SECONDS = 15;

const I18N = {
  ru: {
    brandSubtitle: "Онлайн мониторинг игровых серверов",
    onlineStat: "Онлайн: {online} / {total}",
    allGames: "Все игры",
    searchPlaceholder: "Поиск сервера по названию, игре или IP...",
    refreshLabel: "Обновить",
    copyBtn: "Копировать",
    copiedToast: "Скопировано: {text}",
    connectBtn: "Подключиться",
    loadingText: "Загрузка списка серверов...",
    errorTitle: "Не удалось получить данные",
    errorMsg: "Проверьте доступность GameAP API",
    retryBtn: "Повторить попытку",
    emptyTitle: "Серверы не найдены",
    emptyMsg: "По вашему запросу не найдено ни одного активного сервера",
    autoRefresh: "Автообновление:",
    secUnit: "с",
    nextLang: "EN"
  },
  en: {
    brandSubtitle: "Online Game Server Monitoring",
    onlineStat: "Online: {online} / {total}",
    allGames: "All Games",
    searchPlaceholder: "Search server by name, game, or IP...",
    refreshLabel: "Refresh",
    copyBtn: "Copy",
    copiedToast: "Copied: {text}",
    connectBtn: "Connect",
    loadingText: "Loading server list...",
    errorTitle: "Failed to load servers",
    errorMsg: "Please check GameAP API availability",
    retryBtn: "Retry",
    emptyTitle: "No servers found",
    emptyMsg: "No active servers match your filter",
    autoRefresh: "Auto-refresh:",
    secUnit: "s",
    nextLang: "RU"
  }
};

let currentLang = localStorage.getItem('web_monitoring_lang') || 
  ((navigator.language && navigator.language.toLowerCase().startsWith('ru')) ? 'ru' : 'en');

function t(key, params = {}) {
  const dict = I18N[currentLang] || I18N.ru;
  let text = dict[key] || I18N.en[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

let allServers = [];
let selectedGame = 'all';
let searchQuery = '';
let refreshInterval = null;
let countdownSeconds = AUTO_REFRESH_SECONDS;

// Demo mock data in case API is running standalone or offline
const DEMO_SERVERS = [
  {
    id: 1,
    name: "Classic Dust2 Only [128 Tick]",
    game_code: "cs2",
    game_name: "Counter-Strike 2",
    address: "198.51.100.10",
    port: 27015,
    status: "online",
    installed: true,
    blocked: false,
    connect_url: "steam://connect/198.51.100.10:27015"
  },
  {
    id: 2,
    name: "Public CS 1.6 #1 [FastDL]",
    game_code: "cstrike",
    game_name: "Counter-Strike 1.6",
    address: "198.51.100.10",
    port: 27016,
    status: "online",
    installed: true,
    blocked: false,
    connect_url: "steam://connect/198.51.100.10:27016"
  },
  {
    id: 3,
    name: "Vanilla Survival 1.21+",
    game_code: "minecraft",
    game_name: "Minecraft",
    address: "198.51.100.10",
    port: 25565,
    status: "online",
    installed: true,
    blocked: false,
    connect_url: ""
  },
  {
    id: 4,
    name: "Rust 2x Main [Wipe Friday]",
    game_code: "rust",
    game_name: "Rust",
    address: "198.51.100.10",
    port: 28015,
    status: "offline",
    installed: true,
    blocked: false,
    connect_url: "steam://connect/198.51.100.10:28015"
  }
];

// DOM Elements
const grid = document.getElementById('servers-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const gameFiltersContainer = document.getElementById('game-filters');
const statOnlineText = document.getElementById('stat-online-text');
const refreshBtn = document.getElementById('refresh-btn');
const refreshLabel = document.getElementById('refresh-label');
const retryBtn = document.getElementById('retry-btn');
const timerText = document.getElementById('timer-text');
const toast = document.getElementById('toast');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const langToggleBtn = document.getElementById('lang-toggle-btn');
const versionLink = document.getElementById('version-link');
const brandSubtitle = document.getElementById('brand-subtitle');
const loadingText = document.getElementById('loading-text');
const errorTitle = document.getElementById('error-title');
const errorMsg = document.getElementById('error-msg');
const emptyTitle = document.getElementById('empty-title');
const emptyMsg = document.getElementById('empty-msg');
const autoRefreshLabel = document.getElementById('auto-refresh-label');

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('web_monitoring_theme') || document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
  }
  localStorage.setItem('web_monitoring_theme', theme);
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  });
}

// Language Management
function initLanguage() {
  applyLanguage(currentLang);
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('web_monitoring_lang', lang);
  
  if (langToggleBtn) {
    langToggleBtn.textContent = t('nextLang');
    langToggleBtn.title = lang === 'ru' ? 'Switch to English' : 'Переключить на русский';
  }
  if (brandSubtitle) brandSubtitle.textContent = t('brandSubtitle');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');
  if (refreshLabel) refreshLabel.textContent = t('refreshLabel');
  if (loadingText) loadingText.textContent = t('loadingText');
  if (errorTitle) errorTitle.textContent = t('errorTitle');
  if (errorMsg) errorMsg.textContent = t('errorMsg');
  if (retryBtn) retryBtn.textContent = t('retryBtn');
  if (emptyTitle) emptyTitle.textContent = t('emptyTitle');
  if (emptyMsg) emptyMsg.textContent = t('emptyMsg');
  if (autoRefreshLabel) autoRefreshLabel.textContent = t('autoRefresh');

  renderAll();
  updateTimerDisplay();
}

if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    applyLanguage(currentLang === 'ru' ? 'en' : 'ru');
  });
}

function initPreloadedData() {
  if (!window.INITIAL_DATA) return;

  if (window.INITIAL_DATA.version && versionLink) {
    versionLink.textContent = `v${window.INITIAL_DATA.version}`;
  }
  if (window.INITIAL_DATA.repo_url && versionLink) {
    versionLink.href = window.INITIAL_DATA.repo_url;
  }

  if (Array.isArray(window.INITIAL_DATA.servers) && window.INITIAL_DATA.servers.length > 0) {
    allServers = window.INITIAL_DATA.servers;
    renderAll();
    setLoading(false);
  }
}

// Determine API base path based on current window location
function getApiEndpoint(route) {
  const path = window.location.pathname || '';
  const idx = path.indexOf('/view');
  if (idx !== -1) {
    const base = path.substring(0, idx);
    return `${base}${route}`;
  }
  // Fallbacks
  return `/api/plugins/bwbwb26fs5eje${route}`;
}

async function fetchServers() {
  if (allServers.length === 0) {
    setLoading(true);
  }
  
  let loadedData = null;
  const primaryEndpoint = getApiEndpoint('/servers');
  const fallbackEndpoint = '/plugins/web-monitoring/servers';

  // Helper to attempt fetch from an endpoint
  async function tryFetch(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.servers)) {
          return data.servers;
        }
      }
    } catch (err) {
      console.warn(`Fetch error for ${url}:`, err);
    }
    return null;
  }

  // 1. Try primary endpoint
  loadedData = await tryFetch(primaryEndpoint);

  // 2. If primary failed, try fallback endpoint
  if (!loadedData && primaryEndpoint !== fallbackEndpoint) {
    loadedData = await tryFetch(fallbackEndpoint);
  }

  // 3. Fallback to preloaded INITIAL_DATA if present
  if ((!loadedData || loadedData.length === 0) && window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA.servers) && window.INITIAL_DATA.servers.length > 0) {
    loadedData = window.INITIAL_DATA.servers;
  }

  // 4. Fallback to localStorage cached servers from Admin panel
  if (!loadedData || loadedData.length === 0) {
    try {
      const cached = localStorage.getItem('web_monitoring_cached_servers');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedData = parsed;
        }
      }
    } catch (_) {}
  }

  // 5. Fallback to settings payload cache
  if (!loadedData || loadedData.length === 0) {
    try {
      const sSaved = localStorage.getItem('web_monitoring_settings');
      if (sSaved) {
        const pSettings = JSON.parse(sSaved);
        if (pSettings && Array.isArray(pSettings.cached_servers) && pSettings.cached_servers.length > 0) {
          loadedData = pSettings.cached_servers;
        }
      }
    } catch (_) {}
  }

  if (loadedData && loadedData.length > 0) {
    allServers = loadedData;
    setError(false);
  } else if (allServers.length === 0) {
    console.warn('No active servers returned, showing fallback demo servers');
    allServers = DEMO_SERVERS;
  }
  
  renderAll();
  setLoading(false);
  resetTimer();
}

function renderAll() {
  renderGameFilters();
  renderServers();
  updateStats();
}

function renderGameFilters() {
  const gamesMap = new Map();
  allServers.forEach(s => {
    if (!gamesMap.has(s.game_code)) {
      gamesMap.set(s.game_code, s.game_name || s.game_code);
    }
  });

  gameFiltersContainer.innerHTML = '';

  // "All" button
  const allBtn = document.createElement('button');
  allBtn.className = `filter-chip ${selectedGame === 'all' ? 'active' : ''}`;
  allBtn.textContent = t('allGames');
  allBtn.onclick = () => {
    selectedGame = 'all';
    renderAll();
  };
  gameFiltersContainer.appendChild(allBtn);

  // Individual games
  gamesMap.forEach((name, code) => {
    const btn = document.createElement('button');
    btn.className = `filter-chip ${selectedGame === code ? 'active' : ''}`;
    btn.textContent = name;
    btn.onclick = () => {
      selectedGame = code;
      renderAll();
    };
    gameFiltersContainer.appendChild(btn);
  });
}

function renderServers() {
  const query = searchQuery.trim().toLowerCase();

  const filtered = allServers.filter(s => {
    if (selectedGame !== 'all' && s.game_code !== selectedGame) {
      return false;
    }
    if (query) {
      const matchName = (s.name || '').toLowerCase().includes(query);
      const matchGame = (s.game_name || s.game_code || '').toLowerCase().includes(query);
      const matchAddr = `${s.address}:${s.port}`.includes(query);
      return matchName || matchGame || matchAddr;
    }
    return true;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.style.display = 'none';
  emptyState.classList.add('hidden');

  filtered.forEach(server => {
    const card = document.createElement('div');
    card.className = 'server-card';

    const isOnline = server.status === 'online';
    const addressStr = `${server.address || '0.0.0.0'}:${server.port || 0}`;

    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="game-badge">${escapeHtml(server.game_name || server.game_code)}</span>
          <span class="status-pill ${isOnline ? 'online' : 'offline'}">
            <span class="status-dot"></span>
            ${isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <h2 class="server-name">${escapeHtml(server.name)}</h2>
      </div>

      <div>
        <div class="card-address">
          <span class="address-text">${addressStr}</span>
          <button class="btn btn-copy" onclick="copyToClipboard('${addressStr}')" title="${t('copyBtn')}">
            ${t('copyBtn')}
          </button>
        </div>

        <div class="card-actions">
          ${server.connect_url ? `
            <a href="${escapeHtml(server.connect_url)}" class="btn btn-connect">
              ${t('connectBtn')}
            </a>
          ` : ''}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

function updateStats() {
  const total = allServers.length;
  const online = allServers.filter(s => s.status === 'online').length;
  if (statOnlineText) {
    statOnlineText.textContent = t('onlineStat', { online, total });
  }
}

function setLoading(isLoading) {
  if (isLoading) {
    loadingState.style.display = 'block';
    loadingState.classList.remove('hidden');
  } else {
    loadingState.style.display = 'none';
    loadingState.classList.add('hidden');
  }
}

function setError(hasError, msg) {
  if (hasError) {
    errorState.style.display = 'block';
    errorState.classList.remove('hidden');
    if (msg && errorMsg) errorMsg.textContent = msg;
  } else {
    errorState.style.display = 'none';
    errorState.classList.add('hidden');
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(t('copiedToast', { text }));
  }).catch(() => {
    showToast(`IP: ${text}`);
  });
}

function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.style.display = 'none';
    toast.classList.add('hidden');
  }, 2200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// Countdown & Auto Refresh
function startTimer() {
  if (refreshInterval) clearInterval(refreshInterval);
  countdownSeconds = AUTO_REFRESH_SECONDS;
  updateTimerDisplay();

  refreshInterval = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds <= 0) {
      fetchServers();
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function resetTimer() {
  countdownSeconds = AUTO_REFRESH_SECONDS;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  if (timerText) {
    timerText.textContent = `${countdownSeconds}${t('secUnit')}`;
  }
}

// Event Listeners
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderServers();
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    fetchServers();
  });
}

if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    fetchServers();
  });
}

// Init
initTheme();
initLanguage();
initPreloadedData();
fetchServers();
startTimer();