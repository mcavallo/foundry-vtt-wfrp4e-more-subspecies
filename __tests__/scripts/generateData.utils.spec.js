import fs from 'fs-extra';
import prettier from 'prettier';
import {
  chooseOneToAny,
  fetchSheetData,
  fetchSheetNames,
  formatDatasetFilename,
  formatDatasetId,
  formatEntryId,
  formatEntryName,
  formatJsonContent,
  formatSkill,
  formatTalent,
  formatTextContent,
  getSpeciesFromDatasetId,
  log,
  parseName,
  parseNameRow,
  parseRandomTalentValue,
  parseSkills,
  parseTalents,
  prepareManifestPayload,
  setupSheetsClient,
  titleCase,
  transformNameWithSuffix,
} from '../../scripts/generateData.utils';
import { CUSTOM_DATA } from '../fixtures/data';

let stdoutWriteSpy, exitSpy;

jest.mock('fs-extra', () => ({
  pathExistsSync: jest.fn(),
}));

beforeEach(() => {
  process.env = {
    DATA_SPREADSHEET_ID: 'DATA_SPREADSHEET_ID',
  };

  exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
  exitSpy.mockRestore();
});

describe('log', () => {
  it('writes to stdout', () => {
    log('foo');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('foo');
  });

  it('writes adding a new line', () => {
    log('foo', true);
    expect(stdoutWriteSpy).toHaveBeenCalledWith('foo\n');
  });
});

describe('setupSheetsClient', () => {
  it('logs an error and exits with status 1', async () => {
    fs.pathExistsSync.mockReturnValue(false);

    await setupSheetsClient();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stdoutWriteSpy).toHaveBeenCalledWith(`Error: Credentials file missing.\n`);
  });

  it.todo('Test the creation of the Google client');
});

describe('fetchSheetNames', () => {
  const client = {
    spreadsheets: {
      get: jest.fn().mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'foo' } },
            { properties: { title: '  bar' } },
            { properties: { title: 'baz   ' } },
          ],
        },
      }),
    },
  };

  it('when the DATA_SPREADSHEET_ID is missing it logs the error and exits with status 1', async () => {
    process.env.DATA_SPREADSHEET_ID = undefined;

    await fetchSheetNames(client);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stdoutWriteSpy).toHaveBeenCalledWith(`Error: DATA_SPREADSHEET_ID missing.\n`);
  });

  it('fetches the spreadsheet and returns the list of sheet titles', async () => {
    const out = await fetchSheetNames(client);

    expect(client.spreadsheets.get).toHaveBeenCalledWith({
      spreadsheetId: process.env.DATA_SPREADSHEET_ID,
    });
    expect(out).toEqual(['foo', 'bar', 'baz']);
  });
});

