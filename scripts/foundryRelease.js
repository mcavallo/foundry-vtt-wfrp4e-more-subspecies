import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

async function sendRequest(payload, isDryRun = true) {
  let body = Object.assign({}, payload);

  if (isDryRun) {
    body['dry-run'] = isDryRun;
    console.log(`\nSending dry run request...`);
  } else {
    console.log(`\nSending request...`);
  }

  console.log(JSON.stringify(body, null, 2));

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

function printErrors(response) {
  const errorKeys = Object.keys(response.errors);

  for (const errorKey of errorKeys) {
    for (const error of response.errors[errorKey]) {
      console.log(`Error (${errorKey}): ${error.message} (${error.code})`);
    }
  }
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
    console.log(`\nDry run failed.`);
    printErrors(dryRunResponse);
    return;
  }

  console.log(`\nDry run OK.`);

  const response = await sendRequest(payload, false);

  if (response.status === 'error') {
    console.log(`\nRelease failed.`);
    printErrors(response);
    return;
  }

  console.log(`\nRelease OK.`);
  console.log(JSON.stringify(response, null, 2));
};

run();
