import prisma from '../prisma';
import { MatchStatus } from '@prisma/client';
import { settleBetsForMatch, settleLiveBetsForMatch } from './settlement';

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
      const statusType = event.status?.type?.name || 'STATUS_SCHEDULED'; // Robust fallback if ESPN omits status

      // If the match is already finished in the DB, we can skip processing it completely
      const existingMatch = matchCache.get(apiFixtureId);
      if (existingMatch && existingMatch.status === 'FINISHED') {
        // Self-healing: Check if there are unsettled bets for this finished match
        const hasUnsettledBets = await prisma.bet.findFirst({
          where: { matchId: existingMatch.id, status: 'PENDING' },
        });

        if (hasUnsettledBets) {
          console.log(`[Sync] Self-healing: Match ${existingMatch.id} is FINISHED but has unsettled bets. Retrying settlement...`);
          try {
            await settleBetsForMatch(existingMatch.id);
          } catch (settlementError) {
            console.error(`[Sync Error] Self-healing settlement failed for match ${existingMatch.id}:`, settlementError);
          }
        }
        continue;
      }

      // Self-healing for LIVE matches removed to prevent DB DoS. Live settlement is now correctly handled by the diff-check below.

      let matchStatus: MatchStatus = MatchStatus.UPCOMING;
      
      if (statusType === 'STATUS_FULL_TIME') {
        matchStatus = MatchStatus.FINISHED;
      } else if (statusType === 'STATUS_CANCELED' || statusType === 'STATUS_POSTPONED') {
        matchStatus = MatchStatus.CANCELLED;
      } else if (statusType === 'STATUS_IN_PROGRESS' || statusType === 'STATUS_HALFTIME') {
        matchStatus = MatchStatus.LIVE;
      } else {
        // If scheduled, check time to see if it should be OPEN or LOCKED
        const now = new Date();
        const msUntilKickoff = date.getTime() - now.getTime();
        if (msUntilKickoff <= 0) {
          matchStatus = MatchStatus.LOCKED;
        } else if (msUntilKickoff <= 24 * 60 * 60 * 1000) {
          matchStatus = MatchStatus.OPEN;
        }
      }

      // Extract Competitors
      const homeCompetitor = event.competitions[0].competitors.find((c: any) => c.homeAway === 'home');
      const awayCompetitor = event.competitions[0].competitors.find((c: any) => c.homeAway === 'away');

      if (!homeCompetitor || !awayCompetitor) continue;

      const team1Goals = matchStatus !== MatchStatus.UPCOMING && matchStatus !== MatchStatus.OPEN ? parseInt(homeCompetitor.score) : null;
      const team2Goals = matchStatus !== MatchStatus.UPCOMING && matchStatus !== MatchStatus.OPEN ? parseInt(awayCompetitor.score) : null;

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

      let firstTeamToScoreId: string | null = existingMatch?.firstTeamToScoreId || null;
      if (Array.isArray(event.competitions[0].details)) {
        const sortedDetails = [...event.competitions[0].details].sort((a: any, b: any) => (a.clock?.value || 0) - (b.clock?.value || 0));
        const firstGoal = sortedDetails.find((d: any) => d.scoringPlay === true);
        if (firstGoal?.team?.id) {
          if (firstGoal.team.id === homeCompetitor.team.id) {
            firstTeamToScoreId = team1.id;
          } else if (firstGoal.team.id === awayCompetitor.team.id) {
            firstTeamToScoreId = team2.id;
          }
        }
      }
      
      if (!firstTeamToScoreId && ((team1Goals ?? 0) > 0 || (team2Goals ?? 0) > 0)) {
        if ((team1Goals ?? 0) > 0 && (team2Goals ?? 0) === 0) firstTeamToScoreId = team1.id;
        else if ((team2Goals ?? 0) > 0 && (team1Goals ?? 0) === 0) firstTeamToScoreId = team2.id;
      }

      const stage = event.season?.slug || 'group-stage';

      // Diff Check: Only update the database if the status, score, or kickoff time has changed
      const hasChanged =
        !existingMatch ||
        existingMatch.status !== matchStatus ||
        existingMatch.team1Goals !== team1Goals ||
        existingMatch.team2Goals !== team2Goals ||
        existingMatch.firstTeamToScoreId !== firstTeamToScoreId ||
        existingMatch.stage !== stage ||
        existingMatch.kickoffTime.getTime() !== date.getTime();

      if (hasChanged) {
        const updatedMatch = await prisma.match.upsert({
          where: { apiFixtureId },
          update: {
            kickoffTime: date,
            status: matchStatus,
            team1Goals,
            team2Goals,
            firstTeamToScoreId,
            stage,
          },
          create: {
            apiFixtureId,
            team1Id: team1.id,
            team2Id: team2.id,
            kickoffTime: date,
            status: matchStatus,
            team1Goals,
            team2Goals,
            firstTeamToScoreId,
            stage,
          }
        });

        // If match just finished or was cancelled, trigger bet settlement
        if ((matchStatus === 'FINISHED' || matchStatus === 'CANCELLED') && existingMatch?.status !== matchStatus) {
          try {
            await settleBetsForMatch(updatedMatch.id);
          } catch (settlementError) {
            console.error(`[Sync Error] Bet settlement failed for match ${updatedMatch.id}:`, settlementError);
            // Intentionally not re-throwing: self-healing above will retry on next sync tick
          }
        } else if ((matchStatus === 'LIVE' || matchStatus === 'LOCKED') && 
                   (updatedMatch.team1Goals !== existingMatch?.team1Goals || 
                    updatedMatch.team2Goals !== existingMatch?.team2Goals || 
                    (updatedMatch.firstTeamToScoreId && !existingMatch?.firstTeamToScoreId))) {
          // If a goal was just scored during a live match, delay settlement by 5 minutes to account for VAR rule-outs.
          // This ensures that if a goal is ruled out, the DB will have reverted back before the settlement executes.
          console.log(`[Sync] Goal detected for match ${updatedMatch.id}. Scheduling live settlement in 5 minutes (VAR protection)...`);
          setTimeout(async () => {
            try {
              await settleLiveBetsForMatch(updatedMatch.id);
            } catch (liveSettleError) {
              console.error(`[Sync Error] Live bet settlement failed for match ${updatedMatch.id}:`, liveSettleError);
            }
          }, 5 * 60 * 1000); // 5 minutes delay
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
