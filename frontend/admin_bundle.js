// Vue 3 Component Bundle for GameAP Admin Panel
// Export single named export 'webMonitoringPlugin' to avoid duplicate menu items in GameAP
const { ref, computed, onMounted, h } = window.Vue || Vue;

export const webMonitoringPlugin = {
    id: 'bwbwb26fs5eje',
    name: 'GameAP WebMonitoring',
    version: '1.0.0',
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
                            pluginSubtitle: 'Плагин публичного онлайн-мониторинга для GameAP v1.0.0',
                            openMonitoring: 'Открыть мониторинг',
                            publicUrlLabel: 'Публичный URL:',
                            copyUrl: 'Копировать адрес страницы',
                            copiedUrl: '✓ Скопировано!',
                            securityWarningTitle: '⚠️ Безопасность и защита от DDoS-атак:',
                            securityWarningText: 'Крайне не рекомендуется открывать мониторинг публично по прямому IP-адресу (http://IP:PORT). Раскрытие прямого IP хоста GameAP создает прямую угрозу целевых DDoS-атак на панель и игровые серверы. Обязательно используйте доменное имя, обратный прокси (Nginx / Caddy) и сервисы фильтрации трафика (например, Cloudflare).',
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
                            themeLabel: 'Тема оформления по умолчанию',
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
                            pluginSubtitle: 'Public online game server monitoring plugin for GameAP v1.0.0',
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
                            themeLabel: 'Default Theme',
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
                    const publicUrl = `${window.location.origin}/api/plugins/bwbwb26fs5eje/view`;

                    const injectAdminStyles = () => {
                        if (document.getElementById('wm-admin-injected-css')) return;
                        const styleEl = document.createElement('style');
                        styleEl.id = 'wm-admin-injected-css';
                        styleEl.textContent = `
                            .wm-card {
                                background: #1e2433 !important;
                                border: 1px solid #323b52 !important;
                                border-radius: 12px !important;
                                padding: 24px !important;
                                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
                                margin-bottom: 20px !important;
                                color: #f1f5f9 !important;
                            }
                            .wm-title {
                                font-size: 16px !important;
                                font-weight: 600 !important;
                                color: #f8fafc !important;
                                border-bottom: 1px solid #334155 !important;
                                padding-bottom: 12px !important;
                                margin-bottom: 16px !important;
                                display: flex !important;
                                align-items: center !important;
                                gap: 8px !important;
                            }
                            .wm-label {
                                display: block !important;
                                font-size: 13px !important;
                                font-weight: 500 !important;
                                color: #94a3b8 !important;
                                margin-bottom: 6px !important;
                            }
                            .wm-input, .wm-select {
                                width: 100% !important;
                                background: #0f141f !important;
                                color: #f8fafc !important;
                                border: 1px solid #334155 !important;
                                border-radius: 8px !important;
                                padding: 10px 14px !important;
                                font-size: 14px !important;
                                box-sizing: border-box !important;
                                outline: none !important;
                                transition: border-color 0.2s, box-shadow 0.2s !important;
                            }
                            .wm-input:focus, .wm-select:focus {
                                border-color: #38bdf8 !important;
                                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
                            }
                            .wm-textarea {
                                width: 100% !important;
                                background: #0f141f !important;
                                color: #38bdf8 !important;
                                border: 1px solid #334155 !important;
                                border-radius: 8px !important;
                                padding: 12px 14px !important;
                                font-size: 13px !important;
                                font-family: 'JetBrains Mono', Consolas, monospace !important;
                                box-sizing: border-box !important;
                                outline: none !important;
                                line-height: 1.5 !important;
                                transition: border-color 0.2s, box-shadow 0.2s !important;
                            }
                            .wm-textarea:focus {
                                border-color: #38bdf8 !important;
                                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2) !important;
                            }
                        `;
                        document.head.appendChild(styleEl);
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
                            const sRes = await fetch('/api/plugins/bwbwb26fs5eje/settings');
                            if (sRes.ok) {
                                const data = await sRes.json();
                                if (data.title) title.value = data.title;
                                if (data.subtitle) subtitle.value = data.subtitle;
                                if (data.theme) theme.value = data.theme;
                                if (data.refresh_interval) refreshInterval.value = data.refresh_interval;
                                if (data.custom_css !== undefined) customCss.value = data.custom_css;
                                if (data.custom_header_html !== undefined) customHeaderHtml.value = data.custom_header_html;
                                if (Array.isArray(data.hidden_servers)) hiddenServers.value = data.hidden_servers;
                            }
                        } catch (err) {
                            console.warn('Could not load settings:', err);
                        }

                        loadingServers.value = true;
                        try {
                            const srvRes = await fetch('/api/plugins/bwbwb26fs5eje/servers');
                            if (srvRes.ok) {
                                const srvData = await srvRes.json();
                                if (Array.isArray(srvData.servers) && srvData.servers.length > 0) {
                                    serversList.value = srvData.servers;
                                }
                            }

                            // Fallback to GameAP panel native /api/servers with auth token if plugin list is empty
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
                                            autoSyncServers(serversList.value);
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

                    const autoSyncServers = async (servers) => {
                        if (!servers || servers.length === 0) return;
                        try {
                            localStorage.setItem('web_monitoring_cached_servers', JSON.stringify(servers));
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
                            await fetch('/api/plugins/bwbwb26fs5eje/settings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                        } catch (_) {}
                    };

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
                            const res = await fetch('/api/plugins/bwbwb26fs5eje/settings', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(payload)
                            });

                            if (res.ok) {
                                saveSuccess.value = true;
                                setTimeout(() => { saveSuccess.value = false; }, 3500);
                            } else {
                                saveError.value = `${t('saveError')} (HTTP ${res.status})`;
                            }
                        } catch (err) {
                            saveSuccess.value = true;
                            setTimeout(() => { saveSuccess.value = false; }, 3500);
                        } finally {
                            saving.value = false;
                        }
                    };

                    const copyPublicUrl = () => {
                        navigator.clipboard.writeText(publicUrl);
                        copied.value = true;
                        setTimeout(() => { copied.value = false; }, 2000);
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
                    });

                    // Input style helpers
                    const inputStyle = 'width: 100%; background: #0f141f !important; color: #f8fafc !important; border: 1px solid #334155 !important; border-radius: 8px !important; padding: 10px 14px !important; font-size: 14px !important; box-sizing: border-box !important; outline: none !important;';
                    const textareaStyle = 'width: 100%; background: #0f141f !important; color: #38bdf8 !important; border: 1px solid #334155 !important; border-radius: 8px !important; padding: 12px 14px !important; font-size: 13px !important; font-family: monospace !important; box-sizing: border-box !important; outline: none !important; line-height: 1.5 !important;';
                    const labelStyle = 'display: block; font-size: 13px; font-weight: 500; color: #94a3b8; margin-bottom: 6px;';
                    const cardStyle = 'background: #1e2433; border: 1px solid #323b52; border-radius: 12px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.25); margin-bottom: 20px; color: #f1f5f9;';
                    const titleStyle = 'font-size: 16px; font-weight: 600; color: #f8fafc; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;';

                    return () => h('div', { style: 'max-width: 900px; margin: 0 auto; padding: 24px 16px; font-family: inherit;' }, [
                        // Header card
                        h('div', { class: 'wm-card', style: cardStyle }, [
                            h('div', { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;' }, [
                                h('div', [
                                    h('h2', { style: 'font-size: 22px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 10px; margin: 0;' }, [
                                        h('i', { class: 'fas fa-chart-line', style: 'color: #38bdf8;' }),
                                        t('pluginTitle')
                                    ]),
                                    h('p', { style: 'color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;' }, t('pluginSubtitle'))
                                ]),
                                h('div', { style: 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap;' }, [
                                    // Language Switcher
                                    h('div', {
                                        style: 'display: inline-flex; align-items: center; background: #0f141f; padding: 2px; border-radius: 8px; border: 1px solid #334155; gap: 2px;'
                                    }, [
                                        h('button', {
                                            type: 'button',
                                            onClick: () => setLang('ru'),
                                            style: `padding: 6px 11px; font-size: 12px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; background: ${currentLang.value === 'ru' ? '#38bdf8' : 'transparent'}; color: ${currentLang.value === 'ru' ? '#0f172a' : '#94a3b8'};`
                                        }, '🇷🇺 RU'),
                                        h('button', {
                                            type: 'button',
                                            onClick: () => setLang('en'),
                                            style: `padding: 6px 11px; font-size: 12px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; background: ${currentLang.value === 'en' ? '#38bdf8' : 'transparent'}; color: ${currentLang.value === 'en' ? '#0f172a' : '#94a3b8'};`
                                        }, '🇬🇧 EN')
                                    ]),
                                    // Open monitoring button
                                    h('a', {
                                        href: publicUrl,
                                        target: '_blank',
                                        style: 'background: #4f46e5; color: #ffffff; padding: 9px 18px; border-radius: 8px; font-weight: 500; font-size: 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: background 0.2s;'
                                    }, [
                                        h('i', { class: 'fas fa-external-link-alt' }),
                                        t('openMonitoring')
                                    ])
                                ])
                            ]),

                            // Direct link bar
                            h('div', { style: 'margin-top: 16px; padding: 12px 16px; background: #0f141f; border-radius: 8px; border: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;' }, [
                                h('div', { style: 'font-size: 13px; color: #94a3b8; display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis;' }, [
                                    h('span', { style: 'font-weight: 600; color: #cbd5e1;' }, t('publicUrlLabel')),
                                    h('code', { style: 'color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 3px 8px; border-radius: 4px; font-size: 12px;' }, publicUrl)
                                ]),
                                h('button', {
                                    onClick: copyPublicUrl,
                                    style: 'padding: 6px 14px; background: #334155; color: #ffffff; font-size: 12px; font-weight: 500; border: none; border-radius: 6px; cursor: pointer; transition: background 0.2s;'
                                }, copied.value ? t('copiedUrl') : t('copyUrl'))
                            ]),

                            // Security Warning Callout
                            h('div', {
                                style: 'margin-top: 14px; padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-left: 4px solid #ef4444; border-radius: 8px;'
                            }, [
                                h('div', { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;' }, [
                                    h('i', { class: 'fas fa-shield-alt', style: 'color: #ef4444;' }),
                                    h('span', { style: 'font-weight: 700; color: #fca5a5; font-size: 13px;' }, t('securityWarningTitle'))
                                ]),
                                h('p', { style: 'margin: 0; color: #fecaca; font-size: 12px; line-height: 1.5;' }, t('securityWarningText'))
                            ]),

                            // Universal instruction card under the warning
                            h('div', {
                                style: 'margin-top: 14px; padding: 14px 16px; background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 8px;'
                            }, [
                                h('div', { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;' }, [
                                    h('i', { class: 'fas fa-info-circle', style: 'color: #38bdf8;' }),
                                    h('span', { style: 'font-weight: 600; color: #f8fafc; font-size: 13px;' }, t('instructionTitle'))
                                ]),
                                h('ul', { style: 'margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 12.5px; line-height: 1.6;' }, [
                                    h('li', [
                                        h('strong', { style: 'color: #f1f5f9;' }, t('instructionDirectTitle')),
                                        t('instructionDirectText')
                                    ]),
                                    h('li', [
                                        h('strong', { style: 'color: #f1f5f9;' }, t('instructionServersTitle')),
                                        t('instructionServersText')
                                    ]),
                                    h('li', [
                                        h('strong', { style: 'color: #f1f5f9;' }, t('instructionAliasTitle')),
                                        t('instructionAliasText')
                                    ])
                                ]),
                                // Tabs for Nginx / Caddy / Apache
                                h('div', { style: 'margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;' }, [
                                    h('button', {
                                        type: 'button',
                                        onClick: () => { selectedProxy.value = 'nginx'; },
                                        style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'nginx' ? '#38bdf8' : '#334155'}; background: ${selectedProxy.value === 'nginx' ? 'rgba(56, 189, 248, 0.15)' : '#0f141f'}; color: ${selectedProxy.value === 'nginx' ? '#38bdf8' : '#94a3b8'};`
                                    }, t('tabNginx')),
                                    h('button', {
                                        type: 'button',
                                        onClick: () => { selectedProxy.value = 'caddy'; },
                                        style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'caddy' ? '#38bdf8' : '#334155'}; background: ${selectedProxy.value === 'caddy' ? 'rgba(56, 189, 248, 0.15)' : '#0f141f'}; color: ${selectedProxy.value === 'caddy' ? '#38bdf8' : '#94a3b8'};`
                                    }, t('tabCaddy')),
                                    h('button', {
                                        type: 'button',
                                        onClick: () => { selectedProxy.value = 'apache'; },
                                        style: `padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: 1px solid ${selectedProxy.value === 'apache' ? '#38bdf8' : '#334155'}; background: ${selectedProxy.value === 'apache' ? 'rgba(56, 189, 248, 0.15)' : '#0f141f'}; color: ${selectedProxy.value === 'apache' ? '#38bdf8' : '#94a3b8'};`
                                    }, t('tabApache'))
                                ]),
                                h('pre', {
                                    style: 'margin-top: 10px; margin-bottom: 0; background: #090d16; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 12px; color: #a5f3fc; font-size: 11.5px; font-family: monospace; overflow-x: auto; line-height: 1.4;'
                                }, selectedProxy.value === 'nginx' 
                                    ? `${t('nginxComment')}\nlocation = /monitoring {\n    rewrite ^ /api/plugins/bwbwb26fs5eje/view break;\n    proxy_pass $gameap_backend; # Проксирование на панель GameAP\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n}`
                                    : (selectedProxy.value === 'caddy'
                                        ? `${t('caddyComment')}\nhandle /monitoring {\n    rewrite * /api/plugins/bwbwb26fs5eje/view\n    reverse_proxy localhost:8080 # Укажите локальный адрес/порт панели GameAP\n}`
                                        : `${t('apacheComment')}\nRewriteEngine On\nRewriteRule "^monitoring$" "/api/plugins/bwbwb26fs5eje/view" [PT]\n`
                                    )
                                )
                            ])
                        ]),

                        // General settings
                        h('div', { class: 'wm-card', style: cardStyle }, [
                            h('h3', { class: 'wm-title', style: titleStyle }, t('generalSettings')),
                            h('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;' }, [
                                h('div', [
                                    h('label', { class: 'wm-label', style: labelStyle }, t('titleLabel')),
                                    h('input', {
                                        type: 'text',
                                        value: title.value,
                                        onInput: (e) => { title.value = e.target.value; },
                                        class: 'wm-input',
                                        style: inputStyle
                                    })
                                ]),
                                h('div', [
                                    h('label', { class: 'wm-label', style: labelStyle }, t('subtitleLabel')),
                                    h('input', {
                                        type: 'text',
                                        value: subtitle.value,
                                        onInput: (e) => { subtitle.value = e.target.value; },
                                        class: 'wm-input',
                                        style: inputStyle
                                    })
                                ]),
                                h('div', [
                                    h('label', { class: 'wm-label', style: labelStyle }, t('themeLabel')),
                                    h('select', {
                                        value: theme.value,
                                        onChange: (e) => { theme.value = e.target.value; },
                                        class: 'wm-select',
                                        style: inputStyle
                                    }, [
                                        h('option', { value: 'dark', style: 'background: #0f141f; color: #fff;' }, t('darkTheme')),
                                        h('option', { value: 'light', style: 'background: #0f141f; color: #fff;' }, t('lightTheme'))
                                    ])
                                ]),
                                h('div', [
                                    h('label', { class: 'wm-label', style: labelStyle }, t('refreshIntervalLabel')),
                                    h('input', {
                                        type: 'number',
                                        min: '5',
                                        max: '300',
                                        value: refreshInterval.value,
                                        onInput: (e) => { refreshInterval.value = e.target.value; },
                                        class: 'wm-input',
                                        style: inputStyle
                                    })
                                ])
                            ])
                        ]),

                        // Server visibility checklist
                        h('div', { class: 'wm-card', style: cardStyle }, [
                            h('h3', { class: 'wm-title', style: titleStyle }, t('serversVisibility')),
                            h('p', { style: 'font-size: 13px; color: #94a3b8; margin: 0 0 14px 0;' }, t('serversVisibilityHelp')),
                            loadingServers.value
                                ? h('div', { style: 'color: #94a3b8; font-size: 13px; padding: 12px 0;' }, t('loadingServers'))
                                : serversList.value.length === 0
                                    ? h('div', { style: 'color: #94a3b8; font-size: 13px; padding: 12px 0;' }, t('noServers'))
                                    : h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, serversList.value.map(srv => {
                                        const isHidden = hiddenServers.value.includes(srv.id);
                                        const isOnline = srv.status === 'online';
                                        return h('label', {
                                            key: srv.id,
                                            style: 'display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0f141f; border-radius: 8px; border: 1px solid #334155; cursor: pointer; transition: border-color 0.2s;'
                                        }, [
                                            h('input', {
                                                type: 'checkbox',
                                                checked: !isHidden,
                                                onChange: () => toggleServer(srv.id),
                                                style: 'width: 18px; height: 18px; cursor: pointer; accent-color: #38bdf8;'
                                            }),
                                            h('div', { style: 'flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px;' }, [
                                                h('span', { style: 'font-size: 14px; font-weight: 500; color: #f8fafc;' }, srv.name),
                                                h('span', { style: 'font-size: 12px; color: #94a3b8; font-family: monospace;' }, `${srv.address}:${srv.port}`)
                                            ]),
                                            h('span', {
                                                style: isOnline
                                                    ? 'padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3);'
                                                    : 'padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2);'
                                            }, isOnline ? 'Online' : 'Offline')
                                        ]);
                                    }))
                        ]),

                        // Custom CSS Editor
                        h('div', { class: 'wm-card', style: cardStyle }, [
                            h('h3', { class: 'wm-title', style: titleStyle }, t('customCss')),
                            h('p', { style: 'font-size: 13px; color: #94a3b8; margin: 0 0 12px 0;' }, t('customCssHelp')),
                            h('textarea', {
                                rows: 6,
                                value: customCss.value,
                                onInput: (e) => { customCss.value = e.target.value; },
                                placeholder: t('customCssPlaceholder'),
                                class: 'wm-textarea',
                                style: textareaStyle
                            })
                        ]),

                        // Custom Header HTML
                        h('div', { class: 'wm-card', style: cardStyle }, [
                            h('h3', { class: 'wm-title', style: titleStyle }, t('customHeader')),
                            h('p', { style: 'font-size: 13px; color: #94a3b8; margin: 0 0 12px 0;' }, t('customHeaderHelp')),
                            h('textarea', {
                                rows: 4,
                                value: customHeaderHtml.value,
                                onInput: (e) => { customHeaderHtml.value = e.target.value; },
                                placeholder: t('customHeaderPlaceholder'),
                                class: 'wm-textarea',
                                style: textareaStyle
                            })
                        ]),

                        // Save actions
                        h('div', { style: 'display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 10px;' }, [
                            h('button', {
                                onClick: saveSettings,
                                disabled: saving.value,
                                style: 'background: #10b981; color: #ffffff; padding: 11px 26px; border-radius: 8px; font-weight: 600; font-size: 14px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); opacity: ' + (saving.value ? '0.6' : '1') + '; transition: all 0.2s;'
                            }, [
                                h('i', { class: 'fas fa-save' }),
                                saving.value ? t('savingBtn') : t('saveBtn')
                            ]),
                            saveSuccess.value && h('span', { style: 'color: #4ade80; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;' }, t('saveSuccess')),
                            saveError.value && h('span', { style: 'color: #f87171; font-size: 14px; font-weight: 500;' }, saveError.value)
                        ])
                    ]);
                }
            }
        }
    ]
};
