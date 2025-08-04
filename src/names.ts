/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */

import HTTPError from 'http-errors';
import { Redis } from '@upstash/redis';

// KV Database connection with improved timeout settings
const database = new Redis({
  url: process.env.KV_REST_API_URL || 'https://adjusted-iguana-8721.upstash.io',
  token: process.env.KV_REST_API_TOKEN || 'ASIRAAIjcDFkNjkwY2ZkNzkwNTE0NDNkODEyYTNiYzE4ODZkMjYzM3AxMA',
  // 타임아웃 설정 개선 (30초)
  retry: {
    retries: 3,
    backoff: (retryCount: number) => Math.min(1000 * 2 ** retryCount, 30000)
  }
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

// KV 작업을 위한 헬퍼 함수 (타임아웃과 재시도 포함)
async function safeKVOperation<T>(operation: () => Promise<T>, fallback: T, operationName: string): Promise<T> {
  try {
    console.log(`${operationName}: Starting KV operation...`);
    
    // 20초 타임아웃 설정
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('KV operation timeout')), 20000)
      )
    ]);
    
    console.log(`${operationName}: KV operation successful`);
    return result;
  } catch (error) {
    console.warn(`${operationName}: KV operation failed, using fallback:`, error);
    return fallback;
  }
}

// ========================================================================== //
// POST /add/name: (name: string) => {}
export async function addName(name: string) {
  console.log('AddName function called (with improved KV):', name);
  checkValidName(name);
  
  // 메모리에 먼저 추가 (항상 성공)
  const data = getData();
  data.names.push(name);
  setData(data);
  console.log('Name added to memory successfully');
  
  // KV에 저장 시도 (개선된 타임아웃과 재시도)
  await safeKVOperation(
    () => database.hset("data:names", { data: JSON.stringify(data) }),
    undefined,
    'AddName'
  );
  
  return {};
}

// GET /view/names: () => { names:  ['Adam', 'Ben', 'Carl'] }
export async function viewNames() {
  console.log('ViewNames function called (with improved KV)');
  
  // 메모리 데이터 확인
  const memoryData = getData();
  console.log('Current memory data:', memoryData.names);
  
  // KV에서 데이터 로드 시도 (개선된 타임아웃과 재시도)
  const kvData = await safeKVOperation(
    () => database.hgetall("data:names"),
    null,
    'ViewNames'
  );
  
  if (kvData && (kvData as any).data) {
    try {
      const parsedData = JSON.parse((kvData as any).data as string);
      console.log('KV data loaded and parsed successfully:', parsedData);
      setData(parsedData);
      return { names: parsedData.names };
    } catch (parseError) {
      console.error('Failed to parse KV data, using memory:', parseError);
      return { names: memoryData.names };
    }
  } else {
    console.log('No valid KV data found, using memory data');
    return { names: memoryData.names };
  }
}

export async function clear() {
  console.log('Clear function called (with improved KV)');
  
  // 메모리 먼저 클리어 (항상 성공)
  const data = getData();
  data.names = [];
  setData(data);
  console.log('Memory cleared successfully');
  
  // KV도 클리어 시도 (개선된 타임아웃과 재시도)
  await safeKVOperation(
    () => database.hset("data:names", { data: JSON.stringify(data) }),
    undefined,
    'Clear'
  );
  
  return {};
}
