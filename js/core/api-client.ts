
interface AgentSparkWindow extends Window {
    __AGENTSPARK_CONFIG__?: { BACKEND_API_BASE?: string };
    enqueueSyncAction?: (action: any) => Promise<any>;
    AGENTSPARK_API_BASE?: string;
    agentsparkApiFetch?: (path: string, options?: any) => Promise<any>;
    agentsparkGenerateRequest?: (payload: any) => Promise<any>;
}
declare let window: AgentSparkWindow;

const API_BASE = String(window.__AGENTSPARK_CONFIG__?.BACKEND_API_BASE || '/api/v1').replace(/\/+$/, '');

export async function apiFetch(path: string, options: any = {}): Promise<any> {
    const {
        method = 'GET',
        headers = {},
        body,
        token = '',
    } = options;

    const finalHeaders: any = { 'Content-Type': 'application/json', ...headers };
    if (token) finalHeaders.Authorization = `Bearer ${token}`;

    const isMutatingProject = path.includes('/projects') && ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase());

    if (!navigator.onLine && isMutatingProject) {
        if (window.enqueueSyncAction) {
            await window.enqueueSyncAction({ path, method, body, timestamp: Date.now() });
            console.log('[Offline] Action queued:', method, path);
            return { success: true, queued: true };
        }
    }

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err: any = new Error(data.error || data.message || `HTTP ${response.status}`);
        err.status = response.status;
        err.payload = data;
        throw err;
    }
    return data;
}

export async function generate(payload: any): Promise<any> {
    // L-03: Pass payload as plain object — apiFetch handles JSON.stringify internally
    // Do NOT pre-stringify here; doing so causes double-serialization
    return apiFetch('/generate', { method: 'POST', body: payload });
}

window.AGENTSPARK_API_BASE = API_BASE;
window.agentsparkApiFetch = apiFetch;
window.agentsparkGenerateRequest = generate;
