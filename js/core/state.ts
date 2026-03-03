/**
 * AgentSpark Core State Manager
 * Replaces scattered window.* global variables to ensure proper module scoping
 * and predictable data flow.
 */

export const state = {
    lang: 'en' as string,
    apiKey: '' as string,
    selectedModel: null as any,
    currentTopic: '' as string,
    currentLevel: 'iskra' as string,
    chatHistory: [] as any[],
    conversationState: 'topic' as string,
    questionCount: 0 as number,
    MAX_QUESTIONS: 4 as number,
    generatedAgents: [] as any[],
    generatedFiles: {} as Record<string, string>,
    refineHistory: [] as any[],
    isRefining: false as boolean,

    // Auth & API State
    currentUser: null as any,
    isPro: false as boolean,

    // Runtime caching
    versionHistory: [] as any[],
    traceSpans: [] as any[],
    GALLERY_TEMPLATES: [] as any[],

    // UI runtime trackers
    currentModalFile: '' as string,
    lastScreenName: '' as string,
    mdBrowserActiveFile: '' as string,
    currentModalTab: 'preview' as string,
    currentProjectId: null as string | null,
    _pendingRefineData: null as any
};

// Backwards compatibility layer for legacy components during migration
// Once full migration is done, we can remove this, but for now we bind them
// so we don't break untested DOM inline expressions if any exist.
if (typeof window !== 'undefined') {
    (window as any).appState = state;
}
