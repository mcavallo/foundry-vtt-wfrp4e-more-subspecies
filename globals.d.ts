import type { ModuleWindow, WFRP4EConfig } from '#/types/module.ts';
import { MODULE } from '@/constants';

export {};

declare module 'bun' {
  interface Env {
    DEV?: string;
    FOUNDRY_DATA_PATH: string;
    FOUNDRY_RELEASE_TOKEN: string;
    GH_API_TOKEN?: string;
    OSTYPE: string;
    RELEASE_VERSION?: string;
  }
}

declare global {
  type Require<C, K extends keyof C> = Partial<C> & Pick<C, K>;

  const game: Game & {
    wfrp4e?: {
      config: WFRP4EConfig;
    };
  };

  interface Window {
    [MODULE.NAMESPACE]: ModuleWindow;
  }
}
