// ─── GALLERY TEMPLATES ────────────────────────────────────
var GALLERY_TEMPLATES = [
  {
    id: 'ecom-support-001', title: 'E-commerce Support Team',
    description: 'Complete customer support with order tracking, refunds, and product inquiries.',
    category: 'ecommerce', difficulty: 'intermediate', agentCount: 3, featured: true,
    tags: ['customer-service', 'orders', 'refunds', 'shopify'],
    useCases: ['Shopify store support', 'Order status tracking', 'Refund processing', 'Product recommendations'],
    team: [
      { name: 'Customer Support Agent', role: 'First-line support', description: 'Handles FAQs, greets customers, routes complex issues.', expertise: ['FAQs', 'Triage', 'General inquiries'] },
      { name: 'Order Management Agent', role: 'Order specialist', description: 'Tracks orders, shipping updates, handles delivery issues.', expertise: ['Order tracking', 'Shipping', 'Modifications'] },
      { name: 'Refund Specialist', role: 'Returns & refunds', description: 'Processes refund requests, explains return policies.', expertise: ['Refunds', 'Returns', 'Exchanges'] }
    ]
  },
  {
    id: 'data-analyst-001', title: 'Data Analysis Team',
    description: 'SQL expert, data visualizer, and insights reporter working together.',
    category: 'data', difficulty: 'advanced', agentCount: 3, featured: true,
    tags: ['sql', 'data-viz', 'reporting', 'analytics'],
    useCases: ['Business intelligence reports', 'SQL query generation', 'Data visualization', 'Trend analysis'],
    team: [
      { name: 'SQL Expert', role: 'Database specialist', description: 'Writes optimized queries, handles complex joins.', expertise: ['SQL', 'Optimization', 'Schema design'] },
      { name: 'Visualization Specialist', role: 'Data viz expert', description: 'Creates charts, dashboards, visual stories.', expertise: ['Charts', 'Dashboards', 'Storytelling'] },
      { name: 'Insights Reporter', role: 'Business translator', description: 'Turns data findings into actionable recommendations.', expertise: ['BI', 'Insights', 'Strategy'] }
    ]
  },
  {
    id: 'content-creation-001', title: 'Content Creation Studio',
    description: 'Copywriter, SEO specialist, and social media manager for complete content workflow.',
    category: 'creative', difficulty: 'beginner', agentCount: 3, featured: true,
    tags: ['copywriting', 'seo', 'social-media', 'marketing'],
    useCases: ['Blog post writing', 'SEO optimization', 'Social media content', 'Marketing campaigns'],
    team: [
      { name: 'Copywriter', role: 'Content writer', description: 'Writes engaging blog posts, articles, and marketing copy.', expertise: ['Blog writing', 'Ad copy', 'Storytelling'] },
      { name: 'SEO Specialist', role: 'SEO expert', description: 'Optimizes content for search, researches keywords.', expertise: ['Keywords', 'On-page SEO', 'Rankings'] },
      { name: 'Social Media Manager', role: 'Social strategist', description: 'Creates platform-specific content, manages schedules.', expertise: ['Social strategy', 'Engagement', 'Calendars'] }
    ]
  },
  {
    id: 'dev-support-001', title: 'Developer Support Team',
    description: 'Technical support specialists for developer tools, APIs, and integrations.',
    category: 'technical', difficulty: 'advanced', agentCount: 3, featured: true,
    tags: ['api', 'debugging', 'documentation', 'technical-support'],
    useCases: ['API documentation support', 'Code debugging help', 'Integration guidance', 'Technical troubleshooting'],
    team: [
      { name: 'API Docs Agent', role: 'API documentation expert', description: 'Explains endpoints, provides code examples, clarifies auth flows.', expertise: ['API docs', 'Code examples', 'Authentication'] },
      { name: 'Debugging Assistant', role: 'Code debugger', description: 'Analyzes errors, suggests fixes, explains strategies.', expertise: ['Error analysis', 'Debugging', 'Code review'] },
      { name: 'Integration Guide', role: 'Integration specialist', description: 'Helps integrate third-party services, SDKs, and APIs.', expertise: ['SDK integration', 'Third-party APIs', 'Architecture'] }
    ]
  },
  {
    id: 'hr-recruiting-001', title: 'HR & Recruiting Team',
    description: 'Job description writer, candidate screener, and interview coordinator.',
    category: 'hr', difficulty: 'beginner', agentCount: 3, featured: false,
    tags: ['recruiting', 'hr', 'interviews', 'hiring'],
    useCases: ['Job description writing', 'Resume screening', 'Interview scheduling', 'Candidate communication'],
    team: [
      { name: 'Job Description Writer', role: 'JD creation specialist', description: 'Writes clear, attractive job descriptions.', expertise: ['JDs', 'Role requirements', 'Culture fit'] },
      { name: 'Candidate Screener', role: 'Resume reviewer', description: 'Reviews resumes, identifies best fits.', expertise: ['Resume analysis', 'Qualification matching', 'Ranking'] },
      { name: 'Interview Coordinator', role: 'Interview manager', description: 'Schedules interviews, manages logistics.', expertise: ['Scheduling', 'Candidate comms', 'Feedback'] }
    ]
  },
  {
    id: 'finance-advisor-001', title: 'Personal Finance Advisory',
    description: 'Budget planner, investment advisor, and expense tracker for financial wellness.',
    category: 'finance', difficulty: 'intermediate', agentCount: 3, featured: false,
    tags: ['budgeting', 'investing', 'finance', 'planning'],
    useCases: ['Budget creation', 'Investment planning', 'Expense tracking', 'Financial goal setting'],
    team: [
      { name: 'Budget Planner', role: 'Budgeting specialist', description: 'Creates personalized budgets, suggests savings strategies.', expertise: ['Budgets', 'Spending analysis', 'Debt management'] },
      { name: 'Investment Advisor', role: 'Investment guidance', description: 'Provides investment education, discusses risk tolerance.', expertise: ['Investment basics', 'Diversification', 'Risk'] },
      { name: 'Expense Tracker', role: 'Expense monitor', description: 'Categorizes expenses, identifies spending patterns.', expertise: ['Expense categorization', 'Pattern analysis', 'Cost cutting'] }
    ]
  },
  {
    id: 'education-tutor-001', title: 'Virtual Tutoring Team',
    description: 'Subject tutors specializing in math, science, and writing.',
    category: 'education', difficulty: 'intermediate', agentCount: 3, featured: false,
    tags: ['education', 'tutoring', 'learning', 'homework-help'],
    useCases: ['Homework help', 'Concept explanation', 'Test preparation', 'Skill development'],
    team: [
      { name: 'Math Tutor', role: 'Mathematics specialist', description: 'Explains math concepts, solves problems step-by-step.', expertise: ['Algebra', 'Geometry', 'Calculus', 'Word problems'] },
      { name: 'Science Tutor', role: 'Science educator', description: 'Teaches biology, chemistry, and physics with real-world examples.', expertise: ['Biology', 'Chemistry', 'Physics', 'Scientific method'] },
      { name: 'Writing Coach', role: 'Writing specialist', description: 'Helps with essays, grammar, structure, and creative writing.', expertise: ['Essay structure', 'Grammar', 'Creative writing', 'Editing'] }
    ]
  },
  {
    id: 'restaurant-ops-001', title: 'Restaurant Operations',
    description: 'Reservation manager, menu consultant, and customer feedback handler.',
    category: 'hospitality', difficulty: 'beginner', agentCount: 3, featured: false,
    tags: ['restaurant', 'hospitality', 'reservations', 'service'],
    useCases: ['Reservation management', 'Menu planning', 'Customer reviews', 'Service improvement'],
    team: [
      { name: 'Reservation Manager', role: 'Booking specialist', description: 'Handles reservations, manages waitlists.', expertise: ['Reservation systems', 'Waitlists', 'Special requests'] },
      { name: 'Menu Consultant', role: 'Menu optimizer', description: 'Analyzes menu performance, suggests improvements.', expertise: ['Menu engineering', 'Food costing', 'Trends'] },
      { name: 'Feedback Handler', role: 'Customer experience', description: 'Analyzes reviews, addresses complaints.', expertise: ['Review management', 'Complaint resolution', 'Reputation'] }
    ]
  }
];

