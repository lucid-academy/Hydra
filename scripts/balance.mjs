// Runs the balance report (scripts/balance.ts) and saves it to docs/BALANCE.md.
// The TypeScript file is loaded through Vite, so its imports work the same as in the game.
// Usage: npm run balance            (200 battles per row)
//        npm run balance -- 50      (quicker, rougher)   add "--no-save" to only print
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const args = process.argv.slice(2);
const battles = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
const { module } = await runnerImport(resolve('scripts/balance.ts'), { logLevel: 'warn' });
const { table, report } = module.balanceReport(battles);
console.log(table);
if (!args.includes('--no-save')) {
  writeFileSync('docs/BALANCE.md', report);
  console.log('\nSaved to docs/BALANCE.md');
}
