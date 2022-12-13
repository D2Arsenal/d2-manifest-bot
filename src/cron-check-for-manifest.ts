#!/usr/bin/env node

import { getDestinyManifest, HttpClientConfig } from 'bungie-api-ts/destiny2';
import latest from '../latest.json' assert { type: 'json' };
import { writeFileSync } from 'fs';
import { $fetch } from 'ofetch';


const $http = async (config: HttpClientConfig) => $fetch(config.url, {
  method: config.method,
  params: config.params,
  body: config.body,
})

const skipCheck = process.env.SKIP_CHECK === 'true' ? true : false;

// do the thing
run().catch((e) => {
  console.log(e);
  process.exit(1);
});

async function run() {
  const manifestMetadata = await getDestinyManifest($http);

  const current = manifestMetadata.Response.version;

  if (skipCheck) {
    console.log(`Skipping check - new manifest is ${current}`);
    return
  }
  console.log(`Latest:  ${latest}`);
  console.log(`Current: ${current}`);
  const isNewManifest = latest !== current;
  if (!isNewManifest) {
    return;
  }
  console.log('New manifest detected');

  writeNewManifestVersion(current)
  try {
    await deployWebsite(current);
  } catch (error) {
    console.log('Error while deploying site');
    console.log(error);
    process.exit(1);
  }
}

function writeNewManifestVersion(current: string) {
  const newREADME = `# d2-manifest-bot\ngithub action for checking for new d2 manifest\n\n# Current Manifest: ${current}`;
  writeFileSync('latest.json', `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  writeFileSync('README.md', newREADME, 'utf8');
}

function deployWebsite(current: string) {
  const buildMessage = `New manifest build - ${current}`;

  const url = process.env.NETLIFY_HOOK_URL
  if (!url) {
    throw new Error('NETLIFY_HOOK_URL is not set');
  }
  return $fetch(url, {
    query: {
      trigger_title: buildMessage,
    },
    body: { data: 'skip' },
    method: 'POST',
  });
}