// AgentSpark Global Type Declarations

interface Window {
    // Global State
    lang: string;
    apiKey: string;
    selectedModel: any;
    currentTopic: string;
    currentLevel: string;
    chatHistory: any[];
    conversationState: string;
    questionCount: number;
    MAX_QUESTIONS: number;
    generatedAgents: any[];
    generatedFiles: Record<string, string>;
    refineHistory: any[];
    isRefining: boolean;

    // UI Functions
    appAlert: (msg: string, title?: string) => void;
    showLoader: (msg?: string, overlay?: boolean) => void;
    hideLoader: () => void;
    uiConfirm: (msgEn: string, msgPl: string, titleEn?: string, titlePl?: string) => Promise<boolean>;
    showNotif: (msg: string, isError?: boolean) => void;
    showScreen: (screen: string) => void;
    setLang: (l: string) => void;
    refreshStaticI18n: () => void;

    // Core Functions
    callGemini: (sysId: string, userMsg: string, traceLabel: string, multiTurn: any[]) => Promise<string>;
    t: (key: string) => any;
    tr: (en: string, pl: string) => string;

    // Tracking & Analytics
    plausible?: (event: string, opts: any) => void;
    gtag?: (command: string, event: string, opts: any) => void;

    // Render & App functions
    renderResults: () => void;
    toggleApiSetup: (force?: boolean) => void;
    onModelChange: () => void;
    checkApiKey: () => void;
    saveCurrentProject: (silent?: boolean) => Promise<void>;
    renderProjectsList: () => Promise<void>;
    loadProject: (id: string) => Promise<void>;

    // Misc
    _formatCost: (cost: number) => string;
    syncIosTabBar: (screenName: string) => void;
    iosTabNav: (tab: string) => void;

    [key: string]: any; // fallback
}

// Global Variables (declared in db.ts)


// External libraries
declare const DOMPurify: any;
declare const marked: any;
declare const hljs: any;
declare const JSZip: any;

// Shared Functions
declare function t(key: string): any;
declare function tr(en: string, pl: string): string;
declare function showNotif(msg: string, isError?: boolean): void;
declare function showLoader(msg?: string, overlay?: boolean): void;
declare function hideLoader(): void;
declare function showScreen(screen: string): void;
declare function renderResults(): void;
declare function toggleApiSetup(force?: boolean): void;
declare function onModelChange(): void;
declare function checkApiKey(): void;
declare function saveCurrentProject(silent?: boolean): Promise<void>;
declare function renderProjectsList(): Promise<void>;
declare function trackEvent(name: string, data?: any): void;
declare function callGemini(sysId: string, userMsg: string, traceLabel: string, multiTurn: any[]): Promise<string>;
declare function getActiveScreenName(): string;
declare function startChat(): void;
declare function buildGraphFromAgents(agents: any[]): void;
declare var graphAnimFrame: any;
declare let graphNodes: any;
declare let graphEdges: any;
declare let _syncFab: any;
declare function uiConfirm(msgEn: string, msgPl: string, titleEn?: string, titlePl?: string): Promise<boolean>;
declare function _formatCost(cost: number): string;
declare var versionHistory: any[];
declare var chatHistory: any[];
declare let traceSpans: any[];
declare function _updateContextBar(screen: string): void;
