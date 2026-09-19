# GameAP WebMonitoring: Архитектура перехода на RUST (WASM)

> **Статус:** Проектирование и каркас для плавного перехода в ветке `feat/rust-wasm-migration`.  
> **Цель:** Снижение размера бинарника с **25.6 МБ** до **~0.8–1.5 МБ**, радикальное уменьшение потребления памяти и ускорение холодного старта в GameAP (Wazero).

---

## 1. Сравнительный анализ: Go WASM vs. Rust WASM

| Показатель | Текущий Go (`wasip1/wasm`) | Проектируемый Rust (`wasm32-wasip1`) | Выигрыш / Эффект |
| :--- | :--- | :--- | :--- |
| **Размер `.wasm` бинарника** | **25.6 МБ** | **~0.8 – 1.5 МБ** (сжатие на ~95%) | В 20+ раз меньше! Быстрая передача, меньше нагрузка на диск и сеть. |
| **Сборщик мусора (GC)** | Встроен в WASM (паузы GC, overhead таблиц типов) | **Отсутствует** (детерминированное RAII освобождение) | Предсказуемый latency, нулевые задержки при пиковом трафике. |
| **Потребление RAM в Wazero** | ~40 – 60 МБ на инстанс плагина | **~2 – 5 МБ** на инстанс плагина | Снижение расхода памяти в 10 раз. |
| **Время компиляции AOT/JIT** | 100–300 мс при старте демона GameAP | **5–15 мс** | Мгновенный холодный старт панели и демона. |
| **Безопасность типов** | Стандартная (Go duck typing / interface{}) | Строгая система типов Rust, borrow checker | Исключение data races и паник в рантайме. |

---

## 2. Спецификация взаимодействия с хостом GameAP (ABI)

GameAP исполняет WASM-модули через движок **Wazero** по соглашению интерфейса `knqyf263/go-plugin`.

### Соглашение о вызовах (Memory ABI)

1. Все функции обмениваются сериализованными бинарными сообщениями **Protocol Buffers**.
2. Передача параметров происходит через указатель и длину в общей линейной памяти WASM:
   ```rust
   // Сигнатура всех экспортируемых RPC методов
   #[no_mangle]
   pub extern "C" fn plugin_service_<method>(ptr: u32, size: u32) -> u64
   ```
3. Результат возвращается как упакованный `u64`:
   - `ptr = (res >> 32) as u32` (указатель на ответ в памяти WASM)
   - `size = (res & 0xFFFFFFFF) as u32` (длина ответа)
4. Хост вызывает функцию аллокации памяти в плагине:
   - `allocate(size: u32) -> u32`
   - `free(ptr: u32)` / `deallocate(ptr: u32, size: u32)`

### Экспортируемые функции (Guest -> GameAP Host)

| Имя экспорта | Назначение |
| :--- | :--- |
| `plugin_service_api_version` | Возвращает номер версии API плагинов GameAP (`1`). |
| `plugin_service_get_info` | Метаданные (ID: `monitoring`, имя, версия, права `listen_events`). |
| `plugin_service_initialize` | Инициализация при включении плагина. |
| `plugin_service_shutdown` | Корректная остановка при выключении. |
| `plugin_service_get_subscribed_events` | Список событий жизненного цикла серверов (`SERVER_POST_START`, `STOP`, `RESTART`, `CREATED`, `UPDATED`, `DELETED`). |
| `plugin_service_handle_event` | Реакция на события (мгновенное обновление статусов серверов в кэше). |
| `plugin_service_get_frontend_bundle` | Отдача бандла панели управления (`admin_bundle.js`). |
| `plugin_service_get_assets` | Отдача статики публичного мониторинга (`index.html`, `styles.css`, `app.js`). |
| `plugin_service_get_http_routes` | Декларация эндпоинтов (`/`, `/servers`, `/view`, `/settings`, `/diagnostic`). |
| `plugin_service_handle_http_request` | Маршрутизация HTTP-запросов и генерация HTML/JSON. |
| `plugin_service_get_server_abilities` | Пользовательские права доступа (пустой список). |

