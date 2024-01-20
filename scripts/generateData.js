import fs from 'fs-extra';
import {
  fetchSheetData,
  fetchSheetNames,
  formatDatasetFilename,
  formatJsonContent,
  formatTextContent,
  log,
  prepareDatasetPayload,
  prepareManifestPayload,
  setupSheetsClient,
} from './generateData.utils.js';

const DEST_DIR = './src/data/';

const run = async () => {
  const client = await setupSheetsClient();

  log(`Fetching... `);
  const names = await fetchSheetNames(client);

  log(`${names.length} sheets found.`, true);

  log(`Preparing...`, true);
  fs.ensureDirSync(DEST_DIR);
  fs.emptyDirSync(DEST_DIR);

  const datasets = [];

  for (const name of names) {
    log(`Downloading '${name}'... `);
    const data = await fetchSheetData(name, client);

    log(`Processing... `);
    const dataset = prepareDatasetPayload(name, data);
    const outputName = formatDatasetFilename(dataset);
    const textDataset = await formatTextContent(dataset);
    const jsonDataset = await formatJsonContent(dataset);

    log(`Writing... `);
    await fs.writeFile(`${DEST_DIR}${outputName}.txt`, textDataset);
    await fs.writeFile(`${DEST_DIR}${outputName}.json`, jsonDataset);

    log('Done.', true);
    datasets.push(dataset);
  }

  log(`Writing manifest with ${datasets.length} datasets... `);
  const manifest = prepareManifestPayload(datasets);
  const formattedManifest = await formatJsonContent(manifest);
  await fs.writeFile(`${DEST_DIR}manifest.json`, formattedManifest);
  log('Done.', true);
  log('All done!', true);
};

run();
