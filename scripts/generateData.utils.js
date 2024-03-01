import fs from 'fs-extra';
import { google } from 'googleapis';
import hasha from 'hasha';
import lodash from 'lodash/fp.js';
import prettier from 'prettier';

const { flow, replace, trim, split, map, kebabCase, compact, uniq } = lodash;

const CREDENTIALS_FILE = './credentials.json';

export const SUFFIXES_EDGE_CASES = {
  // Tribe names
  Strigany: 'Strigany',
  Gospodar: 'Gospodar',
  Ropsmenn: 'Ropsmenn',
  Ungol: 'Ungol',

  // Bretonnian
  Artois: 'Artoin',
  Bordeleaux: 'Bordelen',
  Gisoreux: 'Gisoren',
  Lyonesse: 'Lyonen',
  Quenelles: 'Queneller',
};

export const GENERIC_CASES = ['Bretonnian', 'Estalian', 'Kislevite', 'Tilean'];

export function log(content, newLine = false) {
  process.stdout.write(content + (newLine ? '\n' : ''));
}

export async function setupSheetsClient() {
  if (!fs.pathExistsSync(CREDENTIALS_FILE)) {
    log(`Error: Credentials file missing.`, true);
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({
    version: 'v4',
    auth: authClient,
  });
}

export async function fetchSheetNames(client) {
  if (!process.env.DATA_SPREADSHEET_ID) {
    log(`Error: DATA_SPREADSHEET_ID missing.`, true);
    process.exit(1);
  }

  const res = await client.spreadsheets.get({
    spreadsheetId: process.env.DATA_SPREADSHEET_ID,
  });

  return res.data.sheets.map(sheet => sheet.properties.title.trim());
}

export async function fetchSheetData(name, client) {
  if (!process.env.DATA_SPREADSHEET_ID) {
    log(`Error: DATA_SPREADSHEET_ID missing.`, true);
    process.exit(1);
  }

  const res = await client.spreadsheets.values.get({
    spreadsheetId: process.env.DATA_SPREADSHEET_ID,
    range: `${name}!A1:C`,
  });

  return res.data.values.filter(val => val.length > 0);
}

export function titleCase(str) {
  return flow(
    trim,
    replace(/([^\d]+)*(\d+)([^\d]+)*/g, '$1 $2 $3'), // numbers
    replace(/[A-Z]{2,}/g, match => ` ${match.toLowerCase()} `), // upper words
    replace(/[^A-Z-/][A-Z]/g, match => `${match[0]} ${match[1]}`), // alternating case
    replace(/\s*'\s*/g, ` ' `), // space around apostrophes
    replace(/\s*(\(|\[)\s*([^({[]+)\s*(\)|\])\s*/, ' $1 $2 $3'), // space around parens or square brackets
    replace(/\s+./g, match => match.toUpperCase()), // first and space+letter to upper
    replace(/^./g, match => match.toUpperCase()), // first and space+letter to upper
    replace(/\s+/g, ' '), // keep single space
    replace(/\s*'\s*/g, `'`), // ' spacing
    replace(/\s*(\(|\[)\s*/g, ' $1'), // ([ spacing
    replace(/\s*(\)|\])\s*/g, '$1 '), // )] spacing
    trim
  )(str);
}

export function chooseOneToAny(str) {
  return replace(/\(\s*choose\s*one\s*\)/i, '(Any)', str);
}

export async function formatJsonContent(raw) {
  return await prettier.format(JSON.stringify(raw), { semi: false, parser: 'json' });
}

export async function formatTextContent(raw) {
  return raw.entries
    .map(entry => {
      const out = [];

      out.push(entry.name);
      out.push(entry.skills.join(`\n`));
      out.push(entry.talents.join(`\n`));

      return out.join('\n');
    })
    .join(`\n\n`);
}

export function formatDatasetId(raw) {
  return flow(trim, kebabCase)(raw);
}

export function getSpeciesFromDatasetId(id) {
  if (id.includes('human')) {
    return 'human';
  }

  return null;
}

export function parseNameRow(line) {
  return parseName(line[1]);
}

export function parseName(raw) {
  const match = raw.match(/\s*•\s*([^•]+)•/i);
  return match[1].trim().replace(/\s+/, ' ');
}

export function formatEntryId(name) {
  return flow(
    trim,
    replace(/[']+/, ''),
    replace(/\s+/g, '_'),
    str => str.toLowerCase(),
    val => `ms_${val}`
  )(name);
}

export function formatEntryName(name) {
  return `*${name}`;
}

export function formatTalent(value) {
  return flow(trim, chooseOneToAny, titleCase)(value);
}

export function formatSkill(value) {
  return flow(trim, chooseOneToAny, titleCase)(value);
}

export function parseRandomTalentValue(value) {
  const match = value
    .trim()
    .match(/^(\d+)?(?:\s*One)?(?:\s*Additional)?\s*Random(?:\s*Talents?)?$/i);

  if (match && !match[1]) {
    return 1;
  } else if (match && match[1]) {
    return parseInt(match[1]);
  } else {
    return null;
  }
}

export function transformNameWithSuffix(raw) {
  const name = raw.trim();

  switch (true) {
    case Object.keys(SUFFIXES_EDGE_CASES).includes(name):
      return SUFFIXES_EDGE_CASES[name];
    case GENERIC_CASES.includes(name):
      return name;
    case name.endsWith('lle'):
      return name.replace(/lle$/i, 'llian');
    case name.endsWith('nia'):
      return name.replace(/nia$/i, 'nian');
    case name.endsWith('ine'):
      return name.replace(/ine$/i, 'inian');
    case name.endsWith('nne'):
      return name.replace(/nne$/i, 'nnian');
    case name.endsWith('fort') || name.endsWith('llon'):
      return `${name}ian`;
    case name.endsWith('von'):
      return name.replace(/von$/i, 'vonese');
    case name.endsWith('e'):
      return `${name}r`;
    default:
      return `${name}er`;
  }
}

export function parseSkillsRow(line) {
  return parseSkills(line[2]);
}

export function parseSkills(raw) {
  return flow(trim, split(/\s*,\s*/), compact, map(formatSkill), uniq, val => val.sort())(
    raw
  );
}

export function parseTalentsRow(line) {
  return parseTalents(line[2]);
}

export function parseTalents(raw) {
  return flow(
    trim,
    split(/\s*,\s*/),
    compact,
    map(value => {
      const hasOr = value.match(/\s+or\s+/i);

      if (hasOr) {
        const talents = value.split(/\s+or\s+/i);
        return talents
          .map(value => {
            const randomValue = parseRandomTalentValue(value);
            return randomValue ? `random[${randomValue}]` : formatTalent(value);
          })
          .join(', ');
      } else {
        const randomValue = parseRandomTalentValue(value);
        return randomValue ? randomValue : formatTalent(value);
      }
    }),
    uniq
  )(raw);
}

export function prepareDatasetPayload(sheetName, records) {
  const id = formatDatasetId(sheetName);
  const species = getSpeciesFromDatasetId(id);

  if (records.length % 5) {
    log(`Error: '${id}' seems to be an incomplete dataset.`, true);
    process.exit(1);
  }

  const entries = [];

  for (let entryIndex = 0; entryIndex < records.length; entryIndex += 5) {
    entries.push(
      prepareEntryPayload(
        records[entryIndex],
        records[entryIndex + 2],
        records[entryIndex + 4]
      )
    );
  }

  const dataset = {
    id,
    species,
    entries,
  };

  const hash = hasha(JSON.stringify(dataset), { algorithm: 'sha1' });

  return {
    hash: hash.substring(0, 12),
    ...dataset,
  };
}

export function prepareEntryPayload(nameRow, skillsRow, talentsRow) {
  const name = transformNameWithSuffix(parseNameRow(nameRow));
  const skills = parseSkillsRow(skillsRow);
  const talents = parseTalentsRow(talentsRow);

  return {
    id: formatEntryId(name),
    name: formatEntryName(name),
    skills,
    talents,
  };
}

export function formatDatasetFilename(dataset) {
  return `${dataset.id}-${dataset.hash}`;
}

export function prepareManifestPayload(datasets) {
  return {
    entries: datasets.map(dataset => ({
      id: dataset.id,
      hash: dataset.hash,
      filename: formatDatasetFilename(dataset),
    })),
  };
}
