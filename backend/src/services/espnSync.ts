import prisma from '../prisma';
import { calculatePointsForMatch } from './scoring';

const ESPN_API_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=100';

export const syncESPNData = async () => {
  try {
    const response = await fetch(ESPN_API_URL);
    if (!response.ok) throw new Error(`ESPN API returned ${response.status}`);
    const data = await response.json();

    const events = data.events || [];

    for (const event of events) {
      const apiFixtureId = parseInt(event.id);
      const date = new Date(event.date);
      const statusType = event.status.type.name; // e.g., STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FULL_TIME

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

      // Upsert Teams
      const team1 = await prisma.team.upsert({
        where: { code: homeCompetitor.team.abbreviation },
        update: { flagUrl: homeCompetitor.team.logo, name: homeCompetitor.team.displayName },
        create: {
          name: homeCompetitor.team.displayName,
          code: homeCompetitor.team.abbreviation,
          flagUrl: homeCompetitor.team.logo,
        }
      });

      const team2 = await prisma.team.upsert({
        where: { code: awayCompetitor.team.abbreviation },
        update: { flagUrl: awayCompetitor.team.logo, name: awayCompetitor.team.displayName },
        create: {
          name: awayCompetitor.team.displayName,
          code: awayCompetitor.team.abbreviation,
          flagUrl: awayCompetitor.team.logo,
        }
      });

      // Upsert Match
      const existingMatch = await prisma.match.findUnique({ where: { apiFixtureId } });

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
        await calculatePointsForMatch(updatedMatch.id);
      }
    }

    await prisma.apiSyncLog.create({
      data: { endpoint: ESPN_API_URL, status: 'SUCCESS', message: `Synced ${events.length} events` }
    });

    console.log(`[Sync] Successfully synced ${events.length} matches from ESPN.`);

  } catch (error: any) {
    console.error('[Sync Error] Failed to sync ESPN data:', error);
    await prisma.apiSyncLog.create({
      data: { endpoint: ESPN_API_URL, status: 'ERROR', message: error.message }
    });
  }
};
