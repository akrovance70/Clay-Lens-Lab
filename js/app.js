/**
 * Clay Lens Lab — Main Application Controller
 * Optimized Compact Responsive Table + Expandable Details + Mobile Stacked Cards
 */

(function(global) {
  const H = global.ClayLensHeuristics || {};
  const UI = global.ClayLensUI || {};
  const Export = global.ClayLensExport || {};
  const Comp = global.ClayLensComparison || {};

  class App {
    constructor() {
      this.rawLenses = [];
      this.weights = { ...(H.DEFAULT_WEIGHTS || { sun: 33.33, cloud: 33.33, brown: 33.34 }) };
      this.activePreset = 'balanced';
      this.filters = {
        search: '',
        tech: '',
        vlt: '',
        mode: 'all'
      };
      this.sort = {
        key: 'composite',
        dir: 'desc'
      };
      this.expandedIds = new Set(); // Tracks expanded detail rows/cards
      this.desktopView = 'table'; // 'table' or 'cards' (for desktop toggle)

      this.comparison = new Comp.ComparisonManager({
        onSelectionChange: () => this.handleComparisonChange(),
        getLensById: (id) => this.getEnrichedLensById(id),
        getCurrentWeights: () => H.normalizeWeights(this.weights)
      });

      this.setupIframeResizer();
    }

    setupIframeResizer() {
      // Setup full-screen launcher links regardless of embedding state
      const currentUrl = window.location.href;
      const fsLink = document.getElementById('linkOpenFullscreen');
      const fsBtn = document.getElementById('btnHeaderFullscreen');
      if (fsLink) fsLink.href = currentUrl;
      if (fsBtn) fsBtn.href = currentUrl;

      if (window.self === window.top) return;
      document.documentElement.classList.add('is-embedded');
      document.body.classList.add('is-embedded-body');

      // Trusted Parent Origin management (Phase 1: origin validation)
      let trustedParentOrigin = null;

      const isAllowedOrigin = (origin) => {
        if (!origin || typeof origin !== 'string') return false;
        try {
          const url = new URL(origin);
          const host = url.hostname.toLowerCase();
          return (
            host.endsWith('.squarespace.com') ||
            host === 'squarespace.com' ||
            host.endsWith('.cloudscoutstudio.com') ||
            host === 'cloudscoutstudio.com' ||
            host === 'localhost' ||
            host === '127.0.0.1' ||
            (document.referrer && origin === new URL(document.referrer).origin)
          );
        } catch (e) {
          return false;
        }
      };

      if (document.referrer) {
        try {
          const refOrigin = new URL(document.referrer).origin;
          if (isAllowedOrigin(refOrigin)) {
            trustedParentOrigin = refOrigin;
          }
        } catch (e) {}
      }

      // Check query param e.g. ?parentOrigin=https://cloudscoutstudio.com
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const paramOrigin = urlParams.get('parentOrigin');
        if (paramOrigin && isAllowedOrigin(paramOrigin)) {
          trustedParentOrigin = paramOrigin;
        }
      } catch (e) {}

      let lastSentHeight = 0;
      const postHeight = () => {
        try {
          const height = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight
          );

          if (Math.abs(height - lastSentHeight) < 2) return;
          lastSentHeight = height;

          const payload = {
            type: 'clay-lens-lab:resize',
            height: height,
            timestamp: Date.now()
          };

          const targetOrigin = trustedParentOrigin || (document.referrer ? new URL(document.referrer).origin : '*');
          window.parent.postMessage(payload, targetOrigin);
        } catch (e) {
          // Fallback
        }
      };

      this.postHeight = postHeight;

      // Listen for parent messages (handshake, resize request) with origin validation
      window.addEventListener('message', (event) => {
        if (!event.data || typeof event.data !== 'object') return;
        if (!isAllowedOrigin(event.origin)) {
          console.warn('Clay Lens Lab: Ignored postMessage from untrusted origin:', event.origin);
          return;
        }

        // Lock verified parent origin
        trustedParentOrigin = event.origin;

        if (event.data.type === 'clay-lens-lab:handshake' || event.data.type === 'clay-lens-lab:request-height') {
          postHeight();
        }
      });

      window.addEventListener('resize', () => {
        postHeight();
      });

      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          postHeight();
        });
        ro.observe(document.body);
      }

      // Send initial sizing pulses as fonts and resources load
      postHeight();
      setTimeout(postHeight, 150);
      setTimeout(postHeight, 500);
      setTimeout(postHeight, 1000);
    }

    async init() {
      this.bindEvents();
      this.updateWeightUi();

      try {
        this.showLoading(true);
        if (window.PILLA_LENSES_DATA && Array.isArray(window.PILLA_LENSES_DATA) && window.PILLA_LENSES_DATA.length > 0) {
          this.rawLenses = window.PILLA_LENSES_DATA;
          this.showLoading(false);
          this.render();
        } else {
          const res = await fetch('data/pilla_lenses.json');
          if (!res.ok) throw new Error(`HTTP error loading catalog: ${res.status}`);
          this.rawLenses = await res.json();
          this.showLoading(false);
          this.render();
        }
      } catch (err) {
        if (window.PILLA_LENSES_DATA && Array.isArray(window.PILLA_LENSES_DATA) && window.PILLA_LENSES_DATA.length > 0) {
          this.rawLenses = window.PILLA_LENSES_DATA;
          this.showLoading(false);
          this.render();
          return;
        }
        console.warn('Automatic fetch failed (likely running on file:// protocol without HTTP server):', err);
        this.showLoading(false);
        this.showLocalFileFallback();
      }
    }

    showLoading(isLoading) {
      const el = document.getElementById('resultCount');
      if (el && isLoading) el.textContent = 'Loading lenses...';
    }

    showLocalFileFallback() {
      const errorEl = document.getElementById('errorMessage');
      if (errorEl) {
        errorEl.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <strong>Notice: Running on local file protocol (file://)</strong><br>
              Modern browser security restricts background <code>fetch()</code> on local files. On <strong>GitHub Pages</strong> or any local HTTP server (<code>python -m http.server</code>), this catalog loads automatically.
            </div>
            <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap;">
              <span>To inspect locally without a server, select <code>data/pilla_lenses.json</code>:</span>
              <input type="file" id="localJsonPicker" accept=".json" style="font-size: 12px; padding: 4px;" />
            </div>
          </div>
        `;
        errorEl.style.display = 'block';

        document.getElementById('localJsonPicker')?.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              try {
                this.rawLenses = JSON.parse(evt.target.result);
                errorEl.style.display = 'none';
                this.render();
              } catch (parseErr) {
                alert('Invalid JSON file selected: ' + parseErr.message);
              }
            };
            reader.readAsText(file);
          }
        });
      }
    }

    loadDataDirectly(lenses) {
      this.rawLenses = lenses;
      const errorEl = document.getElementById('errorMessage');
      if (errorEl) errorEl.style.display = 'none';
      this.render();
    }

    getEnrichedLenses() {
      const normWeights = H.normalizeWeights(this.weights);
      return this.rawLenses.map(lens => H.enrichLens(lens, normWeights));
    }

    getEnrichedLensById(id) {
      const raw = this.rawLenses.find(l => l.id === id);
      if (!raw) return null;
      return H.enrichLens(raw, H.normalizeWeights(this.weights));
    }

    getFilteredAndSortedLenses() {
      const enriched = this.getEnrichedLenses();
      const q = this.filters.search.toLowerCase().trim();
      const tech = this.filters.tech;
      const vlt = this.filters.vlt;
      const mode = this.filters.mode;

      const filtered = enriched.filter(item => {
        if (q) {
          const textBlob = [
            item.id,
            item.tech,
            item.env,
            item.light,
            item.color,
            item.sourceType
          ].join(' ').toLowerCase();
          if (!textBlob.includes(q)) return false;
        }

        if (tech && !item.tech.includes(tech)) {
          return false;
        }

        if (vlt) {
          const v = item.vlt;
          if (vlt === 'dark' && !(v <= 25)) return false;
          if (vlt === 'mid' && !(v > 25 && v <= 55)) return false;
          if (vlt === 'light' && !(v > 55 && v <= 75)) return false;
          if (vlt === 'very' && !(v > 75)) return false;
        }

        if (mode === 'sun' && item.sun < 4) return false;
        if (mode === 'cloud' && item.cloud < 4) return false;
        if (mode === 'brown' && item.brown < 4) return false;

        return true;
      });

      filtered.sort((a, b) => {
        const { key, dir } = this.sort;
        let diff = 0;

        if (key === 'composite') {
          diff = b.composite - a.composite || a.vlt - b.vlt;
        } else if (key === 'vlt') {
          diff = a.vlt - b.vlt;
        } else if (key === 'vlt-desc') {
          diff = b.vlt - a.vlt;
        } else if (key === 'id') {
          diff = a.id.localeCompare(b.id, undefined, { numeric: true });
        } else if (key === 'sun') {
          diff = b.sun - a.sun || a.vlt - b.vlt;
        } else if (key === 'cloud') {
          diff = b.cloud - a.cloud || b.vlt - a.vlt;
        } else if (key === 'brown') {
          diff = b.brown - a.brown || a.vlt - b.vlt;
        }

        return dir === 'desc' ? diff : -diff;
      });

      return filtered;
    }

    bindEvents() {
      const searchInput = document.getElementById('searchQuery');
      searchInput?.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.updateActiveFiltersBadge();
        this.render();
      });

      const techSelect = document.getElementById('filterTech');
      techSelect?.addEventListener('change', (e) => {
        this.filters.tech = e.target.value;
        this.updateActiveFiltersBadge();
        this.render();
      });

      const vltSelect = document.getElementById('filterVlt');
      vltSelect?.addEventListener('change', (e) => {
        this.filters.vlt = e.target.value;
        this.updateActiveFiltersBadge();
        this.render();
      });

      const sortSelect = document.getElementById('selectSort');
      sortSelect?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'vlt-desc') {
          this.sort = { key: 'vlt-desc', dir: 'desc' };
        } else {
          this.sort = { key: val, dir: 'desc' };
        }
        this.updateActiveFiltersBadge();
        this.render();
      });

      // Personalize Collapsible Drawer Toggle
      const btnTogglePersonalize = document.getElementById('btnTogglePersonalize');
      const personalizeContent = document.getElementById('personalizeContent');
      const caretPersonalize = document.getElementById('caretTogglePersonalize');
      const textPersonalize = document.getElementById('textTogglePersonalize');

      // Initialize collapsed on mobile (≤ 768px)
      if (window.innerWidth <= 768 && personalizeContent) {
        personalizeContent.classList.add('collapsed');
        btnTogglePersonalize?.setAttribute('aria-expanded', 'false');
        if (caretPersonalize) caretPersonalize.textContent = '▾';
        if (textPersonalize) textPersonalize.textContent = 'Adjust Weights';
      }

      btnTogglePersonalize?.addEventListener('click', () => {
        const isCollapsed = personalizeContent?.classList.toggle('collapsed');
        const expanded = !isCollapsed;
        btnTogglePersonalize.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (caretPersonalize) caretPersonalize.textContent = expanded ? '▴' : '▾';
        if (textPersonalize) textPersonalize.textContent = expanded ? 'Hide Sliders' : 'Adjust Weights';
        if (this.postHeight) {
          requestAnimationFrame(() => this.postHeight());
          setTimeout(() => this.postHeight(), 250);
        }
      });

      // Advanced Filters Drawer Toggle (Mobile)
      const btnToggleAdvanced = document.getElementById('btnToggleAdvancedFilters');
      const advancedDrawer = document.getElementById('advancedFiltersDrawer');
      const caretAdvanced = document.getElementById('caretAdvancedFilters');

      btnToggleAdvanced?.addEventListener('click', () => {
        const isOpen = advancedDrawer?.classList.toggle('open');
        btnToggleAdvanced.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (caretAdvanced) caretAdvanced.textContent = isOpen ? '▴' : '▾';
        if (this.postHeight) {
          requestAnimationFrame(() => this.postHeight());
          setTimeout(() => this.postHeight(), 250);
        }
      });

      document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const mode = e.currentTarget.getAttribute('data-mode');
          this.filters.mode = mode;
          
          document.querySelectorAll('[data-mode]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-mode') === mode);
          });

          if (mode === 'sun') this.sort = { key: 'sun', dir: 'desc' };
          else if (mode === 'cloud') this.sort = { key: 'cloud', dir: 'desc' };
          else if (mode === 'brown') this.sort = { key: 'brown', dir: 'desc' };
          else if (mode === 'all') this.sort = { key: 'composite', dir: 'desc' };

          if (sortSelect) sortSelect.value = this.sort.key;
          this.render();
        });
      });

      document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        this.filters = { search: '', tech: '', vlt: '', mode: 'all' };
        this.sort = { key: 'composite', dir: 'desc' };

        if (searchInput) searchInput.value = '';
        if (techSelect) techSelect.value = '';
        if (vltSelect) vltSelect.value = '';
        if (sortSelect) sortSelect.value = 'composite';

        document.querySelectorAll('[data-mode]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-mode') === 'all');
        });

        this.render();
      });

      document.getElementById('btnExportFiltered')?.addEventListener('click', () => {
        const filtered = this.getFilteredAndSortedLenses();
        Export.exportFilteredLensesCsv(filtered, H.normalizeWeights(this.weights));
      });

      // Desktop View Mode Toggle (Table vs Cards)
      const btnTable = document.getElementById('btnViewTable');
      const btnCards = document.getElementById('btnViewCards');
      btnTable?.addEventListener('click', () => {
        this.desktopView = 'table';
        btnTable.classList.add('active');
        btnCards?.classList.remove('active');
        this.applyViewMode();
      });
      btnCards?.addEventListener('click', () => {
        this.desktopView = 'cards';
        btnCards.classList.add('active');
        btnTable?.classList.remove('active');
        this.applyViewMode();
      });

      window.addEventListener('resize', () => {
        this.applyViewMode();
      });

      ['sun', 'cloud', 'brown'].forEach(key => {
        const slider = document.getElementById(`weightSlider_${key}`);
        const numInput = document.getElementById(`weightNum_${key}`);

        const handleWeightChange = (val) => {
          const num = Math.max(0, Math.min(100, Number(val) || 0));
          this.weights[key] = num;
          if (slider) slider.value = num;
          if (numInput) numInput.value = num;
          this.activePreset = null;
          this.updateWeightPresetButtons();
          this.updateWeightUi();
          this.render();
        };

        slider?.addEventListener('input', (e) => handleWeightChange(e.target.value));
        numInput?.addEventListener('input', (e) => handleWeightChange(e.target.value));
      });

      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const presetKey = e.currentTarget.getAttribute('data-preset');
          const preset = H.WEIGHT_PRESETS[presetKey];
          if (preset) {
            this.weights = { ...preset.weights };
            this.activePreset = presetKey;
            this.updateWeightUi();
            this.updateWeightPresetButtons();
            this.render();
          }
        });
      });

      document.getElementById('btnResetWeights')?.addEventListener('click', () => {
        this.weights = { ...H.DEFAULT_WEIGHTS };
        this.activePreset = 'balanced';
        this.updateWeightUi();
        this.updateWeightPresetButtons();
        this.render();
      });

      // Table Header click sorting
      document.querySelectorAll('th[data-sort-col]').forEach(th => {
        th.addEventListener('click', (e) => {
          const col = e.currentTarget.getAttribute('data-sort-col');
          if (this.sort.key === col) {
            this.sort.dir = this.sort.dir === 'desc' ? 'asc' : 'desc';
          } else {
            this.sort.key = col;
            this.sort.dir = col === 'id' || col === 'vlt' ? 'asc' : 'desc';
          }

          if (sortSelect) {
            sortSelect.value = this.sort.key === 'vlt' && this.sort.dir === 'desc' ? 'vlt-desc' : this.sort.key;
          }

          this.render();
        });
      });

      // Table events: compare toggle and detail row toggle
      const tableBody = document.getElementById('tableRows');
      tableBody?.addEventListener('change', (e) => {
        if (e.target.matches('input[data-compare-id]')) {
          const id = e.target.getAttribute('data-compare-id');
          const success = this.comparison.toggleLens(id);
          if (!success) {
            e.target.checked = false;
          }
        }
      });

      tableBody?.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('[data-toggle-detail]');
        if (toggleBtn) {
          const id = toggleBtn.getAttribute('data-toggle-detail');
          if (this.expandedIds.has(id)) {
            this.expandedIds.delete(id);
          } else {
            this.expandedIds.add(id);
          }
          this.render();
          return;
        }
      });

      // Cards events: compare toggle and card accordion toggle
      const cardsContainer = document.getElementById('cardsContainer');
      cardsContainer?.addEventListener('change', (e) => {
        if (e.target.matches('input[data-compare-id]')) {
          const id = e.target.getAttribute('data-compare-id');
          const success = this.comparison.toggleLens(id);
          if (!success) {
            e.target.checked = false;
          }
        }
      });

      cardsContainer?.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('[data-toggle-card-detail]');
        if (toggleBtn) {
          const id = toggleBtn.getAttribute('data-toggle-card-detail');
          if (this.expandedIds.has(id)) {
            this.expandedIds.delete(id);
          } else {
            this.expandedIds.add(id);
          }
          this.render();
          return;
        }
      });

      // Modal
      const modal = document.getElementById('methodologyModal');
      const openModalBtn = document.getElementById('btnOpenMethodology');
      const closeModalBtn = document.getElementById('btnCloseMethodology');
      const modalBackdrop = document.getElementById('modalBackdrop');

      const toggleModal = (show) => {
        if (modal) modal.style.display = show ? 'flex' : 'none';
        document.body.style.overflow = show ? 'hidden' : '';
      };

      openModalBtn?.addEventListener('click', () => toggleModal(true));
      closeModalBtn?.addEventListener('click', () => toggleModal(false));
      modalBackdrop?.addEventListener('click', () => toggleModal(false));
    }

    updateWeightPresetButtons() {
      document.querySelectorAll('[data-preset]').forEach(b => {
        const p = b.getAttribute('data-preset');
        b.classList.toggle('active', p === this.activePreset);
      });
    }

    updateWeightUi() {
      const norm = H.normalizeWeights(this.weights);

      ['sun', 'cloud', 'brown'].forEach(key => {
        const slider = document.getElementById(`weightSlider_${key}`);
        const numInput = document.getElementById(`weightNum_${key}`);
        const pctDisplay = document.getElementById(`weightPct_${key}`);

        if (slider) slider.value = this.weights[key];
        if (numInput) numInput.value = this.weights[key];
        if (pctDisplay) {
          pctDisplay.textContent = norm.total > 0 ? `${norm[key].toFixed(1)}%` : '0.0%';
        }
      });

      // Update preset summary badge in header
      const summaryText = document.getElementById('presetSummaryText');
      if (summaryText) {
        const pLabel = this.activePreset && H.WEIGHT_PRESETS[this.activePreset] 
          ? H.WEIGHT_PRESETS[this.activePreset].label 
          : 'Custom';
        summaryText.textContent = `Preset: ${pLabel} (${norm.sun.toFixed(0)}% Sun · ${norm.cloud.toFixed(0)}% Cloud · ${norm.brown.toFixed(0)}% Brown)`;
      }

      const zeroWarning = document.getElementById('zeroWeightWarning');
      if (zeroWarning) {
        zeroWarning.style.display = norm.total === 0 ? 'block' : 'none';
      }
    }

    updateActiveFiltersBadge() {
      const badge = document.getElementById('activeFiltersBadge');
      if (!badge) return;

      let count = 0;
      if (this.filters.tech) count++;
      if (this.filters.vlt) count++;
      if (this.sort.key !== 'composite') count++;

      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    handleComparisonChange() {
      const container = document.getElementById('comparisonContainer');
      this.comparison.render(container);

      document.querySelectorAll('input[data-compare-id]').forEach(cb => {
        const id = cb.getAttribute('data-compare-id');
        cb.checked = this.comparison.isSelected(id);
      });

      if (this.postHeight) {
        requestAnimationFrame(() => this.postHeight());
      }
    }

    render() {
      const filtered = this.getFilteredAndSortedLenses();
      const countEl = document.getElementById('resultCount');
      if (countEl) {
        countEl.textContent = `Showing ${filtered.length} of ${this.rawLenses.length} Outlaw lenses`;
      }

      this.renderTable(filtered);
      this.renderCards(filtered);
      this.comparison.render(document.getElementById('comparisonContainer'));

      // Update sort indicators
      document.querySelectorAll('th[data-sort-col]').forEach(th => {
        const col = th.getAttribute('data-sort-col');
        const arrow = th.querySelector('.sort-arrow');
        if (col === this.sort.key) {
          th.classList.add('sort-active');
          if (arrow) arrow.textContent = this.sort.dir === 'desc' ? '▼' : '▲';
        } else {
          th.classList.remove('sort-active');
          if (arrow) arrow.textContent = '↕';
        }
      });

      this.applyViewMode();

      if (this.postHeight) {
        requestAnimationFrame(() => this.postHeight());
      }
    }

    applyViewMode() {
      const tableContainer = document.getElementById('tableContainer');
      const cardsContainer = document.getElementById('cardsContainer');
      if (!tableContainer || !cardsContainer) return;

      if (window.innerWidth <= 768) {
        tableContainer.style.display = 'none';
        cardsContainer.style.display = 'flex';
      } else {
        if (this.desktopView === 'cards') {
          tableContainer.style.display = 'none';
          cardsContainer.style.display = 'grid';
        } else {
          tableContainer.style.display = 'block';
          cardsContainer.style.display = 'none';
        }
      }
    }

    renderTable(lenses) {
      const tbody = document.getElementById('tableRows');
      if (!tbody) return;

      if (lenses.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="no-results" style="text-align: center; padding: 32px 16px;">
              <div class="empty-state">
                <span style="font-size: 28px;">🔍</span>
                <p><strong>No lenses match the active filter criteria.</strong></p>
                <p style="color: var(--color-text-muted);">Try clearing your search query or selecting "All Lenses".</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = lenses.map(l => {
        const isChecked = this.comparison.isSelected(l.id);
        const isExpanded = this.expandedIds.has(l.id);

        return `
          <tr class="main-table-row ${isChecked ? 'row-selected' : ''} ${isExpanded ? 'row-expanded' : ''}">
            <td class="col-check col-center">
              <input 
                type="checkbox" 
                class="compare-check" 
                data-compare-id="${UI.esc(l.id)}" 
                ${isChecked ? 'checked' : ''}
                aria-label="Select ${UI.esc(l.id)} for comparison"
              />
            </td>
            <td class="col-lens-id">
              <div class="lens-id-cell">
                <span 
                  class="color-swatch-circle" 
                  style="background: ${UI.getColorGradient(l.color)}" 
                  title="Illustrative color profile: ${UI.esc(l.color)} (Not accurate spectrophotometric optical filter)"
                ></span>
                <strong class="lens-code">${UI.esc(l.id)}</strong>
              </div>
            </td>
            <td class="col-vlt">${UI.renderVltBar(l.vlt)}</td>
            <td class="col-tech">${UI.renderTechBadge(l.tech, l.verificationStatus)}</td>
            <td class="col-score col-composite-score">
              ${UI.renderScoreBadge(l.composite, true)}
            </td>
            <td class="col-score">${UI.renderScoreBadge(l.sun)}</td>
            <td class="col-score">${UI.renderScoreBadge(l.cloud)}</td>
            <td class="col-score">${UI.renderScoreBadge(l.brown)}</td>
            <td class="col-expand col-center">
              <button 
                class="btn-toggle-detail ${isExpanded ? 'active' : ''}" 
                data-toggle-detail="${UI.esc(l.id)}" 
                aria-expanded="${isExpanded ? 'true' : 'false'}"
                title="View secondary specifications, lighting, environments, and source provenance"
              >
                <span>${isExpanded ? 'Hide' : 'Details'}</span>
                <span class="detail-caret">${isExpanded ? '▴' : '▾'}</span>
              </button>
            </td>
          </tr>
          ${isExpanded ? `
            <tr class="detail-drawer-row">
              <td colspan="9" class="detail-cell">
                ${UI.renderDetailContent(l)}
              </td>
            </tr>
          ` : ''}
        `;
      }).join('');
    }

    renderCards(lenses) {
      const container = document.getElementById('cardsContainer');
      if (!container) return;

      if (lenses.length === 0) {
        container.innerHTML = `
          <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px 16px;">
            <div class="empty-state">
              <span style="font-size: 28px;">🔍</span>
              <p><strong>No lenses match the active filter criteria.</strong></p>
              <p style="color: var(--color-text-muted);">Try clearing your search query or selecting "All Lenses".</p>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = lenses.map(l => {
        const isChecked = this.comparison.isSelected(l.id);
        const isExpanded = this.expandedIds.has(l.id);

        return `
          <article class="lens-mobile-card ${isChecked ? 'card-selected' : ''}">
            <div class="mcard-top-row">
              <div class="mcard-brand-group">
                <span class="color-swatch-circle" style="background: ${UI.getColorGradient(l.color)}" title="Illustrative: ${UI.esc(l.color)}"></span>
                <div>
                  <strong class="mcard-id">${UI.esc(l.id)}</strong>
                  <div class="mcard-tech-wrap">${UI.renderTechBadge(l.tech, l.verificationStatus)}</div>
                </div>
              </div>
              <div class="mcard-top-right">
                <div class="mcard-vlt-badge"><strong>${l.vlt}%</strong> VLT</div>
                <label class="mcard-compare-label">
                  <input 
                    type="checkbox" 
                    class="compare-check" 
                    data-compare-id="${UI.esc(l.id)}" 
                    ${isChecked ? 'checked' : ''}
                  />
                  <span>Compare</span>
                </label>
              </div>
            </div>

            <!-- Scores Strip -->
            <div class="mcard-scores-strip">
              <div class="mscore-composite-box">
                <span class="mscore-label">Personalized:</span>
                ${UI.renderScoreBadge(l.composite, true)}
              </div>
              <div class="mscore-group">
                <div class="mscore-item">
                  <span class="mscore-item-title">☀ Sun</span>
                  ${UI.renderScoreBadge(l.sun)}
                </div>
                <div class="mscore-item">
                  <span class="mscore-item-title">☁ Cloud</span>
                  ${UI.renderScoreBadge(l.cloud)}
                </div>
                <div class="mscore-item">
                  <span class="mscore-item-title">🌾 Brown</span>
                  ${UI.renderScoreBadge(l.brown)}
                </div>
              </div>
            </div>

            <!-- Expand Accordion Button -->
            <div class="mcard-accordion-toggle">
              <button 
                class="btn-card-accordion ${isExpanded ? 'active' : ''}" 
                data-toggle-card-detail="${UI.esc(l.id)}"
                aria-expanded="${isExpanded ? 'true' : 'false'}"
              >
                <span>${isExpanded ? 'Hide Specifications & Provenance' : 'Specifications, Lighting & Sources'}</span>
                <span>${isExpanded ? '▴' : '▾'}</span>
              </button>
            </div>

            ${isExpanded ? `
              <div class="mcard-expanded-body">
                ${UI.renderDetailContent(l)}
              </div>
            ` : ''}
          </article>
        `;
      }).join('');
    }
  }

  global.clayLensLabApp = new App();
  document.addEventListener('DOMContentLoaded', () => {
    global.clayLensLabApp.init();
  });
})(typeof window !== 'undefined' ? window : this);
