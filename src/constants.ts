import type { ModuleSettings } from '#/types/module.ts';

export const MODULE = {
  NAME: 'WFRP4e - More Subspecies',
  ID: 'wfrp4e-more-subspecies',
  NAMESPACE: 'wfrp4eMoreSubspecies',
} as const;

export const CORE_CHECK = {
  DELAY: 200,
  MAX_ATTEMPTS: 60,
} as const;

export const SETTING_IDS = {
  CUSTOM_DATASETS: 'customDataSets',
  DEBUG_MODE: 'debugMode',
  ENABLED_DATASETS: 'enabledDataSets',
  HIDE_RAW: 'hideRaw',
  STYLE_CHARGEN: 'styleChargen',
} as const;

export const FOUNDRY_SETTING_IDS = [
  SETTING_IDS.CUSTOM_DATASETS,
  SETTING_IDS.DEBUG_MODE,
  SETTING_IDS.ENABLED_DATASETS,
  SETTING_IDS.HIDE_RAW,
  SETTING_IDS.STYLE_CHARGEN,
] as const;

export const DEFAULT_SETTINGS: ModuleSettings = {
  [SETTING_IDS.CUSTOM_DATASETS]: [],
  [SETTING_IDS.DEBUG_MODE]: false,
  [SETTING_IDS.ENABLED_DATASETS]: [],
  [SETTING_IDS.HIDE_RAW]: false,
  [SETTING_IDS.STYLE_CHARGEN]: true,
};

export const SUBSPECIES_ID_PREFIX = 'ms_';
export const SUBSPECIES_NAME_PREFIX = '*';
export const SETTINGS_UPDATE_DEBOUNCE_TIME = 100;
export const RERENDER_DEBOUNCE_TIME = 100;
