/** One aggregated job from a night's JSONL run log. */
export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  /** null in the log → render as — */
  owner: string | null;
  /** Event lines for this job (bad lines are not events). */
  runs: number;
  /** Lines whose status was `retry`. */
  retries: number;
  lastStatus: DigestStatus;
  /** Error from the last event that carried one; otherwise null. */
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  night: string;
  rows: DigestRow[];
  /** Lines that did not parse as JSON objects. */
  badLines: number;
};

/**
 * Read `runs/<night>.jsonl` into one row per job.
 * Missing file → null. Empty / only-bad file → rows [].
 */
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
