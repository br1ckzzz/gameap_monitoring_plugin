// GameAP WebMonitoring Frontend Script

let autoRefreshSeconds = 15;

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
    nextLang: "EN",
    busyNotice: "Сервер перегружен (защита GameAP). Повтор через {sec} с"
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
    nextLang: "RU",
    busyNotice: "Server is busy (GameAP protection). Retrying in {sec} s"
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
let countdownSeconds = autoRefreshSeconds;

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

  if (window.INITIAL_DATA.refresh_interval) {
    const parsedInterval = parseInt(window.INITIAL_DATA.refresh_interval, 10);
    if (!isNaN(parsedInterval) && parsedInterval > 0) {
      autoRefreshSeconds = parsedInterval;
      countdownSeconds = autoRefreshSeconds;
      updateTimerDisplay();
    }
  }

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
  let path = window.location.pathname || '';
  const sep = route.includes('?') ? '&' : '?';
  const actionName = route.replace(/^\//, '').split('?')[0];

  // Strip /view or /view/ if opened via legacy route
  const idx = path.indexOf('/view');
  if (idx !== -1) {
    path = path.substring(0, idx);
  }
  path = path.replace(/\/+$/, '');

  // If path is root or standalone HTML file, use canonical plugin endpoint
  if (!path || path === '/' || path.endsWith('.html') || (!path.includes('monitoring') && !path.includes('plugins'))) {
    path = '/api/plugins/monitoring';
  }

  return `${path}${route}${sep}action=${actionName}`;
}

async function fetchServers(isManual = false) {
  if (allServers.length === 0) {
    setLoading(true);
  }
  
  try {
    let loadedData = null;
    const cacheBuster = `_t=${Date.now()}${isManual ? '&refresh=1' : ''}`;
    const appendCb = (url) => url + (url.includes('?') ? '&' : '?') + cacheBuster;

    const primaryEndpoint = appendCb(getApiEndpoint('/servers'));
    const directEndpoint = appendCb('/api/plugins/monitoring?action=servers');
    const fallbackEndpoint = appendCb('/api/plugins/monitorine/servers');
    const fallbackEndpoint2 = appendCb('/plugins/web-monitoring/servers');

    function handleRateLimit(retrySec) {
      console.warn(`GameAP returned 429/503, backing off for ${retrySec}s`);
      countdownSeconds = retrySec + 2;
      updateTimerDisplay();
      showToast(t('busyNotice', { sec: retrySec }));
    }

    // Helper to attempt fetch from an endpoint
    async function tryFetch(url) {
      try {
        const controller = new AbortController();
        // Synchronized with GameAP v4.5.3 PLUGINS_ROUTES_QUEUE_TIMEOUT (10s)
        const timeoutId = setTimeout(() => controller.abort(), 9500);
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeoutId);

        // Handle GameAP v4.5.3 DoS protection and rate-limiting
        if (res.status === 429 || res.status === 503) {
          let retrySec = 5;
          const retryHeader = res.headers.get('Retry-After');
          if (retryHeader) {
            const parsed = parseInt(retryHeader, 10);
            if (!isNaN(parsed) && parsed > 0) {
              retrySec = parsed;
            }
          } else if (res.status === 429) {
            retrySec = 10;
          }
          return { rateLimited: true, status: res.status, retryAfter: retrySec };
        }

        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.refresh_interval) {
              const parsedInt = parseInt(data.refresh_interval, 10);
              if (!isNaN(parsedInt) && parsedInt > 0 && parsedInt !== autoRefreshSeconds) {
                autoRefreshSeconds = parsedInt;
              }
            }
            if (Array.isArray(data.servers)) {
              return { success: true, servers: data.servers };
            }
          }
        }
      } catch (err) {
        console.warn(`Fetch error for ${url}:`, err);
      }
      return null;
    }

    // 1. Try primary endpoint
    const primaryRes = await tryFetch(primaryEndpoint);
    if (primaryRes && primaryRes.rateLimited) {
      handleRateLimit(primaryRes.retryAfter);
      return;
    }
    if (primaryRes && primaryRes.success) {
      loadedData = primaryRes.servers;
    }

    // 2. If primary failed, try direct canonical action endpoint
    if (!loadedData && primaryEndpoint !== directEndpoint) {
      const dirRes = await tryFetch(directEndpoint);
      if (dirRes && dirRes.rateLimited) {
        handleRateLimit(dirRes.retryAfter);
        return;
      }
      if (dirRes && dirRes.success) {
        loadedData = dirRes.servers;
      }
    }

    // 3. If still no data, try fallback endpoints (only on 404/network error, NOT 429/503)
    if (!loadedData && primaryEndpoint !== fallbackEndpoint) {
      const fb1 = await tryFetch(fallbackEndpoint);
      if (fb1 && fb1.rateLimited) {
        handleRateLimit(fb1.retryAfter);
        return;
      }
      if (fb1 && fb1.success) {
        loadedData = fb1.servers;
      }
    }

    // 4. Try legacy static plugin endpoint
    if (!loadedData && primaryEndpoint !== fallbackEndpoint2) {
      const fb2 = await tryFetch(fallbackEndpoint2);
      if (fb2 && fb2.rateLimited) {
        handleRateLimit(fb2.retryAfter);
        return;
      }
      if (fb2 && fb2.success) {
        loadedData = fb2.servers;
      }
    }

    // 5. Fallback to preloaded INITIAL_DATA ONLY on initial load when allServers is empty
    if ((!loadedData || loadedData.length === 0) && allServers.length === 0 && window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA.servers) && window.INITIAL_DATA.servers.length > 0) {
      loadedData = window.INITIAL_DATA.servers;
    }

    // 6. Fallback to localStorage cached servers from Admin panel (initial load only)
    if ((!loadedData || loadedData.length === 0) && allServers.length === 0) {
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

    // 7. Fallback to settings payload cache (initial load only)
    if ((!loadedData || loadedData.length === 0) && allServers.length === 0) {
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

    if (loadedData !== null && loadedData !== undefined) {
      allServers = loadedData;
      setError(false);
    } else if (allServers.length === 0) {
      console.warn('No active servers returned from API');
      allServers = [];
      setError(true);
    } else if (isManual) {
      showToast(t('errorTitle'));
    }
  } catch (outerErr) {
    console.error('fetchServers error:', outerErr);
  } finally {
    renderAll();
    setLoading(false);
    resetTimer();
  }
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
          <span class="address-text">${escapeHtml(addressStr)}</span>
          <button class="btn btn-copy" type="button" data-copy="${escapeHtml(addressStr)}" title="${t('copyBtn')}">
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

function fallbackCopyText(text) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-999999px";
    textArea.style.left = "-999999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      showToast(t('copiedToast', { text }));
      return;
    }
  } catch (err) {
    console.warn("Fallback copy failed", err);
  }
  showToast(`IP: ${text}`);
}

