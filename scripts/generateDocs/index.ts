import path from 'node:path';
import { run } from './generateDocs';

const rootDir = path.resolve(import.meta.dir, '..', '..');
void run(rootDir);
