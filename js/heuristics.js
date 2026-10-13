/**
 * Clay Lens Lab — Heuristics & Scoring Engine
 * Version: 1.1.0-heuristic
 * 
 * IMPORTANT DISCLAIMER:
 * Suitability ratings are calculated mathematical screening heuristics based on
 * manufacturer/dealer published VLT percentages, lighting descriptors, and
 * environmental keywords. They are NOT manufacturer-certified optical performance
 * ratings, nor are they spectrophotometric laboratory measurements.
 * Suitability is not determined by eye color alone.
 */

(function(global) {
  const HEURISTICS_VERSION = '1.1.0-heuristic';

  const DEFAULT_WEIGHTS = Object.freeze({
    sun: 33.33,
    cloud: 33.33,
    brown: 33.34
  });

  const WEIGHT_PRESETS = Object.freeze({
    balanced: {
      id: 'balanced',
      name: 'Balanced (Equal)',
      description: 'Equal weighting across bright sun, overcast, and dormant background conditions.',
      weights: { sun: 33.33, cloud: 33.33, brown: 33.34 }
    },
    sun: {
      id: 'sun',
      name: 'Bright Sun Specialist',
      description: 'Heavy emphasis on direct sunlight filtration and glare reduction.',
      weights: { sun: 70, cloud: 15, brown: 15 }
    },
    cloud: {
      id: 'cloud',
      name: 'Overcast / Low Light',
      description: 'Prioritizes high light transmission and flat/dim light target definition.',
      weights: { sun: 15, cloud: 70, brown: 15 }
    },
    brown: {
      id: 'brown',
      name: 'Dormant Brown Terrain',
      description: 'Targets contrast against dry brush, dead fields, and winter vegetation (least validated heuristic).',
      weights: { sun: 15, cloud: 15, brown: 70 }
    }
  });

  function calculateSunRating(vlt) {
    const v = Number(vlt);
    if (isNaN(v)) return 1;
    if (v <= 25) return 5;
    if (v <= 40) return 4;
    if (v <= 55) return 3;
    if (v <= 70) return 2;
    return 1;
  }

  function calculateCloudRating(vlt, light) {
    const v = Number(vlt);
    const l = String(light || '').toLowerCase();
    
    if (l.includes('flat') || l.includes('low')) {
      return v >= 50 ? 5 : 3;
    }
    if (v <= 20) return 1;
    if (v <= 35) return 2;
    if (v <= 50) return 3;
    if (v <= 70) return 4;
    return 5;
  }

  function calculateBrownRating(env, color) {
    const e = String(env || '').toLowerCase();
    const c = String(color || '').toLowerCase();
    
    if (e.includes('open field') || e.includes('desert')) {
      return /orange|amber|red|brown/.test(c) ? 5 : 4;
    }
    return 2;
  }

  function normalizeWeights(weights) {
    const rawSun = Math.max(0, Number(weights?.sun) || 0);
    const rawCloud = Math.max(0, Number(weights?.cloud) || 0);
    const rawBrown = Math.max(0, Number(weights?.brown) || 0);
    const total = rawSun + rawCloud + rawBrown;
    
    if (total <= 0) {
      return { sun: 0, cloud: 0, brown: 0, total: 0 };
    }
    
    return {
      sun: (rawSun / total) * 100,
      cloud: (rawCloud / total) * 100,
      brown: (rawBrown / total) * 100,
      total
    };
  }

  function calculateCompositeScore(sunScore, cloudScore, brownScore, weights) {
    const wSun = Math.max(0, Number(weights?.sun) || 0);
    const wCloud = Math.max(0, Number(weights?.cloud) || 0);
    const wBrown = Math.max(0, Number(weights?.brown) || 0);
    const totalWeight = wSun + wCloud + wBrown;
    
    if (totalWeight <= 0) {
      return 0.0;
    }
    
    const weightedSum = (wSun * sunScore) + (wCloud * cloudScore) + (wBrown * brownScore);
    const composite = weightedSum / totalWeight;
    return Math.round(composite * 100) / 100;
  }

  function enrichLens(lens, weights = DEFAULT_WEIGHTS) {
    const sun = calculateSunRating(lens.vlt);
    const cloud = calculateCloudRating(lens.vlt, lens.light);
    const brown = calculateBrownRating(lens.env, lens.color);
    const composite = calculateCompositeScore(sun, cloud, brown, weights);
    
    return {
      ...lens,
      sun,
      cloud,
      brown,
      composite
    };
  }

  const moduleObj = {
    HEURISTICS_VERSION,
    DEFAULT_WEIGHTS,
    WEIGHT_PRESETS,
    calculateSunRating,
    calculateCloudRating,
    calculateBrownRating,
    normalizeWeights,
    calculateCompositeScore,
    enrichLens
  };

  global.ClayLensHeuristics = moduleObj;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = moduleObj;
  }
})(typeof window !== 'undefined' ? window : this);
