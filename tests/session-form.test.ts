import { describe, expect, it } from "vitest";
import type { Account } from "../src/contract";
import { membersReducer, planMembers, type MemberDraft, type NewGuest } from "../src/features/sessions/members-draft";
import { editSessionInitial, newSessionInitial } from "../src/features/sessions/session-defaults";
import { endSuggestions, sessionTimes } from "../src/features/sessions/session-times";
import {
  isDirty,
  resolvePin,
  sessionProblems,
  toSessionSave,
  toValues,
  type SessionFormInitial,
} from "../src/features/sessions/session-values";
import { zonedToIso } from "../src/lib/zoned";

const KL = "Asia/Kuala_Lumpur";

const account = (name: string, isGuest = false): Account => ({
  id: crypto.randomUUID(),
  displayName: name,
  handle: name.toLowerCase(),
  avatarUrl: null,
  isGuest,
});
const draft = (a: Account, role: MemberDraft["role"] = "VIEWER"): MemberDraft => ({
  account: a,
  role,
  isPlayer: false,
  newGuest: false,
});

const me = account("Me");
const sessionId = crypto.randomUUID();

describe("session members", () => {
  it("adds a person once, even when they are picked twice", () => {
    const sam = account("Sam");
    const list = membersReducer([draft(me, "OWNER")], { type: "add", accounts: [sam, sam] });
    expect(list.map((m) => m.account.id)).toEqual([me.id, sam.id]);
    expect(membersReducer(list, { type: "add", accounts: [sam] })).toHaveLength(2);
  });

  it("marks a guest that does not exist yet, and saves it before the members", () => {
    const guest: NewGuest = { ...account("Pat", true), isNew: true };
    const staged = membersReducer([draft(me, "OWNER")], { type: "add", accounts: [guest] });
    expect(staged[1].newGuest).toBe(true);

    const plan = planMembers([draft(me, "OWNER")], staged, sessionId);
    expect(plan.newGuests).toEqual([{ id: guest.id, displayName: "Pat", handle: "pat" }]);
    expect(plan.toSave).toEqual([{ sessionId, accountId: guest.id, role: "VIEWER" }]);
  });

  it("never changes or removes the owner", () => {
    const list = [draft(me, "OWNER")];
    expect(membersReducer(list, { type: "role", id: me.id, role: "VIEWER" })).toEqual(list);
    expect(membersReducer(list, { type: "remove", id: me.id })).toEqual(list);
  });

  it("puts a removed member back with their role, where they were, once", () => {
    const sam = account("Sam");
    const kim = account("Kim");
    const editor = draft(sam, "EDITOR");
    const list = [draft(me, "OWNER"), editor, draft(kim)];
    const removed = membersReducer(list, { type: "remove", id: sam.id });
    const undone = membersReducer(removed, { type: "restore", member: editor, index: 1 });
    expect(undone).toEqual(list);
    expect(membersReducer(undone, { type: "restore", member: editor, index: 1 })).toBe(undone);
  });

  it("writes only what changed since the last save", () => {
    const sam = account("Sam");
    const kim = account("Kim");
    const saved = [draft(me, "OWNER"), draft(sam, "VIEWER"), draft(kim, "EDITOR")];
    let staged = membersReducer(saved, { type: "role", id: sam.id, role: "EDITOR" });
    staged = membersReducer(staged, { type: "remove", id: kim.id });
    const plan = planMembers(saved, staged, sessionId);
    expect(plan.toSave).toEqual([{ sessionId, accountId: sam.id, role: "EDITOR" }]);
    expect(plan.toRemove).toEqual([{ sessionId, accountId: kim.id }]);
  });
});

describe("session times", () => {
  it("reads an end earlier than the start as the next day", () => {
    const times = sessionTimes("2026-11-06", "22:00", "00:30", KL);
    expect(times.nextDay).toBe(true);
    expect(times.runMinutes).toBe(150);
    expect(Date.parse(times.endIso) - Date.parse(times.startIso)).toBe(150 * 60_000);
  });

  it("keeps an end after the start on the same day", () => {
    const times = sessionTimes("2026-11-06", "19:00", "21:00", KL);
    expect(times.nextDay).toBe(false);
    expect(times.endIso).toBe(zonedToIso("2026-11-06", "21:00", KL));
  });

  it("reads the times on the session's clock, whatever zone the viewer is in", () => {
    expect(sessionTimes("2026-11-06", "19:00", "21:00", KL).startIso).toBe("2026-11-06T11:00:00.000Z");
    expect(sessionTimes("2026-11-06", "19:00", "21:00", "Europe/London").startIso).toBe("2026-11-06T19:00:00.000Z");
  });

  it("leaves unset times empty", () => {
    expect(sessionTimes("2026-11-06", "", "", KL)).toEqual({ startIso: "", endIso: "", nextDay: false, runMinutes: null });
  });

  it("offers end times after the start, wrapping past midnight", () => {
    expect(endSuggestions("22:30")).toEqual(["23:30", "00:00", "00:30", "01:00", "01:30"]);
  });
});

