// ─── AgentSpark Global Type Declarations ─────────────────
// Single source of truth for all cross-file declares.

interface Window {
  // ── Global State ────────────────────────────────────────
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

  // ── Auth state ──────────────────────────────────────────
  currentUser: any;
  isPro: boolean;
  agentsparkApiFetch?: (path: string, options?: any) => Promise<any>;
  agentsparkGenerateRequest?: (payload: any) => Promise<any>;

  // ── App config ──────────────────────────────────────────
  __AGENTSPARK_CONFIG__?: {
    BACKEND_API_BASE?: string;
    REVENUECAT_API_KEY?: string;
    SENTRY_DSN?: string;
    ENV?: string;
  };

  // ── UI Functions ────────────────────────────────────────
  appAlert: (msg: string, title?: string) => void;
  showLoader: (msg?: string, overlay?: boolean) => void;
  hideLoader: () => void;
  uiConfirm: (msgEn: string, msgPl: string, titleEn?: string, titlePl?: string) => Promise<boolean>;
  showNotif: (msg: string, isError?: boolean) => void;
  showScreen: (screen: string) => void;
  setLang: (l: string) => void;
  refreshStaticI18n: () => void;
  renderTopicScreen?: () => void;

  // ── Core ────────────────────────────────────────────────
  callGemini: (sysId: string, userMsg: string, traceLabel: string, multiTurn: any[]) => Promise<string>;
  t: (key: string) => any;
  tr: (en: string, pl: string) => string;

  // ── Analytics ───────────────────────────────────────────
  plausible?: (event: string, opts: any) => void;
  gtag?: (command: string, event: string, opts: any) => void;

  // ── App / Results ────────────────────────────────────────
  renderResults: () => void;
  showResults: (skipReset?: boolean) => void;
  toggleApiSetup: (force?: boolean) => void;
  onModelChange: () => void;
  checkApiKey: () => void;
  saveCurrentProject: (silent?: boolean) => Promise<void>;
  renderProjectsList: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  deleteProject: (id: string, name: string) => Promise<void>;
  forkProject: (id: string) => Promise<void>;
  openProjectsScreen: () => Promise<void>;
  scheduleAutoSave: () => void;
  _onAgentsReady: () => void;
  _updateProjectsBadge: () => Promise<void>;

  // ── Results screen ──────────────────────────────────────
  renderMarkdown: (md: string) => string;
  previewFile: (filename: string) => void;
  switchModalTab: (tab: string) => void;
  downloadCurrentFile: () => void;
  closeModal: () => void;
  openMarkdownPreview: () => void;
  selectMdBrowserFile: (filename: string) => void;
  closeMdBrowser: () => void;
  downloadAllMd: () => Promise<void>;
  downloadZip: () => Promise<void>;
  showInstructions: () => void;

  // ── Gallery ─────────────────────────────────────────────
  initGallery: () => void;
  filterByCategory: (btnEl: HTMLElement, cat: string) => void;
  filterGallery: () => void;
  loadFeaturedTemplates: () => Promise<void>;
  renderGalleryGrid: () => void;
  showTemplateDetail: (id: string) => void;
  closeTemplateDetail: () => void;
  forkTemplate: () => void;
  forkTemplateById: (id: string) => void;

  // ── Auth ────────────────────────────────────────────────
  toggleAuth: () => Promise<void>;
  showPaywall: () => void;
  closePaywall: () => void;
  initRevenueCat: () => Promise<void>;
  syncProjectsWithCloud: () => Promise<void>;
  checkProStatus: (uid: string) => Promise<void>;
  Purchases?: any;

  // ── Graph ───────────────────────────────────────────────
  buildGraphFromAgents: (agents?: any[]) => void;

  // ── Internal / misc ─────────────────────────────────────
  _isGeneratingTeam: boolean;
  _scoringData?: any;
  _updateContextBar?: (screen: string) => void;
  _renderSkeletonCards?: (n: number) => void;
  _formatCost: (cost: number) => string;
  syncIosTabBar: (screenName: string) => void;
  iosTabNav: (tab: string) => void;
  updateDrawerActive?: () => void;
  AGENTSPARK_API_BASE?: string;

  [key: string]: any;
}

// ─── External libraries ───────────────────────────────────
declare const DOMPurify: any;
declare const marked: any;
declare const hljs: any;
declare const JSZip: any;

// ─── Global variables ─────────────────────────────────────
declare var versionHistory: any[];
declare var chatHistory: any[];
declare var traceSpans: any[];
declare var GALLERY_TEMPLATES: any[];

