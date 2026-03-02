(function () {
  const API_BASE = String(window.__AGENTSPARK_CONFIG__?.BACKEND_API_BASE || '/api/v1').replace(/\/+$/, '');

  async function apiFetch(path, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body,
      token = '',
    } = options;

    const finalHeaders = { 'Content-Type': 'application/json', ...headers };
    if (token) finalHeaders.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error || data.message || `HTTP ${response.status}`);
      err.status = response.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function generate(payload) {
    return apiFetch('/generate', { method: 'POST', body: payload });
  }

  window.AGENTSPARK_API_BASE = API_BASE;
  window.agentsparkApiFetch = apiFetch;
  window.agentsparkGenerateRequest = generate;
})();

