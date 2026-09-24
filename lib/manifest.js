const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER_UUID = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

function isConfiguredUuid(value) {
  return UUID_PATTERN.test(value) && !PLACEHOLDER_UUID.test(value);
}

function parseRelayUrl(value) {
  if (!value) {
    throw new Error('SCOUT_RELAY_WS_URL is required');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('SCOUT_RELAY_WS_URL must be an absolute URL');
  }
  if (!['ws:', 'wss:'].includes(url.protocol)) {
    throw new Error('SCOUT_RELAY_WS_URL must use ws:// or wss://');
  }
  return url;
}

function createManifestZip({ botAppId, relayWsUrl, manifestDir }) {
  if (!isConfiguredUuid(botAppId)) {
    throw new Error('SCOUT_BOT_APP_ID must be a non-placeholder UUID');
  }

  const relayUrl = parseRelayUrl(relayWsUrl);
  if (relayUrl.protocol !== 'wss:') {
    throw new Error('SCOUT_RELAY_WS_URL must use wss:// to build a Teams package');
  }

  const templatePath = path.join(manifestDir, 'manifest.template.json');
  const manifest = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  manifest.id = botAppId;
  manifest.bots[0].botId = botAppId;
  manifest.validDomains = [relayUrl.hostname];

  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'));
  zip.addLocalFile(path.join(manifestDir, 'color.png'), '', 'color.png');
  zip.addLocalFile(path.join(manifestDir, 'outline.png'), '', 'outline.png');
  return zip;
}

module.exports = {
  createManifestZip,
  isConfiguredUuid,
  parseRelayUrl,
};
