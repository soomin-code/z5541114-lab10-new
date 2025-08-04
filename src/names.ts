/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */

import HTTPError from 'http-errors';
import { Redis } from '@upstash/redis';

// KV Database connection using explicit configuration
const database = new Redis({
  url: process.env.KV_REST_API_URL || 'https://adjusted-iguana-8721.upstash.io',
  token: process.env.KV_REST_API_TOKEN || 'ASIRAAIjcDFkNjkwY2ZkNzkwNTE0NDNkODEyYTNiYzE4ODZkMjYzM3AxMA',
});

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
  
  // 메모리에 먼저 추가 (항상 성공)
  const data = getData();
  data.names.push(name);
  setData(data);
  console.log('Name added to memory successfully');
  
  // KV에 저장 시도 (실패해도 무시)
  try {
    await database.hset("data:names", { data: JSON.stringify(data) });
    console.log('Name saved to KV successfully');
  } catch (kvError) {
    console.warn('KV save failed, but memory is updated:', kvError);
  }
  
  return {};
}

// GET /view/names: () => { names:  ['Adam', 'Ben', 'Carl'] }
export async function viewNames() {
  console.log('ViewNames function called');
  
  // 메모리 데이터 먼저 확인
  const memoryData = getData();
  console.log('Current memory data:', memoryData.names);
  
  // KV에서 데이터 로드 시도
  try {
    console.log('Attempting to load from KV...');
    const kvData = await database.hgetall("data:names");
    
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
    return { names: memoryData.names };
  }
}

export async function clear() {
  console.log('Clear function called');
  
  // 메모리 먼저 클리어 (항상 성공)
  const data = getData();
  data.names = [];
  setData(data);
  console.log('Memory cleared successfully');
  
  // KV도 클리어 시도 (실패해도 무시)
  try {
    await database.hset("data:names", { data: JSON.stringify(data) });
    console.log('KV cleared successfully');
  } catch (kvError) {
    console.warn('KV clear failed, but memory is cleared:', kvError);
  }
  
  return {};
}
