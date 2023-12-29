import { CORE_CHECK, MODULE } from './constants';
import {
  backupAndSetAsInitialized,
  fetchModuleData,
  log,
  overrideSubspecies,
  waitForCore,
} from './lib/utils';
import { registerSettings, saveSetting } from './settings';

import availableDatasets from './data/manifest.json';
import './styles/module.scss';

Hooks.on(`${MODULE.ID}:init`, async () => {
  log(`Hook: ${MODULE.ID}:init`);
  try {
    await fetchModuleData();
    backupAndSetAsInitialized();
    overrideSubspecies();
  } catch (err) {
    ui.notifications.error(`Module ${MODULE.ID} could not be loaded. Check your log.`);
    log(`Error`, err);
  }
});

Hooks.on('init', async () => {
  const initialSettings = registerSettings();

  window[MODULE.NAMESPACE] = {
    availableDatasets: availableDatasets.entries,
    data: {},
    initialized: false,
    rawData: null,
    saveSetting: saveSetting, // Avoid using object property shorthand
    settings: initialSettings,
  };

  log(`Hook: init`);

  try {
    const wasCoreLoaded = await waitForCore(CORE_CHECK.DELAY, CORE_CHECK.MAX_ATTEMPTS);

    if (wasCoreLoaded) {
      log(`Core loaded`);
      Hooks.call(`${MODULE.ID}:init`);
    } else {
      throw new Error(`WFRP4E core didn't load in time.`);
    }
  } catch (err) {
    ui.notifications.error(`Module ${MODULE.ID} could not be loaded. Check your log.`);
    log(`Error`, err);
  }
});
