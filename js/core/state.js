/**
 * Central State Repository
 * 
 * Replaces global variables previously scattered across app.js.
 * This is the first step towards full ES modules migration.
 */

export const state = {
    // App Config
    lang: 'en',
    apiKey: '',
    currentLevel: 'intermediate',
    currentTopic: '',

    // Interview Flow
    questionCount: 0,
    /** @type {any[]} */
    chatHistory: [],
    conversationState: 'interview', // 'interview' | 'parsing' | 'scoring'

    // Output
    /** @type {any[]} */
    generatedAgents: [],
    /** @type {Record<string, string>} */
    generatedFiles: {},

    // Tracing & UI
    /** @type {any[]} */
    traceSpans: [],
    tracePanelOpen: false,
    traceSessionStart: null,
    lastScreenName: 'topic',
    themeHoldTimer: null
};

/**
 * Setup global access for backwards compatibility during migration.
 * This allows non-module scripts to access state via window.__state
 */
window.__state = state;

export function updateState(updates) {
    Object.assign(state, updates);
    return state;
}
