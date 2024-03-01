import merge from 'deepmerge';
import { MODULE, SETTING_IDS } from '../constants';
import { consoleLog } from './dev-utils';

/**
 * @param {(...args: unknown[]) => void} fn
 * @param {number=} delay
 * @returns {(...args: unknown[]) => void}
 */
export function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * @param {{name: string}} a
 * @param {{name: string}} b
 * @returns {number}
 */
export function sortAlphabetically(a, b) {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

/**
 * @param {string} message
 * @param {unknown[]=} args
 */
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

/**
 * @param {{name: string}} a
 * @param {{name: string}} b
 * @returns {number}
 */
export function sortSubspeciesByName(a, b) {
  return sortAlphabetically(a.name, b.name);
}

/**
 * @returns {void}
 */
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

/**
 * @returns {Boolean}
 */
export function isCoreAvailable() {
  return (
    typeof game.wfrp4e !== 'undefined' &&
    typeof game.wfrp4e.config !== 'undefined' &&
    typeof game.wfrp4e.config.subspecies !== 'undefined' &&
    typeof game.wfrp4e.config.subspecies.human !== 'undefined'
  );
}

/**
 * @param {number} delay
 * @param {number} maxAttempts
 * @returns {Promise<Boolean>}
 */
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

/**
 * @returns {void}
 */
export function backupAndSetAsInitialized() {
  if (!window[MODULE.NAMESPACE].initialized) {
    window[MODULE.NAMESPACE].rawData = merge({}, game.wfrp4e.config.subspecies);
    window[MODULE.NAMESPACE].initialized = true;
  }
}

/**
 * @param {RawData} rawData
 * @returns {Collection}
 */
export function rawDataToFlatCollection(rawData) {
  const transformed = {};

  for (const [speciesId, speciesData] of Object.entries(rawData)) {
    transformed[speciesId] = [];
    const subspecies = Object.entries(speciesData);

    for (const [subspeciesId, subspeciesEntry] of subspecies) {
      transformed[speciesId].push({
        id: subspeciesId,
        ...subspeciesEntry,
      });
    }
  }

  return transformed;
}

/**
 * @param {CustomData} customData
 * @returns {Collection}
 */
export function customDataToFlatCollection(customData) {
  const transformed = {};

  for (const [, datasetData] of Object.entries(customData)) {
    if (!datasetData.species) {
      continue;
    }

    if (!transformed[datasetData.species]) {
      transformed[datasetData.species] = [];
    }

    for (const entry of datasetData.entries) {
      transformed[datasetData.species].push(entry);
    }
  }

  return transformed;
}

/**
 * @param {...Collection} collections
 * @returns {string[]}
 */
export function getUniqueSpeciesIds(...collections) {
  return collections
    .flatMap(Object.keys)
    .filter((val, idx, arr) => arr.indexOf(val) === idx)
    .sort();
}

/**
 * @param {Collection} collection
 * @returns {number}
 */
export function getTotalSubspecies(collection) {
  const existingEpeciesIds = Object.keys(collection);
  let total = 0;

  for (const especiesIds of existingEpeciesIds) {
    total += collection[especiesIds].length;
  }

  return total;
}

/**
 * @param {...Collection} collections
 * @returns {Collection}
 */
export function mergeCollections(...collections) {
  const result = {};
  const existingSpeciesIds = getUniqueSpeciesIds(...collections);

  for (const speciesId of existingSpeciesIds) {
    result[speciesId] = collections
      .flatMap(collection => collection[speciesId] || [])
      .sort(sortSubspeciesByName);
  }

  return result;
}

/**
 * @param {Collection} collection
 * @returns {RawData}
 */
export function flatCollectionToRawData(collection) {
  const transformed = {};

  for (const [speciesId, subspeciesEntries] of Object.entries(collection)) {
    transformed[speciesId] = subspeciesEntries.reduce((prev, subspecies) => {
      const { id, name, skills, talents } = subspecies;
      return {
        ...prev,
        [id]: {
          name,
          skills,
          talents,
        },
      };
    }, {});
  }

  return transformed;
}

/**
 * @returns {void}
 */
export function overrideSubspecies() {
  const customData = customDataToFlatCollection(window[MODULE.NAMESPACE].data);
  const totalCustomSubspecies = getTotalSubspecies(customData);

  if (totalCustomSubspecies === 0) {
    log(`Using only RAW subspecies`);
    game.wfrp4e.config.subspecies = window[MODULE.NAMESPACE].rawData;
    return;
  }

  const replaceRawData = window[MODULE.NAMESPACE].settings[SETTING_IDS.REPLACE_RAW_DATA];

  if (replaceRawData) {
    log(`Overriding RAW data`);
  }

  const rawData = replaceRawData
    ? {}
    : rawDataToFlatCollection(window[MODULE.NAMESPACE].rawData);

  const mergedData = mergeCollections(rawData, customData);
  game.wfrp4e.config.subspecies = flatCollectionToRawData(mergedData);

  log(`${totalCustomSubspecies} subspecies loaded`);
}
