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
  console.log('AddName function called:', name);
  
  checkValidName(name);
  
  try {
    // 메모리에 먼저 추가
    const data = getData();
    data.names.push(name);
    setData(data);
    console.log('Name added to memory successfully');
    
    // KV에 저장 시도 (타임아웃 5초)
    try {
      await Promise.race([
        database.hset("data:names", { data: JSON.stringify(data) }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('KV timeout')), 5000)
        )
      ]);
      console.log('Name saved to KV successfully');
    } catch (kvError) {
      console.warn('KV save failed, but memory is updated:', kvError);
    }
    
    return {};
  } catch (error) {
    console.error('AddName Error:', error);
    return {};
  }
}

// GET /view/names: () => { names:  ['Adam', 'Ben', 'Carl'] }
export async function viewNames() {
  console.log('ViewNames function called');
  
  try {
    // 먼저 메모리 데이터 확인
    const memoryData = getData();
    console.log('Current memory data:', memoryData.names);
    
    // KV에서 데이터 로드 시도 (타임아웃 5초)
    console.log('Attempting to load from KV...');
    const kvData = await Promise.race([
      database.hgetall("data:names"),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('KV timeout')), 5000)
      )
    ]);
    
    if (kvData && (kvData as any).data) {
      const parsedData = JSON.parse((kvData as any).data as string);
      console.log('KV data loaded successfully:', parsedData);
      setData(parsedData);
      return { names: parsedData.names };
    } else {
      console.log('No KV data found, using memory data');
      return { names: memoryData.names };
    }
  } catch (error) {
    console.error('KV error, falling back to memory:', error);
    const memoryData = getData();
    return { names: memoryData.names };
  }
}

export async function clear() {
  console.log('Clear function called');
  
  try {
    // 메모리 먼저 클리어
    const data = getData();
    data.names = [];
    setData(data);
    console.log('Memory cleared successfully');
    
    // KV도 클리어 시도 (타임아웃 5초)
    try {
      await Promise.race([
        database.hset("data:names", { data: JSON.stringify(data) }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('KV timeout')), 5000)
        )
      ]);
      console.log('KV cleared successfully');
    } catch (kvError) {
      console.warn('KV clear failed, but memory is cleared:', kvError);
    }
    
    return {};
  } catch (error) {
    console.error('Clear Error:', error);
    return {};
  }
}
