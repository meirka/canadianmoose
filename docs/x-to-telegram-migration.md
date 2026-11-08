# Перенос X → Telegram

Задача: [#8 — X2tg](https://github.com/meirka/canadianmoose/issues/8).
Источник: [el15eev/tgwriter](https://github.com/el15eev/tgwriter), включая локальный файл тестов.
Целевая ветка PR: `meirka/canadianmoose:main`.

## Состав переноса

- `.github/workflows/x-to-telegram.yml` — расписание и запуск уведомлений.
- `.github/scripts/x_to_telegram.mjs` — получение RSS через локальный Nitter и отправка самостоятельных публикаций X в Telegram.
- `.github/scripts/x_to_telegram.test.mjs` — существующие тесты, в том числе незакоммиченный в исходном проекте файл.
- `.github/nitter/nitter.conf` — конфигурация Nitter.
- `.github/state/last_tweet_id.txt` — состояние последней обработанной публикации.

Скрипт, тесты, конфигурация и состояние переносятся без изменений.
В workflow ссылка на `secrets.TGTOKEN` заменена на существующий
`secrets.TELEGRAM_BOT_TOKEN` целевого репозитория. Для `TELEGRAM_CHAT_ID`
также используется текущий секрет `canadianmoose`.

Сохраняются Node.js 20, версии Actions и образы контейнеров, фильтрация
ответов/репостов, форматирование и расписание исходного workflow:
`17 5-21 * * *`, часовой пояс `America/Toronto`.
Дополнительного флага включения нет. Существующие workflow YouTube и Topics
не изменяются.

## Настройки GitHub Actions

Значения секретов не входят в Git, PR или эту инструкцию.

| Тип | Имя | Действие |
| --- | --- | --- |
| Secret | `TELEGRAM_BOT_TOKEN` | Использовать существующий секрет `canadianmoose`; `TGTOKEN` не переносить. |
| Secret | `TELEGRAM_CHAT_ID` | Использовать существующий секрет `canadianmoose`. |
| Secret | `NITTER_SESSION_AUTH_TOKEN` | Пользователь вручную добавляет в `canadianmoose` до слияния PR. |
| Secret | `NITTER_SESSION_CT0` | Пользователь вручную добавляет в `canadianmoose` до слияния PR. |
| Variable | `NITTER_SESSION_KIND` | Уже присутствует в обоих репозиториях; значения совпадают на момент подготовки PR. |
| Variable | `NITTER_SESSION_USERNAME` | Уже присутствует в обоих репозиториях; значения совпадают на момент подготовки PR. |
| Variable | `X_USERNAME` | Уже присутствует в обоих репозиториях; значения совпадают на момент подготовки PR. |

Секреты добавляются в [Settings → Secrets and variables → Actions](https://github.com/meirka/canadianmoose/settings/secrets/actions).

## Алгоритм переключения

Подготовка PR не переключает работающую автоматизацию. До слияния старый
workflow продолжает работать и обновлять состояние. Новый workflow сможет
запускаться по расписанию после попадания в `main`, поэтому переключение
нужно завершить до его следующего запуска. Все времена расписания ниже
относятся к `America/Toronto`.

1. **До слияния PR вручную добавить в `canadianmoose` секреты
   `NITTER_SESSION_AUTH_TOKEN` и `NITTER_SESSION_CT0`.** Проверить наличие
   двух текущих Telegram-секретов и трёх переменных из таблицы.
2. Выбрать окно между запусками по расписанию, дождаться завершения
   старого workflow и убедиться, что нет старых запусков в очереди.
   Учитывать возможные задержки GitHub Actions. Самое длинное окно —
   между вечерним запуском в 21:17 и утренним в 05:17.
   Обновить `.github/state/last_tweet_id.txt` в ветке PR из актуального
   `main` репозитория `el15eev/tgwriter`, закоммитить и отправить обновление.
   Состояние в первоначальном PR — снимок на момент подготовки.
3. Слить PR в `meirka/canadianmoose:main` и **сразу после слияния отключить
   старый workflow**:

   ```sh
   gh workflow disable x-to-telegram.yml --repo el15eev/tgwriter
   ```

   Не отключать старый workflow до слияния PR.
4. Проверить отсутствие выполняющихся и ожидающих старых запусков:
   отключение workflow само по себе не завершает уже созданный запуск.
   Если такой запуск есть, дождаться его завершения и до запуска нового
   повторно сверить состояние. Если старое состояние изменилось,
   синхронизировать `.github/state/last_tweet_id.txt` в `main` целевого
   репозитория с финальным состоянием `tgwriter`.
   До завершения этой сверки новый workflow не запускать; все действия
   должны уложиться в выбранное окно до следующего запуска по расписанию.
5. Проверить новый workflow ручным запуском:

   ```sh
   gh workflow run x-to-telegram.yml --repo meirka/canadianmoose --ref main
   ```

   Это рабочий запуск: он может отправить новые публикации в Telegram.
   Проверить успешный запуск Nitter, выполнение уведомителя и сохранение
   состояния при наличии новых публикаций. Убедиться, что следующий запуск
   по расписанию выполняется только в `canadianmoose`.

## Локальная проверка

```sh
node --test .github/scripts/x_to_telegram.test.mjs
node --check .github/scripts/x_to_telegram.mjs
```

Тесты используют локальные RSS-примеры и не отправляют сообщения в Telegram.
Рабочий workflow при подготовке PR не запускается.
