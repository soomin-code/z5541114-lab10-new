/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */

import HTTPError from 'http-errors';
import { Redis } from '@upstash/redis';

// KV Database connection using environment variables
const database = Redis.fromEnv();

const MAX_LENGTH = 20;
const MIN_LENGTH = 1;

// ========================================================================== //

interface Data {
  names: string[]
}

// In-memory data store
let dataStore: Data = {
  names: []
};

// ========================================================================== //
/**
 * HELPER FUNCTIONS
 */

const getData = (): Data => {
  return dataStore;
};

export const setData = (newData: Data) => {
  dataStore = newData;
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
export async function addName(name: string) {
  console.log('AddName function called - DEBUG VERSION:', name);
  
  checkValidName(name);
  
  try {
    const data = getData();
    data.names.push(name);
    setData(data);
    
    console.log('Name added to memory successfully');
    return {};
  } catch (error) {
    console.error('AddName Error (even without KV):', error);
    return {};
  }
}

// GET /view/names: () => { names:  ['Adam', 'Ben', 'Carl'] }
export async function viewNames() {
  console.log('ViewNames function called - DEBUG VERSION');
  
  try {
    const data = getData();
    console.log('Returning memory data:', data.names);
    return { names: data.names };
  } catch (error) {
    console.error('ViewNames Error (even without KV):', error);
    return { names: [] };
  }
}

export async function clear() {
  console.log('Clear function called - DEBUG VERSION');
  
  try {
    const data = getData();
    data.names = [];
    setData(data);
    
    console.log('Memory cleared successfully');
    return {};
  } catch (error) {
    console.error('Clear Error (even without KV):', error);
    return {};
  }
}