let _galleryFiltered: any[] = [...GALLERY_TEMPLATES];
let _selectedTemplate: any = null;
let _galleryActiveCat = 'all';

// ─── INIT ─────────────────────────────────────────────────
function initGallery(): void {
  _galleryFiltered = [...GALLERY_TEMPLATES];
  _galleryActiveCat = 'all';
  document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.gallery-filter-btn[data-cat="all"]') as HTMLElement | null;
  if (allBtn) allBtn.classList.add('active');
  const searchEl = document.getElementById('gallery-search') as HTMLInputElement | null;
  if (searchEl) searchEl.value = '';
  renderGalleryGrid();
}

// ─── FILTERS ──────────────────────────────────────────────
function filterByCategory(btnEl: HTMLElement, cat: string): void {
  _galleryActiveCat = cat;
  document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
  _applyGalleryFilters();
}

function filterGallery(): void {
  _applyGalleryFilters();
}

function _applyGalleryFilters(): void {
  const searchEl = document.getElementById('gallery-search') as HTMLInputElement | null;
  const q = (searchEl?.value || '').toLowerCase().trim();
  _galleryFiltered = GALLERY_TEMPLATES.filter((t: any) => {
    const catOk = _galleryActiveCat === 'all' || t.category === _galleryActiveCat;
    const qOk = !q
      || t.title.toLowerCase().includes(q)
      || t.description.toLowerCase().includes(q)
      || t.tags.some((g: string) => g.includes(q));
    return catOk && qOk;
  });
  renderGalleryGrid();
}

