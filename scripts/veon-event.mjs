// Records a demo build in the VEON project log (../veon/metrics.jsonl) for `veon_project.py metrics`. Never fails the build.
import fs from 'node:fs';
import path from 'node:path';

const log = path.resolve(process.cwd(), '..', 'veon', 'metrics.jsonl');
try {
  if (fs.existsSync(path.dirname(log))) fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), type: process.argv[2] || 'demo_build' }) + '\n');
} catch { /* metrics only */ }
