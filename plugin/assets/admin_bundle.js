// Vue 3 Component Bundle for GameAP Admin Panel
// Export single named export 'webMonitoringPlugin' to avoid duplicate menu items in GameAP
const { ref, computed, onMounted, onUnmounted, h } = window.Vue || Vue;

export const webMonitoringPlugin = {
    id: 'monitoring',
    name: 'GameAP WebMonitoring',
    version: '1.0.4',
    description: 'Публичная страница для отображения работающих серверов / Public online game server monitoring',
    author: 'GameAP Community',
    menuItems: [
        {
            section: 'admin',
            group: 'admin',
            icon: 'fas fa-chart-line',
            text: 'Мониторинг',
            title: 'Мониторинг',
            route: { name: 'index' },
            order: 100
        }
    ],
    routes: [
        {
            path: '/',
            name: 'index',
            component: {
                name: 'WebMonitoringAdmin',
                setup() {
                    // Internationalization dictionary
                    const i18n = {
                        ru: {
                            pluginTitle: 'Настройка веб-мониторинга серверов',
                            pluginSubtitle: 'Плагин публичного онлайн-мониторинга для GameAP v1.0.5',
                            openMonitoring: 'Открыть мониторинг',
                            publicUrlLabel: 'Публичный URL:',
                            publicUrlHint: 'Поддерживаются оба формата адреса: прямой /api/plugins/monitoring и классический /view',
                            copyUrl: 'Копировать адрес страницы',
                            copiedUrl: '✓ Скопировано!',
                            securityWarningTitle: '⚠️ Безопасность и защита от DDoS-атак:',
                            securityWarningText: 'Крайне не рекомендуется открывать доступ к мониторингу публично по прямому IP-адресу (http://IP:PORT). Раскрытие прямого IP хоста GameAP создает прямую угрозу целевых DDoS-атак на панель и игровые серверы. Обязательно используйте доменное имя, обратный прокси (Nginx / Caddy) и сервисы фильтрации трафика (например, Cloudflare).',
                            instructionTitle: 'Инструкция по доступу и красивому адресу страницы:',
                            instructionDirectTitle: 'Прямой доступ (работает сразу): ',
                            instructionDirectText: 'Страница мониторинга не требует входа в панель GameAP. Любой игрок или посетитель может открывать её напрямую по скопированному адресу на вашем домене панели.',
                            instructionServersTitle: 'Отображение серверов: ',
                            instructionServersText: 'Серверы синхронизируются из GameAP автоматически. Ниже в блоке «Видимость серверов» можно исключить служебные или приватные серверы.',
                            instructionAliasTitle: 'Настройка красивого адреса (/monitoring): ',
                            instructionAliasText: 'Данный код для красивой страницы прописывается в конфигурационный файл вашего веб-сервера (в блок виртуального хоста вашего домена GameAP, например /etc/nginx/sites-available/...):',
                            tabNginx: 'Nginx (Основной)',
                            tabCaddy: 'Caddy (Альтернатива)',
                            tabApache: 'Apache (Альтернатива)',
                            nginxComment: '# Прописать в секцию server { ... } вашего домена GameAP в Nginx:',
                            caddyComment: '# Прописать в блок вашего домена GameAP в Caddyfile:',
                            apacheComment: '# Прописать в секцию <VirtualHost ...> или файл .htaccess в Apache:',
                            generalSettings: '⚙️ Основные параметры',
                            titleLabel: 'Заголовок страницы (Title)',
                            subtitleLabel: 'Подзаголовок',
                            themeLabel: 'Тема по умолчанию',
                            darkTheme: '🌙 Тёмная тема (Dark)',
                            lightTheme: '☀️ Светлая тема (Light)',
                            refreshIntervalLabel: 'Интервал обновления (сек.)',
                            serversVisibility: '🎮 Видимость и порядок серверов',
                            serversVisibilityHelp: 'Отметьте серверы, которые должны отображаться в публичном мониторинге.',
                            serversOrderHelp: 'Перетаскивайте серверы мышью (Drag-and-Drop) или используйте стрелки ▲ ▼ для задания порядка отображения. Флагманские серверы будут сверху.',
                            moveUp: 'Поднять выше',
                            moveDown: 'Опустить ниже',
                            refreshServersBtn: 'Обновить список',
                            loadingServers: 'Загрузка списка серверов...',
                            noServers: 'В панели GameAP пока не найдено запущенных или установленных серверов.',
                            addressKeyLabel: 'Ключ адреса сервера (опционально)',
                            addressKeyHelp: 'По умолчанию плагин автоматически находит адрес (public_ip, domain, hostname в метаданных и переменных). Вы можете указать несколько ключей через запятую или точку с запятой (например: public_ip, domain; my_custom_ip).',
                            addressKeyPlaceholder: 'Например: public_ip, domain; hostname',
                            brandingSection: '🖼️ Логотип и фавикон',
                            logoUrlLabel: 'Прямая ссылка на логотип (URL)',
                            logoUrlHelp: 'Отображается в левом верхнем углу публичной страницы вместо эмодзи 🎮. Поддерживаются PNG, SVG, JPG, WebP.',
                            logoUrlPlaceholder: 'https://example.com/logo.png',
                            faviconUrlLabel: 'Прямая ссылка на фавикон (Favicon URL)',
                            faviconUrlHelp: 'Иконка во вкладке браузера (.ico, .png, .svg).',
                            faviconUrlPlaceholder: 'https://example.com/favicon.ico',
                            customCss: '🎨 Пользовательский CSS',
                            customCssHelp: 'Стили внедряются прямо в страницу мониторинга без перекомпиляции плагина.',
                            customCssPlaceholder: '/* Например: */\nbody { background: #0b0f19; }\n.server-card { border-radius: 16px; }',
                            customHeader: '📝 Пользовательский HTML в шапку',
                            customHeaderHelp: 'Вы можете добавить баннеры, ссылки на Discord/Telegram или логотип сообщества.',
                            customHeaderPlaceholder: '<!-- Например: -->\n<div style="text-align: center; margin-bottom: 20px;">\n  <a href="https://discord.gg/..." style="color: #5865F2;">Наш Discord</a>\n</div>',
                            saveBtn: 'Сохранить настройки',
                            savingBtn: 'Сохранение...',
                            saveSuccess: '✓ Настройки успешно сохранены!',
                            saveError: 'Ошибка сохранения',
                            expandBtn: 'Развернуть',
                            collapseBtn: 'Свернуть'
                        },
                        en: {
                            pluginTitle: 'GameAP WebMonitoring Settings',
                            pluginSubtitle: 'Public online game server monitoring plugin for GameAP v1.0.5',
                            openMonitoring: 'Open Monitoring',
                            publicUrlLabel: 'Public URL:',
                            publicUrlHint: 'Both URL formats are supported: direct /api/plugins/monitoring and legacy /view',
                            copyUrl: 'Copy Page URL',
                            copiedUrl: '✓ Copied!',
                            securityWarningTitle: '⚠️ Security & DDoS Protection Warning:',
                            securityWarningText: 'Do not expose the monitoring page directly via raw server IP (http://IP:PORT). Revealing your direct GameAP host IP exposes your management panel and game servers to targeted DDoS attacks. Always use a domain name behind a reverse proxy (Nginx or Caddy) with a DDoS protection proxy (such as Cloudflare).',
                            instructionTitle: 'Access & Clean URL Configuration Guide:',
                            instructionDirectTitle: 'Direct access (works out of the box): ',
                            instructionDirectText: 'The monitoring page does not require a GameAP login. Any visitor or player can open it directly using the copied URL on your panel domain.',
                            instructionServersTitle: 'Server visibility: ',
                            instructionServersText: 'Servers are loaded from GameAP automatically. Use the "Server Visibility" section below to hide private or maintenance servers.',
                            instructionAliasTitle: 'Clean short URL setup (/monitoring): ',
                            instructionAliasText: 'This snippet for a clean public URL must be added into your web server configuration file (inside the virtual host block for your GameAP domain, e.g. /etc/nginx/sites-available/...):',
                            tabNginx: 'Nginx (Recommended)',
                            tabCaddy: 'Caddy (Alternative)',
                            tabApache: 'Apache (Alternative)',
                            nginxComment: '# Add inside the server { ... } block of your GameAP domain in Nginx:',
                            caddyComment: '# Add inside your GameAP domain block in Caddyfile:',
                            apacheComment: '# Add inside your <VirtualHost ...> block or .htaccess in Apache:',
                            generalSettings: '⚙️ General Settings',
                            titleLabel: 'Page Title',
                            subtitleLabel: 'Subtitle',
                            themeLabel: 'Default Theme',
                            darkTheme: '🌙 Dark Theme',
                            lightTheme: '☀️ Light Theme',
                            refreshIntervalLabel: 'Auto-refresh Interval (sec)',
                            serversVisibility: '🎮 Server Visibility & Ordering',
                            serversVisibilityHelp: 'Select servers to display on the public monitoring page.',
                            serversOrderHelp: 'Drag and drop servers or use ▲ ▼ arrows to set display order. Flagship servers will appear at the top.',
                            moveUp: 'Move Up',
                            moveDown: 'Move Down',
                            refreshServersBtn: 'Refresh Servers',
                            loadingServers: 'Loading servers list...',
                            noServers: 'No installed or running servers found in GameAP.',
                            addressKeyLabel: 'Server Address Key (Optional)',
                            addressKeyHelp: 'By default, the plugin automatically detects address from variables. You can specify multiple keys separated by comma or semicolon (e.g.: public_ip, domain; my_custom_ip).',
                            addressKeyPlaceholder: 'e.g. public_ip, domain; hostname',
                            brandingSection: '🖼️ Logo & Favicon',
                            logoUrlLabel: 'Logo Image URL',
                            logoUrlHelp: 'Displayed in top-left header instead of 🎮 emoji. Supports PNG, SVG, JPG, WebP.',
                            logoUrlPlaceholder: 'https://example.com/logo.png',
                            faviconUrlLabel: 'Favicon URL',
                            faviconUrlHelp: 'Browser tab icon (.ico, .png, .svg).',
                            faviconUrlPlaceholder: 'https://example.com/favicon.ico',
                            customCss: '🎨 Custom CSS',
                            customCssHelp: 'Styles are injected directly into the monitoring page without recompilation.',
                            customCssPlaceholder: '/* Example: */\nbody { background: #0b0f19; }\n.server-card { border-radius: 16px; }',
                            customHeader: '📝 Custom Header HTML',
                            customHeaderHelp: 'You can add banners, links to Discord/Telegram, or community logos.',
                            customHeaderPlaceholder: '<!-- Example: -->\n<div style="text-align: center; margin-bottom: 20px;">\n  <a href="https://discord.gg/..." style="color: #5865F2;">Join Discord</a>\n</div>',
                            saveBtn: 'Save Settings',
                            savingBtn: 'Saving...',
                            saveSuccess: '✓ Settings saved successfully!',
                            saveError: 'Save error',
                            expandBtn: 'Expand',
                            collapseBtn: 'Collapse'
                        }
                    };

                    const currentLang = ref(
                        localStorage.getItem('web_monitoring_admin_lang') || 
                        ((navigator.language && navigator.language.toLowerCase().startsWith('ru')) ? 'ru' : 'en')
                    );

                    const setLang = (lang) => {
                        currentLang.value = lang;
                        localStorage.setItem('web_monitoring_admin_lang', lang);
                    };

                    const t = (key) => {
                        const langData = i18n[currentLang.value] || i18n['ru'];
                        return langData[key] || i18n['en'][key] || key;
                    };

                    const title = ref('GameAP Servers');
                    const subtitle = ref('Онлайн мониторинг игровых серверов');
                    const theme = ref('dark');
                    const refreshInterval = ref(15);
                    const customCss = ref('');
                    const customHeaderHtml = ref('');
                    const addressKey = ref('');
                    const logoUrl = ref('');
                    const faviconUrl = ref('');
                    const serverOrder = ref([]);
                    const draggedServerId = ref(null);
                    const hiddenServers = ref([]);
                    const serversList = ref([]);
                    const loadingServers = ref(false);
                    const saving = ref(false);
                    const saveSuccess = ref(false);
                    const saveError = ref('');
                    const copied = ref(false);
                    const selectedProxy = ref('nginx');
                    const showDdosAlert = ref(localStorage.getItem('web_monitoring_admin_ddos_open') === 'true');
                    const showInstructions = ref(localStorage.getItem('web_monitoring_admin_instructions_open') === 'true');

                    const toggleDdosAlert = () => {
                        showDdosAlert.value = !showDdosAlert.value;
                        try {
                            localStorage.setItem('web_monitoring_admin_ddos_open', showDdosAlert.value);
                        } catch (_) {}
                    };

                    const toggleInstructions = () => {
                        showInstructions.value = !showInstructions.value;
                        try {
                            localStorage.setItem('web_monitoring_admin_instructions_open', showInstructions.value);
                        } catch (_) {}
                    };

                    const applyServerSort = (list, order) => {
                        if (!Array.isArray(order) || order.length === 0 || !Array.isArray(list) || list.length <= 1) {
                            return list;
                        }
                        const orderMap = new Map();
                        order.forEach((id, idx) => orderMap.set(id, idx));
                        return [...list].sort((a, b) => {
                            const posA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
                            const posB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
                            return posA - posB;
                        });
                    };

                    const moveServer = (index, delta) => {
                        const target = index + delta;
                        if (target < 0 || target >= serversList.value.length) return;
                        const item = serversList.value.splice(index, 1)[0];
                        serversList.value.splice(target, 0, item);
                        serverOrder.value = serversList.value.map(s => s.id);
                        autoSyncServers(serversList.value);
                    };

                    const onDragStart = (e, srv) => {
                        draggedServerId.value = srv.id;
                        if (e.dataTransfer) {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(srv.id));
                        }
                    };

                    const onDragOver = (e) => {
                        e.preventDefault();
                        if (e.dataTransfer) {
                            e.dataTransfer.dropEffect = 'move';
                        }
                    };

                    const onDrop = (e, targetSrv) => {
                        e.preventDefault();
                        const draggedId = draggedServerId.value;
                        if (!draggedId || draggedId === targetSrv.id) {
                            draggedServerId.value = null;
                            return;
                        }
                        const fromIdx = serversList.value.findIndex(s => s.id === draggedId);
                        const toIdx = serversList.value.findIndex(s => s.id === targetSrv.id);
                        if (fromIdx !== -1 && toIdx !== -1) {
                            const [moved] = serversList.value.splice(fromIdx, 1);
                            serversList.value.splice(toIdx, 0, moved);
                            serverOrder.value = serversList.value.map(s => s.id);
                            autoSyncServers(serversList.value);
                        }
                        draggedServerId.value = null;
                    };

                    const onDragEnd = () => {
                        draggedServerId.value = null;
                    };

                    // Dynamic public URL based on current host/domain (canonical short URL)
                    const publicUrl = `${window.location.origin}/api/plugins/monitoring`;

                    // Detect GameAP dark mode reactively
                    const isGameApDark = ref(document.documentElement.classList.contains('dark'));
                    let themeObserver = null;

                    const updateThemeState = () => {
                        isGameApDark.value = document.documentElement.classList.contains('dark');
                    };

                    // Injects scoped styles matching GameAP CSS design tokens seamlessly
                    const injectAdminStyles = () => {
                        let styleEl = document.getElementById('wm-admin-injected-css');
                        if (!styleEl) {
                            styleEl = document.createElement('style');
                            styleEl.id = 'wm-admin-injected-css';
                            document.head.appendChild(styleEl);
                        }
                        styleEl.textContent = `
                            /* GameAP Design Token Bindings with accurate fallbacks */
                            .wm-admin-root {
                                width: 100%;
                                max-width: 1160px;
                                margin: 0 auto;
                                padding: 20px 16px;
                                font-family: inherit;
                                box-sizing: border-box;

                                /* Light mode tokens (default) */
                                --wm-surface: var(--gameap-surface, #ffffff);
                                --wm-surface-raised: var(--gameap-surface-raised, #ffffff);
                                --wm-surface-hover: var(--gameap-surface-hover, #f5f5f4);
                                --wm-bg-inset: var(--gameap-stone-100, #f5f5f4);
                                --wm-border: var(--gameap-border, #e7e5e4);
                                --wm-border-strong: var(--gameap-border-strong, #d6d3d1);
                                --wm-text: var(--gameap-text, #1c1917);
                                --wm-text-secondary: var(--gameap-text-secondary, #57534e);
                                --wm-text-muted: var(--gameap-text-muted, #78716c);
                                --wm-primary: var(--gameap-primary, #84cc16);
                                --wm-primary-hover: var(--gameap-primary-hover, #65a30d);
                                --wm-primary-soft: var(--gameap-primary-soft, #f7fee7);
                                --wm-primary-soft-text: var(--gameap-primary-soft-text, #4d7c0f);
                                --wm-danger: var(--gameap-danger, #ef4444);
                                --wm-danger-soft: var(--gameap-danger-soft, #fef2f2);
                                --wm-danger-text: var(--gameap-danger-soft-text, #b91c1c);
                                --wm-info: var(--gameap-info, #0ea5e9);
                                --wm-info-hover: var(--gameap-info-hover, #0284c7);
                                --wm-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
                                --wm-radius-card: 10px;
                                --wm-radius-control: 8px;
                            }

                            /* Dark mode tokens (activated when GameAP switches to html.dark) */
                            html.dark .wm-admin-root,
                            .dark .wm-admin-root {
                                --wm-surface: var(--gameap-surface, #292524);
                                --wm-surface-raised: var(--gameap-surface-raised, #292524);
                                --wm-surface-hover: var(--gameap-surface-hover, #262322);
                                --wm-bg-inset: var(--gameap-stone-900, #1c1917);
                                --wm-border: var(--gameap-border, #44403c);
                                --wm-border-strong: var(--gameap-border-strong, #57534e);
                                --wm-text: var(--gameap-text, #ffffff);
                                --wm-text-secondary: var(--gameap-text-secondary, #d6d3d1);
                                --wm-text-muted: var(--gameap-text-muted, #a8a29e);
                                --wm-primary: var(--gameap-primary, #84cc16);
                                --wm-primary-hover: var(--gameap-primary-hover, #65a30d);
                                --wm-primary-soft: var(--gameap-primary-soft, rgba(132, 204, 22, 0.15));
                                --wm-primary-soft-text: var(--gameap-primary-soft-text, #bef264);
                                --wm-danger: var(--gameap-danger, #ef4444);
                                --wm-danger-soft: var(--gameap-danger-soft, rgba(239, 68, 68, 0.15));
                                --wm-danger-text: var(--gameap-danger-soft-text, #fca5a5);
                                --wm-info: var(--gameap-info, #0ea5e9);
                                --wm-info-hover: var(--gameap-info-hover, #0284c7);
                                --wm-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
                            }

                            /* Card Component */
                            .wm-card {
                                background: var(--wm-surface) !important;
                                border: 1px solid var(--wm-border) !important;
                                border-radius: var(--wm-radius-card) !important;
                                padding: 24px !important;
                                box-shadow: var(--wm-shadow) !important;
                                margin-bottom: 20px !important;
                                color: var(--wm-text) !important;
                                transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease !important;
                            }

                            /* Titles */
                            .wm-title {
                                font-size: 16px !important;
                                font-weight: 600 !important;
                                color: var(--wm-text) !important;
                                border-bottom: 1px solid var(--wm-border) !important;
                                padding-bottom: 12px !important;
                                margin-bottom: 16px !important;
                                display: flex !important;
                                align-items: center !important;
                                gap: 8px !important;
                            }

                            /* Labels & Form Groups */
                            .wm-form-group {
                                display: flex !important;
                                flex-direction: column !important;
                                justify-content: flex-start !important;
                            }
                            .wm-form-group > label,
                            .wm-label {
                                display: block !important;
                                font-size: 13px !important;
                                font-weight: 500 !important;
                                color: var(--wm-text-secondary) !important;
                                margin-bottom: 6px !important;
                                line-height: 1.4 !important;
                                white-space: nowrap !important;
                                overflow: hidden !important;
                                text-overflow: ellipsis !important;
                            }
                            .wm-form-group > input,
                            .wm-form-group > select,
                            .wm-form-group > .wm-input,
                            .wm-form-group > .wm-select {
                                margin-top: auto !important;
                            }

                            /* Input and Select Controls */
                            .wm-input, .wm-select {
                                width: 100% !important;
                                height: 42px !important;
                                background: var(--wm-bg-inset) !important;
                                color: var(--wm-text) !important;
                                border: 1px solid var(--wm-border-strong) !important;
                                border-radius: var(--wm-radius-control) !important;
                                padding: 10px 14px !important;
                                font-size: 14px !important;
                                box-sizing: border-box !important;
                                outline: none !important;
                                transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease !important;
                            }
                            .wm-select {
                                cursor: pointer !important;
                            }
                            .wm-input:focus, .wm-select:focus {
                                border-color: var(--wm-primary) !important;
                                box-shadow: 0 0 0 3px var(--wm-primary-soft) !important;
                            }

                            /* Textareas */
                            .wm-textarea {
                                width: 100% !important;
                                background: var(--wm-bg-inset) !important;
                                color: var(--wm-text) !important;
                                border: 1px solid var(--wm-border-strong) !important;
                                border-radius: var(--wm-radius-control) !important;
                                padding: 12px 14px !important;
                                font-size: 13px !important;
                                font-family: 'JetBrains Mono', Consolas, Monaco, monospace !important;
                                box-sizing: border-box !important;
                                outline: none !important;
                                line-height: 1.5 !important;
                                transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease !important;
                            }
                            .wm-textarea:focus {
                                border-color: var(--wm-primary) !important;
                                box-shadow: 0 0 0 3px var(--wm-primary-soft) !important;
                            }

                            /* Header Buttons */
                            .wm-btn-open {
                                background: var(--wm-primary) !important;
                                color: #ffffff !important;
                                padding: 9px 18px !important;
                                border-radius: var(--wm-radius-control) !important;
                                font-weight: 500 !important;
                                font-size: 14px !important;
                                text-decoration: none !important;
                                display: inline-flex !important;
                                align-items: center !important;
                                gap: 8px !important;
                                border: none !important;
                                cursor: pointer !important;
                                transition: background-color 0.2s ease, transform 0.1s ease !important;
                            }
                            .wm-btn-open:hover {
                                background: var(--wm-primary-hover) !important;
                            }

                            /* Save Button */
                            .wm-btn-save {
                                background: var(--wm-primary) !important;
                                color: #ffffff !important;
                                padding: 11px 26px !important;
                                border-radius: var(--wm-radius-control) !important;
                                font-weight: 600 !important;
                                font-size: 14px !important;
                                border: none !important;
                                cursor: pointer !important;
                                display: inline-flex !important;
                                align-items: center !important;
                                gap: 8px !important;
                                box-shadow: 0 2px 8px var(--wm-primary-soft) !important;
                                transition: all 0.2s ease !important;
                            }
                            .wm-btn-save:hover:not(:disabled) {
                                background: var(--wm-primary-hover) !important;
                                transform: translateY(-1px);
                            }
                            .wm-btn-save:disabled {
                                opacity: 0.6 !important;
                                cursor: not-allowed !important;
                            }

                            /* Public Link Row */
                            .wm-direct-bar {
                                margin-top: 16px;
                                padding: 12px 16px;
                                background: var(--wm-bg-inset);
                                border-radius: var(--wm-radius-control);
                                border: 1px solid var(--wm-border);
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                flex-wrap: wrap;
                                gap: 10px;
                            }

                            .wm-direct-code {
                                color: var(--wm-primary-soft-text);
                                background: var(--wm-primary-soft);
                                padding: 3px 8px;
                                border-radius: 4px;
                                font-size: 12px;
                                font-family: monospace;
                            }

                            .wm-copy-btn {
                                padding: 6px 14px;
                                background: var(--wm-surface);
                                color: var(--wm-text);
                                font-size: 12px;
                                font-weight: 500;
                                border: 1px solid var(--wm-border-strong);
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            }
                            .wm-copy-btn:hover {
                                background: var(--wm-surface-hover);
                                border-color: var(--wm-primary);
                            }

                            /* DDoS Callout */
                            .wm-ddos-alert {
                                margin-top: 14px;
                                background: var(--wm-danger-soft);
                                border: 1px solid var(--wm-danger);
                                border-left: 4px solid var(--wm-danger);
                                border-radius: var(--wm-radius-control);
                                color: var(--wm-danger-text);
                                overflow: hidden;
                                transition: all 0.2s ease;
                            }

                            .wm-ddos-header {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                padding: 10px 14px;
                                cursor: pointer;
                                user-select: none;
                                font-weight: 600;
                                transition: background-color 0.15s ease;
                            }
                            .wm-ddos-header:hover {
                                background: rgba(239, 68, 68, 0.08);
                            }

                            .wm-ddos-body {
                                padding: 0 14px 12px 14px;
                                font-size: 12.5px;
                                line-height: 1.55;
                                border-top: 1px solid rgba(239, 68, 68, 0.15);
                            }

                            /* Instructions Card */
                            .wm-instruction-box {
                                margin-top: 14px;
                                background: var(--wm-bg-inset);
                                border: 1px solid var(--wm-border);
                                border-left: 4px solid var(--wm-primary);
                                border-radius: var(--wm-radius-control);
                                overflow: hidden;
                                transition: all 0.2s ease;
                            }

                            .wm-instruction-header {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                padding: 10px 14px;
                                cursor: pointer;
                                user-select: none;
                                font-weight: 600;
                                font-size: 13px;
                                color: var(--wm-text);
                                transition: background-color 0.15s ease;
                            }
                            .wm-instruction-header:hover {
                                background: var(--wm-surface-hover);
                            }

                            .wm-instruction-body {
                                padding: 0 14px 16px 14px;
                                border-top: 1px solid var(--wm-border);
                            }

                            .wm-spoiler-toggle {
                                font-size: 11.5px;
                                font-weight: 600;
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                padding: 3px 8px;
                                border-radius: 5px;
                                background: rgba(0, 0, 0, 0.06);
                                transition: all 0.15s ease;
                            }
                            .wm-spoiler-toggle:hover {
                                background: rgba(0, 0, 0, 0.12);
                            }
                            html.dark .wm-spoiler-toggle,
                            .dark .wm-spoiler-toggle {
                                background: rgba(255, 255, 255, 0.08);
                            }
                            html.dark .wm-spoiler-toggle:hover,
                            .dark .wm-spoiler-toggle:hover {
                                background: rgba(255, 255, 255, 0.14);
                            }

                            /* Responsive adjustments for mobile, tablet, and wide screens */
                            @media (max-width: 768px) {
                                .wm-admin-root {
                                    padding: 12px 8px;
                                }
                                .wm-card {
                                    padding: 16px 12px !important;
                                    margin-bottom: 12px !important;
                                }
                                .wm-direct-bar {
                                    flex-direction: column;
                                    align-items: stretch !important;
                                    gap: 8px;
                                }
                                .wm-direct-code {
                                    word-break: break-all;
                                    display: block;
                                }
                                .wm-copy-btn {
                                    width: 100%;
                                    text-align: center;
                                }
                            }

                            @media (max-width: 480px) {
                                .wm-admin-root {
                                    padding: 8px 4px;
                                }
                                .wm-card {
                                    padding: 12px 10px !important;
                                    border-radius: 8px !important;
                                }
                                .wm-server-item {
                                    padding: 10px 8px;
                                    gap: 8px;
                                }
                            }

                            /* Server Visibility Checkbox Row */
                            .wm-server-item {
                                display: flex;
                                align-items: center;
                                gap: 12px;
                                padding: 12px 16px;
                                background: var(--wm-bg-inset);
                                border-radius: var(--wm-radius-control);
                                border: 1px solid var(--wm-border);
                                transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
                                user-select: none;
                            }
                            .wm-server-item:hover {
                                background: var(--wm-surface-hover);
                                border-color: var(--wm-border-strong);
                            }
                            .wm-server-item.wm-dragging {
                                opacity: 0.45;
                                border-style: dashed;
                                border-color: var(--wm-primary);
                            }

                            .wm-drag-handle {
                                cursor: grab;
                                color: var(--wm-text-muted);
                                padding: 4px 6px;
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                transition: color 0.15s ease;
                                user-select: none;
                            }
                            .wm-drag-handle:hover {
                                color: var(--wm-primary);
                            }
                            .wm-drag-handle:active {
                                cursor: grabbing;
                            }

                            .wm-order-btn {
                                background: var(--wm-surface) !important;
                                border: 1px solid var(--wm-border-strong) !important;
                                border-radius: 4px !important;
                                color: var(--wm-text-muted) !important;
                                width: 22px !important;
                                height: 20px !important;
                                padding: 0 !important;
                                display: inline-flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                font-size: 10px !important;
                                cursor: pointer !important;
                                transition: all 0.15s ease !important;
                            }
                            .wm-order-btn:hover:not(:disabled) {
                                background: var(--wm-primary-soft) !important;
                                color: var(--wm-primary-soft-text) !important;
                                border-color: var(--wm-primary) !important;
                            }
                            .wm-order-btn:disabled {
                                opacity: 0.25 !important;
                                cursor: not-allowed !important;
                            }

                            .wm-img-preview {
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                border: 1px solid var(--wm-border-strong);
                                border-radius: 6px;
                                background: var(--wm-surface);
                                padding: 4px;
                                max-height: 40px;
                            }

                            /* Preformatted code snippet */
                            .wm-code-pre {
                                margin-top: 10px;
                                margin-bottom: 0;
                                background: var(--wm-surface);
                                border: 1px solid var(--wm-border-strong);
                                border-radius: 6px;
                                padding: 12px 14px;
                                color: var(--wm-text);
                                font-size: 12px;
                                font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
                                overflow-x: auto;
                                line-height: 1.45;
                            }

                            /* Refresh Servers Button */
                            .wm-btn-refresh {
                                background: var(--wm-bg-inset) !important;
                                color: var(--wm-text) !important;
                                border: 1px solid var(--wm-border-strong) !important;
                                border-radius: var(--wm-radius-control) !important;
                                padding: 6px 12px !important;
                                font-size: 12px !important;
                                font-weight: 500 !important;
                                display: inline-flex !important;
                                align-items: center !important;
                                cursor: pointer !important;
                                transition: all 0.2s ease !important;
                            }
                            .wm-btn-refresh:hover:not(:disabled) {
                                background: var(--wm-primary-soft) !important;
                                border-color: var(--wm-primary) !important;
                                color: var(--wm-primary-soft-text) !important;
                            }
                            .wm-btn-refresh:disabled {
                                opacity: 0.6 !important;
                                cursor: not-allowed !important;
                            }

                            @keyframes wm-spin {
                                from { transform: rotate(0deg); }
                                to { transform: rotate(360deg); }
                            }
                        `;
                    };

                    // Live server synchronization with GameAP API
                    const syncLiveServers = async (showLoading = false) => {
                        if (showLoading || serversList.value.length === 0) {
                            loadingServers.value = true;
                        }

                        let liveServers = null;

                        // 1. Query GameAP native API (/api/servers?page[size]=100)
                        try {
                            let rawList = [];
                            if (window.axios && typeof window.axios.get === 'function') {
                                try {
                                    const aRes = await window.axios.get('/api/servers?page[size]=100');
                                    if (aRes && aRes.data) {
                                        rawList = Array.isArray(aRes.data) ? aRes.data : (aRes.data.data || aRes.data.servers || []);
                                    }
                                } catch (_) {}
                            }

                            if (!rawList || rawList.length === 0) {
                                const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
                                const headers = { 'Accept': 'application/json' };
                                if (token) {
                                    headers['Authorization'] = 'Bearer ' + token;
                                }
                                const gRes = await fetch('/api/servers?page[size]=100', {
                                    credentials: 'include',
                                    headers: headers
                                });
                                if (gRes.ok) {
                                    const gData = await gRes.json();
                                    rawList = Array.isArray(gData) ? gData : (gData.data || gData.servers || []);
                                }
                            }

                            if (Array.isArray(rawList) && rawList.length > 0) {
                                const customKeys = (addressKey.value || '').split(/[,;]+/).map(k => k.trim()).filter(Boolean);
                                liveServers = rawList.map(s => {
                                    let metaIp = '';
                                    if (s.metadata) {
                                        for (const k of customKeys) {
                                            if (s.metadata[k]) {
                                                metaIp = s.metadata[k];
                                                break;
                                            }
                                        }
                                        if (!metaIp && s.metadata.public_ip) {
                                            metaIp = s.metadata.public_ip;
                                        }
                                    }
                                    const sIp = metaIp || s.server_ip || s.serverIp || s.ip || '';
                                    const sPort = s.server_port || s.serverPort || s.port || 0;
                                    const sActive = (s.process_active || s.processActive || s.online || false);
                                    const sGame = s.game_id || s.gameId || s.game || 'game';
                                    let cUrl = '';
                                    if (sIp && sPort && (sGame.includes('cs') || sGame.includes('strike') || sGame.includes('rust') || sGame.includes('tf') || sGame.includes('valheim'))) {
                                        cUrl = `steam://connect/${sIp}:${sPort}`;
                                    }
                                    return {
                                        id: s.id,
                                        name: s.name || `Server #${s.id}`,
                                        game_code: sGame,
                                        game_name: (s.game && s.game.name) || s.game_name || sGame.toUpperCase(),
                                        address: sIp,
                                        port: sPort,
                                        status: sActive ? 'online' : 'offline',
                                        installed: s.installed !== undefined ? (s.installed === 1 || s.installed === true) : true,
                                        blocked: s.blocked || false,
                                        connect_url: cUrl
                                    };
                                });
                            }
                        } catch (e) {
                            console.warn('GameAP native API fetch error:', e);
                        }

                        // 2. Fallback to plugin endpoints if native endpoint did not return servers
                        if (!liveServers || liveServers.length === 0) {
                            const serverEndpoints = [
                                '/api/plugins/monitoring/servers?action=admin_servers&all=1',
                                '/api/plugins/monitorine/servers?action=admin_servers&all=1',
                                '/api/plugins/monitoring?action=admin_servers&all=1',
                                '/api/plugins/monitorine?action=admin_servers&all=1',
                                '/api/plugins/monitoring/servers?all=1',
                                '/api/plugins/monitorine/servers?all=1',
                                '/plugins/web-monitoring/servers?all=1'
                            ];

                            for (const ep of serverEndpoints) {
                                try {
                                    const srvRes = await fetch(ep);
                                    if (srvRes.ok) {
                                        const srvData = await srvRes.json();
                                        const list = Array.isArray(srvData) ? srvData : (srvData.all_servers || srvData.servers || []);
                                        if (Array.isArray(list) && list.length > 0) {
                                            liveServers = list;
                                            break;
                                        }
                                    }
                                } catch (_) {}
                            }
                        }

                        // 3. Update servers list and synchronize cache if live servers were obtained
                        if (Array.isArray(liveServers) && liveServers.length > 0) {
                            serversList.value = applyServerSort(liveServers, serverOrder.value);
                            updateServerListCache(serversList.value);
                        }

                        loadingServers.value = false;
                    };

                    // Load current settings and servers list
                    const loadData = async () => {
                        injectAdminStyles();

                        // Restore from localStorage first as instant cache
                        try {
                            const localSaved = localStorage.getItem('web_monitoring_settings');
                            if (localSaved) {
                                const localData = JSON.parse(localSaved);
                                if (localData.title) title.value = localData.title;
                                if (localData.subtitle) subtitle.value = localData.subtitle;
                                if (localData.theme) theme.value = localData.theme;
                                if (localData.refresh_interval) refreshInterval.value = localData.refresh_interval;
                                if (localData.custom_css !== undefined) customCss.value = localData.custom_css;
                                if (localData.custom_header_html !== undefined) customHeaderHtml.value = localData.custom_header_html;
                                if (localData.address_key !== undefined) addressKey.value = localData.address_key;
                                if (localData.logo_url !== undefined) logoUrl.value = localData.logo_url;
                                if (localData.favicon_url !== undefined) faviconUrl.value = localData.favicon_url;
                                if (Array.isArray(localData.server_order)) serverOrder.value = localData.server_order;
                                if (Array.isArray(localData.hidden_servers)) hiddenServers.value = localData.hidden_servers;
                                if (Array.isArray(localData.cached_servers) && localData.cached_servers.length > 0) {
                                    serversList.value = applyServerSort(localData.cached_servers, serverOrder.value);
                                }
                            }
                            const localCachedServers = localStorage.getItem('web_monitoring_cached_servers');
                            if (localCachedServers) {
                                const parsed = JSON.parse(localCachedServers);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    serversList.value = applyServerSort(parsed, serverOrder.value);
                                }
                            }
                        } catch (e) {}

                        try {
                            const sEndpoints = ['/api/plugins/monitoring/settings?action=settings', '/api/plugins/monitorine/settings'];
                            for (const sUrl of sEndpoints) {
                                try {
                                    const sRes = await fetch(sUrl);
                                    if (sRes.ok) {
                                        const data = await sRes.json();
                                        if (data.title) title.value = data.title;
                                        if (data.subtitle) subtitle.value = data.subtitle;
                                        if (data.theme) theme.value = data.theme;
                                        if (data.refresh_interval) refreshInterval.value = data.refresh_interval;
                                        if (data.custom_css !== undefined) customCss.value = data.custom_css;
                                        if (data.custom_header_html !== undefined) customHeaderHtml.value = data.custom_header_html;
                                        if (data.address_key !== undefined) addressKey.value = data.address_key;
                                        if (data.logo_url !== undefined) logoUrl.value = data.logo_url;
                                        if (data.favicon_url !== undefined) faviconUrl.value = data.favicon_url;
                                        if (Array.isArray(data.server_order)) serverOrder.value = data.server_order;
                                        if (Array.isArray(data.hidden_servers)) hiddenServers.value = data.hidden_servers;

                                        // If we don't have servers loaded yet, use incoming servers from settings
                                        const incomingServers = data.all_servers || data.servers || data.cached_servers;
                                        if (Array.isArray(incomingServers) && incomingServers.length > 0 && serversList.value.length === 0) {
                                            serversList.value = applyServerSort(incomingServers, serverOrder.value);
                                        }
                                        break;
                                    }
                                } catch (_) {}
                            }
                        } catch (err) {
                            console.warn('Could not load remote plugin settings:', err);
                        }

                        // Always perform live synchronization with GameAP servers
                        await syncLiveServers();
                    };

                    const updateServerListCache = async (servers) => {
                        if (!servers || servers.length === 0) return;
                        try {
                            const payload = {
                                title: title.value,
                                subtitle: subtitle.value,
                                theme: theme.value,
                                refresh_interval: parseInt(refreshInterval.value, 10) || 15,
                                custom_css: customCss.value,
                                custom_header_html: customHeaderHtml.value,
                                address_key: addressKey.value.trim(),
                                logo_url: logoUrl.value.trim(),
                                favicon_url: faviconUrl.value.trim(),
                                server_order: serversList.value.map(s => s.id),
                                hidden_servers: hiddenServers.value,
                                cached_servers: servers
                            };
                            localStorage.setItem('web_monitoring_settings', JSON.stringify(payload));
                            localStorage.setItem('web_monitoring_cached_servers', JSON.stringify(servers));
                            const sEndpoints = ['/api/plugins/monitoring/settings?action=settings', '/api/plugins/monitorine/settings'];
                            for (const sUrl of sEndpoints) {
                                try {
                                    const r = await fetch(sUrl, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload)
                                    });
                                    if (r.ok) break;
                                } catch (_) {}
                            }
                        } catch (_) {}
                    };

                    const autoSyncServers = updateServerListCache;

                    const saveSettings = async () => {
                        saving.value = true;
                        saveSuccess.value = false;
                        saveError.value = '';

                        const payload = {
                            title: title.value,
                            subtitle: subtitle.value,
                            theme: theme.value,
                            refresh_interval: parseInt(refreshInterval.value, 10) || 15,
                            custom_css: customCss.value,
                            custom_header_html: customHeaderHtml.value,
                            address_key: addressKey.value.trim(),
                            logo_url: logoUrl.value.trim(),
                            favicon_url: faviconUrl.value.trim(),
                            server_order: serversList.value.map(s => s.id),
                            hidden_servers: hiddenServers.value,
                            cached_servers: serversList.value
                        };

                        try {
                            localStorage.setItem('web_monitoring_settings', JSON.stringify(payload));
                            localStorage.setItem('web_monitoring_theme', theme.value);
                            if (serversList.value.length > 0) {
                                localStorage.setItem('web_monitoring_cached_servers', JSON.stringify(serversList.value));
                            }
                        } catch (e) {}

                        try {
                            const sEndpoints = ['/api/plugins/monitoring/settings?action=settings', '/api/plugins/monitorine/settings'];
                            let res = null;
                            for (const sUrl of sEndpoints) {
                                try {
                                    const r = await fetch(sUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(payload)
                                    });
                                    if (r.ok) {
                                        res = r;
                                        break;
                                    }
                                } catch (_) {}
                            }
                            if (res && res.ok) {
                                saveSuccess.value = true;
                                setTimeout(() => { saveSuccess.value = false; }, 4000);
                            } else {
                                const errData = res ? await res.json().catch(() => ({})) : {};
                                saveError.value = errData.message || `${t('saveError')} (HTTP ${res ? res.status : 'ERR'})`;
                            }
                        } catch (err) {
                            saveSuccess.value = true;
                            setTimeout(() => { saveSuccess.value = false; }, 3000);
                        } finally {
                            saving.value = false;
                        }
                    };

                    const copyPublicUrl = async () => {
                        try {
                            await navigator.clipboard.writeText(publicUrl);
                            copied.value = true;
                            setTimeout(() => { copied.value = false; }, 2500);
                        } catch (e) {
                            const input = document.createElement('input');
                            input.value = publicUrl;
                            document.body.appendChild(input);
                            input.select();
                            document.execCommand('copy');
                            document.body.removeChild(input);
                            copied.value = true;
                            setTimeout(() => { copied.value = false; }, 2500);
                        }
                    };

                    const toggleServer = (id) => {
                        const idx = hiddenServers.value.indexOf(id);
                        if (idx >= 0) {
                            hiddenServers.value.splice(idx, 1);
                        } else {
                            hiddenServers.value.push(id);
                        }
                        autoSyncServers(serversList.value);
                    };

                    onMounted(() => {
                        loadData();
                        updateThemeState();
                        // Listen to GameAP light/dark theme switches on <html> element
                        if (typeof MutationObserver !== 'undefined') {
                            themeObserver = new MutationObserver(() => {
                                updateThemeState();
                            });
                            themeObserver.observe(document.documentElement, {
                                attributes: true,
                                attributeFilter: ['class', 'data-theme']
                            });
                        }
                    });

                    onUnmounted(() => {
                        if (themeObserver) {
                            themeObserver.disconnect();
                        }
                    });

                    return () => h('div', { class: 'wm-admin-root' }, [
                        // Header Card
                        h('div', { class: 'wm-card' }, [
                            h('div', { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;' }, [
                                h('div', [
                                    h('h2', { style: 'font-size: 22px; font-weight: 700; color: var(--wm-text); display: flex; align-items: center; gap: 10px; margin: 0;' }, [
                                        h('i', { class: 'fas fa-chart-line', style: 'color: var(--wm-primary);' }),
                                        t('pluginTitle')
                                    ]),
                                    h('p', { style: 'color: var(--wm-text-muted); font-size: 13px; margin: 6px 0 0 0;' }, t('pluginSubtitle'))
                                ]),
                                h('div', { style: 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap;' }, [
                                    // Language Switcher
                                    h('div', {
                                        style: 'display: inline-flex; align-items: center; background: var(--wm-bg-inset); padding: 2px; border-radius: 8px; border: 1px solid var(--wm-border); gap: 2px;'
                                    }, [
                                        h('button', {
                                            type: 'button',
                                            onClick: () => setLang('ru'),
                                            style: `padding: 6px 11px; font-size: 12px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; background: ${currentLang.value === 'ru' ? 'var(--wm-primary)' : 'transparent'}; color: ${currentLang.value === 'ru' ? '#ffffff' : 'var(--wm-text-muted)'};`
                                        }, '🇷🇺 RU'),
                                        h('button', {
                                            type: 'button',
                                            onClick: () => setLang('en'),
                                            style: `padding: 6px 11px; font-size: 12px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; background: ${currentLang.value === 'en' ? 'var(--wm-primary)' : 'transparent'}; color: ${currentLang.value === 'en' ? '#ffffff' : 'var(--wm-text-muted)'};`
                                        }, '🇬🇧 EN')
                                    ]),
                                    // Open monitoring button
                                    h('a', {
                                        href: publicUrl,
                                        target: '_blank',
                                        class: 'wm-btn-open'
                                    }, [
                                        h('i', { class: 'fas fa-external-link-alt' }),
                                        t('openMonitoring')
                                    ])
                                ])
                            ]),

                            // Direct link bar
                            h('div', { class: 'wm-direct-bar' }, [
                                h('div', { style: 'font-size: 13px; color: var(--wm-text-secondary); display: flex; flex-direction: column; gap: 4px; overflow: hidden;' }, [
                                    h('div', { style: 'display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis;' }, [
                                        h('span', { style: 'font-weight: 600; color: var(--wm-text);' }, t('publicUrlLabel')),
                                        h('code', { class: 'wm-direct-code' }, publicUrl)
                                    ]),
                                    h('div', { style: 'font-size: 11px; color: var(--wm-text-muted);' }, t('publicUrlHint'))
                                ]),
                                h('button', {
                                    onClick: copyPublicUrl,
                                    class: 'wm-copy-btn'
                                }, copied.value ? t('copiedUrl') : t('copyUrl'))
                            ]),

                            // Security Warning Callout (Collapsible Spoiler)
                            h('div', { class: 'wm-ddos-alert' }, [
                                h('div', {
                                    class: 'wm-ddos-header',
                                    onClick: toggleDdosAlert,
                                    title: showDdosAlert.value ? t('collapseBtn') : t('expandBtn')
                                }, [
                                    h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
                                        h('i', { class: 'fas fa-shield-alt', style: 'color: var(--wm-danger); font-size: 14px;' }),
                                        h('span', { style: 'font-weight: 700; font-size: 13px;' }, t('securityWarningTitle'))
                                    ]),
                                    h('span', { class: 'wm-spoiler-toggle' }, [
                                        h('span', showDdosAlert.value ? t('collapseBtn') : t('expandBtn')),
                                        h('i', { class: showDdosAlert.value ? 'fas fa-chevron-up' : 'fas fa-chevron-down', style: 'font-size: 10px;' })
                                    ])
                                ]),
                                showDdosAlert.value && h('div', { class: 'wm-ddos-body' }, [
                                    h('p', { style: 'margin: 10px 0 0 0; font-size: 12.5px; line-height: 1.55;' }, t('securityWarningText'))
                                ])
                            ]),

                            // Universal instruction card under the warning (Collapsible Spoiler)
                            h('div', { class: 'wm-instruction-box' }, [
                                h('div', {
                                    class: 'wm-instruction-header',
                                    onClick: toggleInstructions,
                                    title: showInstructions.value ? t('collapseBtn') : t('expandBtn')
                                }, [
                                    h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
                                        h('i', { class: 'fas fa-info-circle', style: 'color: var(--wm-primary); font-size: 14px;' }),
                                        h('span', { style: 'font-weight: 600; color: var(--wm-text); font-size: 13px;' }, t('instructionTitle'))
                                    ]),
                                    h('span', { class: 'wm-spoiler-toggle' }, [
                                        h('span', showInstructions.value ? t('collapseBtn') : t('expandBtn')),
                                        h('i', { class: showInstructions.value ? 'fas fa-chevron-up' : 'fas fa-chevron-down', style: 'font-size: 10px;' })
                                    ])
                                ]),
                                showInstructions.value && h('div', { class: 'wm-instruction-body' }, [
                                    h('ul', { style: 'margin: 12px 0 0 0; padding-left: 20px; color: var(--wm-text-secondary); font-size: 12.5px; line-height: 1.6;' }, [
                                        h('li', [
                                            h('strong', { style: 'color: var(--wm-text);' }, t('instructionDirectTitle')),
                                            t('instructionDirectText')
                                        ]),
                                        h('li', [
                                            h('strong', { style: 'color: var(--wm-text);' }, t('instructionServersTitle')),
                                            t('instructionServersText')
                                        ]),
                                        h('li', [
                                            h('strong', { style: 'color: var(--wm-text);' }, t('instructionAliasTitle')),
                                            t('instructionAliasText')
                                        ])
                                    ]),
                                    // Tabs for Nginx / Caddy / Apache
                                    h('div', { style: 'margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;' }, [
                                        h('button', {
                                            type: 'button',
                                            onClick: (e) => { e.stopPropagation(); selectedProxy.value = 'nginx'; },
                                            style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'nginx' ? 'var(--wm-primary)' : 'var(--wm-border-strong)'}; background: ${selectedProxy.value === 'nginx' ? 'var(--wm-primary-soft)' : 'var(--wm-surface)'}; color: ${selectedProxy.value === 'nginx' ? 'var(--wm-primary-soft-text)' : 'var(--wm-text-muted)'};`
                                        }, t('tabNginx')),
                                        h('button', {
                                            type: 'button',
                                            onClick: (e) => { e.stopPropagation(); selectedProxy.value = 'caddy'; },
                                            style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'caddy' ? 'var(--wm-primary)' : 'var(--wm-border-strong)'}; background: ${selectedProxy.value === 'caddy' ? 'var(--wm-primary-soft)' : 'var(--wm-surface)'}; color: ${selectedProxy.value === 'caddy' ? 'var(--wm-primary-soft-text)' : 'var(--wm-text-muted)'};`
                                        }, t('tabCaddy')),
                                        h('button', {
                                            type: 'button',
                                            onClick: (e) => { e.stopPropagation(); selectedProxy.value = 'apache'; },
                                            style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'apache' ? 'var(--wm-primary)' : 'var(--wm-border-strong)'}; background: ${selectedProxy.value === 'apache' ? 'var(--wm-primary-soft)' : 'var(--wm-surface)'}; color: ${selectedProxy.value === 'apache' ? 'var(--wm-primary-soft-text)' : 'var(--wm-text-muted)'};`
                                        }, t('tabApache'))
                                    ]),
                                    h('pre', {
                                        class: 'wm-code-pre'
                                    }, selectedProxy.value === 'nginx' 
                                        ? `${t('nginxComment')}\nlocation = /monitoring {\n    rewrite ^ /api/plugins/monitoring break;\n    proxy_pass $gameap_backend; # Проксирование на панель GameAP\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Gameap-Client-Ip $remote_addr;\n}`
                                        : (selectedProxy.value === 'caddy'
                                            ? `${t('caddyComment')}\nhandle /monitoring {\n    rewrite * /api/plugins/monitoring\n    reverse_proxy localhost:8080 # Укажите локальный адрес/порт панели GameAP\n}`
                                            : `${t('apacheComment')}\nRewriteEngine On\nRewriteRule "^monitoring$" "/api/plugins/monitoring" [PT]\n`
                                        )
                                    )
                                ])
                            ])
                        ]),

                        // General Settings Card
                        h('div', { class: 'wm-card' }, [
                            h('h3', { class: 'wm-title' }, t('generalSettings')),
                            h('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;' }, [
                                h('div', { class: 'wm-form-group' }, [
                                    h('label', { class: 'wm-label', title: t('titleLabel') }, t('titleLabel')),
                                    h('input', {
                                        type: 'text',
                                        value: title.value,
                                        onInput: (e) => { title.value = e.target.value; },
                                        class: 'wm-input'
                                    })
                                ]),
                                h('div', { class: 'wm-form-group' }, [
                                    h('label', { class: 'wm-label', title: t('subtitleLabel') }, t('subtitleLabel')),
                                    h('input', {
                                        type: 'text',
                                        value: subtitle.value,
                                        onInput: (e) => { subtitle.value = e.target.value; },
                                        class: 'wm-input'
                                    })
                                ]),
                                h('div', { class: 'wm-form-group' }, [
                                    h('label', { class: 'wm-label', title: t('themeLabel') }, t('themeLabel')),
                                    h('select', {
                                        value: theme.value,
                                        onChange: (e) => { theme.value = e.target.value; },
                                        class: 'wm-select'
                                    }, [
                                        h('option', { value: 'dark' }, t('darkTheme')),
                                        h('option', { value: 'light' }, t('lightTheme'))
                                    ])
                                ]),
                                h('div', { class: 'wm-form-group' }, [
                                    h('label', { class: 'wm-label', title: t('refreshIntervalLabel') }, t('refreshIntervalLabel')),
                                    h('input', {
                                        type: 'number',
                                        min: '5',
                                        max: '300',
                                        value: refreshInterval.value,
                                        onInput: (e) => { refreshInterval.value = e.target.value; },
                                        class: 'wm-input'
                                    })
                                ]),
                                h('div', { class: 'wm-form-group', style: 'grid-column: 1 / -1;' }, [
                                    h('label', { class: 'wm-label', title: t('addressKeyLabel') }, t('addressKeyLabel')),
                                    h('input', {
                                        type: 'text',
                                        value: addressKey.value,
                                        placeholder: t('addressKeyPlaceholder'),
                                        onInput: (e) => { addressKey.value = e.target.value; },
                                        class: 'wm-input'
                                    }),
                                    h('p', { style: 'font-size: 11.5px; color: var(--wm-text-muted); margin: 4px 0 0 0;' }, t('addressKeyHelp'))
                                ])
                            ])
                        ]),

                        // Branding Card (Logo & Favicon)
                        h('div', { class: 'wm-card' }, [
                            h('h3', { class: 'wm-title' }, t('brandingSection')),
                            h('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;' }, [
                                h('div', { class: 'wm-form-group' }, [
                                    h('label', { class: 'wm-label', title: t('logoUrlLabel') }, t('logoUrlLabel')),
                                    h('div', { style: 'display: flex; gap: 10px; align-items: center;' }, [
                                        h('input', {
                                            type: 'text',
                                            value: logoUrl.value,
                                            placeholder: t('logoUrlPlaceholder'),
                                            onInput: (e) => { logoUrl.value = e.target.value; },
                                            class: 'wm-input'
                                        }),
                                        logoUrl.value ? h('div', { class: 'wm-img-preview', title: 'Предпросмотр логотипа' }, [
                                            h('img', {
                                                src: logoUrl.value,
                                                alt: 'Logo preview',
                                                style: 'max-height: 32px; max-width: 60px; object-fit: contain;',
                                                onError: (e) => { e.target.style.display = 'none'; }
                                            })
                                        ]) : null
                                    ]),
                                    h('p', { style: 'font-size: 11.5px; color: var(--wm-text-muted); margin: 4px 0 0 0;' }, t('logoUrlHelp'))
                                ]),
                                h('div', { class: 'wm-form-group' }, [
                                    h('label', { class: 'wm-label', title: t('faviconUrlLabel') }, t('faviconUrlLabel')),
                                    h('div', { style: 'display: flex; gap: 10px; align-items: center;' }, [
                                        h('input', {
                                            type: 'text',
                                            value: faviconUrl.value,
                                            placeholder: t('faviconUrlPlaceholder'),
                                            onInput: (e) => { faviconUrl.value = e.target.value; },
                                            class: 'wm-input'
                                        }),
                                        faviconUrl.value ? h('div', { class: 'wm-img-preview', style: 'padding: 4px 8px;', title: 'Предпросмотр фавикона' }, [
                                            h('img', {
                                                src: faviconUrl.value,
                                                alt: 'Favicon preview',
                                                style: 'width: 20px; height: 20px; object-fit: contain;',
                                                onError: (e) => { e.target.style.display = 'none'; }
                                            })
                                        ]) : null
                                    ]),
                                    h('p', { style: 'font-size: 11.5px; color: var(--wm-text-muted); margin: 4px 0 0 0;' }, t('faviconUrlHelp'))
                                ])
                            ])
                        ]),

                        // Server Visibility Card
                        h('div', { class: 'wm-card' }, [
                            h('div', { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 6px;' }, [
                                h('h3', { class: 'wm-title', style: 'margin: 0;' }, t('serversVisibility')),
                                h('button', {
                                    type: 'button',
                                    onClick: () => syncLiveServers(true),
                                    disabled: loadingServers.value,
                                    class: 'wm-btn-refresh',
                                    title: t('refreshServersBtn')
                                }, [
                                    h('i', {
                                        class: 'fas fa-sync-alt',
                                        style: loadingServers.value ? 'animation: wm-spin 1s linear infinite;' : ''
                                    }),
                                    h('span', { style: 'margin-left: 6px;' }, t('refreshServersBtn'))
                                ])
                            ]),
                            h('p', { style: 'font-size: 12.5px; color: var(--wm-text-muted); margin: 0 0 14px 0; line-height: 1.5;' }, [
                                h('span', t('serversVisibilityHelp')),
                                h('br'),
                                h('span', { style: 'color: var(--wm-primary-soft-text); font-weight: 500;' }, t('serversOrderHelp'))
                            ]),
                            (loadingServers.value && serversList.value.length === 0)
                                ? h('div', { style: 'color: var(--wm-text-muted); font-size: 13px; padding: 12px 0; display: flex; align-items: center; gap: 8px;' }, [
                                    h('i', { class: 'fas fa-spinner fa-spin' }),
                                    h('span', t('loadingServers'))
                                ])
                                : serversList.value.length === 0
                                    ? h('div', { style: 'color: var(--wm-text-muted); font-size: 13px; padding: 12px 0;' }, t('noServers'))
                                    : h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, serversList.value.map((srv, idx) => {
                                        const isHidden = hiddenServers.value.includes(srv.id);
                                        const isOnline = srv.status === 'online';
                                        return h('div', {
                                            key: srv.id,
                                            class: 'wm-server-item' + (draggedServerId.value === srv.id ? ' wm-dragging' : ''),
                                            draggable: true,
                                            onDragstart: (e) => onDragStart(e, srv),
                                            onDragover: onDragOver,
                                            onDrop: (e) => onDrop(e, srv),
                                            onDragend: onDragEnd
                                        }, [
                                            // Drag grip handle
                                            h('div', {
                                                class: 'wm-drag-handle',
                                                title: t('serversOrderHelp')
                                            }, [
                                                h('i', { class: 'fas fa-grip-vertical' })
                                            ]),
                                            // Up / Down order buttons
                                            h('div', { style: 'display: flex; flex-direction: column; gap: 2px;' }, [
                                                h('button', {
                                                    type: 'button',
                                                    class: 'wm-order-btn',
                                                    disabled: idx === 0,
                                                    onClick: (e) => { e.stopPropagation(); moveServer(idx, -1); },
                                                    title: t('moveUp')
                                                }, [
                                                    h('i', { class: 'fas fa-chevron-up' })
                                                ]),
                                                h('button', {
                                                    type: 'button',
                                                    class: 'wm-order-btn',
                                                    disabled: idx === serversList.value.length - 1,
                                                    onClick: (e) => { e.stopPropagation(); moveServer(idx, 1); },
                                                    title: t('moveDown')
                                                }, [
                                                    h('i', { class: 'fas fa-chevron-down' })
                                                ])
                                            ]),
                                            // Visibility checkbox
                                            h('input', {
                                                type: 'checkbox',
                                                id: `srv-vis-${srv.id}`,
                                                checked: !isHidden,
                                                onChange: () => toggleServer(srv.id),
                                                style: 'width: 18px; height: 18px; cursor: pointer; accent-color: var(--wm-primary);'
                                            }),
                                            // Server details
                                            h('label', {
                                                for: `srv-vis-${srv.id}`,
                                                style: 'flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; margin: 0;'
                                            }, [
                                                h('span', { style: 'font-size: 14px; font-weight: 500; color: var(--wm-text);' }, srv.name),
                                                h('span', { style: 'font-size: 12px; color: var(--wm-text-muted); font-family: monospace;' }, `${srv.address}:${srv.port}`)
                                            ]),
                                            // Status pill
                                            h('span', {
                                                style: isOnline
                                                    ? 'padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: var(--wm-primary-soft); color: var(--wm-primary-soft-text); border: 1px solid var(--wm-primary);'
                                                    : 'padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: var(--wm-bg-inset); color: var(--wm-text-muted); border: 1px solid var(--wm-border-strong);'
                                            }, isOnline ? 'Online' : 'Offline')
                                        ]);
                                    }))
                        ]),

                        // Custom CSS Editor Card
                        h('div', { class: 'wm-card' }, [
                            h('h3', { class: 'wm-title' }, t('customCss')),
                            h('p', { style: 'font-size: 13px; color: var(--wm-text-muted); margin: 0 0 12px 0;' }, t('customCssHelp')),
                            h('textarea', {
                                rows: 6,
                                value: customCss.value,
                                onInput: (e) => { customCss.value = e.target.value; },
                                placeholder: t('customCssPlaceholder'),
                                class: 'wm-textarea'
                            })
                        ]),

                        // Custom Header HTML Card
                        h('div', { class: 'wm-card' }, [
                            h('h3', { class: 'wm-title' }, t('customHeader')),
                            h('p', { style: 'font-size: 13px; color: var(--wm-text-muted); margin: 0 0 12px 0;' }, t('customHeaderHelp')),
                            h('textarea', {
                                rows: 4,
                                value: customHeaderHtml.value,
                                onInput: (e) => { customHeaderHtml.value = e.target.value; },
                                placeholder: t('customHeaderPlaceholder'),
                                class: 'wm-textarea'
                            })
                        ]),

                        // Save Actions
                        h('div', { style: 'display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 10px;' }, [
                            h('button', {
                                onClick: saveSettings,
                                disabled: saving.value,
                                class: 'wm-btn-save'
                            }, [
                                h('i', { class: 'fas fa-save' }),
                                saving.value ? t('savingBtn') : t('saveBtn')
                            ]),
                            saveSuccess.value && h('span', { style: 'color: var(--wm-primary-soft-text); font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;' }, t('saveSuccess')),
                            saveError.value && h('span', { style: 'color: var(--wm-danger); font-size: 14px; font-weight: 500;' }, saveError.value)
                        ])
                    ]);
                }
            }
        }
    ]
};
