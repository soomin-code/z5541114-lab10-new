/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */
interface Data {
    names: string[];
}
export declare const setData: (newData: Data) => void;
export declare function addName(name: string): Promise<{}>;
export declare function viewNames(): Promise<{
    names: any;
}>;
export declare function clear(): Promise<{}>;
export {};
