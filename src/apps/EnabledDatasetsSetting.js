import { MODULE, SETTING_IDS } from '../constants';

export class EnabledDatasetsSetting extends FormApplication {
  constructor() {
    super();
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['form', MODULE.ID],
      popOut: true,
      id: `${MODULE.ID}-enabled-datasets-setting`,
      title: `${MODULE.NAME} - Enabled Datasets`,
      template: `modules/${MODULE.ID}/templates/enabled-datasets-setting.hbs`,
      width: 400,
    });
  }

  getData() {
    const datasets = window[MODULE.NAMESPACE].availableDatasets;
    const checked = window[MODULE.NAMESPACE].settings[SETTING_IDS.ENABLED_DATASETS] || [];

    return {
      datasets: datasets.map(dataset => ({
        id: dataset.id,
        label: dataset.id,
        description: `version: ${dataset.hash}`,
        enabled: checked.includes(dataset.id),
      })),
    };
  }

  async _updateObject(event, formData) {
    if (event.submitter.name !== 'submit') {
      return;
    }

    const selectedDatasets = (formData.datasets || []).filter(Boolean);

    window[MODULE.NAMESPACE].saveSetting(SETTING_IDS.ENABLED_DATASETS, selectedDatasets);
  }
}
