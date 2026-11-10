import { putSegment, pruneSegments, removeSegments } from './shared/idb.js';

const SEGMENT_MS = 5000;
const BUFFER_MS = 30_000;
let stream;
let recorder;
let active = false;
let segmentStartedAt = 0;
let segments = [];
let pinned = new Set();
let finalizeWaiter;
let stopWaiter;

function supportedType() {
  for (const type of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

async function startSegment() {
  if (!active || !stream) return;
  const mimeType = supportedType();
  if (!mimeType) throw new Error('This browser does not support WebM recording.');
  const chunks = [];
  segmentStartedAt = Date.now();
  const currentRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 900_000 });
  recorder = currentRecorder;
  currentRecorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
  currentRecorder.onerror = (event) => chrome.runtime.sendMessage({ type: 'capture:error', message: event.error?.message || 'Video recording failed.' }).catch(() => {});
  currentRecorder.onstop = async () => {
    const endedAt = Date.now();
    if (chunks.length) {
      const id = `seg-${segmentStartedAt}-${crypto.randomUUID().slice(0, 8)}`;
      const blob = new Blob(chunks, { type: mimeType });
      await putSegment({ id, blob, startedAt: segmentStartedAt, endedAt, mimeType });
      segments.push({ id, startedAt: segmentStartedAt, endedAt });
      segments = segments.filter((part) => part.endedAt >= Date.now() - BUFFER_MS || pinned.has(part.id));
      await pruneSegments(Date.now() - BUFFER_MS, [...pinned]);
    }
    const waiter = finalizeWaiter;
    finalizeWaiter = undefined;
    if (waiter) {
      const since = Date.now() - BUFFER_MS;
      const selected = segments.filter((part) => part.endedAt >= since);
      selected.forEach((part) => {
        pinned.add(part.id);
        setTimeout(() => {
          pinned.delete(part.id);
          pruneSegments(Date.now() - BUFFER_MS, [...pinned]);
        }, 3_600_000);
      });
      waiter({ segments: selected, windowMs: BUFFER_MS });
    }
    if (!active) {
      const stopped = stopWaiter;
      stopWaiter = undefined;
      if (stopped) stopped({ ok: true });
      const toRemove = segments.filter((part) => !pinned.has(part.id)).map((part) => part.id);
      await removeSegments(toRemove);
      segments = segments.filter((part) => pinned.has(part.id));
      return;
    }
    try { await startSegment(); }
    catch (error) { active = false; chrome.runtime.sendMessage({ type: 'capture:error', message: error.message }).catch(() => {}); }
  };
  currentRecorder.start();
  setTimeout(() => {
    if (active && currentRecorder.state === 'recording') currentRecorder.stop();
  }, SEGMENT_MS);
}

async function startCapture(streamId) {
  if (active) return { ok: true, alreadyRunning: true };
  const video = {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: streamId,
      maxWidth: 1280,
      maxHeight: 720,
      maxFrameRate: 12,
    },
  };
  stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  segments = [];
  active = true;
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (!active) return;
    stopCapture();
    chrome.runtime.sendMessage({ type: 'capture:source-ended' }).catch(() => {});
  });
  await startSegment();
  return { ok: true };
}

function finalizeClip() {
  return new Promise((resolve) => {
    if (!active || !recorder || recorder.state !== 'recording') {
      const selected = segments.filter((part) => part.endedAt >= Date.now() - BUFFER_MS);
      selected.forEach((part) => {
        pinned.add(part.id);
        setTimeout(() => {
          pinned.delete(part.id);
          pruneSegments(Date.now() - BUFFER_MS, [...pinned]);
        }, 3_600_000);
      });
      resolve({ segments: selected, windowMs: BUFFER_MS });
      return;
    }
    finalizeWaiter = resolve;
    recorder.stop();
  });
}

function stopCapture() {
  if (!active) return Promise.resolve({ ok: true });
  active = false;
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  if (recorder?.state === 'recording') {
    return new Promise((resolve) => { stopWaiter = resolve; recorder.stop(); });
  }
  return Promise.resolve({ ok: true });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'offscreen:start') {
    startCapture(message.streamId).then(sendResponse).catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === 'offscreen:finalize') {
    finalizeClip().then(sendResponse).catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === 'offscreen:unpin') {
    for (const id of message.segmentIds || []) pinned.delete(id);
    pruneSegments(Date.now() - BUFFER_MS, [...pinned]).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === 'offscreen:stop') {
    stopCapture().then(sendResponse);
    return true;
  }
  return false;
});
