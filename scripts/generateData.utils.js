import { parse } from 'csv-parse/sync';
import hasha from 'hasha';
import lodash from 'lodash/fp.js';
import prettier from 'prettier';

const { flow, replace, trim, split, map, kebabCase } = lodash;

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

export function log(content, newLine = false) {
  process.stdout.write(content + (newLine ? '\n' : ''));
}

export async function formatJsonContent(raw) {
  return await prettier.format(JSON.stringify(raw), { semi: false, parser: 'json' });
}

export function formatDatasetId(raw) {
  return flow(trim, kebabCase)(raw);
}

export function parseCSVName(line) {
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
    case name.startsWith('Imperial'):
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

export function parseCSVSkills(line) {
  return parseSkills(line[2]);
}

export function parseSkills(raw) {
  return flow(trim, split(/\s*,\s*/), map(formatSkill), val => val.sort())(raw);
}

export function parseCSVTalents(line) {
  return parseTalents(line[2]);
}

export function parseTalents(raw) {
  return raw
    .trim()
    .split(/\s*,\s*/)
    .map(value => {
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
    })
    .filter(Boolean);
}

export function parseDatasetCSV(sheetName, rawCSVData) {
  const id = formatDatasetId(sheetName);
  const records = parse(rawCSVData, {
    skip_empty_lines: true,
    skip_records_with_empty_values: true,
    trim: true,
  }).slice(1);

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
    entries,
  };

  const hash = hasha(JSON.stringify(dataset), { algorithm: 'sha1' });

  return {
    hash: hash.substring(0, 12),
    ...dataset,
  };
}

export function prepareEntryPayload(nameRow, skillsRow, talentsRow) {
  const name = transformNameWithSuffix(parseCSVName(nameRow));
  const skills = parseCSVSkills(skillsRow);
  const talents = parseCSVTalents(talentsRow);

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
