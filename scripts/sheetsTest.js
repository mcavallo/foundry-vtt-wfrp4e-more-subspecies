import util from 'util';
import {
  fetchSheetData,
  fetchSheetNames,
  prepareDatasetPayload,
  setupSheetsClient,
} from './generateData.utils.js';

const run = async () => {
  const client = await setupSheetsClient();

  const names = await fetchSheetNames(client);

  const datasets = await Promise.all(
    names.map(async name => {
      const data = await fetchSheetData(name, client);
      return prepareDatasetPayload(name, data);
    })
  );

  console.log(util.inspect(datasets, false, null, true));
};

run();
