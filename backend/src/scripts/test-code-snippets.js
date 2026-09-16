import assert from "node:assert";
import {
    normalizeRequest,
    generateCurlSnippet,
    generateFetchSnippet,
    generatePythonSnippet,
    generateAxiosSnippet,
    generateRawHttpSnippet,
    generateSnippet,
    highlightCode,
} from "../../../frontend/src/features/requests/snippet-generator.js";

console.log("========================================");
console.log("Running Feature 7: Code Snippet Generation Tests");
console.log("========================================\n");

// 1. GET Request with Query Parameters
console.log("[1] Testing GET request with Query Parameters...");
const getReq = {
    method: "GET",
    url: "https://api.example.com/users",
    queryParams: [
        { key: "role", value: "admin", enabled: true },
        { key: "active", value: "true", enabled: true },
        { key: "ignored", value: "false", enabled: false },
    ],
    headers: [
        { key: "Accept", value: "application/json", enabled: true },
    ],
};

const curlGet = generateSnippet("curl", getReq);
assert(curlGet.includes("curl --location"), "cURL should include --location");
assert(curlGet.includes("'https://api.example.com/users?role=admin&active=true'"), "cURL should assemble query string");
assert(!curlGet.includes("ignored=false"), "cURL should exclude disabled query parameters");
assert(curlGet.includes("--header 'Accept: application/json'"), "cURL should include header");

const fetchGet = generateSnippet("javascript-fetch", getReq);
assert(fetchGet.includes('fetch("https://api.example.com/users?role=admin&active=true"'), "Fetch should target full URL");
assert(fetchGet.includes('myHeaders.append("Accept", "application/json");'), "Fetch should append header");
assert(!fetchGet.includes("body:"), "GET request in fetch should not have body");

const pythonGet = generateSnippet("python-requests", getReq);
assert(pythonGet.includes('requests.request("GET", url,'), "Python requests should call GET");
assert(pythonGet.includes('"Accept": "application/json"'), "Python requests should include headers");

console.log("✓ GET with query parameters passed for cURL, Fetch, and Python.\n");

// 2. POST Request with JSON Body & Custom Headers
console.log("[2] Testing POST request with JSON Body & Custom Headers...");
const postReq = {
    method: "POST",
    url: "https://api.example.com/posts",
    queryParams: [],
    headers: [
        { key: "X-Custom-Header", value: "CustomVal123", enabled: true },
    ],
    bodyType: "json",
    bodyContent: JSON.stringify({ title: "Hello World", count: 42 }),
};

const curlPost = generateSnippet("curl", postReq);
assert(curlPost.includes("--request POST"), "cURL should specify POST method");
assert(curlPost.includes("--header 'Content-Type: application/json'"), "cURL should auto-add application/json header");
assert(curlPost.includes("--header 'X-Custom-Header: CustomVal123'"), "cURL should include custom header");
assert(curlPost.includes("--data-raw '{\"title\":\"Hello World\",\"count\":42}'"), "cURL should include data-raw");

const fetchPost = generateSnippet("javascript-fetch", postReq);
assert(fetchPost.includes('method: "POST"'), "Fetch should specify POST method");
assert(fetchPost.includes("body: raw"), "Fetch should attach body");
assert(fetchPost.includes('const raw = JSON.stringify({"title":"Hello World","count":42});'), "Fetch should serialize json");

const pythonPost = generateSnippet("python-requests", postReq);
assert(pythonPost.includes('requests.request("POST", url,'), "Python requests should specify POST");
assert(pythonPost.includes("payload = json.dumps("), "Python requests should format json payload");

const axiosPost = generateSnippet("nodejs-axios", postReq);
assert(axiosPost.includes("method: 'post'"), "Axios should specify post method");
assert(axiosPost.includes("data: data"), "Axios should attach data");

console.log("✓ POST with JSON body and custom headers passed across all languages.\n");

// 3. Bearer Token Authentication
console.log("[3] Testing Bearer Token Authentication...");
const bearerReq = {
    method: "GET",
    url: "https://api.example.com/me",
    auth: {
        type: "bearer",
        config: { token: "secret_jwt_token_98765" },
    },
};

const curlBearer = generateSnippet("curl", bearerReq, { maskSecrets: false });
assert(curlBearer.includes("--header 'Authorization: Bearer secret_jwt_token_98765'"), "Bearer token attached to cURL");

const curlBearerMasked = generateSnippet("curl", bearerReq, { maskSecrets: true });
assert(curlBearerMasked.includes("--header 'Authorization: Bearer <BEARER_TOKEN>'"), "Bearer token masked in cURL");
assert(!curlBearerMasked.includes("secret_jwt_token_98765"), "Raw token not exposed when masked");

console.log("✓ Bearer Token authentication and secret masking verified.\n");

// 4. Basic Authentication
console.log("[4] Testing Basic Authentication...");
const basicReq = {
    method: "GET",
    url: "https://api.example.com/secure",
    auth: {
        type: "basic",
        config: { username: "admin", password: "superSecretPassword" },
    },
};

