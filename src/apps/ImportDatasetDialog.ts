// @ts-expect-error this import has issues but the types are working fine
import type DialogV2 from 'fvtt-types/src/foundry/client/applications/api/dialog';
import { ZodError } from 'zod';
import type { ZodSafeParseResult } from 'zod';
import type { output } from 'zod/v4/core';
// @ts-expect-error this import has issues but the types are working fine
import type { StandardSchemaV1 } from 'zod/v4/core/standard-schema';
import { MODULE } from '@/constants.ts';
import { type Dataset, DatasetSchema } from '@/lib/schemas.ts';
import { formatErrorsList, namespacedId } from '@/lib/utils.ts';

const appId = namespacedId('dataset-import');

interface ImportDatasetDialogRenderingContext {}

interface UISelectors {
  content: HTMLDivElement;
  errorDisplay: HTMLDivElement;
  selectionFile: HTMLDivElement;
  selectionClearButton: HTMLButtonElement;
  dropZone: HTMLDivElement;
  fileInput: HTMLInputElement;
  submit: HTMLButtonElement;
}

export class ImportDatasetDialog extends foundry.applications.api
  .DialogV2<ImportDatasetDialogRenderingContext> {
  public parsedDataset: Dataset | null = null;

  _initializeApplicationOptions(options: DialogV2.Configuration) {
    return super._initializeApplicationOptions(
      foundry.utils.mergeObject(options, {
        classes: [appId],
        id: appId,
        modal: true,
        focus: true,
        position: {
          width: 450,
          height: 'auto' as DialogV2.Position,
        },
        window: {
          title: `${MODULE.NAME}: Import Dataset`,
          resizable: false,
        },
      })
    );
  }

  async _parseDataset(file: File): Promise<ZodSafeParseResult<Dataset>> {
    try {
      const data = await foundry.utils.readTextFromFile(file).then(JSON.parse);
      return DatasetSchema.safeParse(data);
    } catch (err) {
      const error = new ZodError([
        {
          code: 'custom',
          path: [],
          message:
            err instanceof Error
              ? `File parse error: ${err.message}`
              : 'Unknown file parse error',
        },
      ]);

      return {
        success: false,
        error,
      } as ZodSafeParseResult<Dataset>;
    }
  }

  _validateDataset(data: Dataset) {
    const existingDatasetIds = window[MODULE.NAMESPACE].instance.getAllDatasetIds();
    const refinedSchema = DatasetSchema.extend({
      id: DatasetSchema.shape.id
        .refine((val) => !val.startsWith('core.'), {
          error: `The dataset id 'core' namespace is reserved`,
        })
        .refine((val) => !existingDatasetIds.includes(val), {
          error: 'The dataset id is taken',
        }),
    });

    return refinedSchema.safeParse(data);
  }

  _getUISelectors() {
    const selectors = {
      content: this.element.querySelector<HTMLDivElement>('.window-content'),
      errorDisplay: this.element.querySelector<HTMLDivElement>('.errorDisplay'),
      selectionFile: this.element.querySelector<HTMLDivElement>('.selection .file'),
      selectionClearButton: this.element.querySelector<HTMLButtonElement>(
        '.selection .selection-clear-button'
      ),
      dropZone: this.element.querySelector<HTMLDivElement>('.drop-zone'),
      fileInput: this.element.querySelector<HTMLInputElement>('input[type="file"]'),
      submit: this.element.querySelector<HTMLButtonElement>(
        '.form-footer button[data-action="import"]'
      ),
    };

    if (Object.values(selectors).some((v) => v === null)) {
      throw new Error();
    }

    return selectors as UISelectors;
  }

  _resetFormState($s: UISelectors) {
    $s.submit.disabled = true;
    $s.content.classList.remove('with-selection');
    $s.content.classList.remove('with-errors');
    $s.fileInput.value = '';
  }

  _setFileFieldValue(
    $s: UISelectors,
    value: FileList | null,
    triggerChange = false
  ) {
    if (value === null) {
      $s.fileInput.value = '';
    } else {
      $s.fileInput.files = value;
    }

    triggerChange &&
      $s.fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  _setSelectedFormState($s: UISelectors, fileName: string) {
    $s.selectionFile.innerHTML = fileName;
    $s.content.classList.add('with-selection');
    $s.content.classList.remove('with-errors');
    $s.submit.disabled = false;
  }

  async _setErrorFormState(
    $s: UISelectors,
    fileName: string,
    error: StandardSchemaV1.FailureResult
  ) {
    $s.errorDisplay.innerHTML = await foundry.applications.handlebars.renderTemplate(
      `modules/${MODULE.ID}/templates/DatasetsSetting/import-errors.hbs`,
      {
        fileName,
        errors: formatErrorsList(error),
      }
    );
    $s.submit.disabled = true;
    $s.content.classList.remove('with-selection');
    $s.content.classList.add('with-errors');
    $s.fileInput.value = '';
  }

  async _onRender() {
    try {
      const $s = this._getUISelectors();

      $s.dropZone.addEventListener('click', () => {
        $s.fileInput.click();
      });

      $s.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        $s.dropZone.classList.add('dragover');
      });

      $s.dropZone.addEventListener('dragleave', () => {
        $s.dropZone.classList.remove('dragover');
      });

      $s.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        $s.dropZone.classList.remove('dragover');
        const files = e?.dataTransfer?.files;

        if (files && files.length > 0) {
          this._setFileFieldValue($s, files, true);
        }
      });

      $s.selectionClearButton.addEventListener('click', (e) => {
        e.preventDefault();
        this._setFileFieldValue($s, null, true);
      });

      $s.fileInput.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target?.files?.[0];

        if (!file) {
          this._resetFormState($s);
          return;
        }

        if (file.type !== 'application/json' || !file.name.endsWith('.json')) {
          window[MODULE.NAMESPACE].instance.notifications.sendInvalidFileError();
          this._resetFormState($s);
          return;
        }

        const parseResult = await this._parseDataset(file);

        if (!parseResult.success) {
          window[MODULE.NAMESPACE].instance.notifications.sendInvalidFormatError();
          await this._setErrorFormState($s, file.name, parseResult.error);
          return;
        }

        const validationResult = this._validateDataset(parseResult.data);

        if (!validationResult.success) {
          window[MODULE.NAMESPACE].instance.notifications.sendInvalidDataError();
          await this._setErrorFormState($s, file.name, validationResult.error);
          return;
        }

        this._setSelectedFormState($s, file.name);
        this.parsedDataset = validationResult.data;
      });
    } catch {
      window[MODULE.NAMESPACE].instance.notifications.sendRenderingFailedError();
    }
  }

  static async wait<
    const Config extends DialogV2.WaitOptions<ImportDatasetDialog>,
  >(): Promise<DialogV2.WaitReturn<Config>> {
    return super.wait({
      content: await foundry.applications.handlebars.renderTemplate(
        `modules/${MODULE.ID}/templates/DatasetsSetting/import.hbs`,
        {}
      ),
      buttons: [
        {
          label: 'Cancel',
          action: 'no',
          callback: () => false,
        },
        {
          label: 'Import',
          action: 'import',
          // @ts-expect-error fix types
          disabled: true,
          callback: async (_event, _button, dialog): Promise<Dataset | null> => {
            return (dialog as ImportDatasetDialog).parsedDataset;
          },
        },
      ],
      close: () => null,
    });
  }
}
