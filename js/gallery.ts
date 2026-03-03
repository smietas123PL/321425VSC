// ─── GALLERY TEMPLATES ────────────────────────────────────
// NOTE: The full GALLERY_TEMPLATES array is unchanged from the original.
// Only the function signatures and type annotations below are fixed.
// Keep the existing GALLERY_TEMPLATES declaration and data intact —
// paste these fixed functions AFTER the GALLERY_TEMPLATES array.

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
  const id          = _cleanStr(raw.id, 60);
  const title       = _cleanStr(raw.title, 120);
  const description = _cleanStr(raw.description, 380);
  const category    = _cleanStr(raw.category, 24).toLowerCase();
  const difficulty  = _cleanStr(raw.difficulty, 24).toLowerCase();
  const agentCount  = Number(raw.agentCount);
  const tags        = _cleanList(raw.tags, 10, 40);
  const useCases    = _cleanList(raw.useCases, 12, 120);

  if (!id || !title || !description) return null;
  if (!category || !difficulty || !Number.isInteger(agentCount) || agentCount < 1 || agentCount > 12) return null;
  if (!tags.length || !useCases.length) return null;

  if (!Array.isArray(raw.team) || raw.team.length === 0 || raw.team.length > 12) return null;
  const team = raw.team.map((member: any) => {
    const name              = _cleanStr(member?.name, 60);
    const role              = _cleanStr(member?.role, 80);
    const memberDescription = _cleanStr(member?.description, 260);
    const expertise         = _cleanList(member?.expertise, 10, 60);
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
  (document.getElementById('tpl-difficulty') as HTMLElement).textContent   = `📊 ${t.difficulty}`;
  (document.getElementById('tpl-agent-count') as HTMLElement).textContent  = `🤖 ${t.agentCount} ${tr('agents', 'agentow')}`;
  (document.getElementById('tpl-description') as HTMLElement).textContent  = t.description;

  const useCasesLabel = document.getElementById('tpl-usecases-label') as HTMLElement | null;
  const teamLabel     = document.getElementById('tpl-team-label') as HTMLElement | null;
  const forkBtn       = document.getElementById('tpl-fork-btn') as HTMLElement | null;
  const cancelBtn     = document.getElementById('tpl-cancel-btn') as HTMLElement | null;
  if (useCasesLabel) useCasesLabel.textContent = tr('USE CASES', 'ZASTOSOWANIA');
  if (teamLabel)     teamLabel.textContent     = tr('AGENT TEAM', 'ZESPOL AGENTOW');
  if (forkBtn)       forkBtn.textContent       = tr('Use This Template', 'Uzyj szablonu');
  if (cancelBtn)     cancelBtn.textContent     = tr('Cancel', 'Anuluj');

  const useCases = document.getElementById('tpl-usecases') as HTMLElement | null;
  if (useCases) {
    useCases.innerHTML = '';
    t.useCases.forEach((u: string) => {
      const li    = document.createElement('li');
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
      const card    = document.createElement('div');
      card.className = 'tpl-agent-card';
      const h4      = document.createElement('h4');
      h4.textContent = a.name;
      const role    = document.createElement('div');
      role.className = 'tpl-agent-role';
      role.textContent = a.role;
      const descEl  = document.createElement('div');
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
    ecommerce:   ['🎧', '📦', '💰'],
    data:        ['🗄️', '📊', '📝'],
    creative:    ['✍️', '🔍', '📱'],
    technical:   ['📖', '🐛', '🔌'],
    hr:          ['📝', '🔎', '📅'],
    finance:     ['💳', '📈', '💹'],
    education:   ['🔢', '🔬', '✏️'],
    hospitality: ['📅', '🍽️', '⭐'],
  };
  const fallback = ['🤖', '🧠', '⚙️', '📊', '🎯', '💡'];
  const emojis: string[] = catEmojis[t.category] || fallback;

  generatedAgents = t.team.map((member: any, i: number) => ({
    id:          t.id + '-' + i,
    name:        member.name,
    emoji:       emojis[i] || fallback[i % fallback.length],
    type:        i === 0 ? 'business' : 'technical',
    role:        i === 0 ? 'ORCHESTRATOR' : 'SPECIALIST',
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
  (window as any).traceSpans     = [];

  const banner      = document.getElementById('shared-banner') as HTMLElement | null;
  const bannerTitle = document.getElementById('shared-banner-title') as HTMLElement | null;
  const bannerSub   = document.getElementById('shared-banner-sub') as HTMLElement | null;
  if (banner && bannerTitle && bannerSub) {
    bannerTitle.textContent = tr(`🔀 Forked: ${t.title}`, `🔀 Skopiowano: ${t.title}`);
    bannerSub.textContent   = tr(
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
window.initGallery          = initGallery;
window.filterByCategory     = filterByCategory;
window.filterGallery        = filterGallery;
window.loadFeaturedTemplates = loadFeaturedTemplates;
window.renderGalleryGrid    = renderGalleryGrid;
window.showTemplateDetail   = showTemplateDetail;
window.closeTemplateDetail  = closeTemplateDetail;
window.forkTemplate         = forkTemplate;
window.forkTemplateById     = forkTemplateById;
