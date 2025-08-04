/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */

import HTTPError from 'http-errors';
import request, { HttpVerb } from 'sync-request';
// Ensure that your DEPLOYED_URL has been updated correctly
import { DEPLOYED_URL } from './submission';

const MAX_LENGTH = 20;
const MIN_LENGTH = 1;

// ========================================================================== //

interface Data {
  names: string[]
}

// ========================================================================== //
/**
 * HELPER FUNCTIONS

 * If there are multiple files that uses these functions, rather than redefining
 * them in each new file, it is better to move these helper functions into a
 * file of its own such as src/helper.ts, then export and import into other files.
 */

const requestHelper = (method: HttpVerb, path: string, payload: object) => {
  let json = {};
  let qs = {};
  if (['POST', 'DELETE'].includes(method)) {
    qs = payload;
  } else {
    json = payload;
  }

  const res = request(method, DEPLOYED_URL + path, { qs, json, timeout: 20000 });
  return JSON.parse(res.body.toString());
};

const getData = (): Data => {
  try {
    const res = requestHelper('GET', '/data', {});
    return res.data;
  } catch (e) {
    return { names: [] };
  }
};

export const setData = (newData: Data) => {
  requestHelper('PUT', '/data', { data: newData });
};

const checkValidName = (name: string) => {
  if (name.length < MIN_LENGTH || name.length > MAX_LENGTH) {
    throw HTTPError(400,
      'For our reference solution, we have restricted the length of the name' +
      ` to be between '${MIN_LENGTH}' and '${MAX_LENGTH}' characters. `
    );
  }
};

// ========================================================================== //
// POST /add/name: (name: string) => {}
export function addName(name: string) {
  checkValidName(name);
  const data = getData();
  data.names.push(name);
  setData(data);
  return {};
}
// GET /view/names: () => { names:  ['Adam', 'Ben', 'Carl'] }
export function viewNames() {
  const data = getData();
  return { names: data.names };
}

export function clear() {
  const data = getData();
  data.names = [];
  setData(data);
  return {};
}
