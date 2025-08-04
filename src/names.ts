/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */

import HTTPError from 'http-errors';

import fs from 'fs';
export const DATABASE_FILE = 'database.json';
const MAX_LENGTH = 20;
const MIN_LENGTH = 1;

// ========================================================================== //

interface Data {
  names: string[]
}

let dataStore: Data = {
  names: []
};

// ========================================================================== //
/**
 * HELPER FUNCTIONS

 * If there are multiple files that uses these functions, rather than redefining
 * them in each new file, it is better to move these helper functions into a
 * file of its own such as src/helper.ts, then export and import into other files.
 */

const getData = () => {
  return dataStore;
};

export const setData = (newData: Data) => {
  dataStore = newData;
  // Update our persistent data store with any data changes
  fs.writeFileSync(DATABASE_FILE, JSON.stringify(dataStore));
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
