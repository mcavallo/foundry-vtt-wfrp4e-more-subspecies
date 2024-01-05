import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

async function sendRequest(payload, isDryRun = true) {
  const body = { ...payload, 'dry-run': isDryRun };
  console.log(`Sending request...`);
  const response = await fetch(
    'https://api.foundryvtt.com/_api/packages/release_version/',
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.FOUNDRY_RELEASE_TOKEN,
      },
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
  return await response.json();
}

const run = async () => {
  const moduleJsonPath = path.resolve(process.cwd(), 'dist/module.json');
  const moduleJson = await fs.readJson(moduleJsonPath);
  const payload = {
    id: moduleJson.name,
    release: {
      version: moduleJson.version,
      manifest: moduleJson.manifest,
      notes: `${moduleJson.url}/releases/tag/v${moduleJson.version}`,
      compatibility: moduleJson.compatibility,
    },
  };

  const dryRunResponse = await sendRequest(payload, true);

  if (dryRunResponse.status === 'error') {
    console.log(`Dry run failed.`);
    const errorKeys = Object.keys(dryRunResponse.errors);

    for (const errorKey of errorKeys) {
      for (const error of dryRunResponse.errors[errorKey]) {
        console.log(`Error (${errorKey}): ${error.message} (${error.code})`);
      }
    }

    return;
  }

  console.log(`Dry run OK.`);
  const response = await sendRequest(payload, false);
  console.log(JSON.stringify(response, null, 2));
};

run();
