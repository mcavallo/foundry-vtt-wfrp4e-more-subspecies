import fs from 'fs-extra';
import path from 'path';
import {
  formatDatasetFilename,
  formatJsonContent,
  keepRelevantDataFiles,
  log,
  parseRawContent,
  prepareDatasetPayload,
  prepareManifestPayload,
} from './generateData.utils.js';

const SRC_DIR = './data/';
const DEST_DIR = './src/data/';

const sourceFiles = await fs.readdir(SRC_DIR);
const textFiles = sourceFiles.filter(keepRelevantDataFiles);
const datasets = [];

log(`Preparing...`, true);
fs.ensureDirSync(DEST_DIR);
fs.emptyDirSync(DEST_DIR);

for (const fileName of textFiles) {
  log(`Processing '${fileName}'... `);
  const fileBaseName = path.basename(fileName, '.txt');
  const data = await fs.readFile(`${SRC_DIR}${fileName}`, 'utf-8');
  const dataset = prepareDatasetPayload(fileBaseName, parseRawContent(data));
  const formattedDataset = await formatJsonContent(dataset);
  const outputName = formatDatasetFilename(dataset);

  log(`Writing... `);
  await fs.writeFile(`${DEST_DIR}${outputName}.json`, formattedDataset);

  datasets.push(dataset);
  log('Done.', true);
}

log(`Writing manifest with ${datasets.length} datasets... `);
const manifest = prepareManifestPayload(datasets);
const formattedManifest = await formatJsonContent(manifest);
await fs.writeFile(`${DEST_DIR}manifest.json`, formattedManifest);
log('Done.', true);

log('All done!', true);
