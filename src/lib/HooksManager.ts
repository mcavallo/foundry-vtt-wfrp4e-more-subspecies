import { MODULE } from '@/constants.ts';
import { Logger } from '@/lib/Logger.ts';

export class HooksManager {
  private readonly hooks = {
    UPDATE: `${MODULE.ID}:update`,
  } as const;

  constructor(private readonly logger: Logger) {}

  triggerUpdate() {
    // @ts-expect-error fix types
    Hooks.call(`${MODULE.ID}:update`);
    this.logger.log(`Called hook '${this.hooks.UPDATE}'`);
  }

  registerUpdateHandler(handler: () => Promise<void>) {
    // @ts-expect-error fix types
    Hooks.on(this.hooks.UPDATE, handler);
    this.logger.log(`Registered hook '${this.hooks.UPDATE}'`);
  }
}
