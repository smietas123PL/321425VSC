# AgentSpark Gallery - Quick Start Guide

## 🚀 Implementation w 3 krokach

### Krok 1: Dodaj Gallery do swojego `index.html`

**Opcja A: Kopiuj całość**
```bash
# Otwórz gallery_feature.html
# Skopiuj wszystko i wklej przed zamykającym </body> w index.html
```

**Opcja B: Manualnie**
1. Dodaj HTML dla `#gallery-screen` po innych screenach
2. Dodaj CSS do sekcji `<style>`
3. Dodaj JavaScript przed `</body>`

### Krok 2: Dodaj link do Gallery w nawigacji

Znajdź swój header albo sidebar i dodaj:

```html
<!-- W header -->
<button onclick="showScreen('gallery')" class="lang-btn">
  ✨ Templates
</button>

<!-- Lub w iOS tab bar (jeśli używasz) -->
<button class="ios-tab-btn" onclick="showScreen('gallery')">
  <span class="tab-icon">✨</span>
  <span class="tab-label">Gallery</span>
</button>
```

### Krok 3: Integracja z Twoim workflow

W funkcji `forkTemplateById()` zamiast tylko notification:

```javascript
function forkTemplateById(templateId) {
  const template = FEATURED_TEMPLATES.find(t => t.id === templateId);
  if (!template) return;
  
  // Pre-wypełnij formularz
  const topicInput = document.getElementById('topic-input'); // Twój ID
  if (topicInput) {
    topicInput.value = template.title;
  }
  
  // Możesz też zapisać template do localStorage
  localStorage.setItem('forkedTemplate', JSON.stringify(template));
  
  showNotification(`✨ Template "${template.title}" loaded!`, 'success');
  showScreen('topic'); // Lub twój początkowy screen
}
```

---

## 📁 Struktura plików

```
agentspark/
├── index.html                  # Twoja główna aplikacja
├── featured_templates.json     # Template data (opcjonalne)
└── README.md
```

---

## 🎨 Customizacja

### Zmień kolory gallery

```css
/* W sekcji :root */
--gallery-accent: #f2b90d;      /* Zmień na swój kolor */
--gallery-surface: #221e10;
```

### Dodaj więcej kategorii

W `gallery_feature.html`, sekcja `gallery-filters`:

```html
<button class="gallery-filter-btn" data-category="finance" onclick="filterByCategory('finance')">
  💰 Finance
</button>
```

### Zmień grid layout

```css
.gallery-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* zmień 300px */
  gap: 2rem; /* zmień spacing */
}
```

---

## 🔧 Advanced: Load templates z JSON

**1. Utwórz `featured_templates.json` w root**

Użyj pliku `featured_templates.json` który stworzyłem.

**2. Załaduj dynamicznie**

W `initGallery()`:

```javascript
function initGallery() {
  // Jeśli templates nie są załadowane
  if (FEATURED_TEMPLATES.length === 0) {
    fetch('/featured_templates.json')
      .then(r => r.json())
      .then(templates => {
        FEATURED_TEMPLATES.push(...templates);
        renderGalleryGrid();
      })
      .catch(err => {
        console.error('Failed to load templates:', err);
        renderGalleryGrid(); // Render empty state
      });
  } else {
    renderGalleryGrid();
  }
}
```

---

## 🌐 Share Feature (GitHub Gist)

Dodaj funkcję share do results screen:

```javascript
async function shareProject(project) {
  try {
    const gist = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `AgentSpark: ${project.title}`,
        public: true,
        files: {
          'agentspark-project.json': {
            content: JSON.stringify(project, null, 2)
          }
        }
      })
    });
    
    const data = await gist.json();
    const shareUrl = `${window.location.origin}?load=${data.id}`;
    
    // Kopiuj do clipboard
    navigator.clipboard.writeText(shareUrl);
    showNotification('🔗 Share link copied!', 'success');
    
    return shareUrl;
  } catch (err) {
    console.error('Share failed:', err);
    showNotification('Failed to create share link', 'error');
  }
}

// Dodaj button w results screen
<button onclick="shareProject(currentProject)" class="share-btn">
  🔗 Share
</button>
```

**Load from URL:**

```javascript
// Na DOMContentLoaded
const urlParams = new URLSearchParams(window.location.search);
const loadGistId = urlParams.get('load');

if (loadGistId) {
  fetch(`https://api.github.com/gists/${loadGistId}`)
    .then(r => r.json())
    .then(gist => {
      const projectData = JSON.parse(gist.files['agentspark-project.json'].content);
      // Load project data
      console.log('Loaded project:', projectData);
      showNotification('✨ Project loaded from share link!', 'success');
    })
    .catch(err => {
      console.error('Failed to load shared project:', err);
      showNotification('Failed to load shared project', 'error');
    });
}
```

---

## 📱 Mobile Responsive

Gallery już jest responsive, ale możesz dodać:

```css
@media (max-width: 480px) {
  .gallery-hero h1 {
    font-size: 1.75rem;
  }
  
  .template-card {
    padding: 1rem;
  }
  
  .gallery-filter-btn {
    font-size: 0.8rem;
    padding: 0.4rem 1rem;
  }
}
```

---

## 🎯 Next Steps

1. ✅ Dodaj Gallery (10 min)
2. ✅ Test na desktop/mobile (5 min)
3. 🔄 Integracja z workflow (30 min)
4. 📦 Dodaj więcej templates (ongoing)
5. 🚀 Ship it!

---

## ❓ Troubleshooting

**Problem: Gallery nie pokazuje się**
- Sprawdź czy screen ma class "active": `showScreen('gallery')`
- Sprawdź console for errors

**Problem: Styles wyglądają źle**
- Upewnij się że CSS jest załadowany PRZED twojego istniejącego CSS
- Sprawdź czy zmienne CSS (--accent, --surface) są zdefiniowane

**Problem: Templates nie ładują się**
- Sprawdź console for fetch errors
- Upewnij się że ścieżka do JSON jest poprawna
- Użyj hardcoded FEATURED_TEMPLATES jako fallback

---

## 📞 Need Help?

Jeśli coś nie działa, sprawdź:
1. Browser console (F12)
2. Network tab (czy pliki się ładują)
3. Elements tab (czy HTML się renderuje)

---

**Gotowe! Gallery powinien działać out-of-the-box. 🎉**
