import { BetType } from '@prisma/client';

/**
 * Fixed multiplier table (Approach A).
 *
 * Multipliers are locked at bet-placement time and never changed retroactively.
 * Values are intentionally conservative to keep the game balanced across a season.
 *
 * predictedData shapes:
 *   MATCH_WINNER:        { outcome: "HOME"|"DRAW"|"AWAY" }
 *   EXACT_SCORE:         { homeScore: number, awayScore: number }
 *   OVER_UNDER_GOALS:    { line: 2.5, side: "OVER"|"UNDER" }
 *   BOTH_TEAMS_TO_SCORE: { answer: boolean }
 *   CORRECT_MARGIN:      { marginSide: "HOME"|"AWAY"|"DRAW", margin: number }
 *   FIRST_TO_SCORE:      { team: "HOME"|"AWAY"|"NONE" }
 *   DOUBLE_CHANCE:       { outcomes: ["HOME","DRAW"] | ["HOME","AWAY"] | ["DRAW","AWAY"] }
 */

/**
 * Simulated team strengths (1-100) based on approximate historical/expected performance.
 * This is used to calculate dynamic odds since we don't have a live bookmaker API.
 */
const TEAM_STRENGTHS: Record<string, number> = {
  ARG: 95, FRA: 94, BRA: 93, ENG: 92, ESP: 90,
  POR: 88, GER: 88, NED: 87, ITA: 87, BEL: 85,
  URU: 84, CRO: 83, COL: 82, MAR: 81, SUI: 80,
  USA: 78, SEN: 78, MEX: 76, JPN: 76, IRN: 75,
  KOR: 74, AUS: 73, ECU: 72, CAN: 70, KSA: 68,
  // Fallback for others is 70
};

const getStrength = (code?: string) => (code && TEAM_STRENGTHS[code]) ? TEAM_STRENGTHS[code] : 70;

interface MultiplierContext {
  predictedData: Record<string, any>;
  team1Code?: string;
  team2Code?: string;
}

/**
 * Helper to calculate win probabilities using a simple strength difference formula.
 */
const calculateProbabilities = (s1: number, s2: number) => {
  // A strength difference of 10 points is roughly a 20% shift in win probability
  const diff = s1 - s2;
  const p1Base = 0.40 + (diff * 0.02); // 40% base win chance for team 1
  const p2Base = 0.40 - (diff * 0.02); // 40% base win chance for team 2
  
  // Cap probabilities between 5% and 85%
  let p1 = Math.max(0.05, Math.min(0.85, p1Base));
  let p2 = Math.max(0.05, Math.min(0.85, p2Base));
  
  // The rest is the draw probability
  let pDraw = 1.0 - p1 - p2;
  if (pDraw < 0.10) {
    // If draw is too low, steal from the favorite
    const steal = 0.10 - pDraw;
    if (p1 > p2) p1 -= steal; else p2 -= steal;
    pDraw = 0.10;
  }
  
  return { p1, p2, pDraw };
};

/**
 * Calculate odds from probability with a house edge (vig).
 * e.g., a 50% probability (0.50) without vig is 2.0x.
 * With a ~10% vig, we multiply the prob by 1.10.
 * 0.50 * 1.10 = 0.55. 1 / 0.55 = 1.81x.
 */
const toOdds = (prob: number) => {
  const vig = 1.05; // 5% house edge for better user payouts
  const odds = 1 / (prob * vig);
  // Cap min at 1.1 and max at 25.0
  return Math.max(1.1, Math.min(25.0, Math.round(odds * 100) / 100));
};

/**
 * Returns the multiplier for a given bet type and predicted data.
 * The multiplier is a Float >= 1.0.
 */
