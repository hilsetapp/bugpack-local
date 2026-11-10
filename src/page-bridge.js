(() => {
  if (window.__bugpackLocalBridge) return;
  const marker = 'bugpack-local-v1';
  const original = {
    fetch: window.fetch,
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    open: XMLHttpRequest.prototype.open,
    send: XMLHttpRequest.prototype.send,
  };
  let stopped = false;
  let lastScroll = 0;

  const emit = (kind, data = {}) => {
    if (stopped) return;
    window.postMessage({ marker, event: { kind, at: Date.now(), ...data } }, '*');
  };
  const serialize = (value) => {
    if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ''}`;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  const argsText = (args) => args.slice(0, 6).map(serialize).filter(Boolean);
  const labelFor = (node) => {
    const el = node instanceof Element ? node.closest('button,a,[role="button"],input,select,textarea,[data-testid]') : null;
    if (!el) return '';
    const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('data-testid') || el.getAttribute('name') || el.id || (el.matches('button,a,[role="button"]') ? el.textContent : '');
    return String(label || el.tagName.toLowerCase()).replace(/\s+/g, ' ').trim().slice(0, 100);
  };

  for (const level of ['log', 'info', 'warn', 'error']) {
    console[level] = function (...args) {
      emit('console', { level, args: argsText(args) });
      return original[level].apply(this, args);
    };
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url || '';
    const method = init?.method || input?.method || 'GET';
    const start = Date.now();
    return original.fetch.call(this, input, init).then((response) => {
      emit('network', { method: String(method).toUpperCase(), url, status: response.status, ok: response.ok, durationMs: Date.now() - start, transport: 'fetch' });
      return response;
    }, (error) => {
      emit('network', { method: String(method).toUpperCase(), url, status: 0, ok: false, durationMs: Date.now() - start, transport: 'fetch', error: serialize(error) });
      throw error;
    });
  };

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__bugpackLocalRequest = { method: String(method || 'GET').toUpperCase(), url: String(url || ''), start: 0 };
    return original.open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const request = this.__bugpackLocalRequest;
    if (request) {
      request.start = Date.now();
      this.addEventListener('loadend', () => emit('network', {
        method: request.method,
        url: request.url,
        status: this.status || 0,
        ok: this.status >= 200 && this.status < 400,
        durationMs: Date.now() - request.start,
        transport: 'xhr',
      }), { once: true });
    }
    return original.send.apply(this, args);
  };

  const onError = (event) => emit('exception', { text: event.message || 'Script error', source: event.filename || '', line: event.lineno || 0, column: event.colno || 0, stack: event.error?.stack || '' });
  const onRejection = (event) => emit('exception', { text: serialize(event.reason), stack: event.reason?.stack || '' });
  const onClick = (event) => {
    const label = labelFor(event.target);
    if (label) emit('step', { action: 'click', label });
  };
  const onSubmit = (event) => {
    const form = event.target;
    const label = form?.getAttribute?.('aria-label') || form?.getAttribute?.('name') || form?.id || 'form';
    emit('step', { action: 'submit', label: String(label).slice(0, 100) });
  };
  const onScroll = () => {
    const now = Date.now();
    if (now - lastScroll < 1200) return;
    lastScroll = now;
    emit('step', { action: 'scroll', x: Math.round(window.scrollX), y: Math.round(window.scrollY) });
  };
  const onControl = (event) => {
    const el = event.target;
    if (!(el instanceof Element) || !el.matches('input,select,textarea')) return;
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'password' || type === 'hidden' || el.hasAttribute('autocomplete') && /password|cc-|one-time-code/i.test(el.getAttribute('autocomplete'))) return;
    const label = el.getAttribute('aria-label') || el.getAttribute('name') || el.id || el.tagName.toLowerCase();
    emit('step', { action: event.type === 'change' ? 'change' : 'input', label: String(label).slice(0, 100), fieldType: type || el.tagName.toLowerCase() });
  };
  const onControlMessage = (event) => {
    if (event.source !== window || event.data?.marker !== marker || event.data?.type !== 'stop') return;
    dispose();
  };
  const dispose = () => {
    stopped = true;
    window.fetch = original.fetch;
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
    XMLHttpRequest.prototype.open = original.open;
    XMLHttpRequest.prototype.send = original.send;
    window.removeEventListener('error', onError, true);
    window.removeEventListener('unhandledrejection', onRejection, true);
    window.removeEventListener('message', onControlMessage);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('submit', onSubmit, true);
    document.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('input', onControl, true);
    document.removeEventListener('change', onControl, true);
    delete window.__bugpackLocalBridge;
  };
  window.__bugpackLocalBridge = { dispose };
  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', onRejection, true);
  window.addEventListener('message', onControlMessage);
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  document.addEventListener('scroll', onScroll, true);
  document.addEventListener('input', onControl, true);
  document.addEventListener('change', onControl, true);
  emit('page', { title: document.title, url: location.href, viewport: { width: innerWidth, height: innerHeight } });
})();