function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(t('copiedToast', { text }));
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

window.copyToClipboard = copyToClipboard;

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
  countdownSeconds = autoRefreshSeconds;
  updateTimerDisplay();

  refreshInterval = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds <= 0) {
      fetchServers(false);
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function resetTimer() {
  startTimer();
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
    resetTimer();
    fetchServers(true);
  });
}

const brandLink = document.getElementById('brand-link');
if (brandLink) {
  brandLink.addEventListener('click', (e) => {
    // If URL has search params or filters are active, smooth reset
    if (window.location.search || searchQuery || selectedGame !== 'all') {
      e.preventDefault();
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      selectedGame = 'all';
      const allBtn = document.getElementById('all-games-btn');
      if (allBtn) {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        allBtn.classList.add('active');
      }
      if (window.history && window.history.pushState) {
        const cleanUrl = window.location.pathname.replace(/\/view\/?$/, '');
        window.history.pushState(null, '', cleanUrl || '/');
      }
      renderServers();
      updateStats();
    }
  });
}

if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    fetchServers();
  });
}

if (grid) {
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-copy');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      const val = btn.getAttribute('data-copy');
      if (val) {
        copyToClipboard(val);
      }
    }
  });
}

function initCustomBranding() {
  let logo = '';
  let favicon = '';
  if (window.INITIAL_DATA) {
    if (window.INITIAL_DATA.logo_url) logo = window.INITIAL_DATA.logo_url;
    if (window.INITIAL_DATA.favicon_url) favicon = window.INITIAL_DATA.favicon_url;
  }
  if (!logo || !favicon) {
    try {
      const sSaved = localStorage.getItem('web_monitoring_settings');
      if (sSaved) {
        const p = JSON.parse(sSaved);
        if (!logo && p.logo_url) logo = p.logo_url;
        if (!favicon && p.favicon_url) favicon = p.favicon_url;
      }
    } catch (_) {}
  }
  if (logo) {
    const brandContainer = document.querySelector('.brand');
    const brandIcon = document.querySelector('.brand-icon');
    if (brandContainer) {
      const existingImg = brandContainer.querySelector('.brand-logo');
      if (!existingImg) {
        const img = document.createElement('img');
        img.src = logo;
        img.alt = 'Logo';
        img.className = 'brand-logo';
        if (brandIcon) {
          brandContainer.replaceChild(img, brandIcon);
        } else {
          brandContainer.insertBefore(img, brandContainer.firstChild);
        }
      }
    }
  }
  if (favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favicon;
  }
}

// Init
initTheme();
initLanguage();
initPreloadedData();
initCustomBranding();
startTimer();
fetchServers();