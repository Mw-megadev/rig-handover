import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('aggregates runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const dig = readNight('runs', '2026-10-28');
    expect(dig).not.toBeNull();
    expect(dig!.badLines).toBe(1);
    expect(dig!.rows).toHaveLength(5);
    expect(dig!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const refresh = dig!.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh.runs).toBe(4);
    expect(refresh.retries).toBe(3);
    expect(refresh.lastStatus).toBe('ok');
    expect(refresh.owner).toBe('rook');

    const render = dig!.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();
    expect(render.runs).toBe(1);
    expect(render.lastStatus).toBe('ok');

    const backup = dig!.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');
  });

  it('returns null when the night file is missing', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});
