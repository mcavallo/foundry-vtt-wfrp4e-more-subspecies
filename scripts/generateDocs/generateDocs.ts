import path from 'node:path';
import { readdir } from 'fs/promises';
import type { Dataset, Subspecies } from '@/lib/schemas.ts';

function pluralize(word: string, count: number): string {
  return count === 1 ? word : word + 's';
}

const h1 = (content: string) => `# ${content}\n`;
const h2 = (content: string) => `## ${content}\n`;
const h3 = (content: string) => `### ${content}\n`;
const bold = (content: string) => `**${content}**`;
const code = (content: string) => `\`${content}\``;

const formatTalent = (talent: string | number) => {
  if (typeof talent === 'number') {
    return code(`${talent} Random ${pluralize('Talent', talent)}`);
  }

  const matches = talent.match(/^random\[(\d+)\]$/);

  if (!matches?.[1]) {
    return code(talent);
  }

  const count = parseInt(matches[1]);
  return count === 1
    ? code(`Additional Random Talent`)
    : code(`${count} Additional Random Talents`);
};

const formatSkillList = (skills: string[]) => {
  return skills.map(code).join(', ');
};

const formatTalentList = (talents: Array<string | number>) => {
  return talents
    .flatMap((item) => {
      if (typeof item === 'number') {
        return formatTalent(item);
      }

      if (item.includes(',')) {
        return item.split(', ').map(formatTalent).join(' or ');
      }

      return formatTalent(item);
    })
    .join(', ');
};

const formatSubspecies = (subspecies: Subspecies) => {
  return [
    h3(subspecies.name),
    `|    |    |`,
    `| :- | :- |`,
    `| ${bold(`Skills`)} | ${formatSkillList(subspecies.skills)} |`,
    `| ${bold(`Talents`)} | ${formatTalentList(subspecies.talents)} |`,
    '\n',
  ];
};

export const run = async (rootDir: string) => {
  const dataDir = path.join(rootDir, 'src', 'data');

  const fileNames = await readdir(dataDir);

  const lines: string[] = [h1(`Datasets`), 'Some introduction'];

  for (const fileName of fileNames) {
    if (!fileName.endsWith('.json') || !fileName.includes('human')) {
      continue;
    }
    const file = Bun.file(path.join(dataDir, fileName));
    const json: Dataset = await file.json();

    lines.push(h2(json.name));

    for (const entry of json.entries) {
      lines.push(...formatSubspecies(entry));
    }
  }

  console.log(lines.join('\n'));
};
