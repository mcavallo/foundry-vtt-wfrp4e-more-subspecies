import { MoreSubspeciesModule } from '@/lib/MoreSubspeciesModule.ts';
import { MODULE } from './constants.js';
import './module.scss';

Hooks.once('init', async () => {
  window[MODULE.NAMESPACE] = {
    instance: new MoreSubspeciesModule(),
  };
  await window[MODULE.NAMESPACE].instance.init();
});
