const language = navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
const text = {
  en: {
    local: 'LOCAL', eyebrow: 'KEEP THE MOMENT', title: 'Catch the bug.<br>Keep the context.',
    intro: 'Screen video and browser events in one local report.',
    bufferVisualLabel: '30-second screen buffer', bufferVisualLocal: 'Rolling locally', activeBufferLabel: 'ROLLING BUFFER',
    sourceTitle: 'Choose what to record', sourceText: 'A browser prompt lets you pick a tab, window, or screen.',
    start: 'Choose source and start', armNote: 'Start before reproducing the issue. Page events come from the active tab. Nothing is captured at install time.',
    armed: 'Capture is armed', bufferText: 'The last 30 seconds stay in a local rolling buffer.', bug: 'Save bug report', stop: 'Stop capture',
    privacy: 'The bundle stays on this device. Storage values are included, with common secret patterns masked. Screen video is not blurred. Review the file before sharing.',
    foot: 'No account · No upload · No background site access', selecting: 'Choose a source in the browser dialog…',
    starting: 'Starting capture…', stopped: 'Capture stopped.', working: 'Preparing bug report…',
    noTab: 'Open a regular website tab first.', noCapture: 'Start a capture before saving a bug report.',
    cancelled: 'Source selection was cancelled.', generic: 'Could not start capture. Check the browser permissions and try again.',
    chooseError: 'This browser page cannot be captured. Switch to a regular website tab.',
  },
  ru: {
    local: 'ЛОКАЛЬНО', eyebrow: 'СОХРАНИТЬ МОМЕНТ', title: 'Нашёл баг.<br>Сохрани контекст.',
    intro: 'Видео экрана и события браузера в одном локальном отчёте.',
    bufferVisualLabel: 'Буфер экрана на 30 секунд', bufferVisualLocal: 'Запись остаётся локально', activeBufferLabel: 'БУФЕР ЗАПИСИ',
    sourceTitle: 'Выбери, что записывать', sourceText: 'В окне браузера можно выбрать вкладку, окно или экран.',
    start: 'Выбрать источник и начать', armNote: 'Запусти запись до воспроизведения. События берутся из активной вкладки. При установке ничего не записывается.',
    armed: 'Запись включена', bufferText: 'Последние 30 секунд хранятся в локальном кольцевом буфере.', bug: 'Сохранить багрепорт', stop: 'Остановить запись',
    privacy: 'Бандл остаётся на этом устройстве. Секреты в хранилище частично маскируются. Видео не размывается. Проверь файл перед отправкой.',
    foot: 'Без аккаунта · Без загрузки · Без фонового доступа к сайтам', selecting: 'Выбери источник в окне браузера…',
    starting: 'Запускаю запись…', stopped: 'Запись остановлена.', working: 'Собираю багрепорт…',
    noTab: 'Сначала открой обычную вкладку с сайтом.', noCapture: 'Сначала запусти запись.',
    cancelled: 'Выбор источника отменён.', generic: 'Не удалось начать запись. Проверь разрешения браузера и попробуй ещё раз.',
    chooseError: 'Эту страницу нельзя записать. Переключись на обычный сайт.',
  },
};
const t = text[language];
for (const node of document.querySelectorAll('[data-t]')) {
  const key = node.dataset.t;
  if (t[key]) node.innerHTML = t[key];
}
document.documentElement.lang = language;

const idle = document.querySelector('#idlePanel');
const active = document.querySelector('#activePanel');
const notice = document.querySelector('#notice');
const startButton = document.querySelector('#startButton');
const bugButton = document.querySelector('#bugButton');
const stopButton = document.querySelector('#stopButton');
const elapsed = document.querySelector('#elapsed');
let startedAt = 0;
let timer;

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}
function clearNotice() { notice.hidden = true; notice.textContent = ''; }
function setActive(isActive, timestamp = Date.now()) {
  idle.hidden = isActive;
  active.hidden = !isActive;
  if (timer) clearInterval(timer);
  if (!isActive) return;
  startedAt = timestamp;
  const update = () => {
    const total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    elapsed.textContent = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };
  update();
  timer = setInterval(update, 1000);
}

async function message(payload) {
  const response = await chrome.runtime.sendMessage(payload);
  if (response?.error) throw new Error(response.error);
  return response;
}

async function refresh() {
  try {
    const state = await message({ type: 'capture:get-state' });
    setActive(state.active, state.startedAt);
  } catch { setActive(false); }
}

startButton.addEventListener('click', async () => {
  clearNotice();
  startButton.disabled = true;
  startButton.querySelector('[data-t]').textContent = t.selecting;
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || '')) throw new Error(t.noTab);
    await message({ type: 'capture:prepare-offscreen' });
    chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab'], undefined, async (streamId) => {
      if (!streamId) {
        startButton.disabled = false;
        startButton.querySelector('[data-t]').textContent = t.start;
        showNotice(t.cancelled);
        return;
      }
      try {
        startButton.querySelector('[data-t]').textContent = t.starting;
        await message({ type: 'capture:start', tabId: tab.id, streamId });
        setActive(true);
        window.close();
      } catch (error) {
        showNotice(error.message || t.generic);
        startButton.disabled = false;
        startButton.querySelector('[data-t]').textContent = t.start;
      }
    });
  } catch (error) {
    showNotice(error.message || t.chooseError);
    startButton.disabled = false;
    startButton.querySelector('[data-t]').textContent = t.start;
  }
});

bugButton.addEventListener('click', async () => {
  clearNotice();
  bugButton.disabled = true;
  bugButton.querySelector('[data-t]').textContent = t.working;
  try {
    await message({ type: 'capture:report' });
    window.close();
  } catch (error) {
    showNotice(error.message || t.noCapture);
    bugButton.disabled = false;
    bugButton.querySelector('[data-t]').textContent = t.bug;
  }
});

stopButton.addEventListener('click', async () => {
  clearNotice();
  try {
    await message({ type: 'capture:stop' });
    setActive(false);
    showNotice(t.stopped);
  } catch (error) { showNotice(error.message || t.generic); }
});

refresh();
