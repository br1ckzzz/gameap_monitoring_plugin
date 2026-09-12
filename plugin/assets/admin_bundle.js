// Vue 3 Component Bundle for GameAP Admin Panel
// Export single named export 'webMonitoringPlugin' to avoid duplicate menu items in GameAP
const { ref, computed, onMounted, onUnmounted, h } = window.Vue || Vue;

export const webMonitoringPlugin = {
    id: 'monitoring',
    name: 'GameAP WebMonitoring',
    version: '1.0.2',
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
                            pluginSubtitle: 'Плагин публичного онлайн-мониторинга для GameAP v1.0.2',
                            openMonitoring: 'Открыть мониторинг',
                            publicUrlLabel: 'Публичный URL:',
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
                            themeLabel: 'Тема публичной страницы по умолчанию',
                            darkTheme: '🌙 Тёмная тема (Dark)',
                            lightTheme: '☀️ Светлая тема (Light)',
                            refreshIntervalLabel: 'Интервал автообновления (сек.)',
                            serversVisibility: '🎮 Видимость серверов',
                            serversVisibilityHelp: 'Отметьте серверы, которые должны отображаться в публичном мониторинге.',
                            loadingServers: 'Загрузка списка серверов...',
                            noServers: 'В панели GameAP пока не найдено запущенных или установленных серверов.',
                            customCss: '🎨 Пользовательский CSS',
                            customCssHelp: 'Стили внедряются прямо в страницу мониторинга без перекомпиляции плагина.',
                            customCssPlaceholder: '/* Например: */\nbody { background: #0b0f19; }\n.server-card { border-radius: 16px; }',
                            customHeader: '📝 Пользовательский HTML в шапку',
                            customHeaderHelp: 'Вы можете добавить баннеры, ссылки на Discord/Telegram или логотип сообщества.',
                            customHeaderPlaceholder: '<!-- Например: -->\n<div style="text-align: center; margin-bottom: 20px;">\n  <a href="https://discord.gg/..." style="color: #5865F2;">Наш Discord</a>\n</div>',
                            saveBtn: 'Сохранить настройки',
                            savingBtn: 'Сохранение...',
                            saveSuccess: '✓ Настройки успешно сохранены!',
                            saveError: 'Ошибка сохранения'
                        },
                        en: {
                            pluginTitle: 'GameAP WebMonitoring Settings',
                            pluginSubtitle: 'Public online game server monitoring plugin for GameAP v1.0.2',
                            openMonitoring: 'Open Monitoring',
                            publicUrlLabel: 'Public URL:',
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
                            themeLabel: 'Default Public Page Theme',
                            darkTheme: '🌙 Dark Theme',
                            lightTheme: '☀️ Light Theme',
                            refreshIntervalLabel: 'Auto-refresh Interval (sec)',
                            serversVisibility: '🎮 Server Visibility',
                            serversVisibilityHelp: 'Select servers that should be displayed on the public monitoring page.',
                            loadingServers: 'Loading servers list...',
                            noServers: 'No installed or running servers found in GameAP.',
                            customCss: '🎨 Custom CSS',
                            customCssHelp: 'Styles are injected directly into the monitoring page without recompilation.',
                            customCssPlaceholder: '/* Example: */\nbody { background: #0b0f19; }\n.server-card { border-radius: 16px; }',
                            customHeader: '📝 Custom Header HTML',
                            customHeaderHelp: 'You can add banners, links to Discord/Telegram, or community logos.',
                            customHeaderPlaceholder: '<!-- Example: -->\n<div style="text-align: center; margin-bottom: 20px;">\n  <a href="https://discord.gg/..." style="color: #5865F2;">Join Discord</a>\n</div>',
                            saveBtn: 'Save Settings',
                            savingBtn: 'Saving...',
                            saveSuccess: '✓ Settings saved successfully!',
                            saveError: 'Save error'
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
                    const hiddenServers = ref([]);
                    const serversList = ref([]);
                    const loadingServers = ref(false);
                    const saving = ref(false);
                    const saveSuccess = ref(false);
                    const saveError = ref('');
                    const copied = ref(false);
                    const selectedProxy = ref('nginx');

                    // Dynamic public URL based on current host/domain
                    const publicUrl = `${window.location.origin}/api/plugins/monitoring/view`;

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
                                max-width: 960px;
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

                            /* Labels */
                            .wm-label {
                                display: block !important;
                                font-size: 13px !important;
                                font-weight: 500 !important;
                                color: var(--wm-text-secondary) !important;
                                margin-bottom: 6px !important;
                            }

                            /* Input and Select Controls */
                            .wm-input, .wm-select {
                                width: 100% !important;
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
                                padding: 12px 16px;
                                background: var(--wm-danger-soft);
                                border: 1px solid var(--wm-danger);
                                border-left: 4px solid var(--wm-danger);
                                border-radius: var(--wm-radius-control);
                                color: var(--wm-danger-text);
                            }

                            /* Instructions Card */
                            .wm-instruction-box {
                                margin-top: 14px;
                                padding: 14px 16px;
                                background: var(--wm-bg-inset);
                                border: 1px solid var(--wm-border);
                                border-left: 4px solid var(--wm-primary);
                                border-radius: var(--wm-radius-control);
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
                                cursor: pointer;
                                transition: background-color 0.2s ease, border-color 0.2s ease;
                            }
                            .wm-server-item:hover {
                                background: var(--wm-surface-hover);
                                border-color: var(--wm-border-strong);
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
                        `;
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
                                if (Array.isArray(localData.hidden_servers)) hiddenServers.value = localData.hidden_servers;
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
                                        if (Array.isArray(data.hidden_servers)) hiddenServers.value = data.hidden_servers;
                                        break;
                                    }
                                } catch (_) {}
                            }
                        } catch (err) {
                            console.warn('Could not load remote plugin settings:', err);
                        }

                        // Load servers list for visibility checkboxes
                        loadingServers.value = true;
                        try {
                            const localCached = localStorage.getItem('web_monitoring_cached_servers');
                            if (localCached) {
                                try {
                                    const parsed = JSON.parse(localCached);
                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                        serversList.value = parsed;
                                    }
                                } catch (_) {}
                            }

                            const srvRes = await fetch('/plugins/web-monitoring/servers');
                            if (srvRes.ok) {
                                const srvData = await srvRes.json();
                                if (srvData.servers && srvData.servers.length > 0) {
                                    serversList.value = srvData.servers;
                                }
                            }

                            // Fallback to GameAP native /api/servers if plugin list is empty
                            if (serversList.value.length === 0) {
                                try {
                                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
                                    const headers = { 'Accept': 'application/json' };
                                    if (token) {
                                        headers['Authorization'] = 'Bearer ' + token;
                                    }
                                    const gRes = await fetch('/api/servers', {
                                        credentials: 'include',
                                        headers: headers
                                    });
                                    if (gRes.ok) {
                                        const gData = await gRes.json();
                                        const rawList = Array.isArray(gData) ? gData : (gData.data || gData.servers || []);
                                        if (rawList.length > 0) {
                                            serversList.value = rawList.map(s => {
                                                const sIp = s.server_ip || s.serverIp || s.ip || '';
                                                const sPort = s.server_port || s.serverPort || s.port || 0;
                                                const sActive = (s.process_active || s.processActive || s.online || false);
                                                const sGame = s.game_id || s.gameId || s.game || 'game';
                                                let cUrl = '';
                                                if (sIp && sPort && (sGame.includes('cs') || sGame.includes('strike') || sGame.includes('rust') || sGame.includes('tf'))) {
                                                    cUrl = `steam://connect/${sIp}:${sPort}`;
                                                }
                                                return {
                                                    id: s.id,
                                                    name: s.name || `Server #${s.id}`,
                                                    game_code: sGame,
                                                    game_name: s.game_name || sGame.toUpperCase(),
                                                    address: sIp,
                                                    port: sPort,
                                                    status: sActive ? 'online' : 'offline',
                                                    installed: s.installed !== undefined ? s.installed : true,
                                                    blocked: s.blocked || false,
                                                    connect_url: cUrl
                                                };
                                            });
                                            updateServerListCache(serversList.value);
                                        }
                                    }
                                } catch (e) {
                                    console.warn('GameAP native API fetch error:', e);
                                }
                            }
                        } catch (err) {
                            console.warn('Could not load servers:', err);
                        } finally {
                            loadingServers.value = false;
                        }
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
                                h('div', { style: 'font-size: 13px; color: var(--wm-text-secondary); display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis;' }, [
                                    h('span', { style: 'font-weight: 600; color: var(--wm-text);' }, t('publicUrlLabel')),
                                    h('code', { class: 'wm-direct-code' }, publicUrl)
                                ]),
                                h('button', {
                                    onClick: copyPublicUrl,
                                    class: 'wm-copy-btn'
                                }, copied.value ? t('copiedUrl') : t('copyUrl'))
                            ]),

                            // Security Warning Callout
                            h('div', { class: 'wm-ddos-alert' }, [
                                h('div', { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;' }, [
                                    h('i', { class: 'fas fa-shield-alt', style: 'color: var(--wm-danger); font-size: 15px;' }),
                                    h('span', { style: 'font-weight: 700; font-size: 13px;' }, t('securityWarningTitle'))
                                ]),
                                h('p', { style: 'margin: 0; font-size: 12.5px; line-height: 1.5;' }, t('securityWarningText'))
                            ]),

                            // Universal instruction card under the warning
                            h('div', { class: 'wm-instruction-box' }, [
                                h('div', { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;' }, [
                                    h('i', { class: 'fas fa-info-circle', style: 'color: var(--wm-primary);' }),
                                    h('span', { style: 'font-weight: 600; color: var(--wm-text); font-size: 13px;' }, t('instructionTitle'))
                                ]),
                                h('ul', { style: 'margin: 0; padding-left: 20px; color: var(--wm-text-secondary); font-size: 12.5px; line-height: 1.6;' }, [
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
                                        onClick: () => { selectedProxy.value = 'nginx'; },
                                        style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'nginx' ? 'var(--wm-primary)' : 'var(--wm-border-strong)'}; background: ${selectedProxy.value === 'nginx' ? 'var(--wm-primary-soft)' : 'var(--wm-surface)'}; color: ${selectedProxy.value === 'nginx' ? 'var(--wm-primary-soft-text)' : 'var(--wm-text-muted)'};`
                                    }, t('tabNginx')),
                                    h('button', {
                                        type: 'button',
                                        onClick: () => { selectedProxy.value = 'caddy'; },
                                        style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'caddy' ? 'var(--wm-primary)' : 'var(--wm-border-strong)'}; background: ${selectedProxy.value === 'caddy' ? 'var(--wm-primary-soft)' : 'var(--wm-surface)'}; color: ${selectedProxy.value === 'caddy' ? 'var(--wm-primary-soft-text)' : 'var(--wm-text-muted)'};`
                                    }, t('tabCaddy')),
                                    h('button', {
                                        type: 'button',
                                        onClick: () => { selectedProxy.value = 'apache'; },
                                        style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'apache' ? 'var(--wm-primary)' : 'var(--wm-border-strong)'}; background: ${selectedProxy.value === 'apache' ? 'var(--wm-primary-soft)' : 'var(--wm-surface)'}; color: ${selectedProxy.value === 'apache' ? 'var(--wm-primary-soft-text)' : 'var(--wm-text-muted)'};`
                                    }, t('tabApache'))
                                ]),
                                h('pre', {
                                    class: 'wm-code-pre'
                                }, selectedProxy.value === 'nginx' 
                                    ? `${t('nginxComment')}\nlocation = /monitoring {\n    rewrite ^ /api/plugins/monitoring/view break;\n    proxy_pass $gameap_backend; # Проксирование на панель GameAP\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n}`
                                    : (selectedProxy.value === 'caddy'
                                        ? `${t('caddyComment')}\nhandle /monitoring {\n    rewrite * /api/plugins/monitoring/view\n    reverse_proxy localhost:8080 # Укажите локальный адрес/порт панели GameAP\n}`
                                        : `${t('apacheComment')}\nRewriteEngine On\nRewriteRule "^monitoring$" "/api/plugins/monitoring/view" [PT]\n`
                                    )
                                )
                            ])
                        ]),

                        // General Settings Card
                        h('div', { class: 'wm-card' }, [
                            h('h3', { class: 'wm-title' }, t('generalSettings')),
                            h('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;' }, [
                                h('div', [
                                    h('label', { class: 'wm-label' }, t('titleLabel')),
                                    h('input', {
                                        type: 'text',
                                        value: title.value,
                                        onInput: (e) => { title.value = e.target.value; },
                                        class: 'wm-input'
                                    })
                                ]),
                                h('div', [
                                    h('label', { class: 'wm-label' }, t('subtitleLabel')),
                                    h('input', {
                                        type: 'text',
                                        value: subtitle.value,
                                        onInput: (e) => { subtitle.value = e.target.value; },
                                        class: 'wm-input'
                                    })
                                ]),
                                h('div', [
                                    h('label', { class: 'wm-label' }, t('themeLabel')),
                                    h('select', {
                                        value: theme.value,
                                        onChange: (e) => { theme.value = e.target.value; },
                                        class: 'wm-select'
                                    }, [
                                        h('option', { value: 'dark' }, t('darkTheme')),
                                        h('option', { value: 'light' }, t('lightTheme'))
                                    ])
                                ]),
                                h('div', [
                                    h('label', { class: 'wm-label' }, t('refreshIntervalLabel')),
                                    h('input', {
                                        type: 'number',
                                        min: '5',
                                        max: '300',
                                        value: refreshInterval.value,
                                        onInput: (e) => { refreshInterval.value = e.target.value; },
                                        class: 'wm-input'
                                    })
                                ])
                            ])
                        ]),

                        // Server Visibility Card
                        h('div', { class: 'wm-card' }, [
                            h('h3', { class: 'wm-title' }, t('serversVisibility')),
                            h('p', { style: 'font-size: 13px; color: var(--wm-text-muted); margin: 0 0 14px 0;' }, t('serversVisibilityHelp')),
                            loadingServers.value
                                ? h('div', { style: 'color: var(--wm-text-muted); font-size: 13px; padding: 12px 0;' }, t('loadingServers'))
                                : serversList.value.length === 0
                                    ? h('div', { style: 'color: var(--wm-text-muted); font-size: 13px; padding: 12px 0;' }, t('noServers'))
                                    : h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, serversList.value.map(srv => {
                                        const isHidden = hiddenServers.value.includes(srv.id);
                                        const isOnline = srv.status === 'online';
                                        return h('label', {
                                            key: srv.id,
                                            class: 'wm-server-item'
                                        }, [
                                            h('input', {
                                                type: 'checkbox',
                                                checked: !isHidden,
                                                onChange: () => toggleServer(srv.id),
                                                style: 'width: 18px; height: 18px; cursor: pointer; accent-color: var(--wm-primary);'
                                            }),
                                            h('div', { style: 'flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px;' }, [
                                                h('span', { style: 'font-size: 14px; font-weight: 500; color: var(--wm-text);' }, srv.name),
                                                h('span', { style: 'font-size: 12px; color: var(--wm-text-muted); font-family: monospace;' }, `${srv.address}:${srv.port}`)
                                            ]),
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
