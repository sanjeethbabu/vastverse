/* Thin client for the FastAPI backend. Every call has a timeout so the static
   build degrades gracefully when no API is reachable. */
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function api(path, { method = 'GET', body, timeout = 5000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(BASE + path, {
      method, signal: ctrl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : null;
    if (!isJson) throw Object.assign(new Error('offline'), { offline: true });
    if (!res.ok) {
      const detail = Array.isArray(data?.detail) ? data.detail.map(d => d.msg.replace(/^Value error, /, '')).join(' ') : data?.detail;
      throw Object.assign(new Error(detail || 'Request failed'), { status: res.status });
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError' || e instanceof TypeError) e.offline = true;
    throw e;
  } finally { clearTimeout(t); }
}
