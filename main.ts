// Leonida Legend: a GTA 6 trophy guide and tracker for make.fun.
// The program hands the guide in: it copies app/ and screenshots/ from
// beside this file into the output directory and writes
// output/dossier.json with the vendored make.fun library.
//
// Crash fix from round 3: this program NEVER deletes the output
// directory or anything inside it. In the grader the output directory is
// a mount point whose parent the sandbox cannot write, so removing it
// fails with EACCES and the program exits 1. Here we only create the
// directory when it is missing and copy files into it, which works both
// locally and in the grader. Every path is resolved against this file's
// own location, never against the working directory, and the program
// takes no network and no clock input, so two runs write identical bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory if it is missing; never remove it.
mkdirSync(out, { recursive: true });

// Fail loudly with a clear message instead of a cryptic copy error when
// the entry is incomplete: the grader's run must never die on a missing
// folder it cannot explain.
for (const dir of ['app', 'screenshots']) {
  if (!existsSync(join(here, dir))) {
    throw new Error(`Leonida Legend: missing ${dir}/ beside main.ts, nothing to hand in`);
  }
}
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots
// or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
