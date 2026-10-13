/**
 * Clay Lens Lab — UI Components & Rendering Helpers
 */

(function(global) {
  const COLOR_SWATCH_MAP = {
    'amber/brown': 'linear-gradient(135deg, #a66a38, #5a3818)',
    'amber/orange': 'linear-gradient(135deg, #e67e22, #a65818)',
    'brown/orange': 'linear-gradient(135deg, #8a5327, #d35400)',
    'purple': 'linear-gradient(135deg, #6c3483, #3a1c4a)',
    'red/purple': 'linear-gradient(135deg, #922b44, #5b1424)',
    'orange': 'linear-gradient(135deg, #e65100, #ff8f00)',
    'red': 'linear-gradient(135deg, #c0392b, #781e1e)',
    'red/pink/purple': 'linear-gradient(135deg, #c2185b, #4a148c)',
    'pink/purple': 'linear-gradient(135deg, #d81b60, #6a1b9a)',
    'red/pink': 'linear-gradient(135deg, #d81b60, #ad1457)',
    'red/orange': 'linear-gradient(135deg, #d84315, #f4511e)',
    'pink/red': 'linear-gradient(135deg, #e91e63, #c2185b)',
    'green': 'linear-gradient(135deg, #1b5e20, #2e7d32)',
    'orange/red': 'linear-gradient(135deg, #e64a19, #bf360c)',
    'yellow/orange': 'linear-gradient(135deg, #f57f17, #fbc02d)',
    'pink': 'linear-gradient(135deg, #ec407a, #d81b60)',
    'yellow': 'linear-gradient(135deg, #fbc02d, #f57f17)',
    'clear': 'linear-gradient(135deg, #e0e0e0, #ffffff)'
  };

  function getColorGradient(color) {
    const c = String(color || '').toLowerCase().trim();
    for (const [key, grad] of Object.entries(COLOR_SWATCH_MAP)) {
      if (c === key || c.includes(key)) {
        return grad;
      }
    }
    return 'linear-gradient(135deg, #546e7a, #37474f)';
  }

  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function renderScoreBadge(score, isComposite = false) {
    if (score === null || score === undefined || isNaN(score)) {
      return `<span class="score-badge score-none">—</span>`;
    }

    let tier = 'low';
    if (score >= 4.0) tier = 'high';
    else if (score >= 3.0) tier = 'mid';

    const formatted = isComposite ? score.toFixed(2) : `${score}/5`;
    const label = isComposite ? `Personalized Heuristic: ${formatted}` : `Estimated Rating: ${formatted}`;

    return `<span class="score-badge score-${tier}" title="${label}" aria-label="${label}">${formatted}</span>`;
  }

  function renderTechBadge(tech, verificationStatus) {
    const descriptions = {
      'ED': 'Enhanced Definition — High definition color profiling for crisp target edge separation',
      'HC': 'High Contrast — Accelerates target contrast against foliage and backgrounds',
      'MX': 'Max Orange — Maximizes target orange registration against backgrounds',
      'N': 'Neutralizer — Subdues green background foliage to make targets pop',
      'AR': 'Anti-reflective — Clear optical transmission for indoor/night shooting'
    };

    const isDisputed = verificationStatus === 'disputed_classification' || tech.includes('*');
    const tooltip = isDisputed 
      ? 'Conflicting distributor classification: CMOS is traditionally Chromashift Max Orange, but was indexed under High Contrast in dealer charts.'
      : (descriptions[tech] || `Technology formulation: ${tech}`);

    return `<span class="tech-badge ${isDisputed ? 'tech-disputed' : ''}" title="${esc(tooltip)}">
      ${esc(tech)}
      ${isDisputed ? '<span class="badge-flag" aria-label="Disputed classification">⚠️</span>' : ''}
    </span>`;
  }

  function renderVltBar(vlt) {
    const pct = Math.min(100, Math.max(0, vlt));
    return `
      <div class="vlt-cell">
        <div class="vlt-num"><b>${vlt}%</b></div>
        <div class="vlt-bar-track" title="VLT: ${vlt}% light transmission">
          <div class="vlt-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }

  function renderSourceBadge(lens) {
    const typeLabels = {
      'dealer_filtration_guide': 'Dealer Guide',
      'official_catalog': 'Official Catalog',
      'distributor_cross_reference': 'Distributor Index',
      'unverified': 'Unverified'
    };

    const label = typeLabels[lens.sourceType] || 'Published Reference';

    if (lens.sourceUrl) {
      return `
        <a href="${esc(lens.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="source-link" title="Open source reference in new tab (${label}, verified ${lens.verifiedDate || 'recent'})">
          <span>${esc(label)}</span>
          <svg class="icon-external" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
            <path d="M4 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0V3.707L4.854 9.854a.5.5 0 1 1-.708-.708L10.293 3H4.5a.5.5 0 0 1-.5-.5z"/>
            <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 1 1 0v3a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 12.5v-8z"/>
          </svg>
        </a>
      `;
    }

    return `<span class="source-tag">${esc(label)}</span>`;
  }

  const moduleObj = {
    COLOR_SWATCH_MAP,
    getColorGradient,
    esc,
    renderScoreBadge,
    renderTechBadge,
    renderVltBar,
    renderSourceBadge
  };

  global.ClayLensUI = moduleObj;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduleObj;
  }
})(typeof window !== 'undefined' ? window : this);