### Импортируемые функции (GameAP Host -> Guest)

| Модуль хоста | Функция | Назначение |
| :--- | :--- | :--- |
| `gameap-servers` | `find_servers(ptr, size) -> u64` | **Безопасное** чтение списка серверов без запроса прав на редактирование (`manage_servers`). |
| `gameap-storage` | `get(ptr, size) -> u64` | Чтение сохранённых настроек плагина из БД GameAP. |
| `gameap-storage` | `set(ptr, size) -> u64` | Запись настроек плагина в БД GameAP. |
| `gameap-games`   | `get_games(ptr, size) -> u64` | Получение справочника установленных игр. |
| `gameap-log`     | `log(ptr, size) -> u64` | Системный логгер GameAP. |

---

## 3. Структура крейта `rust-plugin/`

```text
rust-plugin/
├── Cargo.toml            # Зависимости (prost, serde, serde_json) и флаги оптимизации
├── build.rs              # Кодогенерация из Proto-файлов GameAP
├── proto/                # Официальные спецификации protobuf GameAP
│   ├── plugin/proto/plugin.proto
│   ├── plugin/sdk/servers/servers.proto
│   ├── plugin/sdk/storage/storage.proto
│   └── proto/server.proto, game.proto, ...
└── src/
    ├── lib.rs            # Точка входа WASM, аллокатор и exports
    ├── abi.rs            # Управление памятью, упаковка u64, буферы
    ├── proto.rs          # Модули сгенерированных protobuf структур
    ├── types.rs          # Внутренние DTO (PublicServerDTO, PluginSettings)
    ├── settings.rs       # Чтение/запись конфигурации в gameap-storage
    ├── cache.rs          # Внутриплагинный Micro-Cache на 3-5 сек (защита от DoS)
    ├── assets.rs         # Встраивание статики фронтенда через include_bytes!
    ├── handlers.rs       # HTTP роутинг: /, /servers, /view, /settings, /diagnostic
    └── service.rs        # Реализация бизнес-логики PluginService
```

---

## 4. Конфигурация компилятора для минимального веса (`Cargo.toml`)

```toml
[profile.release]
opt-level = "z"        # Агрессивная оптимизация по размеру кода
lto = true             # Link Time Optimization (сквозное удаление неиспользуемого кода)
codegen-units = 1      # Единый блок кодогенерации для максимального LTO
panic = "abort"        # Исключение раскрутки стека при паниках (-150 КБ)
strip = true           # Вырезание таблиц отладочных символов
```

Дополнительно на выходе применяется утилита `wasm-opt`:
```bash
wasm-opt -Oz -o web_monitoring.wasm target/wasm32-wasip1/release/gameap_web_monitoring.wasm
```

---

## 5. План перехода и тестирования (Roadmap)

1. **Этап 1 (Текущий):**
   - Создана ветка `feat/rust-wasm-migration`.
   - Подготовлена спецификация, схемы Proto, каркас крейта `rust-plugin` и скрипты сборки.
   - Текущий релиз v1.0.5 на Go в ветке `main` остаётся в неизменном рабочем состоянии.

2. **Этап 2 (Будущая разработка и тесты):**
   - Установка `rust` (`rustup target add wasm32-wasip1`).
   - Сборка прототипа `build_rust.ps1` / `build_rust.sh`.
   - Запуск через тестовый скрипт `mock_server.py` и Wazero harness.
   - Сравнение производительности и размера (`web_monitoring.wasm`).

3. **Этап 3 (Мягкое переключение):**
   - Замена артефакта `web_monitoring.wasm` в релизной сборке после прохождения тестов.
   - Слияние ветки `feat/rust-wasm-migration` в `main`.
