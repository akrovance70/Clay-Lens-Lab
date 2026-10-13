/**
 * Clay Lens Lab — 4-Lens Side-by-Side Comparison Comparator
 */

(function(global) {
  const UI = global.ClayLensUI || {};
  const Export = global.ClayLensExport || {};

  class ComparisonManager {
    constructor(options = {}) {
      this.selectedIds = new Set();
      this.maxSelections = 4;
      this.onSelectionChange = options.onSelectionChange || (() => {});
      this.getLensById = options.getLensById || (() => null);
      this.getCurrentWeights = options.getCurrentWeights || (() => ({ sun: 33.33, cloud: 33.33, brown: 33.34 }));
    }

    toggleLens(id) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id);
        this.onSelectionChange(this.getSelectedList());
        return true;
      }

      if (this.selectedIds.size >= this.maxSelections) {
        alert(`You can select up to ${this.maxSelections} lenses to compare at a time. Deselect a lens before adding another.`);
        return false;
      }

      this.selectedIds.add(id);
      this.onSelectionChange(this.getSelectedList());
      return true;
    }

    removeLens(id) {
      if (this.selectedIds.delete(id)) {
        this.onSelectionChange(this.getSelectedList());
      }
    }

    clearAll() {
      this.selectedIds.clear();
      this.onSelectionChange([]);
    }

    isSelected(id) {
      return this.selectedIds.has(id);
    }

    getSelectedList() {
      return Array.from(this.selectedIds)
        .map(id => this.getLensById(id))
        .filter(Boolean);
    }

    exportCsv() {
      const list = this.getSelectedList();
      if (list.length === 0) {
        alert('Select at least one lens to export comparison.');
        return;
      }
      (global.ClayLensExport || Export).exportComparisonCsv(list, this.getCurrentWeights());
    }

    render(container) {
      if (!container) return;
      const lenses = this.getSelectedList();
      const ui = global.ClayLensUI || UI;

      if (lenses.length === 0) {
        container.innerHTML = `
          <div class="compare-empty">
            <div class="empty-icon">⚖️</div>
            <p class="empty-title">No lenses selected for comparison</p>
            <p class="empty-subtitle">Check the compare box on up to 4 lenses in the catalog to view their published specifications and estimated ratings side by side.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="compare-header">
          <div class="compare-title-group">
            <h3 class="compare-heading">Side-by-Side Comparison</h3>
            <span class="compare-counter">${lenses.length} of ${this.maxSelections} lenses selected</span>
          </div>
          <div class="compare-actions">
            <button class="btn btn-secondary btn-sm" id="btnExportCompare" title="Download side-by-side comparison matrix as CSV">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
              Export Comparison (CSV)
            </button>
            <button class="btn btn-ghost btn-sm" id="btnClearCompare" title="Clear all selected lenses">
              Clear All
            </button>
          </div>
        </div>

        <div class="compare-table-wrapper">
          <table class="compare-matrix-table">
            <thead>
              <tr>
                <th class="matrix-metric-header">Specification / Heuristic</th>
                ${lenses.map(l => `
                  <th class="matrix-lens-header">
                    <div class="matrix-lens-header-content">
                      <div class="lens-badge-group">
                        <span class="color-swatch-circle" style="background: ${ui.getColorGradient(l.color)}" title="Illustrative tint: ${ui.esc(l.color)}"></span>
                        <strong class="matrix-lens-id">${ui.esc(l.id)}</strong>
                      </div>
                      <button class="btn-remove-compare" data-remove-id="${ui.esc(l.id)}" title="Remove ${ui.esc(l.id)} from comparison" aria-label="Remove ${ui.esc(l.id)}">✕</button>
                    </div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              <tr class="matrix-group-divider">
                <td colspan="${lenses.length + 1}">
                  <div class="group-divider-inner">
                    <span class="divider-icon">📋</span>
                    <span>Published Specifications (Official / Dealer Documentation)</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="metric-label">Visible Light Transmission (VLT)</td>
                ${lenses.map(l => `<td>${ui.renderVltBar(l.vlt)}</td>`).join('')}
              </tr>
              <tr>
                <td class="metric-label">Filtration Technology</td>
                ${lenses.map(l => `<td>${ui.renderTechBadge(l.tech, l.verificationStatus)}</td>`).join('')}
              </tr>
              <tr>
                <td class="metric-label">Color Profile</td>
                ${lenses.map(l => `
                  <td>
                    <div class="color-profile-cell">
                      <span class="color-swatch-sm" style="background: ${ui.getColorGradient(l.color)}"></span>
                      <span>${ui.esc(l.color)}</span>
                    </div>
                  </td>
                `).join('')}
              </tr>
              <tr>
                <td class="metric-label">Documented Environments</td>
                ${lenses.map(l => `<td><span class="env-tag-list">${ui.esc(l.env)}</span></td>`).join('')}
              </tr>
              <tr>
                <td class="metric-label">Documented Lighting</td>
                ${lenses.map(l => `<td>${ui.esc(l.light)}</td>`).join('')}
              </tr>
              <tr>
                <td class="metric-label">Source & Verification</td>
                ${lenses.map(l => `
                  <td>
                    ${ui.renderSourceBadge(l)}
                    <div class="audit-meta">Status: ${ui.esc(l.verificationStatus || 'verified')}</div>
                  </td>
                `).join('')}
              </tr>

              <tr class="matrix-group-divider divider-heuristic">
                <td colspan="${lenses.length + 1}">
                  <div class="group-divider-inner">
                    <span class="divider-icon">🧮</span>
                    <span>Estimated Screening Ratings (Calculated Heuristics — Not Certified)</span>
                  </div>
                </td>
              </tr>
              <tr class="row-highlight-composite">
                <td class="metric-label">
                  <strong>Personalized Composite Score</strong>
                  <div class="label-subtext">Weighted by active user preferences</div>
                </td>
                ${lenses.map(l => `<td>${ui.renderScoreBadge(l.composite, true)}</td>`).join('')}
              </tr>
              <tr>
                <td class="metric-label">☀ Direct Sunshine (1-5)</td>
                ${lenses.map(l => `<td>${ui.renderScoreBadge(l.sun)}</td>`).join('')}
              </tr>
              <tr>
                <td class="metric-label">☁ Overcast Skies (1-5)</td>
                ${lenses.map(l => `<td>${ui.renderScoreBadge(l.cloud)}</td>`).join('')}
              </tr>
              <tr>
                <td class="metric-label">
                  🌾 Dormant Brown Backgrounds (1-5)
                  <div class="label-subtext">Exploratory heuristic; unverified</div>
                </td>
                ${lenses.map(l => `<td>${ui.renderScoreBadge(l.brown)}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      `;

      container.querySelector('#btnExportCompare')?.addEventListener('click', () => this.exportCsv());
      container.querySelector('#btnClearCompare')?.addEventListener('click', () => this.clearAll());
      container.querySelectorAll('[data-remove-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-remove-id');
          this.removeLens(id);
        });
      });
    }
  }

  const moduleObj = {
    ComparisonManager
  };

  global.ClayLensComparison = moduleObj;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduleObj;
  }
})(typeof window !== 'undefined' ? window : this);
