// @ts-expect-error this import has issues but the types are working fine
import type { ApplicationRenderOptions } from 'fvtt-types/src/foundry/client/applications/_types';
// @ts-expect-error this import has issues but the types are working fine
import type ApplicationV2 from 'fvtt-types/src/foundry/client/applications/api/application';
import { ImportDatasetDialog } from '@/apps/ImportDatasetDialog.ts';
import { MODULE, RERENDER_DEBOUNCE_TIME, SETTING_IDS } from '@/constants.ts';
import { DebouncedCallback } from '@/lib/DebouncedCallback';
import { Logger } from '@/lib/Logger.ts';
import { SettingsManager } from '@/lib/SettingsManager.ts';
import type { Dataset } from '@/lib/schemas.ts';
import { isInputEvent, namespacedId } from '@/lib/utils.ts';

interface DatasetInfo {
  id: string;
  name: string;
  species: string;
  enabled: boolean;
  custom: boolean;
  totalEntries: number;
}

interface DatasetsSettingRenderingContext {
  coreDatasets: DatasetInfo[];
  customDatasets: DatasetInfo[];
}

const appId = namespacedId('datasets-setting');

export class DatasetsSetting extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2<DatasetsSettingRenderingContext>
) {
  private debouncedReRender: DebouncedCallback<[DatasetsSetting]>;

  private lastKnownScrollTop: number;
  public readonly settings: SettingsManager;
  public readonly logger: Logger;

  static PARTS = {
    content: {
      template: `modules/${MODULE.ID}/templates/DatasetsSetting/content.hbs`,
    },
  };

  constructor(...options: ConstructorParameters<typeof ApplicationV2>) {
    super(...options);
    this.lastKnownScrollTop = 0;
    this.settings = window[MODULE.NAMESPACE].instance.settings;
    this.logger = window[MODULE.NAMESPACE].instance.logger;

    this.debouncedReRender = new DebouncedCallback((instance) => {
      void instance.render();
    }, RERENDER_DEBOUNCE_TIME);

    this._configureHooks();
  }

  _configureHooks() {
    Hooks.on('updateSetting', (setting) => {
      if (setting?.key === `${MODULE.ID}.${SETTING_IDS.CUSTOM_DATASETS}`) {
        this.debouncedReRender.run(this);
      }
    });
  }

  async _prepareContext(
    options: ApplicationV2.RenderContext
  ): Promise<DatasetsSettingRenderingContext> {
    let prevContext = await super._prepareContext(options);
    const enabledDatasets = new Set(this.settings.get(SETTING_IDS.ENABLED_DATASETS));
    const coreDatasets = this._mapDatasetsToDatasetInfo(
      window[MODULE.NAMESPACE].instance.coreDatasets,
      enabledDatasets
    );
    const customDatasets = this._mapDatasetsToDatasetInfo(
      this.settings.get(SETTING_IDS.CUSTOM_DATASETS),
      enabledDatasets
    );

    const newContext: Required<DatasetsSettingRenderingContext> = {
      coreDatasets,
      customDatasets,
    };
    return foundry.utils.mergeObject(prevContext, newContext);
  }

  _mapDatasetsToDatasetInfo(
    datasets: Dataset[],
    enabledDatasets: Set<string>
  ): DatasetInfo[] {
    return datasets.map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      species: dataset.species,
      enabled: enabledDatasets.has(dataset.id),
      custom: !dataset.id.startsWith('core.'),
      totalEntries: dataset.entries.length,
    }));
  }

  _initializeApplicationOptions(options: ApplicationV2.Configuration) {
    return super._initializeApplicationOptions(
      foundry.utils.mergeObject(options, {
        classes: [appId],
        id: appId,
        tag: 'form',
        position: {
          width: 600,
          height: 'auto' as ApplicationV2.Position,
        },
        window: {
          title: `${MODULE.NAME}: Configure Datasets`,
          minimizable: false,
          resizable: false,
        },
      })
    );
  }

  async _onRender(
    context: DatasetsSettingRenderingContext,
    options: ApplicationRenderOptions
  ) {
    this._restoreScrollPosition();

    this.element
      .querySelector('[data-action="importCustomDataset"]')
      ?.addEventListener('click', this._handleImportCustomDataset.bind(this));

    this.element
      .querySelectorAll('[data-action="removeCustomDataset"][data-id]')
      .forEach((el) => {
        el.addEventListener('click', this._handleRemoveCustomDataset.bind(this));
      });

    this.element.querySelectorAll('input[name="selectedDatasets"]').forEach((el) => {
      el.addEventListener('change', this._handleSelectionChange.bind(this));
    });
  }

  _restoreScrollPosition() {
    const scrollableContent = this.element.querySelector<HTMLDivElement>(
      '.window-content > .scrollable'
    );

    if (scrollableContent) {
      // Restore the scroll position
      if (this.lastKnownScrollTop > 0) {
        scrollableContent.scrollTop = this.lastKnownScrollTop;
      }

      // Record the scroll position
      scrollableContent.addEventListener('scroll', (e) => {
        if (e.target) {
          this.lastKnownScrollTop = (e.target as HTMLDivElement).scrollTop;
        }
      });
    }
  }

  _handleSelectionChange(e: Event) {
    if (isInputEvent(e)) {
      if (e.target.checked) {
        this.settings.enableDataset(e.target.value);
      } else {
        this.settings.disableDataset(e.target.value);
      }
    }
  }

  async _handleImportCustomDataset(e: Event) {
    const result = await this._promptCustomDatasetImport();

    if (!result || typeof result === 'string') {
      return;
    }

    this.logger.log(`Custom dataset '${result.id}' imported`);
    this.settings.addCustomDataset(result);
  }

  async _handleRemoveCustomDataset(e: Event) {
    const target = e.target as HTMLButtonElement;
    const id = target.dataset?.id;

    if (!id) {
      return;
    }

    const proceed = await foundry.applications.api.DialogV2.confirm({
      content: `Are you sure you want to remove the '${id}' dataset?`,
      rejectClose: false,
      modal: true,
    });

    if (proceed) {
      this.settings.disableDataset(id);
      this.settings.removeCustomDataset(id);
      this.logger.log(`Custom dataset '${id}' removed`);
    }
  }

  async _promptCustomDatasetImport() {
    return await ImportDatasetDialog.wait();
  }
}