export const getMultiplier = (betType: BetType, context: MultiplierContext): number => {
  const { predictedData, team1Code, team2Code } = context;

  const s1 = getStrength(team1Code);
  const s2 = getStrength(team2Code);
  const { p1, p2, pDraw } = calculateProbabilities(s1, s2);

  switch (betType) {
    case BetType.MATCH_WINNER: {
      if (predictedData.outcome === 'HOME') return toOdds(p1);
      if (predictedData.outcome === 'AWAY') return toOdds(p2);
      return toOdds(pDraw);
    }

    case BetType.DOUBLE_CHANCE: {
      const o = predictedData.outcomes as string[];
      let p = 0;
      if (o.includes('HOME')) p += p1;
      if (o.includes('AWAY')) p += p2;
      if (o.includes('DRAW')) p += pDraw;
      return toOdds(Math.min(0.95, p));
    }

    case BetType.OVER_UNDER_GOALS: {
      // Very simple: higher strength teams = slightly more goals? 
      // Let's just keep this relatively static but varied by combined strength
      const totalStrength = s1 + s2;
      // High strength teams might play tighter or score more. Let's say high strength = slight over.
      const pOver = 0.45 + ((totalStrength - 140) * 0.002);
      const cappedPOver = Math.max(0.2, Math.min(0.8, pOver));
      if (predictedData.side === 'OVER') return toOdds(cappedPOver);
      return toOdds(1 - cappedPOver);
    }

    case BetType.BOTH_TEAMS_TO_SCORE: {
      // If teams are evenly matched, BTTS is higher.
      const diff = Math.abs(s1 - s2);
      const pBtts = 0.55 - (diff * 0.005);
      const cappedPBtts = Math.max(0.2, Math.min(0.8, pBtts));
      if (predictedData.answer === true) return toOdds(cappedPBtts);
      return toOdds(1 - cappedPBtts);
    }

    case BetType.CORRECT_MARGIN: {
      const margin = predictedData.margin as number;
      if (predictedData.marginSide === 'DRAW') return toOdds(pDraw);
      
      const isFav = (predictedData.marginSide === 'HOME' && p1 > p2) || (predictedData.marginSide === 'AWAY' && p2 > p1);
      const baseProb = predictedData.marginSide === 'HOME' ? p1 : p2;
      
      // Probability decays based on the margin and whether they are the favorite
      let pMargin = baseProb * (isFav ? 0.4 : 0.25);
      if (margin === 1) pMargin *= 1.0;
      else if (margin === 2) pMargin *= 0.5;
      else if (margin === 3) pMargin *= 0.2;
      else pMargin *= 0.05; // 4+
      
      return toOdds(pMargin);
    }

    case BetType.FIRST_TO_SCORE: {
      if (predictedData.team === 'NONE') return toOdds(0.08); // 8% chance of 0-0
      // Redistribute the 92% chance based on win probability ratio
      const ratio = p1 / (p1 + p2);
      if (predictedData.team === 'HOME') return toOdds(0.92 * ratio);
      return toOdds(0.92 * (1 - ratio)); // AWAY
    }

    case BetType.EXACT_SCORE: {
      // Basic Poisson-like approximation based on win probabilities
      const h = predictedData.homeScore as number;
      const a = predictedData.awayScore as number;
      
      // Expected goals
      const xG1 = 1.2 + ((p1 - 0.4) * 2);
      const xG2 = 1.2 + ((p2 - 0.4) * 2);
      
      // Extremely simplified poisson for max 3 goals
      const poisson = (lambda: number, k: number) => {
        const cappedK = Math.min(k, 5); // Don't crash math on 10 goals
        return (Math.pow(lambda, cappedK) * Math.exp(-lambda)) / [1, 1, 2, 6, 24, 120][cappedK];
      };
      
      let prob = poisson(xG1, h) * poisson(xG2, a);
      // Reduce probability of crazy scores
      if (h + a > 4) prob *= 0.5;
      if (h + a > 6) prob *= 0.1;
      
      return toOdds(prob);
    }

    default:
      return 1.5;
  }
};

/**
 * All valid outcomes per bet type, for validation.
 */
export const validatePredictedData = (
  betType: BetType,
  predictedData: Record<string, any>
): string | null => {
  switch (betType) {
    case BetType.MATCH_WINNER:
      if (!['HOME', 'DRAW', 'AWAY'].includes(predictedData.outcome))
        return 'outcome must be HOME, DRAW, or AWAY';
      break;

    case BetType.DOUBLE_CHANCE: {
      const valid = [
        JSON.stringify(['HOME', 'DRAW']),
        JSON.stringify(['HOME', 'AWAY']),
        JSON.stringify(['DRAW', 'AWAY']),
      ];
      if (!Array.isArray(predictedData.outcomes) || !valid.includes(JSON.stringify(predictedData.outcomes)))
        return 'outcomes must be one of: ["HOME","DRAW"], ["HOME","AWAY"], ["DRAW","AWAY"]';
      break;
    }

    case BetType.OVER_UNDER_GOALS:
      if (typeof predictedData.line !== 'number' || predictedData.line <= 0)
        return 'line must be a positive number (e.g. 2.5)';
      if (!['OVER', 'UNDER'].includes(predictedData.side))
        return 'side must be OVER or UNDER';
      break;

    case BetType.BOTH_TEAMS_TO_SCORE:
      if (typeof predictedData.answer !== 'boolean')
        return 'answer must be true or false';
      break;

    case BetType.CORRECT_MARGIN:
      if (!['HOME', 'AWAY', 'DRAW'].includes(predictedData.marginSide))
        return 'marginSide must be HOME, AWAY, or DRAW';
      if (typeof predictedData.margin !== 'number' || predictedData.margin < 0)
        return 'margin must be a non-negative integer';
      if (predictedData.marginSide === 'DRAW' && predictedData.margin !== 0)
        return 'margin must be 0 for a DRAW';
      break;

    case BetType.FIRST_TO_SCORE:
      if (!['HOME', 'AWAY', 'NONE'].includes(predictedData.team))
        return 'team must be HOME, AWAY, or NONE';
      break;

    case BetType.EXACT_SCORE:
      if (typeof predictedData.homeScore !== 'number' || predictedData.homeScore < 0)
        return 'homeScore must be a non-negative integer';
      if (typeof predictedData.awayScore !== 'number' || predictedData.awayScore < 0)
        return 'awayScore must be a non-negative integer';
      break;

    default:
      return 'Unknown bet type';
  }
  return null; // valid
};
