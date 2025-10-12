import { MODULE } from '@/constants.ts';

export class Logger {
  private isEnabled: boolean = false;

  constructor() {}

  log(message: string, ...args: unknown[]): void {
    if (!this.isEnabled) {
      return;
    }

    console.log(
      `%c${MODULE.ID}` + `%c | ${message}`,
      'color: gold',
      'color: unset',
      ...args
    );
  }

  setIsEnabled(isEnabled: boolean) {
    this.isEnabled = isEnabled;
  }
}
