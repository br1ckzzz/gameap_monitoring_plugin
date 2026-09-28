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
    busyNotice: "Сервер перегружен (защита GameAP). Повтор через {sec} с",
    favoritesFilter: "⭐ Избранное",
    favoriteTitle: "Добавить в избранное",
    unfavoriteTitle: "Удалить из избранного",
    categoriesAll: "Все категории",
    showHiddenOffline: "Показать скрытые офлайн-серверы ({count})",
    hideHiddenOffline: "Скрыть офлайн-серверы",
    uptimeBadge: "Аптайм: {time}",
    offlineAccordionTitle: "Офлайн-серверы",
    cardSpoilerToggle: "Консоль и параметры",
    consoleCommandLabel: "Команда консоли:",
    copyCommandBtn: "Копировать команду",
    statusLabel: "Статус:",
    portLabel: "Порт:",
    pingLabel: "Пинг:",
    categoryLabel: "Категория:",
    viewModeTabsTitle: "Вид: Вкладки",
    viewModeAccordionTitle: "Вид: Аккордеоны"
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
    busyNotice: "Server is busy (GameAP protection). Retrying in {sec} s",
    favoritesFilter: "⭐ Favorites",
    favoriteTitle: "Add to favorites",
    unfavoriteTitle: "Remove from favorites",
    categoriesAll: "All Categories",
    showHiddenOffline: "Show offline servers ({count})",
    hideHiddenOffline: "Hide offline servers",
    uptimeBadge: "Uptime: {time}",
    offlineAccordionTitle: "Offline Servers",
    cardSpoilerToggle: "Console & Details",
    consoleCommandLabel: "Console Command:",
    copyCommandBtn: "Copy Command",
    statusLabel: "Status:",
    portLabel: "Port:",
    pingLabel: "Ping:",
    categoryLabel: "Category:",
    viewModeTabsTitle: "View: Tabs",
    viewModeAccordionTitle: "View: Accordions"
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

// 13.1 Favorites Management
const FAVORITES_STORAGE_KEY = 'web_monitoring_favorites';

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map(Number));
      }
    }
  } catch (_) {}
  return new Set();
}

let favoriteServers = loadFavorites();

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoriteServers)));
  } catch (_) {}
}

function isFavorite(serverId) {
  return favoriteServers.has(Number(serverId));
}

function toggleFavorite(serverId) {
  const id = Number(serverId);
  if (favoriteServers.has(id)) {
    favoriteServers.delete(id);
  } else {
    favoriteServers.add(id);
  }
  saveFavorites();
  renderAll();
}
window.toggleFavorite = toggleFavorite;

// 13.12 Anonymous Click Analytics Beacon
function trackServerClick(serverId) {
  if (!serverId) return;
  try {
    const sId = encodeURIComponent(serverId);
    let basePath = window.location.pathname || '';
    const idx = basePath.indexOf('/view');
    if (idx !== -1) {
      basePath = basePath.substring(0, idx);
    }
    basePath = basePath.replace(/\/+$/, '');
    if (!basePath || basePath === '/' || basePath.endsWith('.html') || (!basePath.includes('monitoring') && !basePath.includes('plugins'))) {
      basePath = '/api/plugins/monitoring';
    }

    const url = `${basePath}?action=click&server_id=${sId}`;
    const payload = JSON.stringify({ server_id: Number(serverId) });
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      } catch (_) {}
    }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => {});
  } catch (err) {
    console.warn('trackServerClick error:', err);
  }
}
window.trackServerClick = trackServerClick;

let allServers = [];
let selectedGame = 'all';
let selectedCategory = 'all';
let announcementData = null;
let announcementTimerInterval = null;
let searchQuery = '';
let refreshInterval = null;
let countdownSeconds = autoRefreshSeconds;
let baseDocumentTitle = document.title || 'GameAP | Servers Monitoring';
let currentViewMode = localStorage.getItem('web_monitoring_view_mode') || 'tabs';

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
const brandTitle = document.getElementById('brand-title');
const brandSubtitle = document.getElementById('brand-subtitle');
const loadingText = document.getElementById('loading-text');
const errorTitle = document.getElementById('error-title');
const errorMsg = document.getElementById('error-msg');
const emptyTitle = document.getElementById('empty-title');
const emptyMsg = document.getElementById('empty-msg');
const autoRefreshLabel = document.getElementById('auto-refresh-label');

