import hasha from 'hasha';
import lodash from 'lodash/fp.js';
import path from 'path';
import prettier from 'prettier';

const { flow, replace, trim, split, map } = lodash;

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

export function log(content, newLine = false) {
  process.stdout.write(content + (newLine ? '\n' : ''));
}

export function keepRelevantDataFiles(fileName) {
  const lowerCase = fileName.toLowerCase();
  return !path.basename(lowerCase).startsWith('_') && path.extname(lowerCase) === '.txt';
}

export async function formatJsonContent(raw) {
  return await prettier.format(JSON.stringify(raw), { semi: false, parser: 'json' });
}

export function parseRawContent(raw) {
  return raw
    .replace(/^([^•]+)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*•\s*([^•\s]+)\s*•\s*/g, '\n---\n[Location] $1')
    .replace(/(?:(Skills|Talents):)/gi, '\n[$1]')
    .replace(/(\s*\n\s*)/g, '\n')
    .replace(/\[.+\]\s+/g, '')
    .split('\n---\n')
    .slice(1);
}

export function formatEntryId(name) {
  return flow(
    replace(/[^\w]+/i, ''),
    val => val.toLowerCase(),
    val => `ms_${val}`
  )(name);
}

export function formatEntryName(name) {
  return `*${name}`;
}

export function formatTalent(value) {
  return value.trim();
}

export function formatSkill(value) {
  return value.trim();
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

export function parseSkills(raw) {
  return flow(trim, split(/\s*,\s*/), map(formatSkill), val => val.sort())(raw);
}

export function parseTalents(raw) {
  return raw
    .trim()
    .split(/\s*,\s*/)
    .map(value => {
      const optionMatch = value.match(/(.*)\s+or\s+(.*)*/i);

      if (optionMatch) {
        const [, first, second] = optionMatch;
        return [first, second]
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

export function prepareDatasetPayload(id, raw) {
  const entries = raw.map(entry => {
    const parts = entry.split('\n');
    const name = transformNameWithSuffix(parts[0]);

    return {
      id: formatEntryId(name),
      name: formatEntryName(name),
      skills: parseSkills(parts[1]),
      talents: parseTalents(parts[2]),
    };
  });

  const hash = hasha(JSON.stringify(entries), { algorithm: 'sha1' });

  return {
    id,
    hash: hash.substring(0, 12),
    entries,
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