// ─── Core app state (bare ambient names used across split modules) ──────────
// These match the Window properties above; declared here so TypeScript resolves
// plain `lang`, `apiKey`, etc. without needing `window.` prefix in TS files.
declare var lang: string;
declare var apiKey: string;
declare var selectedModel: any;
declare var currentTopic: string;
declare var currentLevel: string;
declare var questionCount: number;
declare var MAX_QUESTIONS: number;
declare var conversationState: string;
declare var isRefining: boolean;
declare var generatedAgents: any[];
declare var generatedFiles: Record<string, string>;
declare var refineHistory: any[];
declare var _pendingRefineData: any;

// ─── Vite replaces process.env at build time — declare for tsc ───────────────
declare const process: {
  readonly env: Record<string, string | undefined>;
};

// ─── UI state vars (results modal / md browser) ─────────────────────────────
declare var currentModalFile: string;
declare var mdBrowserActiveFile: string;
declare var currentModalTab: string;

// ─── Utility functions (defined in results-render.ts / app.ts) ───────────────
declare function _escHtml(s: string): string;
declare function _formatDate(d: string | Date): string;

// ─── Shared functions ─────────────────────────────────────
declare function t(key: string): any;
declare function tr(en: string, pl: string): string;
declare function showNotif(msg: string, isError?: boolean): void;
declare function showLoader(msg?: string, overlay?: boolean): void;
declare function hideLoader(): void;
declare function showScreen(screen: string): void;
declare function renderResults(): void;
declare function showResults(skipReset?: boolean): void;
declare function toggleApiSetup(force?: boolean): void;
declare function onModelChange(): void;
declare function checkApiKey(): void;
declare function setLang(l: string): void;
declare function saveCurrentProject(silent?: boolean): Promise<void>;
declare function renderProjectsList(): Promise<void>;
declare function trackEvent(name: string, data?: any): void;
declare function callGemini(sysId: string, userMsg: string, traceLabel: string, multiTurn: any[]): Promise<string>;
declare function getActiveScreenName(): string;
declare function startChat(): void;
declare function uiConfirm(msgEn: string, msgPl: string, titleEn?: string, titlePl?: string): Promise<boolean>;
declare function _formatCost(cost: number): string;
declare function _updateContextBar(screen: string): void;
declare function _renderSkeletonCards(n: number): void;
declare function _onAgentsReady(): void;
declare function _syncFab(): void;
declare function renderVersionPanel(): void;
declare function renderTraceLive(): void;
declare function renderScoring(data: any): void;
declare function buildGraphFromAgents(agents?: any[]): void;
declare function generateReadme(): string;
declare function dbGetAll(): Promise<any[]>;
declare function dbGet(id: string): Promise<any>;
declare function dbPut(project: any): Promise<any>;
declare function dbDelete(id: string): Promise<void>;
declare function toggleAuth(): Promise<void>;
declare function syncProjectsWithCloud(): Promise<void>;
declare let refineSnapshots: any[];
declare let selectedRefineAction: any;
declare var graphAnimFrame: number | null;
declare let graphNodes: any[];
declare let graphEdges: any[];

// ─── Interview / chat helpers ─────────────────────────────
declare function renderProgressSteps(step: number): void;
declare function renderOptions(parsed: any): void;
declare function renderOptionsLegacy(reply: string): void;
declare function clearOptions(): void;
declare function getSystemPrompt(): string;
declare function generateScoring(history: string): Promise<any>;
declare function addMessage(role: string, text: string): void;

// ─── Trace ────────────────────────────────────────────────
declare var traceSessionStart: number | null;

// ─── Window extensions ────────────────────────────────────
interface Window {
  sanitizeRichText?: (text: string) => string;
  renderProgressSteps?: (step: number) => void;
  renderOptions?: (parsed: any) => void;
  renderOptionsLegacy?: (reply: string) => void;
  clearOptions?: () => void;
  getSystemPrompt?: () => string;
  submitAnswer?: (answer: string) => Promise<void>;
  generateAgents?: () => Promise<void>;
  addMessage?: (role: string, text: string) => void;
  addTypingIndicator?: () => void;
  removeTypingIndicator?: () => void;
  Exporter?: any;
  openExportCodeModal?: () => void;
  closeExportCodeModal?: () => void;
  exportCode?: (framework: string) => void;
  aesGcmEncrypt?: (plaintext: string, password: string) => Promise<Uint8Array>;
  aesGcmDecrypt?: (packed: Uint8Array, password: string) => Promise<string>;
  _unlockConfirm?: () => void;
  _unlockReject?: () => void;
  _unlockShowError?: () => void;
  loadFromGistUrl?: () => Promise<void>;
  publishToGist?: () => Promise<void>;
  loadFromHash?: () => Promise<boolean>;
}
