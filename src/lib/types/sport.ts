/**
 * The sports a match can be recorded for. String-valued so the stored value
 * stays readable in the database and in URLs once persistence is wired up.
 */
export enum Sport {
  Badminton = "badminton",
  Tennis = "tennis",
  Pickleball = "pickleball",
}

/** Human-readable label for each sport, for rendering in the UI. */
export const SPORT_LABELS: Record<Sport, string> = {
  [Sport.Badminton]: "Badminton",
  [Sport.Tennis]: "Tennis",
  [Sport.Pickleball]: "Pickleball",
};

/** Every sport, in display order. */
export const SPORTS: readonly Sport[] = [
  Sport.Badminton,
  Sport.Tennis,
  Sport.Pickleball,
];
