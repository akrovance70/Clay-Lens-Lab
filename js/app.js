/**
 * Clay Lens Lab — Main Application Controller
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
      this.viewMode = 'table';

      this.comparison = new Comp.ComparisonManager({
        onSelectionChange: () => this.handleComparisonChange(),
        getLensById: (id) => this.getEnrichedLensById(id),
        getCurrentWeights: () => H.normalizeWeights(this.weights)
      });

      this.setupIframeResizer();
    }

    setupIframeResizer() {
      if (window.self === window.top) return; // Running top-level standalone
      document.documentElement.classList.add('is-embedded');

      const postHeight = () => {
        try {
          const height = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight
          );
          window.parent.postMessage({
            type: 'clay-lens-lab:resize',
            height: height
          }, '*');
        } catch (e) {
          // Gracefully ignore cross-origin sandboxing restrictions
        }
      };

      this.postHeight = postHeight;
      window.addEventListener('resize', postHeight);

      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => postHeight());
        ro.observe(document.body);
      }
    }

    async init() {
      this.bindEvents();
      this.updateWeightUi();

      try {
        this.showLoading(true);
        const res = await fetch('data/pilla_lenses.json');
        if (!res.ok) throw new Error(`HTTP error loading catalog: ${res.status}`);
        this.rawLenses = await res.json();
        this.showLoading(false);
        this.render();
      } catch (err) {
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
                this.bootstrap();
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
      this.bootstrap();
    }

    bootstrap() {
      this.bindEvents();
      this.updateWeightUi();
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
        this.render();
      });

      const techSelect = document.getElementById('filterTech');
      techSelect?.addEventListener('change', (e) => {
        this.filters.tech = e.target.value;
        this.render();
      });

      const vltSelect = document.getElementById('filterVlt');
      vltSelect?.addEventListener('change', (e) => {
        this.filters.vlt = e.target.value;
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
        this.render();
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

      document.getElementById('btnViewTable')?.addEventListener('click', () => {
        this.viewMode = 'table';
        this.updateViewModeButtons();
        this.render();
      });
      document.getElementById('btnViewCards')?.addEventListener('click', () => {
        this.viewMode = 'cards';
        this.updateViewModeButtons();
        this.render();
      });

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

    updateViewModeButtons() {
      const btnTable = document.getElementById('btnViewTable');
      const btnCards = document.getElementById('btnViewCards');
      btnTable?.classList.toggle('active', this.viewMode === 'table');
      btnCards?.classList.toggle('active', this.viewMode === 'cards');
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

      const zeroWarning = document.getElementById('zeroWeightWarning');
      if (zeroWarning) {
        zeroWarning.style.display = norm.total === 0 ? 'block' : 'none';
      }
    }

    handleComparisonChange() {
      const container = document.getElementById('comparisonContainer');
      this.comparison.render(container);

      document.querySelectorAll('input[data-compare-id]').forEach(cb => {
        const id = cb.getAttribute('data-compare-id');
        cb.checked = this.comparison.isSelected(id);
      });
    }

    render() {
      const filtered = this.getFilteredAndSortedLenses();
      const countEl = document.getElementById('resultCount');
      if (countEl) {
        countEl.textContent = `Showing ${filtered.length} of ${this.rawLenses.length} Outlaw lenses`;
      }

      const tableContainer = document.getElementById('tableContainer');
      const cardsContainer = document.getElementById('cardsContainer');

      if (this.viewMode === 'table') {
        if (tableContainer) tableContainer.style.display = 'block';
        if (cardsContainer) cardsContainer.style.display = 'none';
        this.renderTable(filtered);
      } else {
        if (tableContainer) tableContainer.style.display = 'none';
        if (cardsContainer) cardsContainer.style.display = 'grid';
        this.renderCards(filtered);
      }

      this.comparison.render(document.getElementById('comparisonContainer'));

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

      if (this.postHeight) {
        requestAnimationFrame(() => this.postHeight());
      }
    }

    renderTable(lenses) {
      const tbody = document.getElementById('tableRows');
      if (!tbody) return;

      if (lenses.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" class="no-results" style="text-align: center; padding: 32px 16px;">
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
        return `
          <tr class="${isChecked ? 'row-selected' : ''}">
            <td class="col-center">
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
            <td>${UI.renderVltBar(l.vlt)}</td>
            <td>${UI.renderTechBadge(l.tech, l.verificationStatus)}</td>
            <td class="col-color-profile">
              <span class="color-text">${UI.esc(l.color)}</span>
            </td>
            <td class="col-env"><span class="env-text">${UI.esc(l.env)}</span></td>
            <td class="col-light">${UI.esc(l.light)}</td>
            <td class="col-source">${UI.renderSourceBadge(l)}</td>
            <td class="col-score col-composite-score">
              ${UI.renderScoreBadge(l.composite, true)}
            </td>
            <td class="col-score">${UI.renderScoreBadge(l.sun)}</td>
            <td class="col-score">${UI.renderScoreBadge(l.cloud)}</td>
            <td class="col-score">${UI.renderScoreBadge(l.brown)}</td>
          </tr>
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
        return `
          <article class="lens-card ${isChecked ? 'card-selected' : ''}">
            <div class="card-header">
              <div class="card-header-left">
                <span class="color-swatch-circle" style="background: ${UI.getColorGradient(l.color)}" title="Illustrative: ${UI.esc(l.color)}"></span>
                <div>
                  <strong class="card-title">${UI.esc(l.id)}</strong>
                  <div class="card-subtitle">${UI.esc(l.color)} · ${UI.renderTechBadge(l.tech, l.verificationStatus)}</div>
                </div>
              </div>
              <label class="card-compare-label">
                <input 
                  type="checkbox" 
                  class="compare-check" 
                  data-compare-id="${UI.esc(l.id)}" 
                  ${isChecked ? 'checked' : ''}
                />
                <span>Compare</span>
              </label>
            </div>

            <div class="card-body">
              <div class="card-vlt-row">
                <span class="card-label">Transmission:</span>
                ${UI.renderVltBar(l.vlt)}
              </div>

              <div class="card-meta-row">
                <span class="card-label">Lighting:</span>
                <span>${UI.esc(l.light)}</span>
              </div>

              <div class="card-meta-row">
                <span class="card-label">Environments:</span>
                <span>${UI.esc(l.env)}</span>
              </div>

              <div class="card-meta-row">
                <span class="card-label">Source:</span>
                <span>${UI.renderSourceBadge(l)}</span>
              </div>

              <div class="card-scores-section">
                <div class="card-composite-box">
                  <span class="composite-label">Personalized Heuristic:</span>
                  ${UI.renderScoreBadge(l.composite, true)}
                </div>
                <div class="card-subscores">
                  <div class="subscore-item">
                    <span>☀ Sun</span>
                    ${UI.renderScoreBadge(l.sun)}
                  </div>
                  <div class="subscore-item">
                    <span>☁ Overcast</span>
                    ${UI.renderScoreBadge(l.cloud)}
                  </div>
                  <div class="subscore-item">
                    <span>🌾 Brown</span>
                    ${UI.renderScoreBadge(l.brown)}
                  </div>
                </div>
              </div>
            </div>
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
