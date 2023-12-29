import lodash from 'lodash';
import { MODULE, SETTING_IDS } from '../../../src/constants';
import { consoleLog } from '../../../src/lib/dev-utils';
import {
  backupAndSetAsInitialized,
  debounce,
  fetchModuleData,
  isCoreAvailable,
  log,
  overrideSubspecies,
  sortAlphabetically,
  waitForCore,
} from '../../../src/lib/utils';

const { set } = lodash;

jest.mock('../../../src/lib/dev-utils', () => ({
  __esModule: true,
  consoleLog: jest.fn(),
}));

const windowObjectDefaults = {
  availableDatasets: [],
  data: {},
  rawData: {},
  initialized: false,
  settings: {
    [SETTING_IDS.ENABLED_DATASETS]: [],
    [SETTING_IDS.REPLACE_RAW_DATA]: false,
    [SETTING_IDS.DEBUG_MODE]: true,
  },
};

beforeEach(() => {
  jest.useFakeTimers();

  global.window[MODULE.NAMESPACE] = deepCopy(windowObjectDefaults);
  global.game = {};
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('debounce', () => {
  it('prevents multiple executions in a short period of time', () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    const exampleFn = jest.fn();

    const debounced = debounce(() => exampleFn());

    debounced();
    jest.advanceTimersByTime(100);

    debounced();
    jest.advanceTimersByTime(100);

    debounced();
    jest.advanceTimersByTime(300);

    expect(timeoutSpy).toHaveBeenCalledTimes(3);
    expect(exampleFn).toHaveBeenCalledTimes(1);
  });
});

describe('sortAlphabetically', () => {
  const cases = [
    [
      [1, 2, 3],
      [3, 1, 2],
    ],
    [
      ['bar', 'baz', 'foo'],
      ['foo', 'baz', 'bar'],
    ],
    [
      ['foo', 'foo'],
      ['foo', 'foo'],
    ],
  ];

  test.each(cases)('case %#', (expected, input) => {
    const result = input.sort(sortAlphabetically);
    expect(result).toEqual(expected);
  });
});

describe('log', () => {
  it('calls consoleLog with only the message', () => {
    log('foo');
    expect(consoleLog).toHaveBeenCalledWith('foo');
  });

  it('calls consoleLog with 2 arguments', () => {
    log('foo', 'bar');
    expect(consoleLog).toHaveBeenCalledWith('foo', 'bar');
  });

  it('does not call consoleLog when debug mode is off', () => {
    global.window[MODULE.NAMESPACE].settings[SETTING_IDS.DEBUG_MODE] = false;
    log('foo', 'bar');
    expect(consoleLog).not.toHaveBeenCalled();
  });
});

describe('fetchModuleData', () => {
  it('fetches any missing enabled datasets', async () => {
    global.window[MODULE.NAMESPACE] = {
      ...windowObjectDefaults,
      availableDatasets: [
        {
          id: 'foo',
          hash: 'hash',
          filename: 'foo-hash',
        },
        {
          id: 'bar',
          hash: 'hash',
          filename: 'bar-hash',
        },
        {
          id: 'baz',
          hash: 'hash',
          filename: 'baz-hash',
        },
      ],
      data: { foo: { id: 'foo' } },
      settings: {
        ...windowObjectDefaults.settings,
        [SETTING_IDS.ENABLED_DATASETS]: ['foo', 'bar', 'baz'],
      },
    };

    fetchModuleData();

    const barPromise = foundry.__nextPromise().resolve({
      id: 'bar',
    });
    const bazPromise = foundry.__nextPromise().resolve({
      id: 'baz',
    });

    await Promise.allSettled([barPromise, bazPromise]).then(() => {
      expect(foundry.utils.fetchJsonWithTimeout).toHaveBeenCalledWith(
        '/modules/wfrp4e-more-subspecies/data/bar-hash.json'
      );
      expect(consoleLog).toHaveBeenCalledWith('Loaded bar');

      expect(foundry.utils.fetchJsonWithTimeout).toHaveBeenCalledWith(
        '/modules/wfrp4e-more-subspecies/data/baz-hash.json'
      );
      expect(consoleLog).toHaveBeenCalledWith('Loaded baz');

      expect(window[MODULE.NAMESPACE].data).toMatchInlineSnapshot(`
        Object {
          "bar": Object {
            "id": "bar",
          },
          "baz": Object {
            "id": "baz",
          },
          "foo": Object {
            "id": "foo",
          },
        }
      `);
    });
  });

  it('does not fetch anything when all enabled datasets are already present', async () => {
    global.window[MODULE.NAMESPACE] = {
      ...windowObjectDefaults,
      availableDatasets: [
        {
          id: 'foo',
          hash: 'hash',
          filename: 'foo-hash',
        },
      ],
      data: { foo: { id: 'foo' } },
      settings: {
        ...windowObjectDefaults.settings,
        [SETTING_IDS.ENABLED_DATASETS]: ['foo'],
      },
    };

    fetchModuleData();

    expect(consoleLog).not.toHaveBeenCalled();
    expect(foundry.utils.fetchJsonWithTimeout).not.toHaveBeenCalled();
  });

  it('handles gracefully if a dataset fails to load', async () => {
    global.window[MODULE.NAMESPACE] = {
      ...windowObjectDefaults,
      availableDatasets: [
        {
          id: 'foo',
          hash: 'hash',
          filename: 'foo-hash',
        },
        {
          id: 'bar',
          hash: 'hash',
          filename: 'bar-hash',
        },
      ],
      data: { foo: { id: 'foo' } },
      settings: {
        ...windowObjectDefaults.settings,
        [SETTING_IDS.ENABLED_DATASETS]: ['foo', 'bar'],
      },
    };

    fetchModuleData();

    const barPromise = foundry.__nextPromise().reject();

    await Promise.allSettled([barPromise]).then(() => {
      expect(foundry.utils.fetchJsonWithTimeout).toHaveBeenCalledWith(
        '/modules/wfrp4e-more-subspecies/data/bar-hash.json'
      );
      expect(consoleLog).toHaveBeenCalledWith('Failed to load bar');

      expect(window[MODULE.NAMESPACE].data).toMatchInlineSnapshot(`
        Object {
          "foo": Object {
            "id": "foo",
          },
        }
      `);
    });
  });
});

describe('isCoreAvailable', () => {
  it('returns false when the wfrp4e core is not yet initialized', () => {
    expect(isCoreAvailable()).toEqual(false);

    set(game, 'wfrp4e', {});
    expect(isCoreAvailable()).toEqual(false);

    set(game, 'wfrp4e.config', {});
    expect(isCoreAvailable()).toEqual(false);

    set(game, 'wfrp4e.config.subspecies', {});
    expect(isCoreAvailable()).toEqual(false);
  });

  it('returns true otherwise', () => {
    set(game, 'wfrp4e.config.subspecies.human', {});
    expect(isCoreAvailable()).toEqual(true);
  });
});

describe('waitForCore', () => {
  it('returns true when the core is available', async () => {
    waitForCore(100, 3).then(result => {
      expect(result).toEqual(true);
    });

    jest.advanceTimersByTime(100);
    set(game, 'wfrp4e.config.subspecies.human', {});
    jest.advanceTimersByTime(100);
  });

  it('returns false when the maxAttempts count is reached', async () => {
    waitForCore(100, 3).then(result => {
      expect(result).toEqual(false);
    });

    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(100);
  });
});

describe('backupAndSetAsInitialized', () => {
  it('sets the raw data and the initialized flag', () => {
    set(game, 'wfrp4e.config.subspecies.human', { foo: 1 });
    backupAndSetAsInitialized();
    expect(window[MODULE.NAMESPACE].rawData).toEqual({ human: { foo: 1 } });
    expect(window[MODULE.NAMESPACE].initialized).toEqual(true);
  });

  it('does nothing if the module was already initialized', () => {
    window[MODULE.NAMESPACE].initialized = true;
    backupAndSetAsInitialized();
    expect(window[MODULE.NAMESPACE].rawData).toEqual(windowObjectDefaults.rawData);
    expect(window[MODULE.NAMESPACE].initialized).toEqual(true);
  });
});

describe('overrideSubspecies', () => {
  beforeEach(() => {
    set(game, 'wfrp4e.config.subspecies.human', {});

    global.window[MODULE.NAMESPACE] = {
      ...windowObjectDefaults,
      rawData: {
        human: { bar: { id: 'bar' } },
      },
      data: {
        foo: {
          id: 'foo',
          entries: [
            { id: 'foo_2', name: 'foo_2' },
            { id: 'foo_1', name: 'foo_1' },
          ],
        },
      },
      settings: {
        ...windowObjectDefaults.settings,
        [SETTING_IDS.ENABLED_DATASETS]: ['foo'],
      },
    };
  });

  it('recreates the subspecies config, appending the sorted homebrew entries', () => {
    overrideSubspecies();

    expect(consoleLog).toHaveBeenCalledWith('2 subspecies loaded');
    expect(game.wfrp4e.config.subspecies.human).toMatchInlineSnapshot(`
      Object {
        "bar": Object {
          "id": "bar",
        },
        "foo_1": Object {
          "id": "foo_1",
          "name": "foo_1",
        },
        "foo_2": Object {
          "id": "foo_2",
          "name": "foo_2",
        },
      }
    `);
  });

  it('recreates the subspecies config, overriding the RAW data', () => {
    global.window[MODULE.NAMESPACE].settings[SETTING_IDS.REPLACE_RAW_DATA] = true;

    overrideSubspecies();

    expect(consoleLog).toHaveBeenCalledWith('Overriding RAW data');
    expect(consoleLog).toHaveBeenCalledWith('2 subspecies loaded');
    expect(game.wfrp4e.config.subspecies.human).toMatchInlineSnapshot(`
      Object {
        "foo_1": Object {
          "id": "foo_1",
          "name": "foo_1",
        },
        "foo_2": Object {
          "id": "foo_2",
          "name": "foo_2",
        },
      }
    `);
  });

  it('does nothing if no subspecies have been enabled and loaded', () => {
    global.window[MODULE.NAMESPACE].data = {};

    overrideSubspecies();

    expect(consoleLog).toHaveBeenCalledWith('0 subspecies loaded');
    expect(game.wfrp4e.config.subspecies.human).toMatchInlineSnapshot(`
      Object {
        "bar": Object {
          "id": "bar",
        },
      }
    `);
  });
});