// ─── REMOTE TEMPLATES ─────────────────────────────────────
async function loadFeaturedTemplates(): Promise<void> {
  try {
    const res = await fetch('./featured_templates.json', { cache: 'no-store' });
    if (!res.ok) return;
    const remote = await res.json();
    if (!Array.isArray(remote) || remote.length === 0) return;
    const existing = new Set(GALLERY_TEMPLATES.map((t: any) => t.id));
    remote.forEach((t: any) => {
      const parsed = normalizeTemplate(t);
      if (parsed && !existing.has(parsed.id)) {
        GALLERY_TEMPLATES.push(parsed);
      }
    });
    const screen = document.getElementById('screen-gallery') as HTMLElement | null;
    if (screen && screen.classList.contains('active')) renderGalleryGrid();
  } catch (e) { /* silently fall back to static templates */ }
}

// ─── NORMALISATION ────────────────────────────────────────
function _cleanStr(val: any, maxLen = 180): string {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function _cleanList(arr: any, maxItems = 12, maxLen = 120): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v: any) => _cleanStr(v, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeTemplate(raw: any): any | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = _cleanStr(raw.id, 60);
  const title = _cleanStr(raw.title, 120);
  const description = _cleanStr(raw.description, 380);
  const category = _cleanStr(raw.category, 24).toLowerCase();
  const difficulty = _cleanStr(raw.difficulty, 24).toLowerCase();
  const agentCount = Number(raw.agentCount);
  const tags = _cleanList(raw.tags, 10, 40);
  const useCases = _cleanList(raw.useCases, 12, 120);

  if (!id || !title || !description) return null;
  if (!category || !difficulty || !Number.isInteger(agentCount) || agentCount < 1 || agentCount > 12) return null;
  if (!tags.length || !useCases.length) return null;

  if (!Array.isArray(raw.team) || raw.team.length === 0 || raw.team.length > 12) return null;
  const team = raw.team.map((member: any) => {
    const name = _cleanStr(member?.name, 60);
    const role = _cleanStr(member?.role, 80);
    const memberDescription = _cleanStr(member?.description, 260);
    const expertise = _cleanList(member?.expertise, 10, 60);
    if (!name || !role || !memberDescription || !expertise.length) return null;
    return { name, role, description: memberDescription, expertise };
  }).filter(Boolean);

  if (!team.length) return null;
  return { id, title, description, category, difficulty, agentCount, featured: !raw.featured, tags, useCases, team };
}

