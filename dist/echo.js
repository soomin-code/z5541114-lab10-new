"use strict";
/**
 * This file contains the logic of the route `/echo/echo`
 * @module echo
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.echo = echo;
const http_errors_1 = __importDefault(require("http-errors"));
function echo(message) {
    if (message === 'echo') {
        throw (0, http_errors_1.default)(400, "Cannot echo 'echo' lolsss!");
    }
    return {
        message,
    };
}
//# sourceMappingURL=echo.js.map