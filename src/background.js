import { redactUrl, sanitizeEvent, sanitizeStorage } from './shared/redact.js';

const MAX_EVENTS = 500;
const BUFFER_MS = 30_000;
const OFFSCREEN_URL = chrome.runtime.getURL('src/offscreen.html');

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [OFFSCREEN_URL] });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'I keep a short local screen buffer while a bug capture is armed.',
    });
  }
}

async function captureState() {
  const { activeCapture } = await chrome.storage.session.get('activeCapture');
  return activeCapture || null;
}

async function injectCapture(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['src/page-bridge.js'] });
  await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', files: ['src/isolated-bridge.js'] });
}

async function startCapture({ tabId, streamId }) {
  if (!Number.isInteger(tabId) || !streamId) throw new Error('Choose a screen, window, or tab first.');
  const existing = await captureState();
  if (existing?.active) throw new Error('Capture is already running.');
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url || !/^https?:/.test(tab.url)) throw new Error('Open a normal website tab before starting a capture.');
  await injectCapture(tabId);
  const state = { active: true, tabId, startedAt: Date.now(), page: { url: redactUrl(tab.url), title: tab.title || '' }, events: [] };
  await chrome.storage.session.set({ activeCapture: state });
  await ensureOffscreen();
  const result = await chrome.runtime.sendMessage({ type: 'offscreen:start', streamId });
  if (result?.error) {
    await chrome.storage.session.remove('activeCapture');
    chrome.tabs.sendMessage(tabId, { type: 'capture:stop-page' }).catch(() => {});
    throw new Error(result.error);
  }
  return { ok: true, startedAt: state.startedAt };
}

async function collectStorage(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      const read = (store) => {
        const out = {};
        try {
          for (let i = 0; i < store.length && i < 300; i++) {
            const key = store.key(i);
            if (key !== null) out[key] = store.getItem(key);
          }
        } catch (error) { out.__readError = error?.message || 'Storage could not be read.'; }
        return out;
      };
      return {
        localStorage: read(localStorage),
        sessionStorage: read(sessionStorage),
        environment: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screen: { width: screen.width, height: screen.height, pixelRatio: devicePixelRatio },
          viewport: { width: innerWidth, height: innerHeight },
        },
      };
    },
  });
  const raw = results?.[0]?.result || {};
  return {
    localStorage: sanitizeStorage(raw.localStorage),
    sessionStorage: sanitizeStorage(raw.sessionStorage),
    environment: raw.environment || {},
  };
}

function makeHar(events) {
  const requests = events.filter((event) => event.kind === 'network');
  return {
    log: {
      version: '1.2',
      creator: { name: 'Bugpack Local', version: '0.1.0' },
      entries: requests.map((event) => {
        const started = event.at - (event.durationMs || 0);
        const status = Number(event.status) || 0;
        return {
          startedDateTime: new Date(started).toISOString(),
          time: Number(event.durationMs) || 0,
          request: { method: event.method || 'GET', url: event.url || '', httpVersion: '', headers: [], queryString: [], cookies: [], headersSize: -1, bodySize: -1 },
          response: { status, statusText: status === 0 ? 'Network error' : '', httpVersion: '', headers: [], cookies: [], content: { size: -1, mimeType: '' }, redirectURL: '', headersSize: -1, bodySize: -1 },
          cache: {},
          timings: { send: 0, wait: Number(event.durationMs) || 0, receive: 0 },
          _bugpack: { ok: Boolean(event.ok), transport: event.transport || '', error: event.error || '' },
        };
      }),
    },
  };
}

