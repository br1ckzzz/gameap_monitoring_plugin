# GameAP WebMonitoring: Архитектура Rust WASM плагина

> **Статус:** Реализовано и протестировано в ветке `feat/rust-wasm-migration`.  
> **Цель:** Нативная реализация WebAssembly-плагина на языке Rust (`wasm32-wasip1`) для GameAP (Wazero).

---

## 1. Архитектурные особенности Rust WASM реализации

| Характеристика | Описание реализации |
| :--- | :--- |
| **Управление памятью** | Детерминированное RAII освобождение памяти без рантайм-сборщика мусора (GC). |
| **Время отклика** | Стабильный latency обработки HTTP-запросов и событий жизненного цикла серверов. |
| **Инициализация в Wazero** | Быстрая JIT/AOT-компиляция при холодном старте демона и панели GameAP. |
| **Безопасность типов** | Строгая типизация, borrow checker, отсутствие паник и data races при параллельных запросах. |
| **Совместимость** | 100% обратная совместимость по API, роутам и компонентам админ-панели. |

---

## 2. Спецификация взаимодействия с хостом GameAP (ABI)

GameAP исполняет WASM-модули через движок **Wazero** по соглашению интерфейса `knqyf263/go-plugin`.

### Соглашение о вызовах (Memory ABI)

1. Все функции обмениваются сериализованными бинарными сообщениями **Protocol Buffers**.
2. Передача параметров происходит через указатель и длину в общей линейной памяти WASM:
   ```rust
   #[no_mangle]
   pub extern "C" fn plugin_service_<method>(ptr: u32, size: u32) -> u64
   ```
3. Результат возвращается как упакованный `u64`:
   - `ptr = (res >> 32) as u32` (указатель на ответ в памяти WASM)
   - `size = (res & 0xFFFFFFFF) as u32` (длина ответа)
4. Хост использует экспортируемые функции управления памятью:
   - `malloc(size: usize) -> *mut u8`
   - `free(ptr: *mut u8)`
   - `allocate(size: u32) -> u32`
   - `deallocate(ptr: u32, size: u32)`

### Экспортируемые функции (Guest -> GameAP Host)

| Имя экспорта | Назначение |
| :--- | :--- |
| `plugin_service_api_version` | Возвращает номер версии API плагинов GameAP (`1`). |
| `plugin_service_get_info` | Метаданные (ID: `monitoring`, имя, версия, права `listen_events`). |
| `plugin_service_initialize` | Инициализация при включении плагина. |
| `plugin_service_shutdown` | Корректная остановка при выключении. |
| `plugin_service_get_subscribed_events` | Список событий жизненного цикла серверов (`SERVER_POST_START`, `STOP`, `RESTART`, `CREATED`, `UPDATED`, `DELETED`). |
| `plugin_service_handle_event` | Реакция на события (обновление локального кэша статусов серверов). |
| `plugin_service_get_frontend_bundle` | Отдача бандла панели управления (`admin_bundle.js`). |
| `plugin_service_get_assets` | Отдача статики публичного мониторинга (`index.html`, `styles.css`, `app.js`). |
| `plugin_service_get_http_routes` | Декларация эндпоинтов (`/`, `/servers`, `/view`, `/settings`, `/diagnostic`). |
| `plugin_service_handle_http_request` | Маршрутизация HTTP-запросов и генерация HTML/JSON. |
| `plugin_service_get_server_abilities` | Пользовательские права доступа (пустой список). |
| `malloc` | Выделение памяти под буферы хоста. |
| `free` | Освобождение памяти буферов хоста. |

### Импортируемые функции (GameAP Host -> Guest)

| Модуль хоста | Функция | Назначение |
| :--- | :--- | :--- |
| `gameap-servers` | `find_servers(ptr, size) -> u64` | Чтение списка серверов без запроса прав на редактирование (`manage_servers`). |
| `gameap-storage` | `get(ptr, size) -> u64` | Чтение сохранённых настроек плагина из БД GameAP. |
| `gameap-storage` | `set(ptr, size) -> u64` | Запись настроек плагина в БД GameAP. |
| `gameap-games`   | `find_games(ptr, size) -> u64` | Получение справочника установленных игр. |

---

## 3. Структура крейта `rust-plugin/`

```text
rust-plugin/
├── Cargo.toml            # Зависимости (prost, serde, serde_json) и профиль release
├── proto/                # Официальные спецификации protobuf GameAP
│   ├── plugin/proto/plugin.proto
│   ├── plugin/sdk/servers/servers.proto
│   ├── plugin/sdk/storage/storage.proto
│   └── proto/server.proto, game.proto, ...
└── src/
    ├── lib.rs            # Точка входа WASM, экспорты ABI
    ├── abi.rs            # Управление памятью, упаковка u64, буферы
    ├── proto.rs          # Типизированные protobuf-сообщения (prost)
    ├── types.rs          # Внутренние DTO (PublicServerDTO, PluginSettings)
    ├── address.rs        # Интеллектуальный резолвинг публичных IP/доменов
    ├── servers_client.rs # Клиент host-библиотек gameap-servers и gameap-games
    ├── settings.rs       # Чтение/запись конфигурации в gameap-storage
    ├── cache.rs          # Внутриплагинный Micro-Cache на 3-5 сек (защита от DoS)
    ├── assets.rs         # Встраивание статики фронтенда через include_bytes!
    ├── handlers.rs       # HTTP роутинг: /, /servers, /view, /settings, /diagnostic
    └── service.rs        # Дескрипторы метаданных PluginService
```

---

## 4. Конфигурация компилятора (`Cargo.toml`)

```toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

---

## 5. Дорожная карта и тестирование

1. **Разработка и тестирование в ветке `feat/rust-wasm-migration`:**
   - Сборка прототипа через `build_rust.ps1` / `build_rust.sh`.
   - Валидация загрузки и работы в админке GameAP.
   - Тестирование публичного интерфейса мониторинга и сохранения настроек.

2. **Переключение на основной релиз:**
   - После завершения всех проверок ветка `feat/rust-wasm-migration` объединяется с `main`.
