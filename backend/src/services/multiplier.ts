import { BetType } from '@prisma/client';

/**
 * Team strength ratings (0-100 scale) for the FIFA World Cup 2026 (48 teams).
 *
 * Derived from the official FIFA/Coca-Cola Men's World Ranking points
 * published 11 June 2026 (source: inside.fifa.com/fifa-world-ranking/men),
 * the last official update before the tournament kicked off.
 *
 * Conversion method: linear min-max scaling of FIFA ranking points onto a
 * 60-95 strength range (60 = lowest-ranked qualifier, 95 = highest-ranked
 * qualifier). This is a simplification -- FIFA points themselves are not
 * linear in "true" team strength, but it's good enough for a prediction
 * game's difficulty/multiplier weighting.
 *
 * IMPORTANT: FIFA does NOT re-publish official rankings during the
 * tournament (next official update: 20 July 2026, after the World Cup
 * ends). "Live ranking" trackers exist but are unofficial projections.
 * This means these values will become stale as the tournament progresses
 * and teams get eliminated or in-form -- treat this as a pre-tournament
 * snapshot, not a live feed. If you want it to stay accurate, you'd need
 * to either (a) manually refresh from FIFA's official page after each
 * ranking update, or (b) layer in your own in-tournament form adjustment
 * (e.g. +/- a few points per team based on recent match results) on top
 * of this base value, rather than relying on FIFA to update it for you.
 *
 * Fallback for any team code not listed below: 70.
 */
const TEAM_STRENGTHS: Record<string, number> = {
  ARG: 95, ESP: 95, FRA: 95, ENG: 92, POR: 89, BRA: 89,
  MAR: 88, NED: 88, BEL: 87, GER: 87, CRO: 86, ITA: 85,
  COL: 85, MEX: 84, SEN: 84, URU: 83, USA: 83, JPN: 82,
  SUI: 82, IRN: 80, TUR: 79, ECU: 79, AUT: 79, KOR: 78,
  AUS: 78, ALG: 77, EGY: 77, CAN: 77, NOR: 76, CIV: 75,
  PAN: 75, SWE: 74, PAR: 73, SCO: 73, TUN: 72, COD: 72,
  UZB: 71, QAT: 70, IRQ: 70, ZAF: 69, KSA: 69, JOR: 67,
  BIH: 66, CPV: 66, GHA: 64, CUW: 61, HAI: 61, NZL: 60
};

const getStrength = (code?: string) => (code && TEAM_STRENGTHS[code]) ? TEAM_STRENGTHS[code] : 70;

const HOUSE_EDGE = 0.08;
const MIN_MULTIPLIER = 1.01;
const STANDARD_MARKET_CAP = 25;
const HARD_MARKET_CAP = 100;
const POISSON_MAX_GOALS = 10;

interface MultiplierContext {
  predictedData: Record<string, any>;
  team1Code?: string;
  team2Code?: string;
}

interface MatchOutcomeProbabilities {
  team1WinProb: number;
  drawProb: number;
  team2WinProb: number;
}

interface TeamExpectedGoals {
  team1ExpectedGoals: number;
  team2ExpectedGoals: number;
}

export const winProbability = (team1Strength: number, team2Strength: number, k = 15): number => {
  return 1 / (1 + Math.pow(10, (team2Strength - team1Strength) / k));
};

export const matchOutcomeProbabilities = (
  team1Strength: number,
  team2Strength: number,
  baseDrawRate = 0.26
): MatchOutcomeProbabilities => {
  const rawTeam1WinProb = winProbability(team1Strength, team2Strength);
  const strengthGap = Math.abs(team1Strength - team2Strength);
  const drawProb = baseDrawRate * Math.max(0, 1 - strengthGap / 40);
  const remaining = 1 - drawProb;

  return {
    team1WinProb: rawTeam1WinProb * remaining,
    drawProb,
    team2WinProb: (1 - rawTeam1WinProb) * remaining,
  };
};

export const expectedTotalGoals = (team1Strength: number, team2Strength: number): number => {
  const avgStrength = (team1Strength + team2Strength) / 2;
  return 2.0 + (avgStrength - 70) / 100;
};

const factorial = (n: number): number => {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
};

export const poissonProbability = (lambda: number, goals: number): number => {
  if (goals < 0 || !Number.isInteger(goals)) return 0;
  return (Math.pow(lambda, goals) * Math.exp(-lambda)) / factorial(goals);
};

const teamExpectedGoals = (team1Strength: number, team2Strength: number): TeamExpectedGoals => {
  const total = expectedTotalGoals(team1Strength, team2Strength);
  const strengthSum = team1Strength + team2Strength;

  return {
    team1ExpectedGoals: total * (team1Strength / strengthSum),
    team2ExpectedGoals: total * (team2Strength / strengthSum),
  };
};

export const probabilityToMultiplier = (
  probability: number,
  cap = STANDARD_MARKET_CAP,
  houseEdge = HOUSE_EDGE
): number => {
  if (probability <= 0) return cap;
  const multiplier = (1 / probability) * (1 - houseEdge);
  const rounded = Math.round(multiplier * 100) / 100;
  return Math.max(MIN_MULTIPLIER, Math.min(cap, rounded));
};

