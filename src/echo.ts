/**
 * This file contains the logic of the route `/echo/echo`
 * @module echo
 */

import HTTPError from 'http-errors';

export function echo(message: string) {
  if (message === 'echo') {
    throw HTTPError(400, "Cannot echo 'echo' lolsss!");
  }
  return {
    message,
  };
}
