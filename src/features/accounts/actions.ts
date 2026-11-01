"use server";

import type {
  ClaimInput,
  CreateClaimCodeInput,
  FindAccountByHandleInput,
  RemoveGuestsInput,
  SaveCurrentAccountInput,
  SaveGuestsInput,
} from "@/src/contract";
import { backend } from "@/src/server";
import { refreshed } from "../refreshed";

export async function saveCurrentAccount(input: SaveCurrentAccountInput) {
  return refreshed(backend.accounts.saveCurrent(input));
}
export async function saveGuests(input: SaveGuestsInput) {
  return refreshed(backend.accounts.saveGuests(input));
}
export async function removeGuests(input: RemoveGuestsInput) {
  return refreshed(backend.accounts.removeGuests(input));
}
export async function createClaimCode(input: CreateClaimCodeInput) {
  return refreshed(backend.accounts.createClaimCode(input));
}
export async function claimGuest(input: ClaimInput) {
  return refreshed(backend.accounts.claim(input));
}
export async function findByHandle(input: FindAccountByHandleInput) {
  return backend.accounts.findByHandle(input);
}
export async function isHandleFree(input: FindAccountByHandleInput) {
  return backend.accounts.isHandleFree(input);
}
