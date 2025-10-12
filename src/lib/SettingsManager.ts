import type { ModuleSettingId, ModuleSettings } from '#/types/module.ts';
import { DatasetsSetting } from '@/apps/DatasetsSetting';
import {
  DEFAULT_SETTINGS,
  FOUNDRY_SETTING_IDS,
  MODULE,
  SETTINGS_UPDATE_DEBOUNCE_TIME,
  SETTING_IDS,
} from '@/constants.ts';
import type { HooksManager } from '@/lib/HooksManager.ts';
import { Logger } from '@/lib/Logger.ts';
import type { Dataset } from '@/lib/schemas.ts';

type a = typeof SETTING_IDS;

export class SettingsManager {
  private updateTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  private settings: ModuleSettings = DEFAULT_SETTINGS;

  constructor(
    private readonly hooks: HooksManager,
    private readonly logger: Logger
  ) {
    this._registerSettings();
    this._computeAndUpdateSettings();
  }

  get<K extends ModuleSettingId>(key: K) {
    return this.settings[key];
  }

  set<K extends ModuleSettingId>(key: K, value: ModuleSettings[K]) {
    // @ts-expect-error fix types
    void game.settings.set(MODULE.ID, key, value);
    this.logger.log(`Setting '${key}' updated`);
  }

  enableDataset(id: string) {
    const newValue = new Set(this.settings[SETTING_IDS.ENABLED_DATASETS]);
    newValue.add(id);
    this.set(SETTING_IDS.ENABLED_DATASETS, Array.from(newValue));
  }

  disableDataset(id: string) {
    const newValue = new Set(this.settings[SETTING_IDS.ENABLED_DATASETS]);
    newValue.delete(id);
    this.set(SETTING_IDS.ENABLED_DATASETS, Array.from(newValue));
  }

  addCustomDataset(dataset: Dataset) {
    const newValue = this.settings[SETTING_IDS.CUSTOM_DATASETS];
    newValue.push(dataset);
    this.set(SETTING_IDS.CUSTOM_DATASETS, newValue);
  }

  removeCustomDataset(id: string) {
    const newValue = this.settings[SETTING_IDS.CUSTOM_DATASETS].filter(
      (dataset) => dataset.id !== id
    );
    this.set(SETTING_IDS.CUSTOM_DATASETS, newValue);
  }

  _registerSettings() {
    const commonOptions = {
      scope: 'world',
      restricted: true,
      onChange: this._updateSettings.bind(this),
    };

    game.settings.registerMenu(MODULE.ID, SETTING_IDS.ENABLED_DATASETS + 'Menu', {
      name: 'Datasets',
      label: 'Configure Datasets',
      hint: 'Manage which subspecies are allowed in your game. Also lets you add your own custom subspecies.',
      icon: 'fa fa-list-check',
      type: DatasetsSetting,
      restricted: true,
    });

    // @ts-expect-error fix types
    game.settings.register(MODULE.ID, SETTING_IDS.ENABLED_DATASETS, {
      config: false,
      type: Array,
      default: DEFAULT_SETTINGS[SETTING_IDS.ENABLED_DATASETS],
      ...commonOptions,
    });

    // @ts-expect-error fix types
    game.settings.register(MODULE.ID, SETTING_IDS.CUSTOM_DATASETS, {
      config: false,
      type: Array,
      default: DEFAULT_SETTINGS[SETTING_IDS.CUSTOM_DATASETS],
      ...commonOptions,
    });

    // @ts-expect-error fix types
    game.settings.register(MODULE.ID, SETTING_IDS.HIDE_RAW, {
      name: 'Hide RAW subspecies',
      hint: 'Hide RAW subspecies in the WFRP 4E character generator. Useful for overriding a RAW subspecies with a homebrew version.',
      config: true,
      type: Boolean,
      default: DEFAULT_SETTINGS[SETTING_IDS.HIDE_RAW],
      ...commonOptions,
    });

    // @ts-expect-error fix types
    game.settings.register(MODULE.ID, SETTING_IDS.STYLE_CHARGEN, {
      name: 'Add custom styles',
      hint: 'Apply custom styles to the WFRP 4E character generator. Helps visually distinguish RAW subspecies from homebrew ones.',
      config: true,
      type: Boolean,
      default: DEFAULT_SETTINGS[SETTING_IDS.STYLE_CHARGEN],
      ...commonOptions,
    });

    // @ts-expect-error fix types
    game.settings.register(MODULE.ID, SETTING_IDS.DEBUG_MODE, {
      name: 'Debug Mode',
      hint: 'Log debug messages to the browser console.',
      config: true,
      type: Boolean,
      default: DEFAULT_SETTINGS[SETTING_IDS.DEBUG_MODE],
      ...commonOptions,
    });
  }

  _computeAndUpdateSettings() {
    this.settings = this._computeSettings();
    this.logger.log('Settings computed');
  }

  _updateSettings() {
    clearTimeout(this.updateTimeout);

    this.updateTimeout = setTimeout(() => {
      this._computeAndUpdateSettings();
      this.hooks.triggerUpdate();
    }, SETTINGS_UPDATE_DEBOUNCE_TIME);
  }

  _computeSettings(): ModuleSettings {
    return FOUNDRY_SETTING_IDS.reduce(
      (accum, value) => ({
        ...accum,
        // @ts-expect-error fix types
        [value]: game.settings.get(MODULE.ID, value),
      }),
      DEFAULT_SETTINGS
    );
  }
}
