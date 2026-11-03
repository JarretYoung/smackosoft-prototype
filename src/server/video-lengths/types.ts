/**
 * Reads how long videos are, for one source. The server asks through `lengthsOf` in `index.ts` and never
 * names a source. Each source has one file here that knows its own service, its key and its formats.
 */
export interface LengthSource {
  /** The id of the `VideoSource` it reads for, such as `youtube`. */
  readonly id: string;
  /**
   * Whole seconds for each video id it could read. A video it could not read (private, removed, a live stream
   * with no end, the service down) is left out of the map. It never throws, because a missing length must not
   * stop a video from being saved.
   */
  lengthsOf(ids: string[]): Promise<Map<string, number>>;
}
