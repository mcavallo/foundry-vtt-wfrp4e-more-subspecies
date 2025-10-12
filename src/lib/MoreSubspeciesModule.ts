import type { WFRP4EConfig } from '#/types/module.ts';
import {
  CORE_CHECK,
  SETTING_IDS,
  SUBSPECIES_ID_PREFIX,
  SUBSPECIES_NAME_PREFIX,
} from '@/constants.ts';
import bretonnianHumansDataset from '@/data/bretonnian-humans.json';
import estalianHumansDataset from '@/data/estalian-humans.json';
import imperialHumansDataset from '@/data/imperial-humans.json';
import kisleviteHumansDataset from '@/data/kislevite-humans.json';
import tileanHumansDataset from '@/data/tilean-humans.json';
import { HooksManager } from '@/lib/HooksManager.ts';
import { Logger } from '@/lib/Logger.ts';
import { NotificationsManager } from '@/lib/NotificationsManager.ts';
import { SettingsManager } from '@/lib/SettingsManager.ts';
import type { Dataset } from '@/lib/schemas.ts';
import {
  filterRejections,
  makeEmptyWFRPConfig,
  namespacedId,
  objectEntries,
  pollForCondition,
} from '@/lib/utils.ts';

export class MoreSubspeciesModule {
  public readonly coreDatasets: Dataset[];
  public readonly notifications: NotificationsManager;
  public readonly hooks: HooksManager;
  public readonly settings: SettingsManager;
  public readonly logger: Logger;

  constructor() {
    this.coreDatasets = [
      bretonnianHumansDataset,
      estalianHumansDataset,
      imperialHumansDataset,
      kisleviteHumansDataset,
      tileanHumansDataset,
    ] as Dataset[];
    this.notifications = new NotificationsManager();
    this.logger = new Logger();
    this.hooks = new HooksManager(this.logger);
    this.settings = new SettingsManager(this.hooks, this.logger);
  }

  async init() {
    this.logger.setIsEnabled(this.settings.get(SETTING_IDS.DEBUG_MODE));
    this.hooks.registerUpdateHandler(async () => {
      this._updateSystemConfig();
      this._setupStyleCustomizations();
    });

    const failedChecks = await Promise.allSettled([
      pollForCondition({
        id: 'core',
        delay: CORE_CHECK.DELAY,
        maxAttempts: CORE_CHECK.MAX_ATTEMPTS,
        check: this._isCoreAvailable.bind(this),
      }),
    ]).then(filterRejections);

    if (failedChecks.length > 0) {
      const reasons = failedChecks
        .map((failure) => String(failure.reason))
        .join(', ');
      this.logger.log(`Init failed. Reasons: ${reasons}`);
      return;
    }

    this.logger.log('Init completed');
    this.hooks.triggerUpdate();
  }

  _updateSystemConfig() {
    const stats = { added: 0, removed: 0 };
    let config = makeEmptyWFRPConfig();
    const enabledDatasets = this.settings.get(SETTING_IDS.ENABLED_DATASETS);
    this.logger.log(
      `Starting system data update with ${enabledDatasets.length} enabled datasets`
    );

    // Cleanup existing module subspecies in WFRP system config
    for (const [speciesId, speciesData] of objectEntries(
      game.wfrp4e!.config.subspecies
    )) {
      for (const subspeciesId in speciesData) {
        if (subspeciesId.startsWith(SUBSPECIES_ID_PREFIX)) {
          delete game.wfrp4e!.config.subspecies[speciesId][subspeciesId];
          stats.removed++;
          this.logger.log(`Removed: ${subspeciesId}`);
        }
      }
    }

    const allDatasets = this.getAllDatasets();

    // Add selected subspecies
    for (const dataset of allDatasets) {
      if (!enabledDatasets.includes(dataset.id)) {
        continue;
      }

      for (const entry of dataset.entries) {
        const id = `${SUBSPECIES_ID_PREFIX}${entry.id}`;
        const name = `${SUBSPECIES_NAME_PREFIX}${entry.name}`;

        config.subspecies![dataset.species][id] = {
          name,
          skills: entry.skills,
          talents: entry.talents,
        };
        stats.added++;
        this.logger.log(`Added: ${dataset.id} > ${entry.id}`);
      }
    }

    // Strip empty subspecies from the temporary config object
    for (const [key, value] of objectEntries(config.subspecies)) {
      if (Object.keys(value).length === 0) {
        delete config.subspecies[key];
      }
    }

    // Commit temporary config changes
    foundry.utils.mergeObject(game.wfrp4e!.config, config);
    this.logger.log(`System data updated (+${stats.added} -${stats.removed})`);
  }

  _setupStyleCustomizations() {
    document.body.classList.toggle(
      namespacedId('custom-styles'),
      this.settings.get(SETTING_IDS.STYLE_CHARGEN)
    );
    document.body.classList.toggle(
      namespacedId('hide-raw'),
      this.settings.get(SETTING_IDS.HIDE_RAW)
    );
  }

  _isCoreAvailable() {
    return (
      typeof game.wfrp4e !== 'undefined' &&
      typeof game.wfrp4e.config !== 'undefined' &&
      typeof game.wfrp4e.config.subspecies !== 'undefined'
    );
  }

  getAllDatasets() {
    return this.coreDatasets.concat(this.settings.get(SETTING_IDS.CUSTOM_DATASETS));
  }

  getAllDatasetIds() {
    return this.getAllDatasets().map((item) => item.id);
  }
}
