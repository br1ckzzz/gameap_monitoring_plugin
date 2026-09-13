# 🎮 Плагин GameAP WebMonitoring

<p align="center">
  <img src="icon.png" alt="GameAP WebMonitoring Logo" width="128">
</p>

<p align="center">
  <strong>Публичный WebAssembly (WASM) плагин мониторинга игровых серверов для панели управления <a href="https://gameap.ru/">GameAP</a>.</strong>
</p>

<p align="center">
  <a href="https://github.com/br1ckzzz/gameap_monitoring_plugin/releases"><img src="https://img.shields.io/github/v/release/br1ckzzz/gameap_monitoring_plugin?label=версия&color=blue" alt="Версия"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Лицензия-MIT-green.svg" alt="Лицензия: MIT"></a>
  <a href="https://go.dev"><img src="https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go" alt="Go 1.23+"></a>
  <a href="https://webassembly.org"><img src="https://img.shields.io/badge/таргет-wasip1%2Fwasm-654FF0" alt="Таргет: wasip1/wasm"></a>
</p>

<p align="center">
  <a href="README.md">🇬🇧 Read documentation in English</a>
</p>

<p align="center">
  <img src="docs/images/screen.jpg" alt="Интерфейс GameAP WebMonitoring" width="850">
</p>

---

## 📌 Обзор

**GameAP WebMonitoring** добавляет в GameAP автономную, быструю страницу онлайн-мониторинга. Игроки и участники игрового сообщества могут отслеживать статус серверов в реальном времени без необходимости входа или регистрации в панели GameAP.

Плагин компилируется в единый бинарный модуль WebAssembly (`web_monitoring.wasm`, таргет `wasip1`) и выполняется в песочнице **Wazero** внутри GameAP. Он работает полностью внутри экосистемы GameAP, не требуя установки дополнительных служб, демонов или системных пакетов на хост-сервере.

---

## ✨ Возможности

- 🛡️ **Изоляция WebAssembly:** плагин упакован в единый файл `.wasm` и стабильно работает независимо от обновлений самой панели.
- 🌐 **Публичный доступ без пароля:** страница мониторинга и JSON API списка серверов открыты для посетителей, при этом конфиденциальные параметры (RCON-пароли, токены и пути) остаются в безопасности.
- 🎨 **Современный адаптивный интерфейс:**
  - Поддержка темной и светлой темы оформления с сохранением выбора.
  - Двуязычный интерфейс (**русский** и **английский**) для страницы посетителей и панели администратора.
  - Индикаторы статуса серверов (Online / Offline).
  - Фильтрация по играм (Counter-Strike 2, CS 1.6, Minecraft, Rust, Team Fortress 2 и др.).
  - Живой поиск по названию, игре или IP-адресу.
  - Быстрое копирование IP-адреса в буфер и ссылки быстрого запуска `steam://connect`.
- ⏱️ **Автообновление и таймер:** периодическое обновление данных с обратным отсчётом и возможностью ручной перезагрузки.
- ⚙️ **Управление в панели GameAP:**
  - Настройка видимости каждого сервера (скрытие приватных или тестовых серверов).
  - Смена заголовка, описания, темы по умолчанию и интервала опроса.
  - Встроенный редактор Custom CSS и Custom Header HTML (для виджетов Discord, Telegram, логотипов и баннеров без пересборки плагина).

---

## 📂 Структура репозитория

```
gameap_monitoring_plugin/
├── .github/                # GitHub Actions (автосборка и релизы на GitHub)
│   ├── workflows/ci.yml
│   └── workflows/release.yml
├── frontend/               # Исходные файлы веб-интерфейса
│   ├── index.html          # Разметка публичной страницы мониторинга
│   ├── styles.css          # Стили оформления страницы
│   ├── app.js              # Клиентская логика, таймеры, фильтры
│   └── admin_bundle.js     # Компонент для панели администратора GameAP (Vue 3)
├── plugin/                 # Исходный код на Go (WebAssembly/WASI)
│   ├── main.go             # Регистрация плагина в GameAP SDK
│   ├── handler.go          # HTTP-роуты и отдача веб-страниц
│   ├── monitor.go          # Безопасное получение статусов серверов
│   ├── settings.go         # Хранение и сохранение настроек
│   └── assets/             # Встроенные веб-ресурсы, упакованные в бинарник
├── scripts/                # Скрипты сборки
│   ├── build.sh            # Сборка для Linux / macOS
│   └── build.ps1           # Сборка для Windows (PowerShell)
├── Dockerfile              # Мультистейдж-сборка в Docker
└── mock_server.py          # Локальный сервер для предпросмотра
```