describe('fetchSheetData', () => {
  const SHEET_NAME = 'SHEET_NAME';
  const client = {
    spreadsheets: {
      values: {
        get: jest.fn().mockResolvedValue({
          data: {
            values: ['', 'foo', '', 'bar', 'baz'],
          },
        }),
      },
    },
  };

  it('when the DATA_SPREADSHEET_ID is missing it logs the error and exits with status 1', async () => {
    process.env.DATA_SPREADSHEET_ID = undefined;

    await fetchSheetData(SHEET_NAME, client);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stdoutWriteSpy).toHaveBeenCalledWith(`Error: DATA_SPREADSHEET_ID missing.\n`);
  });

  it('given a sheet name, it returns all the non-empty values from the right range', async () => {
    const out = await fetchSheetData(SHEET_NAME, client);

    expect(client.spreadsheets.values.get).toHaveBeenCalledWith({
      spreadsheetId: process.env.DATA_SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:C`,
    });
    expect(out).toEqual(['foo', 'bar', 'baz']);
  });
});

describe('titleCase', () => {
  const cases = [
    ['Foo Bar Baz', 'fooBarBaz'],
    ['Foo Bar Baz', 'FooBarBaz'],
    ['Foo Bar Baz', 'fooBARbaz'],
    ['Foo 9', 'foo9'],
    ['Foo 99', 'foo99'],
    ['9 Foo', '9foo'],
    ['99 Foo', '99foo'],
    ['Foo (Bar)', 'FOO(BAR)'],
    ['Foo (Bar)', 'foo(bar)'],
    ['Foo (Bar)', 'foo   ( bar ) '],
    ['Foo (Bar Baz)', 'foo(barBaz)'],
    ['Foo [Bar]', 'FOO[BAR]'],
    ['Foo [Bar]', 'foo[bar]'],
    ['Foo [Bar]', 'foo   [ bar ] '],
    ['Foo [Bar Baz]', 'foo[barBaz]'],
    [`Foo'Bar`, `foo'bar`],
    [`Foo'Bar`, `Foo'Bar`],
    [`Foo-bar`, `foo-bar`],
    [`Foo-Bar`, `Foo-Bar`],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(titleCase(input)).toEqual(expected);
  });
});

describe('chooseOneToAny', () => {
  const cases = [
    ['Lore (Any)', 'Lore (chooseone)'],
    ['Lore (Any)', 'Lore (choose one)'],
    ['Lore (Any)', 'Lore (  choose  one  )'],
    ['Lore (Any)', 'Lore (  ChooseOne  )'],
    ['Lore (Any)', 'Lore (CHOOSEONE)'],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(chooseOneToAny(input)).toEqual(expected);
  });
});

describe('formatJsonContent', () => {
  it('formats the json payload using prettier', async () => {
    const formatSpy = jest.spyOn(prettier, 'format').mockResolvedValue('');
    const payload = { foo: 1 };

    await formatJsonContent(payload);
    expect(formatSpy).toHaveBeenCalledWith(JSON.stringify(payload), {
      semi: false,
      parser: 'json',
    });
  });
});

describe('formatTextContent', () => {
  it('formats the text payload', async () => {
    const out = await formatTextContent(CUSTOM_DATA.human_custom_1);

    expect(out).toMatchInlineSnapshot(`
      "Human Custom 2
      skill1
      skill2
      talent1
      talent2

      Human Custom 1
      skill1
      skill2
      talent1
      talent2"
    `);
  });
});

describe('formatDatasetId', () => {
  const cases = [
    ['imperial-humans', 'Imperial Humans'],
    ['imperial-humans', '    Imperial  HUMANS   '],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(formatDatasetId(input)).toEqual(expected);
  });
});

describe('getSpeciesFromDatasetId', () => {
  const cases = [
    ['human', 'bretonnian-humans'],
    ['human', 'estalian-humans'],
    ['human', 'imperial-humans'],
    ['human', 'kislevite-humans'],
    ['human', 'tilean-humans'],
    [null, 'something-else'],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(getSpeciesFromDatasetId(input)).toEqual(expected);
  });
});

describe('parseNameRow', () => {
  it('parses the name column', () => {
    expect(parseNameRow(['', '• Foo •'])).toEqual('Foo');
  });
});

describe('parseName', () => {
  const cases = [
    ['Foo', '• Foo •'],
    ['Foo Bar', '  •  Foo   Bar  • '],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(parseName(input)).toEqual(expected);
  });
});

describe('formatEntryId', () => {
  const cases = [
    ['ms_altdorfer', 'Altdorfer'],
    ['ms_languillian', "L'Anguillian"],
    ['ms_bretonnian', 'Bretonnian'],
    ['ms_inconsistent_spacing', '  Inconsistent   Spacing  '],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(formatEntryId(input)).toEqual(expected);
  });
});

describe('formatEntryName', () => {
  const cases = [
    ['*Altdorfer', 'Altdorfer'],
    ["*L'Anguillian", "L'Anguillian"],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(formatEntryName(input)).toEqual(expected);
  });
});

describe('formatTalent', () => {
  const cases = [
    ['Rover', ' Rover  '],
    ['Warrior Born', '  Warrior   Born  '],
    ['Strider (Any)', 'Strider (Choose One)'],
    ['Stout-hearted', 'Stout-hearted'],
    ['Witch!', 'Witch!'],
    ['Read/Write', 'Read/Write'],
    ['', ''],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(formatTalent(input)).toEqual(expected);
  });
});

describe('formatSkill', () => {
  const cases = [
    ['Lore (Aquitaine)', '   Lore (Aquitaine)  '],
    ['Lore (Aquitaine)', '   Lore (Aquitaine)  '],
    ['Lore (Any)', '   Lore     ( Choose  One )  '],
    ['Endurance', 'endurance'],
    ['Consume Alcohol', 'ConsumeAlcohol'],
    ['', ''],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(formatSkill(input)).toEqual(expected);
  });
});

describe('parseRandomTalentValue', () => {
  const cases = [
    [1, 'Additional Random Talent'],
    [1, 'One Additional Random Talent'],
    [3, '3 Random Talents'],
    [2, '2 Additional Random Talents'],
    [2, '2 Random'],
    [1, 'Random Talent'],
    [1, 'Random'],
    [null, 'Talent'],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(parseRandomTalentValue(input)).toEqual(expected);
  });
});

describe('transformNameWithSuffix', () => {
  describe('handles tribe names', () => {
    const cases = [
      ['Strigany', 'Strigany'],
      ['Gospodar', 'Gospodar'],
      ['Ropsmenn', 'Ropsmenn'],
      ['Ungol', 'Ungol'],
    ];

    test.each(cases)('case %#', (expected, input) => {
      expect(transformNameWithSuffix(input)).toEqual(expected);
    });
  });

  describe('handles Bretonnian edge cases', () => {
    const cases = [
      ['Artoin', 'Artois'],
      ['Bordelen', 'Bordeleaux'],
      ['Gisoren', 'Gisoreux'],
      ['Lyonen', 'Lyonesse'],
      ['Queneller', 'Quenelles'],
    ];

    test.each(cases)('case %#', (expected, input) => {
      expect(transformNameWithSuffix(input)).toEqual(expected);
    });
  });

  describe('handles generic cases', () => {
    const cases = [
      ['Bretonnian', 'Bretonnian'],
      ['Estalian', 'Estalian'],
      ['Kislevite', 'Kislevite'],
      ['Tilean', 'Tilean'],
    ];

    test.each(cases)('case %#', (expected, input) => {
      expect(transformNameWithSuffix(input)).toEqual(expected);
    });
  });

  describe('handles common scenarios', () => {
    const cases = [
      ["L'Anguillian", "L'Anguille"],
      ['Sylvanian', 'Sylvania'],
      ['Aquitainian', 'Aquitaine'],
      ['Carcassonnian', 'Carcassonne'],
      ['Montfortian', 'Montfort'],
      ['Mousillonian', 'Mousillon'],
      ['Parravonese', 'Parravon'],
      ['Riversider', 'Riverside'],
      ['Fooer', 'Foo'],
    ];

    test.each(cases)('case %#', (expected, input) => {
      expect(transformNameWithSuffix(input)).toEqual(expected);
    });
  });
});

describe('parseSkills', () => {
  it('parses a comma separated list of skills, formats and sorts them keeping only unique values', () => {
    expect(parseSkills('foo,bar,foo,baz,foo,qux')).toMatchInlineSnapshot(`
      Array [
        "Bar",
        "Baz",
        "Foo",
        "Qux",
      ]
    `);
  });

  it('handles inconsistent casing and spacing', () => {
    expect(parseSkills('foo,   BAR,baz  ,,Qux ')).toMatchInlineSnapshot(`
      Array [
        "Bar",
        "Baz",
        "Foo",
        "Qux",
      ]
    `);
  });

  it('handles a single skill', () => {
    expect(parseSkills('foo')).toMatchInlineSnapshot(`
      Array [
        "Foo",
      ]
    `);
  });
});

describe('parseTalents', () => {
  it('handles single talents', () => {
    expect(parseTalents('foo')).toMatchInlineSnapshot(`
      Array [
        "Foo",
      ]
    `);
  });

  it('handles multiple talents', () => {
    expect(parseTalents('foo,bar,baz')).toMatchInlineSnapshot(`
      Array [
        "Foo",
        "Bar",
        "Baz",
      ]
    `);
  });

  it('handles multiple talents with optional choices', () => {
    expect(parseTalents('Foo or Bar or Baz, Foo, Bar')).toMatchInlineSnapshot(`
      Array [
        "Foo, Bar, Baz",
        "Foo",
        "Bar",
      ]
    `);
  });

  it('handles optional choices with inconsistent casing and spacing', () => {
    expect(parseTalents('Foo Or   Bar   or    Baz Baz')).toMatchInlineSnapshot(`
      Array [
        "Foo, Bar, Baz Baz",
      ]
    `);
  });
});

describe('formatDatasetFilename', () => {
  const cases = [[['first-hash', { id: 'first', hash: 'hash' }]]];

  test.each(cases)('case %#', ([id, data]) => {
    expect(formatDatasetFilename(id, data)).toMatchSnapshot();
  });
});

describe('prepareManifestPayload', () => {
  const cases = [
    [
      [
        [], // empty list
      ],
    ],
    [
      [
        [
          { id: 'first', hash: 'hash' },
          { id: 'second', hash: 'hash' },
        ],
      ],
    ],
  ];

  test.each(cases)('case %#', ([categoryIds]) => {
    expect(prepareManifestPayload(categoryIds)).toMatchSnapshot();
  });
});