// ─── GRID RENDER ──────────────────────────────────────────
function renderGalleryGrid(): void {
  const grid = document.getElementById('gallery-grid') as HTMLElement | null;
  if (!grid) return;
  grid.innerHTML = '';

  if (!_galleryFiltered.length) {
    grid.innerHTML = `<div class="gallery-empty" style="grid-column:1/-1;">
      <div class="empty-icon">🔍</div>
      <p>${tr('No templates match your search.', 'Brak szablonow pasujacych do wyszukiwania.')}</p>
    </div>`;
    return;
  }

  _galleryFiltered.forEach((t: any) => {
    const card = document.createElement('div');
    card.className = 'tpl-card';
    card.addEventListener('click', () => showTemplateDetail(t.id));

    const top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.6rem;';
    const badge = document.createElement('span');
    badge.className = `template-badge ${t.featured ? 'featured' : ''}`;
    badge.textContent = t.featured ? tr('Featured', 'Polecany') : t.category;
    top.appendChild(badge);

    const title = document.createElement('h3');
    title.textContent = t.title;

    const desc = document.createElement('p');
    desc.className = 'tpl-card-desc';
    desc.textContent = t.description;

    const meta = document.createElement('div');
    meta.className = 'tpl-card-meta';
    const agentMeta = document.createElement('span');
    agentMeta.textContent = `🤖 ${t.agentCount} ${tr('agents', 'agentow')}`;
    const difficultyMeta = document.createElement('span');
    difficultyMeta.textContent = `📊 ${t.difficulty}`;
    meta.appendChild(agentMeta);
    meta.appendChild(difficultyMeta);

    const tags = document.createElement('div');
    tags.className = 'tpl-card-tags';
    t.tags.slice(0, 3).forEach((tag: string) => {
      const chip = document.createElement('span');
      chip.className = 'tpl-tag';
      chip.textContent = tag;
      tags.appendChild(chip);
    });

    const footer = document.createElement('div');
    footer.className = 'tpl-card-footer';
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:0.75rem;color:var(--muted);';
    hint.textContent = tr('View details ->', 'Zobacz szczegoly ->');
    const useBtn = document.createElement('button');
    useBtn.className = 'tpl-fork-btn';
    useBtn.textContent = tr('Use', 'Uzyj');
    useBtn.addEventListener('click', (ev: MouseEvent) => {
      ev.stopPropagation();
      forkTemplateById(t.id);
    });
    footer.appendChild(hint);
    footer.appendChild(useBtn);

    card.appendChild(top);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);
    card.appendChild(tags);
    card.appendChild(footer);
    grid.appendChild(card);
  });
}

