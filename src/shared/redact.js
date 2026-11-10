const SECRET_KEY = /password|passwd|secret|token|api[-_]?key|authorization|cookie|session(?:id)?|csrf|credential|private[-_]?key/i;
const SECRET_NAME = /^(?:password|passwd|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|authorization|cookie|sessionid|csrf|client[_-]?secret)$/i;

export function redactUrl(input) {
  try {
    const url = new URL(String(input));
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_KEY.test(key) || SECRET_NAME.test(key)) url.searchParams.set(key, '[REDACTED]');
    }
    return url.toString();
  } catch {
    return redactText(String(input));
  }
}

export function redactText(value, maxLength = 2000) {
  let text = String(value ?? '');
  text = text.replace(/\bAuthorization\s*:\s*(?:Bearer\s+)?[^\s,;]+/gi, 'Authorization: [REDACTED]');
  text = text.replace(/(["']authorization["']\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"');
  text = text.replace(/(["']?(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|passwd|api[_-]?key|cookie|session(?:id)?|csrf|credential|client[_-]?secret)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^,\s;}\]]+)/gi, '$1"[REDACTED]"');
  text = text.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]');
  text = text.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*)?/g, '[REDACTED JWT]');
  return text.slice(0, maxLength);
}

export function sanitizeStorage(storage = {}) {
  const clean = {};
  for (const [key, raw] of Object.entries(storage)) {
    if (SECRET_KEY.test(key) || SECRET_NAME.test(key)) {
      clean[key] = '[REDACTED: sensitive key]';
      continue;
    }
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    clean[key] = redactText(text ?? '', 3000);
  }
  return clean;
}

export function sanitizeEvent(event) {
  const out = { ...event };
  if (typeof out.url === 'string') out.url = redactUrl(out.url);
  if (typeof out.text === 'string') out.text = redactText(out.text);
  if (Array.isArray(out.args)) out.args = out.args.map((value) => redactText(value, 800));
  if (typeof out.label === 'string') out.label = redactText(out.label, 120);
  if (typeof out.error === 'string') out.error = redactText(out.error);
  if (typeof out.stack === 'string') out.stack = redactText(out.stack);
  return out;
}
