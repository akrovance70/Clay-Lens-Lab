/**
 * Clay Lens Lab — CSV Export Engine
 * RFC-4180 Compliant Data Exporter
 */

(function(global) {
  function escapeCsvCell(value) {
    if (value === null || value === undefined) {
      return '""';
    }
    const str = String(value);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  function buildCsvContent(rows) {
    return '\uFEFF' + rows
      .map(row => row.map(escapeCsvCell).join(','))
      .join('\r\n');
  }

  function downloadCsv(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportFilteredLensesCsv(lenses, currentWeights) {
    const headers = [
      'Lens ID [Published]',
      'VLT (%) [Published]',
      'Technology [Published]',
      'Documented Environment [Published]',
      'Documented Lighting [Published]',
      'Color Profile [Published]',
      'Source Type [Attribution]',
      'Source URL [Attribution]',
      'Verification Status [Audit]',
      'Verified Date [Audit]',
      `Personalized Composite Score (Weights: Sun ${currentWeights.sun.toFixed(1)}%, Cloud ${currentWeights.cloud.toFixed(1)}%, Brown ${currentWeights.brown.toFixed(1)}%) [Heuristic]`,
      'Direct Sun Rating (1-5) [Estimated Heuristic]',
      'Overcast Rating (1-5) [Estimated Heuristic]',
      'Dormant Brown Rating (1-5) [Estimated Heuristic]'
    ];

    const rows = [headers];

    for (const lens of lenses) {
      rows.push([
        lens.id,
        lens.vlt,
        lens.tech,
        lens.env,
        lens.light,
        lens.color,
        lens.sourceType || 'dealer_filtration_guide',
        lens.sourceUrl || '',
        lens.verificationStatus || 'verified_dealer',
        lens.verifiedDate || '',
        lens.composite !== undefined ? lens.composite.toFixed(2) : '',
        lens.sun,
        lens.cloud,
        lens.brown
      ]);
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `clay-lens-lab-filtered-${timestamp}.csv`;
    downloadCsv(buildCsvContent(rows), filename);
  }

  function exportComparisonCsv(selectedLenses, currentWeights) {
    if (!selectedLenses || selectedLenses.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const rows = [];

    // Metadata preamble
    rows.push(['Clay Lens Lab — Side-by-Side Comparison Export']);
    rows.push(['Export Date', timestamp]);
    rows.push([
      'Personalization Weights Used',
      `Direct Sun: ${currentWeights.sun.toFixed(1)}% | Overcast: ${currentWeights.cloud.toFixed(1)}% | Dormant Brown: ${currentWeights.brown.toFixed(1)}%`
    ]);
    rows.push(['Disclaimer', 'Ratings are screening heuristics based on published specs, not manufacturer certified performance.']);
    rows.push([]);

    const matrixHeader = ['Comparison Metric', ...selectedLenses.map(l => l.id)];
    rows.push(matrixHeader);

    const attributes = [
      { label: 'Published VLT (%)', getter: l => `${l.vlt}%` },
      { label: 'Technology Family', getter: l => l.tech },
      { label: 'Published Color Profile', getter: l => l.color },
      { label: 'Documented Environments', getter: l => l.env },
      { label: 'Documented Lighting', getter: l => l.light },
      { label: 'Source Reference', getter: l => l.sourceType },
      { label: 'Verification Status', getter: l => l.verificationStatus },
      { label: 'Verified Date', getter: l => l.verifiedDate || 'Unverified' },
      { label: 'Personalized Composite Score (0-5)', getter: l => l.composite?.toFixed(2) ?? '—' },
      { label: '☀ Direct Sun Rating (1-5)', getter: l => `${l.sun} / 5` },
      { label: '☁ Overcast Skies Rating (1-5)', getter: l => `${l.cloud} / 5` },
      { label: '🌾 Dormant Brown Rating (1-5)', getter: l => `${l.brown} / 5` }
    ];

    for (const attr of attributes) {
      rows.push([attr.label, ...selectedLenses.map(attr.getter)]);
    }

    const filename = `clay-lens-lab-comparison-${timestamp}.csv`;
    downloadCsv(buildCsvContent(rows), filename);
  }

  const moduleObj = {
    escapeCsvCell,
    buildCsvContent,
    downloadCsv,
    exportFilteredLensesCsv,
    exportComparisonCsv
  };

  global.ClayLensExport = moduleObj;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduleObj;
  }
})(typeof window !== 'undefined' ? window : this);
