# Manual browser checks

### English

I ran the Node tests and checked the extension JavaScript syntax. I did not run the extension in Chrome in this workspace because Chromium is not installed here.

Before I call the capture flow verified, I will load the unpacked extension in Chrome 116 or newer and check:

1. The browser source picker offers a tab, window, and screen.
2. The selected source records without audio, and the extension stops when screen sharing ends.
3. Six or fewer short WebM parts cover the recent buffer and play in order in `replay.html`.
4. Clicks and form actions appear without typed values. Console errors and fetch/XHR failures include useful timestamps.
5. A known token in Local Storage is masked. An unknown sensitive value is visible in review, and the bundle stays in Downloads.
6. The exported `.bugpack` opens as a ZIP and contains valid report JSON and HAR JSON.
7. The MCP server lists the package and reads its report from the chosen folder only.

Page events come from the active browser tab. If I select another tab in the source picker, the event log can refer to the tab that was active when capture started. I should choose the active tab or use the active browser window or screen.

### Русский

Я запустил Node-тесты и проверил синтаксис JavaScript расширения. Проверить расширение в Chrome в этой среде не удалось: Chromium здесь не установлен.

Перед тем как считать запись проверенной, я загружу расширение в Chrome 116 или новее и проверю:

1. В окне выбора источника доступны вкладка, окно и экран.
2. Выбранный источник записывается без звука, а запись останавливается после завершения демонстрации экрана.
3. До шести коротких WebM-фрагментов покрывают недавний буфер и проигрываются по порядку в `replay.html`.
4. Клики и действия с формами записываются без значений введённого текста. Ошибки консоли и сбои fetch/XHR получают таймкоды.
5. Известный токен в Local Storage маскируется. Неизвестное чувствительное значение видно при проверке, а бандл остаётся в Downloads.
6. Файл `.bugpack` открывается как ZIP и содержит корректные JSON-отчёт и HAR.
7. MCP-сервер находит бандл и читает отчёт только из выбранной папки.

События страницы берутся из активной вкладки браузера. Если в окне выбора источника указать другую вкладку, журнал может относиться к вкладке, которая была активна при запуске записи. Для совпадения данных я выберу активную вкладку, окно браузера или экран.
