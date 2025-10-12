import { SETTING_IDS } from '@/constants.ts';
import type { MoreSubspeciesModule } from '@/lib/MoreSubspeciesModule.ts';
import type { Dataset, SpeciesEnum, Subspecies } from '@/lib/schemas.ts';

export interface ModuleWindow {
  instance: MoreSubspeciesModule;
}

export interface WFRP4EConfig {
  subspecies: SubspeciesConfig;
}

export type SubspeciesConfig = {
  [K in SpeciesEnum]: Record<string, Subspecies>;
};

export type ModuleSettingId = (typeof SETTING_IDS)[keyof typeof SETTING_IDS];

export type ModuleSettings = {
  [SETTING_IDS.CUSTOM_DATASETS]: Dataset[];
  [SETTING_IDS.DEBUG_MODE]: boolean;
  [SETTING_IDS.ENABLED_DATASETS]: string[];
  [SETTING_IDS.HIDE_RAW]: boolean;
  [SETTING_IDS.STYLE_CHARGEN]: boolean;
};
