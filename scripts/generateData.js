import fs from 'fs-extra';
import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import {
  formatDatasetFilename,
  formatJsonContent,
  log,
  parseDatasetCSV,
  prepareManifestPayload,
} from './generateData.utils.js';

const DEST_DIR = './src/data/';

const run = async () => {
  const datasets = [];
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.DATA_SPREADSHEET_ID, serviceAccountAuth);

  log(`Fetching... `);
  await doc.loadInfo();

  log(`${doc.sheetCount} sheets found.`, true);

  log(`Preparing...`, true);
  fs.ensureDirSync(DEST_DIR);
  fs.emptyDirSync(DEST_DIR);

  for (const sheet of doc.sheetsByIndex) {
    log(`Downloading '${sheet.title}'... `);
    const csvBuffer = await sheet.downloadAsCSV();

    log(`Processing... `);
    const rawCSV = csvBuffer.toString('utf-8');
    const dataset = parseDatasetCSV(sheet.title, rawCSV);
    const outputName = formatDatasetFilename(dataset);
    const formattedDataset = await formatJsonContent(dataset);

    log(`Writing... `);
    await fs.writeFile(`${DEST_DIR}${outputName}.txt`, rawCSV);
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
};

run();