// Accordions & Spoilers DOM Elements
const offlineAccordion = document.getElementById('offline-accordion');
const offlineAccordionToggle = document.getElementById('offline-accordion-toggle');
const offlineAccordionTitle = document.getElementById('offline-accordion-title');
const offlineCountBadge = document.getElementById('offline-count-badge');
const offlineAccordionBody = document.getElementById('offline-accordion-body');
const offlineServersGrid = document.getElementById('offline-servers-grid');
const viewModeToggle = document.getElementById('view-mode-toggle');
const viewModeTabsBtn = document.getElementById('view-mode-tabs-btn');
const viewModeAccordionBtn = document.getElementById('view-mode-accordion-btn');

function loadCachedAnnouncement() {
  if (window.INITIAL_DATA && window.INITIAL_DATA.announcement !== undefined) {
    if (window.INITIAL_DATA.announcement && window.INITIAL_DATA.announcement.text) {
      announcementData = window.INITIAL_DATA.announcement;
      return;
    } else {
      // Explicitly disabled/null in server preloaded data
      announcementData = null;
      try {
        localStorage.removeItem('web_monitoring_announcement');
      } catch (_) {}
      return;
    }
  }
  try {
    const raw = localStorage.getItem('web_monitoring_announcement');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.text) {
        announcementData = parsed;
        return;
      }
    }
  } catch (_) {}

  try {
    const sRaw = localStorage.getItem('web_monitoring_settings');
    if (sRaw) {
      const s = JSON.parse(sRaw);
      if (s && s.announcement_enabled && s.announcement_text) {
        announcementData = {
          text: s.announcement_text,
          link: s.announcement_link || null,
          banner_type: s.announcement_type || 'warning',
          deadline: s.announcement_deadline || null
        };
        return;
      }
    }
  } catch (_) {}
  announcementData = null;
}

const DEFAULT_SUBTITLES = [
  "Онлайн мониторинг игровых серверов",
  "Online Game Server Monitoring"
];
const DEFAULT_TITLES = [
  "GameAP Servers"
];

let customTitle = null;
let customSubtitle = null;

function detectBrandingCustomizations() {
  loadCachedAnnouncement();
  // 1. Check window.INITIAL_DATA
  if (window.INITIAL_DATA) {
    if (typeof window.INITIAL_DATA.title === 'string' && window.INITIAL_DATA.title.trim() !== '') {
      const t = window.INITIAL_DATA.title.trim();
      if (!DEFAULT_TITLES.includes(t)) customTitle = t;
    }
    if (typeof window.INITIAL_DATA.subtitle === 'string' && window.INITIAL_DATA.subtitle.trim() !== '') {
      const s = window.INITIAL_DATA.subtitle.trim();
      if (!DEFAULT_SUBTITLES.includes(s)) customSubtitle = s;
    }
  }

  // 2. Check localStorage
  try {
    const sSaved = localStorage.getItem('web_monitoring_settings');
    if (sSaved) {
      const p = JSON.parse(sSaved);
      if (!customTitle && typeof p.title === 'string' && p.title.trim() !== '') {
        const t = p.title.trim();
        if (!DEFAULT_TITLES.includes(t)) customTitle = t;
      }
      if (!customSubtitle && typeof p.subtitle === 'string' && p.subtitle.trim() !== '') {
        const s = p.subtitle.trim();
        if (!DEFAULT_SUBTITLES.includes(s)) customSubtitle = s;
      }
    }
  } catch (_) {}

  // 3. Check initial HTML text content if server pre-rendered it
  if (!customTitle && brandTitle) {
    const text = brandTitle.textContent.trim();
    if (text !== '' && !DEFAULT_TITLES.includes(text)) {
      customTitle = text;
    }
  }
  if (!customSubtitle && brandSubtitle) {
    const text = brandSubtitle.textContent.trim();
    if (text !== '' && !DEFAULT_SUBTITLES.includes(text)) {
      customSubtitle = text;
    }
  }
}

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
  if (brandSubtitle) {
    if (customSubtitle) {
      brandSubtitle.textContent = customSubtitle;
    } else {
      brandSubtitle.textContent = t('brandSubtitle');
    }
  }
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
  loadCachedAnnouncement();
  if (!window.INITIAL_DATA) return false;

  if (window.INITIAL_DATA.announcement && window.INITIAL_DATA.announcement.text) {
    announcementData = window.INITIAL_DATA.announcement;
  }

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
    return true;
  }
  return false;
}

