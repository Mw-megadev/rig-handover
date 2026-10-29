import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, NightDigest, ReadNight } from './types.js';

type EventLine = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

function isStatus(v: unknown): v is DigestStatus {
  return v === 'ok' || v === 'retry' || v === 'fail';
}

function parseEvent(line: string): EventLine | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string' || !isStatus(o.status)) return null;
  if (!('owner' in o)) return null;
  const owner = o.owner;
  if (owner !== null && typeof owner !== 'string') return null;
  const error = o.error;
  if (error !== undefined && typeof error !== 'string') return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status,
    owner,
    ...(error !== undefined ? { error } : {}),
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  const path = join(runsDir, `${night}.jsonl`);
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of text.split(/\n/)) {
    if (line === '') continue;
    const ev = parseEvent(line);
    if (!ev) {
      badLines += 1;
      continue;
    }
    const prev = byJob.get(ev.job);
    if (!prev) {
      byJob.set(ev.job, {
        job: ev.job,
        owner: ev.owner,
        runs: 1,
        retries: ev.status === 'retry' ? 1 : 0,
        lastStatus: ev.status,
        lastError: ev.error ?? null,
        firstAt: ev.at,
        lastAt: ev.at,
      });
      continue;
    }
    prev.runs += 1;
    if (ev.status === 'retry') prev.retries += 1;
    prev.lastStatus = ev.status;
    prev.lastAt = ev.at;
    prev.owner = ev.owner;
    if (ev.error !== undefined) prev.lastError = ev.error;
  }

  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { night, rows, badLines };
};

export function statusCounts(rows: DigestRow[]): { ok: number; retry: number; fail: number } {
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const r of rows) {
    if (r.lastStatus === 'ok') ok += 1;
    else if (r.lastStatus === 'retry') retry += 1;
    else fail += 1;
  }
  return { ok, retry, fail };
}
