import 'dotenv/config';

import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

function getTokenMask() {
  try {
    return process.env.FOUNDRY_RELEASE_TOKEN &&
      process.env.FOUNDRY_RELEASE_TOKEN.length === 30
      ? process.env.FOUNDRY_RELEASE_TOKEN.replace(
          /(\w{6})(.{18})(\w{6})/i,
          (_match, p1, p2, p3) => `${p1}${'*'.repeat(p2.length)}${p3}`
        )
      : '???';
  } catch {
    return 'unknown';
  }
}

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
  const moduleJsonPath = path.resolve(process.cwd(), 'dist/module.json');
  const moduleJson = await fs.readJson(moduleJsonPath);

  console.log(`\nReleasing '%s' using token '%s'...`, moduleJson.name, getTokenMask());

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
  console.log(`\nDry run OK.`);

  await sendRequest(payload, false);
  console.log(`\nRelease OK.`);
};

run();