---

## 🚀 Установка

### 1. Скачивание или сборка плагина
Скачайте готовый файл `web_monitoring.wasm` (v1.0.3) со страницы **[GitHub Releases](https://github.com/br1ckzzz/gameap_monitoring_plugin/releases)** (либо соберите его из исходников согласно инструкции ниже).
Поместите файл `web_monitoring.wasm` в каталог плагинов GameAP (по умолчанию `/var/lib/gameap/plugins/` или директорию, указанную в `PLUGINS_DIR`).

### 2. Активация плагина
1. Войдите в панель управления GameAP с правами администратора.
2. Перейдите в раздел **Администрирование -> Плагины**.
3. Найдите **GameAP WebMonitoring** в списке и нажмите **Включить** (или выполните `gameapctl plugins reload`).
4. В боковом меню панели появится раздел **Мониторинг**.

---

## ⚠️ Важное предупреждение: Безопасность и защита от DDoS-атак

> [!CAUTION]
> **НЕ предоставляйте публичный доступ к мониторингу напрямую по «сырому» IP-адресу сервера (например, `http://IP_СЕРВЕРА:8080/api/...`)!**
> Публикация прямого IP-адреса хост-машины делает ваш сервер открытой мишенью для **целевых DDoS-атак** (прямой флуд по IP в обход систем фильтрации). Мощный флуд по веб-порту перегружает сетевой стек и процессор хоста, из-за чего перестанет отвечать не только панель GameAP, но и **все запущенные на сервере игровые серверы**.

### Рекомендации по безопасной публикации:
1. **Используйте доменное имя (FQDN):** Никогда не распространяйте прямые IP-адреса для веб-доступа к панели.
2. **Обратный прокси (Nginx, Caddy, Apache):** Настройте веб-сервер для проксирования запросов на локальный порт GameAP и терминации SSL (HTTPS).
3. **Защита от DDoS (Cloudflare, DDoS-Guard, StormWall):** Подключите ваш домен через сервис защиты от атак (в Cloudflare обязательно включите «оранжевое облако» 🟠 Proxy). Это скроет реальный IP-адрес вашей машины от злоумышленников.

---

## 🌐 Доступ по URL и настройка веб-сервера

### Прямой доступ из коробки
Страница мониторинга доступна по адресу вашего домена:
```
https://<домен-вашей-панели>/api/plugins/monitoring/view
```
- Страница открыта для посетителей и не требует авторизации.
- Корректно работает через HTTPS.

### Красивый короткий URL (`/monitoring`)
Чтобы игроки переходили по красивой короткой ссылке вида `https://<домен>/monitoring`, добавьте правило в настройки вашего веб-сервера:

#### 1. Nginx (Основной вариант)
Внутри конфигурационного блока `server { ... }` вашего сайта GameAP (например, в `/etc/nginx/sites-available/gameap`):

```nginx
location = /monitoring {
    rewrite ^ /api/plugins/monitoring/view break;
    proxy_pass $gameap_backend; # Или http://127.0.0.1:8080
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

#### 2. Caddy (Современная альтернатива с автоматическим HTTPS)
В блоке вашего домена в `Caddyfile`:

```caddy
handle /monitoring {
    rewrite * /api/plugins/monitoring/view
    reverse_proxy localhost:8080
}
```

#### 3. Apache (Альтернатива)
В секции `<VirtualHost *:443>` или файле `.htaccess`:

```apache
RewriteEngine On
RewriteRule "^monitoring$" "/api/plugins/monitoring/view" [PT]
```

> **Примечание:** Статические файлы (`/plugins/web-monitoring/`) и маршруты API (`/api/plugins/monitoring/`) обрабатываются панелью GameAP автоматически.

---

## 🛠️ Сборка из исходного кода

Для компиляции плагина требуется **Go 1.22+** или установленный **Docker**.

### Сборка через скрипты

#### Linux / macOS:
```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

#### Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

### Сборка через Docker (без установки Go)
```bash
docker build -t gameap-web-monitoring -f Dockerfile .
docker create --name temp-build gameap-web-monitoring
docker cp temp-build:/web_monitoring.wasm ./web_monitoring.wasm
docker rm temp-build
```

---

## 🧪 Локальное тестирование верстки

Интерфейс можно протестировать локально без запуска GameAP:

```bash
python mock_server.py
```

Откройте адрес **http://localhost:8050** в браузере.

## 📄 Лицензия

Распространяется под лицензией MIT. Подробности см. в файле [LICENSE](LICENSE).
