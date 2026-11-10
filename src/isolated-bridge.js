(() => {
  if (globalThis.__bugpackLocalIsolatedBridge) return;
  const marker = 'bugpack-local-v1';
  let active = true;
  let queue = [];
  const flush = async () => {
    if (!active || !queue.length) return;
    const events = queue.splice(0, 100);
    await chrome.runtime.sendMessage({ type: 'capture:event-batch', events }).catch(() => {});
  };
  const timer = setInterval(() => { flush(); }, 400);
  const onMessage = (event) => {
    if (!active || event.source !== window || event.data?.marker !== marker || !event.data?.event) return;
    queue.push(event.data.event);
    if (queue.length >= 100) flush();
  };
  const dispose = () => {
    active = false;
    clearInterval(timer);
    window.postMessage({ marker, type: 'stop' }, '*');
    window.removeEventListener('message', onMessage);
    chrome.runtime.onMessage.removeListener(onControl);
    delete globalThis.__bugpackLocalIsolatedBridge;
  };
  const onControl = (message, _sender, sendResponse) => {
    if (message?.type === 'capture:flush') {
      flush().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message?.type === 'capture:stop-page') {
      flush().then(() => { dispose(); sendResponse({ ok: true }); });
      return true;
    }
    return false;
  };
  globalThis.__bugpackLocalIsolatedBridge = true;
  window.addEventListener('message', onMessage);
  chrome.runtime.onMessage.addListener(onControl);
})();
