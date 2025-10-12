import { prettifyError } from 'zod';
// @ts-expect-error this import has issues but the types are working fine
import type { StandardSchemaV1 } from 'zod/v4/core/standard-schema';
import type { WFRP4EConfig } from '#/types/module.ts';
import { MODULE } from '@/constants.ts';

export const makeEmptyWFRPConfig = (): WFRP4EConfig => ({
  subspecies: {
    dwarf: {},
    familiar: {},
    gnome: {},
    halfling: {},
    helf: {},
    human: {},
    ogre: {},
    welf: {},
  },
});

export const isInputEvent = (
  e: Event
): e is Event & { target: HTMLInputElement } => {
  return e instanceof Event && e.target instanceof HTMLInputElement;
};

export const namespacedId = (id: string) => `${MODULE.ID}-${id}`;

export const formatErrorsList = (
  error: StandardSchemaV1.FailureResult
): string[] => {
  return prettifyError(error)
    .replaceAll('✖ ', '')
    .replaceAll('\n  →', '')
    .split(`\n`);
};

export function objectEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

export const pollForCondition = async ({
  id,
  delay,
  maxAttempts = Infinity,
  check,
}: {
  id: string;
  delay: number;
  maxAttempts?: number;
  check: () => boolean;
}) => {
  let checkCount = 0;
  let timeout: ReturnType<typeof setTimeout>;

  return new Promise((resolve, reject) => {
    function runCheck() {
      clearTimeout(timeout);
      checkCount++;

      if (check()) {
        return resolve(id);
      }

      if (checkCount >= maxAttempts) {
        return reject(id);
      }

      timeout = setTimeout(runCheck, delay);
    }

    runCheck();
  });
};

export const filterRejections = <T extends unknown>(
  results: PromiseSettledResult<unknown>[]
) =>
  results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