// ─── TEMPLATE DETAIL ──────────────────────────────────────
function showTemplateDetail(id: string): void {
  const t = GALLERY_TEMPLATES.find((x: any) => x.id === id);
  if (!t) return;
  _selectedTemplate = t;

  (document.getElementById('tpl-modal-title') as HTMLElement).textContent = t.title;
  (document.getElementById('tpl-badge') as HTMLElement).textContent = t.featured ? tr('Featured', 'Polecany') : t.category;
  (document.getElementById('tpl-badge') as HTMLElement).className = `template-badge ${t.featured ? 'featured' : ''}`;
  (document.getElementById('tpl-difficulty') as HTMLElement).textContent = `📊 ${t.difficulty}`;
  (document.getElementById('tpl-agent-count') as HTMLElement).textContent = `🤖 ${t.agentCount} ${tr('agents', 'agentow')}`;
  (document.getElementById('tpl-description') as HTMLElement).textContent = t.description;

  const useCasesLabel = document.getElementById('tpl-usecases-label') as HTMLElement | null;
  const teamLabel = document.getElementById('tpl-team-label') as HTMLElement | null;
  const forkBtn = document.getElementById('tpl-fork-btn') as HTMLElement | null;
  const cancelBtn = document.getElementById('tpl-cancel-btn') as HTMLElement | null;
  if (useCasesLabel) useCasesLabel.textContent = tr('USE CASES', 'ZASTOSOWANIA');
  if (teamLabel) teamLabel.textContent = tr('AGENT TEAM', 'ZESPOL AGENTOW');
  if (forkBtn) forkBtn.textContent = tr('Use This Template', 'Uzyj szablonu');
  if (cancelBtn) cancelBtn.textContent = tr('Cancel', 'Anuluj');

  const useCases = document.getElementById('tpl-usecases') as HTMLElement | null;
  if (useCases) {
    useCases.innerHTML = '';
    t.useCases.forEach((u: string) => {
      const li = document.createElement('li');
      li.style.cssText = 'padding:0.3rem 0 0.3rem 1.25rem;position:relative;color:var(--muted);font-size:0.82rem;';
      const arrow = document.createElement('span');
      arrow.style.cssText = 'position:absolute;left:0;color:var(--accent);font-weight:700;';
      arrow.textContent = '→';
      li.appendChild(arrow);
      li.appendChild(document.createTextNode(u));
      useCases.appendChild(li);
    });
  }

  const team = document.getElementById('tpl-team') as HTMLElement | null;
  if (team) {
    team.innerHTML = '';
    t.team.forEach((a: any) => {
      const card = document.createElement('div');
      card.className = 'tpl-agent-card';
      const h4 = document.createElement('h4');
      h4.textContent = a.name;
      const role = document.createElement('div');
      role.className = 'tpl-agent-role';
      role.textContent = a.role;
      const descEl = document.createElement('div');
      descEl.className = 'tpl-agent-desc';
      descEl.textContent = a.description;
      const expWrap = document.createElement('div');
      a.expertise.forEach((e: string) => {
        const chip = document.createElement('span');
        chip.className = 'expertise-tag';
        chip.textContent = e;
        expWrap.appendChild(chip);
      });
      card.appendChild(h4);
      card.appendChild(role);
      card.appendChild(descEl);
      card.appendChild(expWrap);
      team.appendChild(card);
    });
  }

  const tagsEl = document.getElementById('tpl-tags') as HTMLElement | null;
  if (tagsEl) {
    tagsEl.innerHTML = '';
    t.tags.forEach((g: string) => {
      const chip = document.createElement('span');
      chip.className = 'tpl-tag';
      chip.textContent = g;
      tagsEl.appendChild(chip);
    });
  }

  (document.getElementById('template-detail-overlay') as HTMLElement).classList.add('open');
}

function closeTemplateDetail(): void {
  (document.getElementById('template-detail-overlay') as HTMLElement).classList.remove('open');
  _selectedTemplate = null;
}

function forkTemplate(): void {
  if (_selectedTemplate) forkTemplateById(_selectedTemplate.id);
  closeTemplateDetail();
}

