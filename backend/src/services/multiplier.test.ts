import { BetType } from '@prisma/client';
import { describe, expect, it } from '@jest/globals';
import {
  getMultiplier,
  matchOutcomeProbabilities,
  probabilityToMultiplier,
} from './multiplier';

describe('neutral multiplier engine', () => {
  it('keeps equal-strength teams balanced without home advantage', () => {
    const probs = matchOutcomeProbabilities(95, 95);

    expect(probs.team1WinProb).toBeCloseTo(probs.team2WinProb, 6);
    expect(probs.drawProb).toBeCloseTo(0.26, 6);
  });

  it('makes strong favorites cheaper than underdogs', () => {
    const favorite = getMultiplier(BetType.MATCH_WINNER, {
      team1Code: 'ARG',
      team2Code: 'IRN',
      predictedData: { outcome: 'HOME' },
    });
    const underdog = getMultiplier(BetType.MATCH_WINNER, {
      team1Code: 'ARG',
      team2Code: 'IRN',
      predictedData: { outcome: 'AWAY' },
    });

    expect(favorite).toBeLessThan(underdog);
  });

  it('shrinks draw probability as the strength gap grows', () => {
    const even = matchOutcomeProbabilities(95, 95);
    const uneven = matchOutcomeProbabilities(95, 60);

    expect(uneven.drawProb).toBeLessThan(even.drawProb);
  });

  it('prices double chance lower than the single away underdog outcome it covers', () => {
    const awayWin = getMultiplier(BetType.MATCH_WINNER, {
      team1Code: 'ARG',
      team2Code: 'IRN',
      predictedData: { outcome: 'AWAY' },
    });
    const awayOrDraw = getMultiplier(BetType.DOUBLE_CHANCE, {
      team1Code: 'ARG',
      team2Code: 'IRN',
      predictedData: { outcomes: ['DRAW', 'AWAY'] },
    });

    expect(awayOrDraw).toBeLessThan(awayWin);
  });

  it('gives rarer exact scores and margins higher multipliers', () => {
    const commonScore = getMultiplier(BetType.EXACT_SCORE, {
      team1Code: 'ARG',
      team2Code: 'FRA',
      predictedData: { homeScore: 1, awayScore: 1 },
    });
    const rareScore = getMultiplier(BetType.EXACT_SCORE, {
      team1Code: 'ARG',
      team2Code: 'FRA',
      predictedData: { homeScore: 5, awayScore: 4 },
    });
    const oneGoalMargin = getMultiplier(BetType.CORRECT_MARGIN, {
      team1Code: 'ARG',
      team2Code: 'FRA',
      predictedData: { marginSide: 'HOME', margin: 1 },
    });
    const fourGoalMargin = getMultiplier(BetType.CORRECT_MARGIN, {
      team1Code: 'ARG',
      team2Code: 'FRA',
      predictedData: { marginSide: 'HOME', margin: 4 },
    });

    expect(rareScore).toBeGreaterThan(commonScore);
    expect(fourGoalMargin).toBeGreaterThan(oneGoalMargin);
  });

  it('returns finite standard-market multipliers for goal markets', () => {
    const over = getMultiplier(BetType.OVER_UNDER_GOALS, {
      team1Code: 'ENG',
      team2Code: 'USA',
      predictedData: { line: 2.5, side: 'OVER' },
    });
    const btts = getMultiplier(BetType.BOTH_TEAMS_TO_SCORE, {
      team1Code: 'ENG',
      team2Code: 'USA',
      predictedData: { answer: true },
    });
    const first = getMultiplier(BetType.FIRST_TO_SCORE, {
      team1Code: 'ENG',
      team2Code: 'USA',
      predictedData: { team: 'HOME' },
    });

    expect(over).toBeGreaterThanOrEqual(1.01);
    expect(over).toBeLessThanOrEqual(25);
    expect(btts).toBeGreaterThanOrEqual(1.01);
    expect(btts).toBeLessThanOrEqual(25);
    expect(first).toBeGreaterThanOrEqual(1.01);
    expect(first).toBeLessThanOrEqual(25);
  });

  it('rounds and caps multipliers', () => {
    expect(probabilityToMultiplier(0.999)).toBe(1.01);
    expect(probabilityToMultiplier(0.0001, 100)).toBe(100);
    expect(probabilityToMultiplier(0.3333)).toBe(2.76);
  });
});
