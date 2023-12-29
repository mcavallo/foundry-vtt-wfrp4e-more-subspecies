import { MODULE } from '../constants';

export function consoleLog(message, args) {
  console.log(
    `%c${MODULE.ID}` + `%c | ${message}`,
    'color: gold',
    'color: unset',
    args || ''
  );
}
