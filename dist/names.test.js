"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sync_request_1 = __importDefault(require("sync-request"));
const submission_1 = require("./submission");
// ========================================================================= //
// Helpers
const parseResponse = (res, path) => {
    let caughtError = "Unknown error";
    let dpst1093Hint = "No hint available for this error";
    const body = res.body.toString();
    try {
        // Try returning JSON
        const jsonBody = JSON.parse(body);
        if ("error" in jsonBody && ![400].includes(res.statusCode)) {
            caughtError = `Returned error object with status code ${res.statusCode}`;
            dpst1093Hint =
                "For lab10_deploy, the only acceptable status code for error cases is 400. " +
                    "Since you returned { error: 'some message' } with a status code other than 400, the test fails";
        }
        else {
            return jsonBody;
        }
    }
    catch (e) {
        caughtError = e.message;
        if (res.statusCode === 404) {
            caughtError = `Missing route ${path} | ` + caughtError;
            dpst1093Hint = `The route '${path}' does not exist on your server (i.e. in server.ts). Check that you do not have any typos and your routes begin with a '/'`;
        }
        else if (res.statusCode === 500) {
            dpst1093Hint =
                "Your server has crashed. Check the terminal running the server to see the error stack trace";
        }
        else {
            dpst1093Hint =
                "Your routes may not be returning a valid JSON response - for example, the /clear should still return an empty object `{}` instead of undefined.";
        }
    }
    const ret = {
        testName: expect.getState().currentTestName,
        returnedBody: body,
        statusCode: res.statusCode,
        caughtError,
        dpst1093Hint,
    };
    console.log("Logging Error:", ret);
    return ret;
};
const requestHelper = (method, path, payload) => {
    let qs = {};
    let json = {};
    if (["GET", "DELETE"].includes(method)) {
        qs = payload;
    }
    else {
        // PUT/POST
        json = payload;
    }
    const res = (0, sync_request_1.default)(method, submission_1.DEPLOYED_URL + path, {
        qs,
        json,
        timeout: 60000,
    });
    return parseResponse(res, path);
};
// ========================================================================= //
function clear() {
    return requestHelper("DELETE", "/clear", {});
}
function root() {
    return requestHelper("GET", "/", {});
}
function echo(message) {
    return requestHelper("GET", "/echo/echo", { message });
}
function addName(name) {
    return requestHelper("POST", "/add/name", { name });
}
function viewNames() {
    return requestHelper("GET", "/view/names", {});
}
// ========================================================================= //
beforeEach(clear);
afterAll(clear);
describe("Deployed URL Sanity check", () => {
    test("Looks for exactly one zID in the URL", () => {
        const zIDs = submission_1.DEPLOYED_URL.match(/z[0-9]{7}/g) || [];
        // URL Sanity test
        expect(zIDs.length).toEqual(1);
        expect(submission_1.DEPLOYED_URL.startsWith("http")).toBe(true);
        expect(submission_1.DEPLOYED_URL.endsWith("/")).toBe(false);
        if (process.env.GITLAB_USER_LOGIN) {
            // Pipeline CI test
            expect(zIDs[0]).toEqual(process.env.GITLAB_USER_LOGIN);
        }
    });
});
describe("/", () => {
    test("success", () => {
        expect(root()).toStrictEqual({ message: expect.any(String) });
    });
});
describe("/echo", () => {
    test("success", () => {
        expect(echo("helloworld")).toStrictEqual({ message: "helloworld" });
    });
    test("failure", () => {
        expect(echo("echo")).toStrictEqual({ error: expect.any(String) });
    });
});
describe("/clear", () => {
    test("return empty", () => {
        expect(clear()).toStrictEqual({});
    });
    test("clear post", () => {
        addName("Hayden");
        expect(viewNames().names.length).toEqual(1);
        expect(clear()).toStrictEqual({});
        expect(viewNames()).toStrictEqual({ names: [] });
    });
});
describe("/add/name", () => {
    describe("errors", () => {
        test.each([{ name: "" }, { name: "a".repeat(21) }])("addName('$name') incorrect name length", ({ name }) => {
            expect(addName(name)).toStrictEqual({ error: expect.any(String) });
        });
    });
    describe("success", () => {
        test("adding a name", () => {
            expect(addName("Emily")).toStrictEqual({});
        });
    });
});
describe("/view/names", () => {
    test("empty state", () => {
        expect(viewNames()).toStrictEqual({ names: [] });
    });
    test("one name", () => {
        addName("Tam");
        expect(viewNames()).toStrictEqual({ names: ["Tam"] });
    });
    test("multiple names", () => {
        addName("Tam");
        addName("Rani");
        addName("Emily");
        addName("Brendan");
        expect(viewNames()).toEqual({ names: ["Tam", "Rani", "Emily", "Brendan"] });
    });
});
//# sourceMappingURL=names.test.js.map