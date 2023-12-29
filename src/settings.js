import { EnabledDatasetsSetting } from './apps/EnabledDatasetsSetting';
import { FOUNDRY_SETTING_IDS, MODULE, SETTING_IDS } from './constants';
import { debounce } from './lib/utils';

export function computeSettings() {
  const baseSettings = FOUNDRY_SETTING_IDS.reduce(
    (accum, value) => ({
      ...accum,
      [value]: game.settings.get(MODULE.ID, value),
    }),
    {}
  );

  return {
    ...baseSettings,
    [SETTING_IDS.FORM_SETTINGS]: {
      width: 500,
      height: 380,
    },
  };
}

export function updateSettings() {
  window[MODULE.NAMESPACE].settings = computeSettings();
  Hooks.call(`${MODULE.ID}:init`);
}

const debouncedUpdateSettings = debounce(updateSettings);

export function registerSettings() {
  game.settings.registerMenu(MODULE.ID, SETTING_IDS.ENABLED_DATASETS + 'Menu', {
    name: 'Enabled Datasets',
    label: 'Configure Datasets',
    hint: 'Whether the available datasets should be allowed in your game.',
    icon: 'fa fa-list-check',
    type: EnabledDatasetsSetting,
    restricted: true,
  });

  game.settings.register(MODULE.ID, SETTING_IDS.ENABLED_DATASETS, {
    scope: 'world',
    config: false,
    type: Array,
    default: [],
    onChange: debouncedUpdateSettings,
  });

  game.settings.register(MODULE.ID, SETTING_IDS.REPLACE_RAW_DATA, {
    name: 'Replace RAW data',
    hint: 'Whether the homebrew subspecies should replace the RAW subspecies.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: debouncedUpdateSettings,
  });

  game.settings.register(MODULE.ID, SETTING_IDS.DEBUG_MODE, {
    name: 'Debug Mode',
    hint: 'Whether if the module logs debug messages to the browser console.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: debouncedUpdateSettings,
  });

  return computeSettings();
}

export function saveSetting(key, value) {
  game.settings.set(MODULE.ID, key, value);
}