const overUnderProbability = (expectedGoals: number, line: number, side: 'OVER' | 'UNDER'): number => {
  let underProbability = 0;
  for (let goals = 0; goals <= Math.floor(line); goals += 1) {
    underProbability += poissonProbability(expectedGoals, goals);
  }

  return side === 'UNDER' ? underProbability : 1 - underProbability;
};

const bttsYesProbability = (team1ExpectedGoals: number, team2ExpectedGoals: number): number => {
  const team1ScoresProb = 1 - poissonProbability(team1ExpectedGoals, 0);
  const team2ScoresProb = 1 - poissonProbability(team2ExpectedGoals, 0);
  return team1ScoresProb * team2ScoresProb;
};

const correctMarginProbability = (
  team1ExpectedGoals: number,
  team2ExpectedGoals: number,
  marginSide: 'HOME' | 'AWAY' | 'DRAW',
  margin: number
): number => {
  let probability = 0;

  for (let team1Goals = 0; team1Goals <= POISSON_MAX_GOALS; team1Goals += 1) {
    for (let team2Goals = 0; team2Goals <= POISSON_MAX_GOALS; team2Goals += 1) {
      const diff = team1Goals - team2Goals;
      const matches =
        marginSide === 'HOME' ? diff === margin :
          marginSide === 'AWAY' ? diff === -margin :
            diff === 0;

      if (matches) {
        probability += poissonProbability(team1ExpectedGoals, team1Goals) *
          poissonProbability(team2ExpectedGoals, team2Goals);
      }
    }
  }

  return probability;
};

const exactScoreProbability = (
  team1ExpectedGoals: number,
  team2ExpectedGoals: number,
  team1Goals: number,
  team2Goals: number
): number => {
  return poissonProbability(team1ExpectedGoals, team1Goals) *
    poissonProbability(team2ExpectedGoals, team2Goals);
};

const firstToScoreProbabilities = (team1ExpectedGoals: number, team2ExpectedGoals: number) => {
  const noGoalsProb = poissonProbability(team1ExpectedGoals, 0) *
    poissonProbability(team2ExpectedGoals, 0);
  const remaining = 1 - noGoalsProb;
  const team1Share = team1ExpectedGoals / (team1ExpectedGoals + team2ExpectedGoals);

  return {
    team1FirstProb: team1Share * remaining,
    team2FirstProb: (1 - team1Share) * remaining,
    noGoalsProb,
  };
};

/**
 * Returns the multiplier for a given bet type and predicted data.
 * The multiplier is a Float >= 1.0.
 */
export const getMultiplier = (betType: BetType, context: MultiplierContext): number => {
  const { predictedData, team1Code, team2Code } = context;

  const team1Strength = getStrength(team1Code);
  const team2Strength = getStrength(team2Code);
  const { team1WinProb, team2WinProb, drawProb } = matchOutcomeProbabilities(team1Strength, team2Strength);
  const { team1ExpectedGoals, team2ExpectedGoals } = teamExpectedGoals(team1Strength, team2Strength);

  switch (betType) {
    case BetType.MATCH_WINNER: {
      if (predictedData.outcome === 'HOME') return probabilityToMultiplier(team1WinProb);
      if (predictedData.outcome === 'AWAY') return probabilityToMultiplier(team2WinProb);
      return probabilityToMultiplier(drawProb);
    }

    case BetType.DOUBLE_CHANCE: {
      const o = predictedData.outcomes as string[];
      let p = 0;
      if (o.includes('HOME')) p += team1WinProb;
      if (o.includes('AWAY')) p += team2WinProb;
      if (o.includes('DRAW')) p += drawProb;
      return probabilityToMultiplier(p);
    }

    case BetType.OVER_UNDER_GOALS: {
      const probability = overUnderProbability(
        expectedTotalGoals(team1Strength, team2Strength),
        predictedData.line as number,
        predictedData.side as 'OVER' | 'UNDER'
      );
      return probabilityToMultiplier(probability);
    }

    case BetType.BOTH_TEAMS_TO_SCORE: {
      const yesProbability = bttsYesProbability(team1ExpectedGoals, team2ExpectedGoals);
      return probabilityToMultiplier(predictedData.answer === true ? yesProbability : 1 - yesProbability);
    }

    case BetType.CORRECT_MARGIN: {
      const probability = correctMarginProbability(
        team1ExpectedGoals,
        team2ExpectedGoals,
        predictedData.marginSide as 'HOME' | 'AWAY' | 'DRAW',
        predictedData.margin as number
      );
      return probabilityToMultiplier(probability, HARD_MARKET_CAP);
    }

    case BetType.FIRST_TO_SCORE: {
      const { team1FirstProb, team2FirstProb, noGoalsProb } = firstToScoreProbabilities(
        team1ExpectedGoals,
        team2ExpectedGoals
      );
      if (predictedData.team === 'NONE') return probabilityToMultiplier(noGoalsProb);
      if (predictedData.team === 'HOME') return probabilityToMultiplier(team1FirstProb);
      return probabilityToMultiplier(team2FirstProb);
    }

    case BetType.EXACT_SCORE: {
      const probability = exactScoreProbability(
        team1ExpectedGoals,
        team2ExpectedGoals,
        predictedData.homeScore as number,
        predictedData.awayScore as number
      );
      return probabilityToMultiplier(probability, HARD_MARKET_CAP);
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
