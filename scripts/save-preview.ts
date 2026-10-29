/**
 * Save /digest/<night> as one self-contained HTML file (ADR 0001 / plan §3).
 * Usage: pnpm exec tsx --env-file-if-exists=.env scripts/save-preview.ts [night] [outPath]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? `var/digest-${night}.html`;

const res = await createApp(loadConfig()).request(`/digest/${night}`);
if (!res.ok) {
  console.error(`digest ${night}: HTTP ${res.status}`);
  process.exit(1);
}
const html = await res.text();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html, 'utf8');
console.log(`wrote ${out} (${html.length} bytes)`);
