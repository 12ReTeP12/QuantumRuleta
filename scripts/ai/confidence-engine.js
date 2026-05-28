/* Confidence engine — jediný rozhodovač o confidence (ČAKAJ / OPATRNE / HRAŤ) */
'use strict';

const CONFIDENCE_LEARN_MIN = typeof PRED_AI_MIN !== 'undefined' ? PRED_AI_MIN : 12;

function collectConfidenceSignals(overrides) {
  const o = overrides && typeof overrides === 'object' ? overrides : {};
  const spinCount = o.spinCount != null
    ? Number(o.spinCount)
    : (typeof spins !== 'undefined' ? spins.length : 0);

  let chaosLevel = 50;
  if (o.chaosLevel != null) chaosLevel = Number(o.chaosLevel);
  else if (spinCount >= 2 && typeof computeRiskChaosCore === 'function') {
    chaosLevel = Number(computeRiskChaosCore().chaosLevel) || 50;
  }

  let flowScore = 50;
  if (o.flowScore != null) flowScore = Number(o.flowScore);
  else if (spinCount > 0 && typeof runSpinsEnginePipeline === 'function') {
    const SE = runSpinsEnginePipeline();
    flowScore = SE && SE.ready
      ? (Number(SE.liveScore != null ? SE.liveScore : SE.aiConfidence) || 50)
      : 50;
  }

  let patternStrength = 50;
  if (o.patternStrength != null) patternStrength = Number(o.patternStrength);
  else patternStrength = collectPatternStrength();

  return {
    chaosLevel: clamp(chaosLevel, 0, 100),
    flowScore: clamp(flowScore, 0, 100),
    patternStrength: clamp(patternStrength, 0, 100),
    spinCount: Math.max(0, spinCount)
  };
}

function collectPatternStrength() {
  if (typeof spinMemoryEngine !== 'undefined'
    && spinMemoryEngine.activePatterns
    && spinMemoryEngine.activePatterns.length) {
    const top = spinMemoryEngine.activePatterns[0];
    return clamp(Math.round(Number(top.survival) || 0), 0, 100);
  }
  if (typeof runSpinsEnginePipeline === 'function') {
    const SE = runSpinsEnginePipeline();
    if (SE && SE.ready && SE.patterns && SE.patterns.active && SE.patterns.active.length) {
      return clamp(Math.round(Number(SE.patterns.active[0].survival) || 0), 0, 100);
    }
    if (SE && SE.ready) return clamp(Math.round(Number(SE.liveScore) || 50), 0, 100);
  }
  if (typeof spins !== 'undefined' && spins.length >= 2 && typeof computeRiskChaosCore === 'function') {
    return clamp(Number(computeRiskChaosCore().patternReliability) || 50, 0, 100);
  }
  return 50;
}

function computeNormalConfidence(flowScore, patternStrength, chaosPct) {
  return clamp(
    Math.round(flowScore * 0.45 + patternStrength * 0.4 + (100 - chaosPct) * 0.15),
    12,
    94
  );
}

function computeLowConfidence(flowScore, patternStrength, chaosPct) {
  return clamp(
    Math.round(flowScore * 0.28 + patternStrength * 0.28 + (100 - chaosPct) * 0.22) - 8,
    8,
    45
  );
}

/**
 * Jediný výstup confidence rozhodnutia.
 * @param {object} [overrides] — voliteľné chaosLevel, flowScore, patternStrength, spinCount
 * @returns {{
 *   confidence: number,
 *   status: string,
 *   playMode: string,
 *   playHead: string,
 *   playSub: string,
 *   playCls: string,
 *   allowPlay: boolean,
 *   learn: boolean,
 *   chaosPct: number,
 *   flowScore: number,
 *   patternStrength: number,
 *   spinCount: number,
 *   signals: object
 * }}
 */
function computeConfidenceEngine(overrides) {
  const signals = collectConfidenceSignals(overrides);
  const { chaosLevel, flowScore, patternStrength, spinCount } = signals;
  const chaosPct = Math.round(chaosLevel);

  const base = {
    chaosPct,
    flowScore,
    patternStrength,
    spinCount,
    signals
  };

  if (spinCount < CONFIDENCE_LEARN_MIN) {
    return Object.assign(base, {
      confidence: 0,
      status: 'ČAKAJ',
      playMode: 'LEARN',
      playHead: '🔴 ČAKAJ',
      playSub: 'AI sa učí flow session… ' + spinCount + '/' + CONFIDENCE_LEARN_MIN,
      playCls: 'bad',
      allowPlay: false,
      learn: true
    });
  }

  if (chaosPct >= 70) {
    return Object.assign(base, {
      confidence: 0,
      status: 'ČAKAJ',
      playMode: 'CAKAJ',
      playHead: '🔴 ČAKAJ',
      playSub: 'Chaos ' + chaosPct + '% — wheel nečitateľný',
      playCls: 'bad',
      allowPlay: false,
      learn: false
    });
  }

  if (chaosPct >= 50) {
    return Object.assign(base, {
      confidence: computeLowConfidence(flowScore, patternStrength, chaosPct),
      status: 'OPATRNE',
      playMode: 'OPATRNE',
      playHead: '🟡 OPATRNE',
      playSub: 'Chaos ' + chaosPct + '% — opatrný režim',
      playCls: 'warn',
      allowPlay: true,
      learn: false
    });
  }

  return Object.assign(base, {
    confidence: computeNormalConfidence(flowScore, patternStrength, chaosPct),
    status: 'HRAŤ',
    playMode: 'HRAT',
    playHead: '🟢 HRAŤ',
    playSub: 'Chaos ' + chaosPct + '% — čitateľný flow',
    playCls: 'ok',
    allowPlay: true,
    learn: false
  });
}
