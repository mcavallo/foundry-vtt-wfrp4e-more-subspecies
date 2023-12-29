import prettier from 'prettier';
import bretonnianHumans from '../../data/bretonnian-humans.txt';
import imperialHumans from '../../data/imperial-humans.txt';
import kisleviteHumans from '../../data/kislevite-humans.txt';
import {
  filterTxtFiles,
  formatDatasetFilename,
  formatEntryId,
  formatEntryName,
  formatJsonContent,
  formatTalent,
  log,
  parseRandomTalentValue,
  parseRawContent,
  prepareDatasetPayload,
  prepareManifestPayload,
  transformNameWithSuffix,
} from '../../scripts/generateData.utils';

let stdoutWriteSpy;

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

describe('filterTxtFiles', () => {
  const cases = [
    [true, 'path/to/file.txt'],
    [false, 'path/to/file.json'],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(filterTxtFiles(input)).toEqual(expected);
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

describe('parseRawContent', () => {
  it('parses imperial-humans correctly', () => {
    expect(parseRawContent(imperialHumans)).toMatchSnapshot();
  });

  it('parses bretonnian-humans correctly', () => {
    expect(parseRawContent(bretonnianHumans)).toMatchSnapshot();
  });

  it('parses kislevite-humans correctly', () => {
    expect(parseRawContent(kisleviteHumans)).toMatchSnapshot();
  });
});

describe('formatEntryId', () => {
  const cases = [
    ['ms_altdorfer', 'Altdorfer'],
    ['ms_languillian', "L'Anguillian"],
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
    ['Rover', 'Rover  '],
    ['Warrior Born', '  Warrior Born'],
    ['', ''],
  ];

  test.each(cases)('case %#', (expected, input) => {
    expect(formatTalent(input)).toEqual(expected);
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
    ];

    test.each(cases)('case %#', (expected, input) => {
      expect(transformNameWithSuffix(input)).toEqual(expected);
    });
  });
});

describe('prepareDatasetPayload', () => {
  const cases = [
    [['bretonnian-humans', bretonnianHumans]],
    [['imperial-humans', imperialHumans]],
    [['kislevite-humans', kisleviteHumans]],
  ];

  test.each(cases)('case %#', ([id, data]) => {
    const parsed = parseRawContent(data);
    expect(prepareDatasetPayload(id, parsed)).toMatchSnapshot();
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
