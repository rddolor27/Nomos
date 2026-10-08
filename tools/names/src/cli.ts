import { fileURLToPath } from 'node:url';
import { formatFindings, scanRepo } from './scan.ts';

const findings = scanRepo(fileURLToPath(new URL('../../../', import.meta.url)));
console.log(formatFindings(findings).join('\n'));
process.exitCode = findings.length === 0 ? 0 : 1;
