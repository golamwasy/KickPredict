import prisma from '../prisma';
import { calculatePointsForMatch } from './scoring';

const ESPN_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=100';

let isSyncing = false;

export const syncESPNData = async () => {
  if (isSyncing) {
    console.log('[Sync] ESPN sync already in progress, skipping.');
    return;
  }
  isSyncing = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  try {
    const response = await fetch(ESPN_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`ESPN API returned ${response.status}`);
    const data = await response.json();

    const events = data.events || [];

    // Pre-fetch all teams and matches to run memory caching & skip redundant writes
    const allTeams = await prisma.team.findMany();
    const allMatches = await prisma.match.findMany({
      where: { apiFixtureId: { not: null } }
    });

    const teamCache = new Map(allTeams.map(t => [t.code, t]));
    const matchCache = new Map(allMatches.map(m => [m.apiFixtureId as number, m]));

    for (const event of events) {
      const apiFixtureId = parseInt(event.id);
      const date = new Date(event.date);
      const statusType = event.status.type.name; // e.g., STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FULL_TIME

      // If the match is already finished in the DB, we can skip processing it completely
      const existingMatch = matchCache.get(apiFixtureId);
      if (existingMatch && existingMatch.status === 'FINISHED') {
        // Self-healing: Check if there are active predictions that still do not have points
        const hasUncalculatedPoints = await prisma.prediction.findFirst({
          where: {
            matchId: existingMatch.id,
            skipped: false,
            points: null,
          },
        });

        if (hasUncalculatedPoints) {
          console.log(`[Sync] Self-healing: Match ${existingMatch.id} is FINISHED but has predictions without points. Retrying scoring...`);
          try {
            await calculatePointsForMatch(existingMatch.id);
          } catch (scoringError) {
            console.error(`[Sync Error] Self-healing points recalculation failed for match ${existingMatch.id}:`, scoringError);
          }
        }
        continue;
      }

      let matchStatus: 'UPCOMING' | 'OPEN' | 'LOCKED' | 'LIVE' | 'FINISHED' = 'UPCOMING';
      
      if (statusType === 'STATUS_FULL_TIME') {
        matchStatus = 'FINISHED';
      } else if (statusType === 'STATUS_IN_PROGRESS' || statusType === 'STATUS_HALFTIME') {
        matchStatus = 'LIVE';
      } else {
        // If scheduled, check time to see if it should be OPEN or LOCKED
        const now = new Date();
        const msUntilKickoff = date.getTime() - now.getTime();
        if (msUntilKickoff <= 0) {
          matchStatus = 'LOCKED';
        } else if (msUntilKickoff <= 24 * 60 * 60 * 1000) {
          matchStatus = 'OPEN';
        }
      }

      // Extract Competitors
      const homeCompetitor = event.competitions[0].competitors.find((c: any) => c.homeAway === 'home');
      const awayCompetitor = event.competitions[0].competitors.find((c: any) => c.homeAway === 'away');

      if (!homeCompetitor || !awayCompetitor) continue;

      const team1Goals = matchStatus !== 'UPCOMING' && matchStatus !== 'OPEN' ? parseInt(homeCompetitor.score) : null;
      const team2Goals = matchStatus !== 'UPCOMING' && matchStatus !== 'OPEN' ? parseInt(awayCompetitor.score) : null;

      // Upsert Teams ONLY if they do not exist in the cache
      let team1 = teamCache.get(homeCompetitor.team.abbreviation);
      if (!team1) {
        team1 = await prisma.team.create({
          data: {
            name: homeCompetitor.team.displayName,
            code: homeCompetitor.team.abbreviation,
            flagUrl: homeCompetitor.team.logo,
          }
        });
        teamCache.set(team1.code, team1);
      }

      let team2 = teamCache.get(awayCompetitor.team.abbreviation);
      if (!team2) {
        team2 = await prisma.team.create({
          data: {
            name: awayCompetitor.team.displayName,
            code: awayCompetitor.team.abbreviation,
            flagUrl: awayCompetitor.team.logo,
          }
        });
        teamCache.set(team2.code, team2);
      }

      // Diff Check: Only update the database if the status, score, or kickoff time has changed
      const hasChanged =
        !existingMatch ||
        existingMatch.status !== matchStatus ||
        existingMatch.team1Goals !== team1Goals ||
        existingMatch.team2Goals !== team2Goals ||
        existingMatch.kickoffTime.getTime() !== date.getTime();

      if (hasChanged) {
        const updatedMatch = await prisma.match.upsert({
          where: { apiFixtureId },
          update: {
            kickoffTime: date,
            status: matchStatus,
            team1Goals,
            team2Goals,
          },
          create: {
            apiFixtureId,
            team1Id: team1.id,
            team2Id: team2.id,
            kickoffTime: date,
            status: matchStatus,
            team1Goals,
            team2Goals,
          }
        });

        // If match just finished, trigger scoring calculation
        if (matchStatus === 'FINISHED' && existingMatch?.status !== 'FINISHED') {
          try {
            await calculatePointsForMatch(updatedMatch.id);
          } catch (scoringError) {
            console.error(`[Sync Error] Points calculation failed for match ${updatedMatch.id}:`, scoringError);
            // We intentionally do not throw the error here, allowing the match to remain FINISHED in the DB.
            // The self-healing logic above will automatically retry point calculation on the next sync tick.
          }
        }
      }
    }

    await prisma.apiSyncLog.create({
      data: { endpoint: ESPN_API_URL, status: 'SUCCESS', message: `Synced ${events.length} events` }
    });

    console.log(`[Sync] Successfully synced ${events.length} matches from ESPN.`);

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[Sync Error] Failed to sync ESPN data:', error);
    await prisma.apiSyncLog.create({
      data: { endpoint: ESPN_API_URL, status: 'ERROR', message: error.message }
    });
  } finally {
    isSyncing = false;
  }
};
