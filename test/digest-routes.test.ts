import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function appWithRuns(runsDir: string) {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

describe('digest routes', () => {
  it('GET /digest/2026-10-28 renders the jobs', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await appWithRuns('runs').request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('notes/backup');
    expect(html).toContain('digest/render');
  });

  it('GET /api/digest/:night matches page job order', async () => {
    const app = appWithRuns('runs');
    const page = await (await app.request('/digest/2026-10-28')).text();
    const json = await (await app.request('/api/digest/2026-10-28')).json() as {
      rows: { job: string }[];
    };
    const jobs = json.rows.map((r) => r.job);
    expect(jobs).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    for (const job of jobs) {
      expect(page.indexOf(job)).toBeGreaterThan(-1);
    }
    // same order on the page: each job appears after the previous
    let pos = -1;
    for (const job of jobs) {
      const next = page.indexOf(job);
      expect(next).toBeGreaterThan(pos);
      pos = next;
    }
  });

  it('404 when the night file is missing', async () => {
    const app = appWithRuns('runs');
    expect((await app.request('/digest/1999-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/1999-01-01')).status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    const res = await appWithRuns(dir).request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('night with a bad line still renders', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(
      join(dir, '2026-01-02.jsonl'),
      [
        '{"at":"2026-01-02T01:00:00+01:00","job":"a/job","status":"ok","owner":"x"}',
        'not-json',
        '',
      ].join('\n'),
    );
    const res = await appWithRuns(dir).request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('a/job');
    const api = await (await appWithRuns(dir).request('/api/digest/2026-01-02')).json() as {
      badLines: number;
      rows: unknown[];
    };
    expect(api.badLines).toBe(1);
    expect(api.rows).toHaveLength(1);
  });

  it('status board links nights with counts', async () => {
    const res = await appWithRuns('runs').request('/');
    const html = await res.text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toMatch(/ok \d+ · retry \d+ · fail \d+/);
  });
});