async function createReport() {
  let state = await captureState();
  if (!state?.active) throw new Error('Start a capture before pressing Bug.');
  await chrome.tabs.sendMessage(state.tabId, { type: 'capture:flush' }).catch(() => {});
  state = await captureState();
  const now = Date.now();
  const clip = await chrome.runtime.sendMessage({ type: 'offscreen:finalize' });
  if (clip?.error) throw new Error(clip.error);
  const tab = await chrome.tabs.get(state.tabId).catch(() => null);
  const start = clip.segments?.[0]?.startedAt || Math.max(state.startedAt, now - BUFFER_MS);
  const events = (state.events || [])
    .filter((event) => event.at >= start && event.at <= now)
    .map((event) => ({ ...sanitizeEvent(event), offsetMs: Math.max(0, event.at - start) }));
  const storage = await collectStorage(state.tabId).catch((error) => ({
    localStorage: {}, sessionStorage: { __readError: error.message || 'Storage could not be read.' },
  }));
  const id = `${new Date(now).toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`;
  const pageEvent = [...events].reverse().find((event) => event.kind === 'page');
  const report = {
    schemaVersion: 1,
    id,
    title: '',
    description: '',
    createdAt: new Date(now).toISOString(),
    clipStartedAt: clip.segments?.[0]?.startedAt || start,
    page: {
      url: redactUrl(tab?.url || pageEvent?.url || state.page.url),
      title: tab?.title || pageEvent?.title || state.page.title,
    },
    environment: storage.environment,
    events,
    network: makeHar(events),
    storage,
    videoSegments: (clip.segments || []).map((segment, index) => ({
      id: segment.id,
      file: `video/part-${String(index + 1).padStart(2, '0')}.webm`,
      startedAt: segment.startedAt,
      endedAt: segment.endedAt,
      startOffsetMs: Math.max(0, segment.startedAt - (clip.segments?.[0]?.startedAt || start)),
    })),
    redaction: { automatic: true, knownPatternsOnly: true },
  };
  await chrome.storage.local.set({ pendingReport: report });
  await chrome.tabs.create({ url: chrome.runtime.getURL('src/review.html') });
  return { ok: true, id };
}

async function stopCapture() {
  const state = await captureState();
  if (!state?.active) return { ok: true };
  await chrome.tabs.sendMessage(state.tabId, { type: 'capture:stop-page' }).catch(() => {});
  await chrome.runtime.sendMessage({ type: 'offscreen:stop' }).catch(() => {});
  await chrome.storage.session.remove('activeCapture');
  return { ok: true };
}

async function handleMessage(message, sender) {
  if (message?.type === 'capture:prepare-offscreen') {
    await ensureOffscreen();
    return { ok: true };
  }
  if (message?.type === 'capture:start') return startCapture(message);
  if (message?.type === 'capture:get-state') {
    const state = await captureState();
    return state ? { active: state.active, startedAt: state.startedAt, page: state.page } : { active: false };
  }
  if (message?.type === 'capture:event-batch') {
    const state = await captureState();
    if (!state?.active || sender.tab?.id !== state.tabId || !Array.isArray(message.events)) return { ok: false };
    const fresh = message.events.slice(0, 100).map(sanitizeEvent);
    state.events = [...(state.events || []), ...fresh].filter((event) => event.at >= Date.now() - BUFFER_MS).slice(-MAX_EVENTS);
    await chrome.storage.session.set({ activeCapture: state });
    return { ok: true };
  }
  if (message?.type === 'capture:stop' || message?.type === 'capture:source-ended') return stopCapture();
  if (message?.type === 'capture:report') return createReport();
  if (message?.type === 'capture:clear-pinned') {
    await chrome.runtime.sendMessage({ type: 'offscreen:unpin', segmentIds: message.segmentIds || [] }).catch(() => {});
    await chrome.storage.local.remove('pendingReport');
    return { ok: true };
  }
  if (message?.type === 'capture:error') {
    await chrome.storage.session.set({ lastCaptureError: message.message || 'Recording failed.' });
    return { ok: true };
  }
  return { ok: false };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((error) => sendResponse({ error: error.message || String(error) }));
  return true;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-bug') createReport().catch((error) => chrome.storage.session.set({ lastCaptureError: error.message }));
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('pendingReport').then(({ pendingReport }) => {
    if (pendingReport && Date.now() - Date.parse(pendingReport.createdAt) > 3_600_000) chrome.storage.local.remove('pendingReport');
  });
});