const fetchBasic = generateSnippet("javascript-fetch", basicReq, { maskSecrets: false });
assert(fetchBasic.includes("Basic YWRtaW46c3VwZXJTZWNyZXRQYXNzd29yZA=="), "Basic auth base64 encoded");

const fetchBasicMasked = generateSnippet("javascript-fetch", basicReq, { maskSecrets: true });
assert(fetchBasicMasked.includes("Basic <BASIC_AUTH_TOKEN>"), "Basic auth masked");
assert(!fetchBasicMasked.includes("superSecretPassword"), "Raw password not exposed when masked");

console.log("✓ Basic Authentication passed.\n");

// 5. API Key Authentication (Header and Query Params)
console.log("[5] Testing API Key Authentication (Header and Query Params)...");
const apiKeyHeaderReq = {
    method: "GET",
    url: "https://api.example.com/data",
    auth: {
        type: "apiKey",
        config: { key: "X-API-KEY", value: "live_secret_key_111", addTo: "header" },
    },
};

const curlApiKeyHeader = generateSnippet("curl", apiKeyHeaderReq, { maskSecrets: false });
assert(curlApiKeyHeader.includes("--header 'X-API-KEY: live_secret_key_111'"), "API Key attached in header");

const apiKeyQueryReq = {
    method: "GET",
    url: "https://api.example.com/data",
    auth: {
        type: "apiKey",
        config: { key: "api_key", value: "live_secret_key_222", addTo: "queryParams" },
    },
};

const curlApiKeyQuery = generateSnippet("curl", apiKeyQueryReq, { maskSecrets: false });
assert(curlApiKeyQuery.includes("api_key=live_secret_key_222"), "API Key attached in query param");

const curlApiKeyQueryMasked = generateSnippet("curl", apiKeyQueryReq, { maskSecrets: true });
assert(curlApiKeyQueryMasked.includes("api_key=%3CAPI_KEY%3E") || curlApiKeyQueryMasked.includes("api_key=<API_KEY>"), "API Key masked in query param");

console.log("✓ API Key in header & query parameters verified.\n");

// 6. Environment Variables (Resolved vs Raw Template Mode)
console.log("[6] Testing Environment Variable resolution...");
const envReq = {
    method: "GET",
    url: "{{baseUrl}}/api/v1/users/{{userId}}",
    queryParams: [
        { key: "filter", value: "{{defaultFilter}}", enabled: true },
    ],
    headers: [
        { key: "Authorization", value: "Bearer {{userToken}}", enabled: true },
    ],
};

const variablesMap = {
    baseUrl: "http://localhost:8000",
    userId: "usr_9988",
    defaultFilter: "active_only",
    userToken: "resolved_jwt_var_abc",
};

// Mode A: Resolved
const resolvedSnippet = generateSnippet("curl", envReq, {
    resolveVariables: true,
    variablesMap,
});
assert(resolvedSnippet.includes("http://localhost:8000/api/v1/users/usr_9988?filter=active_only"), "Variables resolved in URL and query params");
assert(resolvedSnippet.includes("Bearer resolved_jwt_var_abc"), "Variables resolved in headers");

// Mode B: Unresolved / Template Mode
const rawTemplateSnippet = generateSnippet("curl", envReq, {
    resolveVariables: false,
    variablesMap,
});
assert(rawTemplateSnippet.includes("{{baseUrl}}/api/v1/users/{{userId}}"), "Template placeholders preserved when resolveVariables=false");
assert(rawTemplateSnippet.includes("Bearer {{userToken}}"), "Header template preserved");

console.log("✓ Environment variable substitution (both resolved & template modes) verified.\n");

// 7. Syntax Highlighter Unit Test
console.log("[7] Testing Vanilla Syntax Highlighter...");
const highlighted = highlightCode("curl --location 'https://api.example.com'", "curl");
assert(highlighted.includes('class="tok-keyword">curl</span>'), "curl command highlighted");
assert(highlighted.includes('class="tok-flag">--location</span>'), "flags highlighted");
assert(highlighted.includes('class="tok-string">'), "string highlighted");

const highlightedPy = highlightCode("import requests\nresponse = requests.request('GET', url)", "python");
assert(highlightedPy.includes('class="tok-keyword">import</span>'), "Python import highlighted");

console.log("✓ Vanilla Syntax Highlighter tokenization verified.\n");

// 8. Raw HTTP Request Generation
console.log("[8] Testing Raw HTTP Request Generation...");
const rawHttp = generateSnippet("raw-http", postReq);
assert(rawHttp.startsWith("POST /posts HTTP/1.1"), "Raw HTTP starts with request line");
assert(rawHttp.includes("Host: api.example.com"), "Raw HTTP includes Host header");
assert(rawHttp.includes(postReq.bodyContent), "Raw HTTP includes body content");

console.log("✓ Raw HTTP Request generation verified.\n");

console.log("========================================");
console.log("ALL CODE SNIPPET GENERATION TESTS PASSED!");
console.log("========================================\n");
