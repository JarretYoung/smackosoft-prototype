/**
 * The real backend. Implements the contract in src/contract.
 * Import `backend` from Server Components and from thin "use server" action wrappers.
 * Never import this from a Client Component.
 */
import type { Backend } from "../contract";
import {
  claimGuest,
  createGuestClaim,
  findAccountByHandle,
  getCurrentAccount,
  isHandleFree,
  listGuests,
  removeGuests,
  saveCurrentAccount,
  saveGuests,
} from "./accounts";
import { removeGameScores, removeMatches, removeMatchPlayers, removeGames, removeTeams, saveGames, saveGameScores, saveMatches, saveMatchPlayers, saveTeams } from "./matches";
import { removeMembers, saveMembers } from "./members";
import { getSessionDetails, listSessions, removeSessions, saveSessions } from "./sessions";
import { getStats, getTeammateStats } from "./stats";
import { listOwnVideos, listSessionVideos, removeVideoLinkages, saveVideoLinkages, saveVideos } from "./videos";

export const backend: Backend = {
  accounts: {
    getCurrent: getCurrentAccount,
    saveCurrent: saveCurrentAccount,
    findByHandle: findAccountByHandle,
    isHandleFree,
    saveGuests,
    listGuests,
    removeGuests,
    createClaim: createGuestClaim,
    claim: claimGuest,
  },
  sessions: {
    list: listSessions,
    get: getSessionDetails,
    save: saveSessions,
    remove: removeSessions,
  },
  members: {
    save: saveMembers,
    remove: removeMembers,
  },
  matches: {
    save: saveMatches,
    remove: removeMatches,
    saveTeams,
    removeTeams,
    savePlayers: saveMatchPlayers,
    removePlayers: removeMatchPlayers,
    saveGames,
    removeGames,
    saveScores: saveGameScores,
    removeScores: removeGameScores,
  },
  videos: {
    listOwn: listOwnVideos,
    listBySession: listSessionVideos,
    save: saveVideos,
    saveLinkages: saveVideoLinkages,
    removeLinkages: removeVideoLinkages,
  },
  stats: {
    get: getStats,
    getTeammates: getTeammateStats,
  },
};