// ─── FORK / LOAD TEMPLATE ─────────────────────────────────
function forkTemplateById(id: string): void {
  const t = GALLERY_TEMPLATES.find((x: any) => x.id === id);
  if (!t) return;

  // Typed with Record to avoid TS7053 index signature errors
  const catEmojis: Record<string, string[]> = {
    ecommerce: ['🎧', '📦', '💰'],
    data: ['🗄️', '📊', '📝'],
    creative: ['✍️', '🔍', '📱'],
    technical: ['📖', '🐛', '🔌'],
    hr: ['📝', '🔎', '📅'],
    finance: ['💳', '📈', '💹'],
    education: ['🔢', '🔬', '✏️'],
    hospitality: ['📅', '🍽️', '⭐'],
  };
  const fallback = ['🤖', '🧠', '⚙️', '📊', '🎯', '💡'];
  const emojis: string[] = catEmojis[t.category] || fallback;

  generatedAgents = t.team.map((member: any, i: number) => ({
    id: t.id + '-' + i,
    name: member.name,
    emoji: emojis[i] || fallback[i % fallback.length],
    type: i === 0 ? 'business' : 'technical',
    role: i === 0 ? 'ORCHESTRATOR' : 'SPECIALIST',
    description: member.description,
    agentMd: `# Agent: ${member.name}\n\n## Identity\nYou are the ${member.role}.\n\n## Goal\n${member.description}\n\n## Capabilities\n${member.expertise.map((e: string) => '- ' + e).join('\n')}`,
    skillMd: `# Skill: ${member.name}\n\n## Expertise\n${member.expertise.map((e: string) => '- ' + e).join('\n')}\n\n## Description\n${member.description}`,
  }));

  generatedFiles = {};
  generatedAgents.forEach((a: any) => {
    generatedFiles['agent-' + a.id + '.md'] = a.agentMd;
    generatedFiles['skill-' + a.id + '.md'] = a.skillMd;
  });
  generatedFiles['README.md'] = `# ${t.title}\n\nForked from AgentSpark Gallery.\n\n## Agents\n${generatedAgents.map((a: any) => `- ${a.emoji} **${a.name}** \u2014 ${a.description}`).join('\n')}\n\n## Use Cases\n${t.useCases.map((u: string) => '- ' + u).join('\n')}`;

  currentTopic = t.title;

  // Typed with Record to avoid TS7053
  const levelMap: Record<string, string> = { beginner: 'iskra', intermediate: 'plomien', advanced: 'pozar' };
  currentLevel = levelMap[t.difficulty] || 'iskra';

  // versionHistory and traceSpans are declared as var in globals.d.ts
  // access via window to be safe across module boundaries
  (window as any).versionHistory = [];
  (window as any).traceSpans = [];

  const banner = document.getElementById('shared-banner') as HTMLElement | null;
  const bannerTitle = document.getElementById('shared-banner-title') as HTMLElement | null;
  const bannerSub = document.getElementById('shared-banner-sub') as HTMLElement | null;
  if (banner && bannerTitle && bannerSub) {
    bannerTitle.textContent = tr(`🔀 Forked: ${t.title}`, `🔀 Skopiowano: ${t.title}`);
    bannerSub.textContent = tr(
      'Template preview. Add your API key to generate a custom version!',
      'Podglad szablonu. Dodaj klucz API, aby wygenerowac wlasna wersje!'
    );
    banner.style.display = 'block';
  }

  showResults();
  showNotif(tr(`✨ Template "${t.title}" loaded!`, `✨ Zaladowano szablon "${t.title}"!`));
  trackEvent('template_forked', { success: true, templateId: t.id, category: t.category });
}

// ─── WINDOW EXPORTS ───────────────────────────────────────
(window as any).initGallery = initGallery;
(window as any).filterByCategory = filterByCategory;
(window as any).filterGallery = filterGallery;
(window as any).loadFeaturedTemplates = loadFeaturedTemplates;
(window as any).renderGalleryGrid = renderGalleryGrid;
(window as any).showTemplateDetail = showTemplateDetail;
(window as any).closeTemplateDetail = closeTemplateDetail;
(window as any).forkTemplate = forkTemplate;
(window as any).forkTemplateById = forkTemplateById;
(window as any).GALLERY_TEMPLATES = GALLERY_TEMPLATES;
