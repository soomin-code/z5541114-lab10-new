"use strict";
/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setData = void 0;
exports.addName = addName;
exports.viewNames = viewNames;
exports.clear = clear;
const http_errors_1 = __importDefault(require("http-errors"));
const redis_1 = require("@upstash/redis");
// KV Database connection with improved timeout settings
const database = new redis_1.Redis({
    url: process.env.KV_REST_API_URL || 'https://adjusted-iguana-8721.upstash.io',
    token: process.env.KV_REST_API_TOKEN || 'ASIRAAIjcDFkNjkwY2ZkNzkwNTE0NDNkODEyYTNiYzE4ODZkMjYzM3AxMA',
    // 타임아웃 설정 개선 (30초)
    retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(1000 * 2 ** retryCount, 30000)
    }
});
const MAX_LENGTH = 20;
const MIN_LENGTH = 1;
// In-memory data store
let dataStore = {
    names: []
};
// ========================================================================== //
/**
 * HELPER FUNCTIONS
 */
const getData = () => {
    return dataStore;
};
const setData = (newData) => {
    dataStore = newData;
};
exports.setData = setData;
const checkValidName = (name) => {
    if (name.length < MIN_LENGTH || name.length > MAX_LENGTH) {
        throw (0, http_errors_1.default)(400, 'For our reference solution, we have restricted the length of the name' +
            ` to be between '${MIN_LENGTH}' and '${MAX_LENGTH}' characters. `);
    }
};
// KV 작업을 위한 헬퍼 함수 (타임아웃과 재시도 포함)
async function safeKVOperation(operation, fallback, operationName) {
    try {
        console.log(`${operationName}: Starting KV operation...`);
        // 20초 타임아웃 설정
        const result = await Promise.race([
            operation(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('KV operation timeout')), 20000))
        ]);
        console.log(`${operationName}: KV operation successful`);
        return result;
    }
    catch (error) {
        console.warn(`${operationName}: KV operation failed, using fallback:`, error);
        return fallback;
    }
}
// ========================================================================== //
// POST /add/name: (name: string) => {}
async function addName(name) {
    console.log('AddName function called (with improved KV):', name);
    checkValidName(name);
    // 메모리에 먼저 추가 (항상 성공)
    const data = getData();
    data.names.push(name);
    (0, exports.setData)(data);
    console.log('Name added to memory successfully');
    // KV에 저장 시도 (개선된 타임아웃과 재시도)
    await safeKVOperation(() => database.hset("data:names", { data: JSON.stringify(data) }), undefined, 'AddName');
    return {};
}
// GET /view/names: () => { names:  ['Adam', 'Ben', 'Carl'] }
async function viewNames() {
    console.log('ViewNames function called (with improved KV)');
    // 메모리 데이터 확인
    const memoryData = getData();
    console.log('Current memory data:', memoryData.names);
    // KV에서 데이터 로드 시도 (개선된 타임아웃과 재시도)
    const kvData = await safeKVOperation(() => database.hgetall("data:names"), null, 'ViewNames');
    if (kvData && kvData.data) {
        try {
            const parsedData = JSON.parse(kvData.data);
            console.log('KV data loaded and parsed successfully:', parsedData);
            (0, exports.setData)(parsedData);
            return { names: parsedData.names };
        }
        catch (parseError) {
            console.error('Failed to parse KV data, using memory:', parseError);
            return { names: memoryData.names };
        }
    }
    else {
        console.log('No valid KV data found, using memory data');
        return { names: memoryData.names };
    }
}
async function clear() {
    console.log('Clear function called (with improved KV)');
    // 메모리 먼저 클리어 (항상 성공)
    const data = getData();
    data.names = [];
    (0, exports.setData)(data);
    console.log('Memory cleared successfully');
    // KV도 클리어 시도 (개선된 타임아웃과 재시도)
    await safeKVOperation(() => database.hset("data:names", { data: JSON.stringify(data) }), undefined, 'Clear');
    return {};
}
//# sourceMappingURL=names.js.map