describe("session form values", () => {
  const initial: SessionFormInitial = {
    ...newSessionInitial({ id: sessionId, today: "2026-11-06", timezone: "Asia/Kuala_Lumpur", me, last: null }),
    label: "Friday",
  };

  it("explains an end that is not after the start", () => {
    const values = { ...toValues(initial), startTime: "19:00", endTime: "19:00" };
    expect(sessionProblems(values, sessionId)).toEqual({ endTime: "Pick an end after the start" });
  });

  it("asks for a name in plain words", () => {
    expect(sessionProblems({ ...toValues(initial), label: "  " }, sessionId)).toEqual({ label: "Give the session a name" });
  });

  it("sends a fee with its currency, or neither", () => {
    const values = toValues(initial);
    expect(toSessionSave(values, sessionId, null)).toMatchObject({ courtFee: null, currency: null });
    expect(toSessionSave({ ...values, courtFee: "55" }, sessionId, null)).toMatchObject({ courtFee: 55, currency: "MYR" });
  });

  it("saves the session's own timezone with the times", () => {
    const values = { ...toValues(initial), date: "2026-11-06", startTime: "19:00", endTime: "21:00" };
    expect(toSessionSave(values, sessionId, null)).toMatchObject({
      timezone: KL,
      startTime: "2026-11-06T11:00:00.000Z",
      endTime: "2026-11-06T13:00:00.000Z",
    });
  });

  it("counts a changed role as a change, and a pin as none", () => {
    const sam = account("Sam");
    const saved = { ...toValues(initial), members: [draft(me, "OWNER"), draft(sam)] };
    expect(isDirty(saved, saved)).toBe(false);
    expect(isDirty({ ...saved, members: [draft(me, "OWNER"), draft(sam, "EDITOR")] }, saved)).toBe(true);
  });

  it("keeps the saved pin while the link is unchanged, and drops it when the link changes", () => {
    const saved = { locationUrl: "https://maps.app.goo.gl/abc", latitude: 3.1, longitude: 101.6 };
    expect(resolvePin(null, "https://maps.app.goo.gl/abc ", saved)).toEqual({ latitude: 3.1, longitude: 101.6 });
    expect(resolvePin(null, "https://maps.app.goo.gl/other", saved)).toBeNull();
    expect(resolvePin({ latitude: 1, longitude: 2 }, "https://maps.app.goo.gl/other", saved)).toEqual({ latitude: 1, longitude: 2 });
  });
});

describe("session defaults", () => {
  const last = {
    id: crypto.randomUUID(),
    label: "Last Friday",
    date: "2026-10-30",
    timezone: "Asia/Kuala_Lumpur",
    location: "Sunway Serene",
    locationUrl: "https://maps.app.goo.gl/abc",
    latitude: 3.1,
    longitude: 101.6,
    startTime: "2026-10-30T11:00:00.000Z",
    endTime: "2026-10-30T13:00:00.000Z",
    coverUrl: "https://example.com/cover.jpg",
    courtFee: 55,
    currency: "SGD",
    members: [],
  };

  it("starts a new session from the last one, without its name or cover", () => {
    const initial = newSessionInitial({ id: sessionId, today: "2026-11-06", timezone: "Asia/Kuala_Lumpur", me, last });
    expect(initial).toMatchObject({
      label: "",
      date: "2026-11-06",
      location: "Sunway Serene",
      courtFee: "55",
      currency: "SGD",
      coverUrl: "",
      startTime: "19:00",
      endTime: "21:00",
    });
    expect(initial.members).toEqual([draft(me, "OWNER")]);
  });

  it("keeps the time of day when the last session was in another zone", () => {
    const london = { ...last, timezone: "Europe/London" };
    expect(newSessionInitial({ id: sessionId, today: "2026-11-06", timezone: KL, me, last: london })).toMatchObject({
      startTime: "11:00",
      endTime: "13:00",
    });
  });

  it("starts from plain defaults when there is no last session", () => {
    expect(newSessionInitial({ id: sessionId, today: "2026-11-06", timezone: "Asia/Kuala_Lumpur", me, last: null })).toMatchObject({
      location: "",
      courtFee: "",
      currency: "MYR",
      startTime: "",
    });
  });

  it("turns a saved session into form text", () => {
    expect(editSessionInitial({ ...last, location: null, courtFee: null, currency: null })).toMatchObject({
      location: "",
      courtFee: "",
      currency: "MYR",
    });
  });
});
