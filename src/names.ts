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
  checkValidName(name);
  
  try {
    // 현재 KV 데이터 로드
    console.log('Loading current data from KV for addName...');
    const kvData = await database.hgetall("data:names");
    
    let currentData: Data;
    if (kvData && kvData.data) {
      currentData = JSON.parse(kvData.data as string);
    } else {
      currentData = { names: [] };
    }
    
    // 새 이름 추가
    currentData.names.push(name);
    
    // 메모리에 저장
    setData(currentData);
    
    // KV에 저장
    await database.hset("data:names", { data: JSON.stringify(currentData) });
    console.log('Name added and saved to KV successfully');
    
    return {};
  } catch (error) {
    console.error('KV Save Error in addName:', error);
    // KV 실패해도 메모리는 저장
    const data = getData();
    data.names.push(name);
    setData(data);
    return {};
  }
}

// GET /view/names: () => { names:  ['Adam', 'Ben', 'Carl'] }
export async function viewNames() {
  try {
    // KV 데이터베이스에서 최신 데이터 로드
    console.log('Loading names from KV database...');
    const kvData = await database.hgetall("data:names");
    
    if (kvData && kvData.data) {
      const parsedData = JSON.parse(kvData.data as string);
      console.log('KV data loaded:', parsedData);
      // 메모리에 로드
      setData(parsedData);
      return { names: parsedData.names };
    } else {
      console.log('No KV data found, returning empty array');
      return { names: [] };
    }
  } catch (error) {
    console.error('KV Load Error in viewNames:', error);
    // KV 에러 시 현재 메모리 데이터 반환
    const data = getData();
    return { names: data.names };
  }
}

export async function clear() {
  try {
    const data = getData();
    data.names = [];
    setData(data);
    
    // KV에서도 클리어
    await database.hset("data:names", { data: JSON.stringify(data) });
    console.log('Data cleared from both memory and KV successfully');
    
    return {};
  } catch (error) {
    console.error('KV Clear Error:', error);
    // KV 실패해도 메모리는 클리어
    const data = getData();
    data.names = [];
    setData(data);
    return {};
  }
}
