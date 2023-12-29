import merge from 'deepmerge';
import { MODULE, SETTING_IDS } from '../constants';
import { consoleLog } from './dev-utils';

export function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

export function sortAlphabetically(a, b) {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

export function log(message, args = null) {
  if (!window[MODULE.NAMESPACE].settings[SETTING_IDS.DEBUG_MODE]) {
    return;
  }

  if (args) {
    consoleLog(message, args);
  } else {
    consoleLog(message);
  }
}

export function sortSubspeciesByName(a, b) {
  return sortAlphabetically(a.name, b.name);
}

export async function fetchModuleData() {
  const existingIds = Object.keys(window[MODULE.NAMESPACE].data);
  const enabledDatasetIds =
    window[MODULE.NAMESPACE].settings[SETTING_IDS.ENABLED_DATASETS];

  const missingFiles = enabledDatasetIds.reduce((accum, id) => {
    if (existingIds.includes(id)) {
      return accum;
    }

    const manifestEntry = window[MODULE.NAMESPACE].availableDatasets.find(
      entry => entry.id === id
    );

    return accum.concat(manifestEntry.filename);
  }, []);

  const responses = await Promise.allSettled(
    missingFiles.map(filename =>
      foundry.utils.fetchJsonWithTimeout(`/modules/${MODULE.ID}/data/${filename}.json`)
    )
  );

  const loadedData = responses.reduce((accum, response) => {
    if (response.status === 'fulfilled') {
      return accum.concat(response.value);
    } else {
      return accum;
    }
  }, []);

  let newData = {};

  for (const id of enabledDatasetIds) {
    if (window[MODULE.NAMESPACE].data[id]) {
      newData[id] = window[MODULE.NAMESPACE].data[id];
    } else {
      const dataset = loadedData.find(data => data.id === id);

      if (dataset) {
        newData[id] = dataset;
        log(`Loaded ${id}`);
      } else {
        log(`Failed to load ${id}`);
      }
    }
  }

  window[MODULE.NAMESPACE].data = newData;
}

export function isCoreAvailable() {
  return (
    typeof game.wfrp4e !== 'undefined' &&
    typeof game.wfrp4e.config !== 'undefined' &&
    typeof game.wfrp4e.config.subspecies !== 'undefined' &&
    typeof game.wfrp4e.config.subspecies.human !== 'undefined'
  );
}

export async function waitForCore(delay, maxAttempts) {
  let checkCount = 0;
  let timeout;

  return new Promise(resolve => {
    function checkCoreAvailable() {
      clearTimeout(timeout);
      checkCount++;

      const result = isCoreAvailable();

      if (result) {
        return resolve(true);
      }

      if (checkCount >= maxAttempts) {
        return resolve(false);
      }

      timeout = setTimeout(checkCoreAvailable, delay);
    }

    checkCoreAvailable();
  });
}

export function backupAndSetAsInitialized() {
  if (!window[MODULE.NAMESPACE].initialized) {
    window[MODULE.NAMESPACE].rawData = merge({}, game.wfrp4e.config.subspecies);
    window[MODULE.NAMESPACE].initialized = true;
  }
}

export function overrideSubspecies() {
  const subspecies = [];
  const replaceRawData = window[MODULE.NAMESPACE].settings[SETTING_IDS.REPLACE_RAW_DATA];

  if (replaceRawData) {
    log(`Overriding RAW data`);
    game.wfrp4e.config.subspecies = { human: {} };
  } else {
    game.wfrp4e.config.subspecies = merge({}, window[MODULE.NAMESPACE].rawData);
  }

  for (const key of Object.keys(window[MODULE.NAMESPACE].data)) {
    for (const entry of window[MODULE.NAMESPACE].data[key].entries) {
      subspecies.push(entry);
    }
  }

  if (subspecies.length > 0) {
    subspecies.sort(sortSubspeciesByName);

    for (const entry of subspecies) {
      game.wfrp4e.config.subspecies.human[entry.id] = entry;
    }
  }

  log(`${subspecies.length} subspecies loaded`);
}
