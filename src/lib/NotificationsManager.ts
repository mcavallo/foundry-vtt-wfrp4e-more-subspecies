export class NotificationsManager {
  sendRenderingFailedError() {
    ui?.notifications?.error('Failed to render', {
      console: false,
    });
  }

  sendInvalidFileError() {
    ui?.notifications?.error('Invalid file. Only JSON files are supported', {
      console: false,
    });
  }

  sendInvalidFormatError() {
    ui?.notifications?.error(
      "Invalid dataset file. The format doesn't match the expected format. Please check the validation errors",
      {
        console: false,
      }
    );
  }

  sendInvalidDataError() {
    ui?.notifications?.error(
      'Invalid dataset file. There are some problems. Please check the validation errors',
      {
        console: false,
      }
    );
  }
}
