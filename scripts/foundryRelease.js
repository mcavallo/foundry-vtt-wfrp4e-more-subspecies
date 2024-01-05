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

  const response = await fetch(
    'https://api.foundryvtt.com/_api/packages/release_version/',
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${process.env.FOUNDRY_RELEASE_TOKEN}`,
      },
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    console.log(`Error: Request failed with status ${response.status}`);
    console.log('Response:', responseText);
    process.exit(1);
  } else {
    console.log('Response:', responseText);
  }
}

const run = async () => {
  if (!process.env.FOUNDRY_RELEASE_TOKEN) {
    console.log(`Error: FOUNDRY_RELEASE_TOKEN is missing.`);
    process.exit(1);
  }

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

  await sendRequest(payload, true);
  console.log(`Dry run OK.`);

  await sendRequest(payload, false);
  console.log(`Release OK.`);
};

run();