// Determine API base path based on current window location
function getApiEndpoint(route = '') {
  let path = window.location.pathname || '';
  const sep = route.includes('?') ? '&' : '?';
  const cleanRoute = (typeof route === 'string') ? route : '';
  const actionName = cleanRoute ? cleanRoute.replace(/^\//, '').split('?')[0] : '';

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

  return `${path}${cleanRoute}${sep}action=${actionName || 'servers'}`;
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
            if (data.announcement && data.announcement.text) {
              announcementData = data.announcement;
              try {
                localStorage.setItem('web_monitoring_announcement', JSON.stringify(announcementData));
              } catch (_) {}
            } else {
              announcementData = null;
              try {
                localStorage.removeItem('web_monitoring_announcement');
              } catch (_) {}
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
  renderAnnouncement();
  renderCategoryTabs();
  renderGameFilters();
  renderServers();
  updateStats();
}

const announcementBar = document.getElementById('announcement-bar');

function renderAnnouncement() {
  if (!announcementBar) return;
  if (!announcementData || !announcementData.text) {
    announcementBar.classList.add('hidden');
    announcementBar.innerHTML = '';
    if (announcementTimerInterval) {
      clearInterval(announcementTimerInterval);
      announcementTimerInterval = null;
    }
    return;
  }

  const type = announcementData.banner_type || 'info';
  const typeIcon = type === 'warning' ? '⚠️' : (type === 'success' ? '🏆' : '📢');

  function getCountdownText() {
    if (!announcementData.deadline) return '';
    const diff = new Date(announcementData.deadline).getTime() - Date.now();
    if (isNaN(diff) || diff <= 0) return '';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const dStr = days > 0 ? `${days}д ` : '';
    return `⏳ ${dStr}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const countdownText = getCountdownText();

  const safeLink = (announcementData.link && !/^javascript:/i.test(announcementData.link.trim())) ? announcementData.link.trim() : null;

  announcementBar.className = `announcement-bar banner-${type}`;
  announcementBar.innerHTML = `
    <div class="announcement-content">
      <span class="announcement-icon">${typeIcon}</span>
      <div class="announcement-text-wrap">
        <span class="announcement-text">${escapeHtml(announcementData.text)}</span>
        ${safeLink ? `<a href="${escapeHtml(safeLink)}" target="_blank" rel="noopener" class="announcement-link">Подробнее &rarr;</a>` : ''}
      </div>
      ${countdownText ? `<span class="announcement-timer" id="announcement-timer-ticker">${countdownText}</span>` : ''}
    </div>
  `;
  announcementBar.classList.remove('hidden');

  if (announcementData.deadline && !announcementTimerInterval) {
    announcementTimerInterval = setInterval(() => {
      const ticker = document.getElementById('announcement-timer-ticker');
      if (ticker) {
        const text = getCountdownText();
        if (text) {
          ticker.textContent = text;
        } else {
          ticker.remove();
        }
      }
    }, 1000);
  }
}

const categoryTabsContainer = document.getElementById('category-tabs');

function renderCategoryTabs() {
  const categoriesSet = new Set();
  allServers.forEach(s => {
    if (s.category && s.category.trim()) {
      categoriesSet.add(s.category.trim());
    }
  });

  if (viewModeToggle) {
    if (categoriesSet.size > 0) {
      viewModeToggle.classList.remove('hidden');
      if (viewModeTabsBtn) {
        viewModeTabsBtn.classList.toggle('active', currentViewMode === 'tabs');
        viewModeTabsBtn.title = t('viewModeTabsTitle');
      }
      if (viewModeAccordionBtn) {
        viewModeAccordionBtn.classList.toggle('active', currentViewMode === 'accordion');
        viewModeAccordionBtn.title = t('viewModeAccordionTitle');
      }
    } else {
      viewModeToggle.classList.add('hidden');
    }
  }

  if (!categoryTabsContainer) return;

  if (categoriesSet.size === 0) {
    categoryTabsContainer.classList.add('hidden');
    categoryTabsContainer.innerHTML = '';
    return;
  }

  categoryTabsContainer.classList.remove('hidden');
  categoryTabsContainer.innerHTML = '';

  const allTab = document.createElement('button');
  allTab.className = `category-tab ${selectedCategory === 'all' ? 'active' : ''}`;
  allTab.textContent = t('categoriesAll');
  allTab.onclick = () => {
    selectedCategory = 'all';
    renderAll();
  };
  categoryTabsContainer.appendChild(allTab);

  categoriesSet.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = `category-tab ${selectedCategory === cat ? 'active' : ''}`;
    tab.textContent = cat;
    tab.onclick = () => {
      selectedCategory = cat;
      renderAll();
    };
    categoryTabsContainer.appendChild(tab);
  });
}

function renderGameFilters() {
  const gamesMap = new Map();
  allServers.forEach(s => {
    if (!gamesMap.has(s.game_code)) {
      gamesMap.set(s.game_code, s.game_name || s.game_code);
    }
  });

  gameFiltersContainer.innerHTML = '';

  // 13.1 Favorites Button
  if (favoriteServers.size > 0) {
    const favBtn = document.createElement('button');
    favBtn.className = `filter-chip filter-chip-fav ${selectedGame === 'favorites' ? 'active' : ''}`;
    favBtn.innerHTML = `<span>★</span> ${t('favoritesFilter')} <span class="fav-count">${favoriteServers.size}</span>`;
    favBtn.onclick = () => {
      selectedGame = (selectedGame === 'favorites') ? 'all' : 'favorites';
      renderAll();
    };
    gameFiltersContainer.appendChild(favBtn);
  }

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

function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function toggleHiddenOffline() {
  toggleOfflineAccordion();
}
window.toggleHiddenOffline = toggleHiddenOffline;

function normalizeGameCode(code) {
  if (!code) return '';
  const c = String(code).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (c === 'cs2' || c === 'csgo' || c === 'counterstrike2') return 'csgo';
  if (c === 'cstrike' || c === 'cs' || c === 'cs16' || c === 'counterstrike') return 'cs';
  if (c === 'css' || c === 'cstrikesource' || c === 'cstrike_source' || c === 'cssource') return 'css';
  if (c === 'tf2' || c === 'tf' || c === 'teamfortress2') return 'tf2';
  if (c === 'garrysmod' || c === 'gmod') return 'garrysmod';
  if (c === 'l4d2' || c === 'left4dead2') return 'l4d2';
  if (c === 'dods' || c === 'dayofdefeatsource') return 'dods';
  if (c === 'dod' || c === 'dayofdefeat') return 'dod';
  if (c === 'hl2mp') return 'hl2mp';
  if (c === 'killingfloor' || c === 'kf') return 'killingfloor';
  if (c === '7dtd' || c === 'sdtd') return 'sdtd';
  if (c === 'minecraft' || c === 'mc') return 'minecraft';
  return '';
}

function cleanMapName(mapName) {
  if (!mapName) return '';
  let m = String(mapName).trim().toLowerCase();
  m = m.replace(/^workshop[\/\\][0-9]+[\/\\]/, '');
  m = m.replace(/\s+/g, '_');
  return m;
}

function getMapPreviewUrl(gameCode, mapName) {
  const clean = cleanMapName(mapName);
  if (!clean) return null;
  const gtGame = normalizeGameCode(gameCode);
  if (!gtGame) return null;
  return `https://image.gametracker.com/images/maps/160x120/${gtGame}/${clean}.jpg`;
}

// Game banners library mapping game codes to Steam App IDs
const STEAM_APP_MAP = {
  // Valve / Counter-Strike
  cs2: 730,
  csgo: 730,
  counterstrike2: 730,
  counterstrikeglobaloffensive: 730,
  cstrike: 10,
  cs: 10,
  cs16: 10,
  counterstrike: 10,
  css: 240,
  cssource: 240,
  cstrikesource: 240,
  cstrike_source: 240,
  czero: 80,
  cscz: 80,
  conditionzero: 80,
  tf2: 440,
  tf: 440,
  teamfortress2: 440,
  tfc: 20,
  teamfortressclassic: 20,
  hl2mp: 320,
  halflife2deathmatch: 320,
  dods: 300,
  dayofdefeatsource: 300,
  dod: 30,
  dayofdefeat: 30,
  hl1: 70,
  valve: 70,
  hldm: 70,
  op4: 50,
  ricochet: 60,
  dmc: 40,
  bms: 362890,
  l4d2: 550,
  left4dead2: 550,
  l4d: 500,
  left4dead: 500,
  garrysmod: 4000,
  gmod: 4000,
  synergy: 17520,
  svencoop: 225300,

  // Survival & Sandbox
  rust: 252490,
  valheim: 892970,
  astroneer: 361420,
  palworld: 1623730,
  palwrld: 1623730,
  enshrouded: 1203630,
  corekeeper: 1621690,
  spaceengineers: 244850,
  barotrauma: 602960,
  raft: 648800,
  ark: 346110,
  arkse: 346110,
  arksurvivalevolved: 346110,
  asa: 2399830,
  arksurvivalascended: 2399830,
  '7dtd': 251570,
  '7d2d': 251570,
  sdtd: 251570,
  '7daystodie': 251570,
  dayz: 221100,
  projectzomboid: 108600,
  pz: 108600,
  terraria: 105600,
  starbound: 211820,
  conanexiles: 440900,
  conan: 440900,
  theforest: 242760,
  the_forest: 242760,
  'the-forest': 242760,
  forest: 242760,
  sonsoftheforest: 1326470,
  sotf: 1326470,
  dontstarvetogether: 322330,
  dst: 322330,
  scum: 513710,
  vrising: 1604030,
  v_rising: 1604030,
  satisfactory: 526870,
  factorio: 427520,
  hurtworld: 393420,
  rok: 344760,

  // Shooters & Tactical
  killingfloor: 1250,
  kf: 1250,
  killingfloor2: 232090,
  kf2: 232090,
  arma3: 107410,
  a3: 107410,
  arma2: 33900,
  a2: 33900,
  arma2oa: 33930,
  a2oa: 33930,
  squad: 393380,
  unturned: 304930,
  insurgency: 222880,
  sandstorm: 581320,
  insurgencysandstorm: 581320,
  payday2: 218620,
  cod4: 7940,
  samp: 12120,
  gtasa: 12120,
  gta: 12120,
  mta: 12120,
  fivem: 271590,
};

function getGameBannerUrl(gameCode) {
  if (!gameCode) return null;
  const c = String(gameCode).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!c) return null;
  if (c === 'minecraft' || c === 'mc') {
    return 'https://image.gametracker.com/images/maps/160x120/minecraft/default.jpg';
  }
  const appId = STEAM_APP_MAP[c];
  if (appId) {
    // Akamai Steam CDN is globally reliable and unblocked
    return `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;
  }
  return null;
}

function getGameBannerFallbackUrl(gameCode) {
  if (!gameCode) return null;
  const c = String(gameCode).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!c) return null;
  const appId = STEAM_APP_MAP[c];
  if (appId) {
    return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
  }
  return null;
}

function handleCardHeroError(img) {
  const fallbackSrc = img.getAttribute('data-fallback-src');
  if (fallbackSrc && img.src !== fallbackSrc) {
    img.removeAttribute('data-fallback-src');
    img.src = fallbackSrc;
    return;
  }
  const hero = img.closest('.card-hero');
  if (hero) hero.classList.add('no-image');
  img.remove();
}
window.handleCardHeroError = handleCardHeroError;

function toggleCardSpoiler(btn, serverId) {
  if (!btn) return;
  const content = document.getElementById(`card-spoiler-${serverId}`) || (btn.parentElement && btn.parentElement.querySelector('.card-spoiler-content'));
  if (!content) return;
  const isOpen = btn.classList.toggle('is-open');
  content.classList.toggle('hidden', !isOpen);
}
window.toggleCardSpoiler = toggleCardSpoiler;

function toggleClusterAccordion(btn, catSafeId) {
  if (!btn) return;
  const body = document.getElementById(`cluster-body-${catSafeId}`);
  if (!body) return;
  const isOpen = btn.classList.toggle('is-open');
  body.classList.toggle('hidden', !isOpen);
}
window.toggleClusterAccordion = toggleClusterAccordion;

function toggleOfflineAccordion() {
  if (!offlineAccordionToggle || !offlineAccordionBody) return;
  const isOpen = offlineAccordionToggle.classList.toggle('is-open');
  offlineAccordionToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  offlineAccordionBody.classList.toggle('hidden', !isOpen);
  try {
    localStorage.setItem('web_monitoring_offline_open', isOpen ? 'true' : 'false');
  } catch (_) {}
}
window.toggleOfflineAccordion = toggleOfflineAccordion;
if (offlineAccordionToggle) {
  offlineAccordionToggle.addEventListener('click', toggleOfflineAccordion);
}

function createServerCard(server) {
  const card = document.createElement('div');
  const isOnline = server.status === 'online';
  const addressStr = `${server.address || '0.0.0.0'}:${server.port || 0}`;

  let initialImgUrl = null;
  let fallbackImgUrl = null;

  const gameBannerUrl = getGameBannerUrl(server.game_code);
  const gameBannerFallback = getGameBannerFallbackUrl(server.game_code);

  if (isOnline) {
    const mapPreviewUrl = server.map ? getMapPreviewUrl(server.game_code, server.map) : null;
    if (mapPreviewUrl) {
      initialImgUrl = mapPreviewUrl;
      fallbackImgUrl = gameBannerUrl;
    } else if (gameBannerUrl) {
      initialImgUrl = gameBannerUrl;
      fallbackImgUrl = gameBannerFallback;
    }
  } else {
    if (gameBannerUrl) {
      initialImgUrl = gameBannerUrl;
      fallbackImgUrl = gameBannerFallback;
    }
  }

  const hasPlayers = server.max_players !== undefined && server.max_players > 0;
  const currentPlayers = server.players !== undefined ? Math.max(0, server.players) : 0;
  const maxPlayers = hasPlayers ? server.max_players : 0;
  const playerPercent = (hasPlayers && maxPlayers > 0) ? Math.min(100, Math.round((currentPlayers / maxPlayers) * 100)) : 0;

  let pingClass = 'ping-good';
  if (server.ping !== undefined) {
    if (server.ping > 120) pingClass = 'ping-bad';
    else if (server.ping > 60) pingClass = 'ping-warn';
  }

  // Build meta items
  let metaHtml = '';
  const metaParts = [];

  // 13.6 Uptime Badge
  if (server.uptime_seconds) {
    const uStr = formatUptime(server.uptime_seconds);
    if (uStr) {
      metaParts.push(`
        <span class="meta-item meta-uptime" title="Uptime: ${uStr}">
          ⏱️ ${uStr}
        </span>
      `);
    }
  }

  if (hasPlayers) {
    metaParts.push(`
      <div class="meta-item meta-players" title="Players: ${currentPlayers} / ${maxPlayers}">
        <span class="meta-label">👥 ${currentPlayers}/${maxPlayers}</span>
        <div class="player-bar-track">
          <div class="player-bar-fill" style="width: ${playerPercent}%;"></div>
        </div>
      </div>
    `);
  } else if (server.players !== undefined && server.players > 0) {
    metaParts.push(`<span class="meta-item" title="Players">👥 ${server.players}</span>`);
  }

  if (server.ping !== undefined && server.ping > 0) {
    metaParts.push(`
      <span class="meta-item meta-ping ${pingClass}" title="Ping: ${server.ping} ms">
        <span class="ping-dot"></span>
        <span>${server.ping} ms</span>
      </span>
    `);
  }

  if (metaParts.length > 0) {
    metaHtml = `<div class="card-meta">${metaParts.join('')}</div>`;
  }

  card.className = `server-card ${isOnline ? 'is-online' : 'is-offline'} ${isFavorite(server.id) ? 'is-favorite' : ''}`;

  card.innerHTML = `
    <div class="card-hero ${!isOnline ? 'is-offline' : ''} ${!initialImgUrl ? 'no-image' : ''}">
      ${initialImgUrl ? `
        <img class="card-hero-img is-loaded" 
             src="${escapeHtml(initialImgUrl)}" 
             ${fallbackImgUrl ? `data-fallback-src="${escapeHtml(fallbackImgUrl)}"` : ''}
             alt="" 
             aria-hidden="true"
             referrerpolicy="no-referrer"
             onload="this.classList.add('is-loaded')"
             onerror="window.handleCardHeroError(this)" />
      ` : ''}
      <div class="card-hero-overlay"></div>
      <div class="card-hero-top">
        <div class="card-hero-badges">
          <span class="game-badge">${escapeHtml(server.game_name || server.game_code)}</span>
          ${server.category ? `<span class="category-badge">${escapeHtml(server.category)}</span>` : ''}
        </div>
        <div class="card-hero-actions">
          <button class="favorite-star-btn ${isFavorite(server.id) ? 'is-fav' : ''}" 
                  title="${isFavorite(server.id) ? t('unfavoriteTitle') : t('favoriteTitle')}" 
                  onclick="event.stopPropagation(); window.toggleFavorite(${server.id})">★</button>
          <span class="status-pill ${isOnline ? 'online' : 'offline'}">
            <span class="status-dot"></span>
            ${isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      ${isOnline && server.map ? `
        <div class="card-hero-bottom">
          <span class="map-chip" title="Map: ${escapeHtml(server.map)}">
            <svg class="icon-map" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
            <span class="map-chip-text">${escapeHtml(server.map)}</span>
          </span>
        </div>
      ` : ''}
    </div>

    <div class="card-body">
      <div class="card-body-top">
        <h2 class="server-name" title="${escapeHtml(server.name)}">${escapeHtml(server.name)}</h2>
        ${metaHtml}
      </div>

      <div class="card-body-bottom">
        <div class="card-address">
          <span class="address-text">${escapeHtml(addressStr)}</span>
          <button class="btn btn-copy" type="button" data-copy="${escapeHtml(addressStr)}" data-server-id="${server.id}" title="${t('copyBtn')}">
            ${t('copyBtn')}
          </button>
        </div>

        <div class="card-actions">
          ${isOnline && server.connect_url ? `
            <a href="${escapeHtml(server.connect_url)}" class="btn btn-connect" onclick="window.trackServerClick(${server.id})">
              <svg class="icon-connect" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              ${t('connectBtn')}
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Card Spoiler / Accordion for Console & Extra Details -->
      <div class="card-spoiler-wrap">
        <button type="button" class="btn-spoiler-toggle" onclick="window.toggleCardSpoiler(this, ${server.id})">
          <span>${t('cardSpoilerToggle')}</span>
          <span class="spoiler-arrow">▼</span>
        </button>
        <div class="card-spoiler-content hidden" id="card-spoiler-${server.id}">
          <div class="spoiler-row">
            <span class="spoiler-key">${t('consoleCommandLabel')}</span>
            <div class="spoiler-cmd-box">
              <code>connect ${escapeHtml(addressStr)}</code>
              <button type="button" class="btn-copy-sm" data-copy="connect ${escapeHtml(addressStr)}" data-server-id="${server.id}" title="${t('copyCommandBtn')}">📋</button>
            </div>
          </div>
          <div class="spoiler-details-grid">
            <div class="spoiler-detail-item">
              <span class="detail-label">${t('statusLabel')}</span>
              <span class="detail-val ${isOnline ? 'text-online' : 'text-offline'}">${isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div class="spoiler-detail-item">
              <span class="detail-label">${t('portLabel')}</span>
              <span class="detail-val">${server.port || 0}</span>
            </div>
            ${(server.ping !== undefined && server.ping > 0) ? `
              <div class="spoiler-detail-item">
                <span class="detail-label">${t('pingLabel')}</span>
                <span class="detail-val">${server.ping} ms</span>
              </div>
            ` : ''}
            ${server.category ? `
              <div class="spoiler-detail-item">
                <span class="detail-label">${t('categoryLabel')}</span>
                <span class="detail-val">${escapeHtml(server.category)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  return card;
}

function renderServers() {
  const query = searchQuery.trim().toLowerCase();

  const filtered = allServers.filter(s => {
    // 13.5 Cluster / Category filter (in tabs mode)
    if (currentViewMode !== 'accordion' && selectedCategory !== 'all' && s.category !== selectedCategory) {
      return false;
    }

    // 13.1 Favorites filter or Game filter
    if (selectedGame === 'favorites') {
      if (!isFavorite(s.id)) return false;
    } else if (selectedGame !== 'all' && s.game_code !== selectedGame) {
      return false;
    }

    if (query) {
      const matchName = (s.name || '').toLowerCase().includes(query);
      const matchGame = (s.game_name || s.game_code || '').toLowerCase().includes(query);
      const matchAddr = `${s.address}:${s.port}`.includes(query);
      const matchCat = (s.category || '').toLowerCase().includes(query);
      return matchName || matchGame || matchAddr || matchCat;
    }
    return true;
  });

  // 13.1 Pin favorites to top
  if (selectedGame !== 'favorites') {
    filtered.sort((a, b) => {
      const favA = isFavorite(a.id) ? 1 : 0;
      const favB = isFavorite(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return 0;
    });
  }

  const onlineServers = filtered.filter(s => s.status === 'online');
  const offlineServers = filtered.filter(s => s.status !== 'online');

  grid.innerHTML = '';

  if (onlineServers.length === 0 && offlineServers.length === 0) {
    emptyState.style.display = 'block';
    emptyState.classList.remove('hidden');
    if (offlineAccordion) offlineAccordion.classList.add('hidden');
    return;
  }
  emptyState.style.display = 'none';
  emptyState.classList.add('hidden');

  // Check if accordion view mode is selected for clusters/categories
  const hasCategories = allServers.some(s => s.category && s.category.trim());
  if (currentViewMode === 'accordion' && hasCategories) {
    // Group online servers by category
    const catMap = new Map();
    onlineServers.forEach(s => {
      const cat = s.category || t('categoriesAll');
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat).push(s);
    });

    catMap.forEach((servers, catName) => {
      const catSafeId = 'cat-' + catName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const clusterDiv = document.createElement('div');
      clusterDiv.className = 'cluster-accordion';
      clusterDiv.id = `cluster-${catSafeId}`;
      clusterDiv.innerHTML = `
        <button type="button" class="accordion-header is-open" onclick="window.toggleClusterAccordion(this, '${catSafeId}')">
          <div class="accordion-header-left">
            <span class="accordion-title">${escapeHtml(catName)}</span>
            <span class="cluster-badge">${servers.length}</span>
          </div>
          <span class="accordion-arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </button>
        <div class="accordion-body" id="cluster-body-${catSafeId}">
          <div class="servers-grid"></div>
        </div>
      `;
      const bodyGrid = clusterDiv.querySelector('.servers-grid');
      servers.forEach(s => bodyGrid.appendChild(createServerCard(s)));
      grid.appendChild(clusterDiv);
    });
  } else {
    // Standard flat grid for online servers
    onlineServers.forEach(server => {
      grid.appendChild(createServerCard(server));
    });
  }

  // Render offline servers into #offline-accordion
  if (offlineAccordion && offlineServersGrid) {
    if (offlineServers.length > 0) {
      offlineAccordion.classList.remove('hidden');
      if (offlineCountBadge) offlineCountBadge.textContent = offlineServers.length;
      if (offlineAccordionTitle) offlineAccordionTitle.textContent = t('offlineAccordionTitle');

      offlineServersGrid.innerHTML = '';
      offlineServers.forEach(server => {
        offlineServersGrid.appendChild(createServerCard(server));
      });

      // Maintain or set open state
      const savedOpen = localStorage.getItem('web_monitoring_offline_open');
      const shouldBeOpen = (savedOpen === 'true') || (onlineServers.length === 0 && offlineServers.length > 0);
      if (offlineAccordionToggle && offlineAccordionBody) {
        if (shouldBeOpen) {
          offlineAccordionToggle.classList.add('is-open');
          offlineAccordionToggle.setAttribute('aria-expanded', 'true');
          offlineAccordionBody.classList.remove('hidden');
        } else {
          offlineAccordionToggle.classList.remove('is-open');
          offlineAccordionToggle.setAttribute('aria-expanded', 'false');
          offlineAccordionBody.classList.add('hidden');
        }
      }
    } else {
      offlineAccordion.classList.add('hidden');
      offlineServersGrid.innerHTML = '';
    }
  }
}

function updateDocumentTitle(isError = false) {
  if (isError) {
    document.title = `(⚠️ Error) • ${baseDocumentTitle}`;
    return;
  }
  const total = allServers.length;
  const online = allServers.filter(s => s.status === 'online').length;
  if (selectedGame !== 'all') {
    const filteredOnline = allServers.filter(s => s.game_code === selectedGame && s.status === 'online').length;
    const filteredTotal = allServers.filter(s => s.game_code === selectedGame).length;
    const gameServer = allServers.find(s => s.game_code === selectedGame);
    const gameName = gameServer ? (gameServer.game_name || gameServer.game_code) : selectedGame;
    document.title = `(${filteredOnline}/${filteredTotal} ${gameName}) • ${baseDocumentTitle}`;
  } else {
    document.title = `(${online}/${total} Online) • ${baseDocumentTitle}`;
  }
}

function updateStats() {
  const total = allServers.length;
  const online = allServers.filter(s => s.status === 'online').length;
  if (statOnlineText) {
    statOnlineText.textContent = t('onlineStat', { online, total });
  }
  updateDocumentTitle();
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
    updateDocumentTitle(true);
  } else {
    errorState.style.display = 'none';
    errorState.classList.add('hidden');
    updateDocumentTitle(false);
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

let toastTimer = null;
function showToast(msg) {
  const toastEl = toast || document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  toastEl.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.display = 'none';
    toastEl.classList.add('hidden');
    toastTimer = null;
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

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-copy, .btn-copy-sm');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    const val = btn.getAttribute('data-copy');
    const sId = btn.getAttribute('data-server-id');
    if (val) {
      copyToClipboard(val);
    }
    if (sId) {
      try {
        trackServerClick(sId);
      } catch (err) {
        console.warn('trackServerClick failed:', err);
      }
    }
  }
});

function setViewMode(mode) {
  currentViewMode = mode;
  try {
    localStorage.setItem('web_monitoring_view_mode', mode);
  } catch (_) {}
  if (viewModeTabsBtn && viewModeAccordionBtn) {
    viewModeTabsBtn.classList.toggle('active', mode === 'tabs');
    viewModeAccordionBtn.classList.toggle('active', mode === 'accordion');
  }
  renderAll();
}

if (viewModeTabsBtn) {
  viewModeTabsBtn.addEventListener('click', () => setViewMode('tabs'));
}
if (viewModeAccordionBtn) {
  viewModeAccordionBtn.addEventListener('click', () => setViewMode('accordion'));
}

function initCustomBranding() {
  detectBrandingCustomizations();
  if (customTitle && brandTitle) {
    brandTitle.textContent = customTitle;
  }
  if (customSubtitle && brandSubtitle) {
    brandSubtitle.textContent = customSubtitle;
  }

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
detectBrandingCustomizations();
initLanguage();
const hasPreloaded = initPreloadedData();
initCustomBranding();
startTimer();
if (!hasPreloaded) {
  fetchServers();
}