import prettier from 'prettier';
import {
  chooseOneToAny,
  formatDatasetFilename,
  formatDatasetId,
  formatEntryId,
  formatEntryName,
  formatJsonContent,
  formatSkill,
  formatTalent,
  log,
  parseCSVName,
  parseDatasetCSV,
  parseName,
  parseRandomTalentValue,
  parseTalents,
  prepareManifestPayload,
  titleCase,
  transformNameWithSuffix,
} from '../../scripts/generateData.utils';
import csvData from '../fixtures/csvData.txt';
import incompleteCsvData from '../fixtures/incompleteCsvData.txt';

let stdoutWriteSpy;

afterEach(() => {
  jest.clearAllMocks();
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

describe('log', () => {
  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
  });

  it('writes to stdout', () => {
    log('foo');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('foo');
  });

  it('writes adding a new line', () => {
    log('foo', true);
    expect(stdoutWriteSpy).toHaveBeenCalledWith('foo\n');
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

describe('formatDatasetId', () => {
  const cases = [
    ['imperial-humans', 'Imperial Humans'],
    ['imperial-humans', '    Imperial  HUMANS   '],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(formatDatasetId(input)).toEqual(expected);
  });
});

describe('parseCSVName', () => {
  it('parses the name column', () => {
    expect(parseCSVName(['', '• Foo •'])).toEqual('Foo');
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

describe('parseTalents', () => {
  it('handles single talents', () => {
    expect(parseTalents('Foo')).toMatchInlineSnapshot(`
      Array [
        "Foo",
      ]
    `);
  });

  it('handles multiple talents', () => {
    expect(parseTalents('Foo, Bar, Baz')).toMatchInlineSnapshot(`
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

describe('parseDatasetCSV', () => {
  beforeEach(() => {
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
  });

  it('parses the Google Sheets CSV and turns it into a dataset', () => {
    expect(parseDatasetCSV('Sheet Name', csvData)).toMatchSnapshot();
  });

  it('exits if the CSV data is malformed', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw 'process.exit';
    });

    const t = () => {
      parseDatasetCSV('Incomplete Data', incompleteCsvData);
    };

    expect(t).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
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
