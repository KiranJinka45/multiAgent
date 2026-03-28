"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/lib/buffer_utils.js
var encoder, decoder, MAX_INT32;
var init_buffer_utils = __esm({
  "../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/lib/buffer_utils.js"() {
    "use strict";
    encoder = new TextEncoder();
    decoder = new TextDecoder();
    MAX_INT32 = 2 ** 32;
  }
});

// ../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/runtime/base64url.js
function normalize(input) {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  return encoded;
}
var import_buffer, encode, decode;
var init_base64url = __esm({
  "../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/runtime/base64url.js"() {
    "use strict";
    import_buffer = require("buffer");
    init_buffer_utils();
    if (import_buffer.Buffer.isEncoding("base64url")) {
      encode = (input) => import_buffer.Buffer.from(input).toString("base64url");
    } else {
      encode = (input) => import_buffer.Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    decode = (input) => import_buffer.Buffer.from(normalize(input), "base64");
  }
});

// ../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/util/errors.js
var init_errors = __esm({
  "../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/util/errors.js"() {
    "use strict";
  }
});

// ../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/util/base64url.js
var base64url_exports = {};
__export(base64url_exports, {
  decode: () => decode2,
  encode: () => encode2
});
var encode2, decode2;
var init_base64url2 = __esm({
  "../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/util/base64url.js"() {
    "use strict";
    init_base64url();
    encode2 = encode;
    decode2 = decode;
  }
});

// ../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/index.js
var init_esm = __esm({
  "../../node_modules/.pnpm/jose@4.15.9/node_modules/jose/dist/node/esm/index.js"() {
    "use strict";
    init_errors();
    init_base64url2();
  }
});

// ../../node_modules/.pnpm/@supabase+auth-helpers-shared@0.7.0_@supabase+supabase-js@2.100.0/node_modules/@supabase/auth-helpers-shared/dist/index.mjs
var dist_exports = {};
__export(dist_exports, {
  BrowserCookieAuthStorageAdapter: () => BrowserCookieAuthStorageAdapter,
  CookieAuthStorageAdapter: () => CookieAuthStorageAdapter,
  DEFAULT_COOKIE_OPTIONS: () => DEFAULT_COOKIE_OPTIONS,
  createSupabaseClient: () => createSupabaseClient,
  isBrowser: () => isBrowser,
  parseCookies: () => export_parseCookies,
  parseSupabaseCookie: () => parseSupabaseCookie,
  serializeCookie: () => export_serializeCookie,
  stringifySupabaseSession: () => stringifySupabaseSession
});
function parseSupabaseCookie(str) {
  if (!str) {
    return null;
  }
  try {
    const session = JSON.parse(str);
    if (!session) {
      return null;
    }
    if (session.constructor.name === "Object") {
      return session;
    }
    if (session.constructor.name !== "Array") {
      throw new Error(`Unexpected format: ${session.constructor.name}`);
    }
    const [_header, payloadStr, _signature] = session[0].split(".");
    const payload = base64url_exports.decode(payloadStr);
    const decoder2 = new TextDecoder();
    const { exp, sub, ...user } = JSON.parse(decoder2.decode(payload));
    return {
      expires_at: exp,
      expires_in: exp - Math.round(Date.now() / 1e3),
      token_type: "bearer",
      access_token: session[0],
      refresh_token: session[1],
      provider_token: session[2],
      provider_refresh_token: session[3],
      user: {
        id: sub,
        factors: session[4],
        ...user
      }
    };
  } catch (err) {
    console.warn("Failed to parse cookie string:", err);
    return null;
  }
}
function stringifySupabaseSession(session) {
  var _a;
  return JSON.stringify([
    session.access_token,
    session.refresh_token,
    session.provider_token,
    session.provider_refresh_token,
    ((_a = session.user) == null ? void 0 : _a.factors) ?? null
  ]);
}
function isBrowser() {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}
function createChunkRegExp(chunkSize) {
  return new RegExp(".{1," + chunkSize + "}", "g");
}
function createChunks(key, value, chunkSize) {
  const re = chunkSize !== void 0 ? createChunkRegExp(chunkSize) : MAX_CHUNK_REGEXP;
  const chunkCount = Math.ceil(value.length / (chunkSize ?? MAX_CHUNK_SIZE));
  if (chunkCount === 1) {
    return [{ name: key, value }];
  }
  const chunks = [];
  const values = value.match(re);
  values == null ? void 0 : values.forEach((value2, i) => {
    const name = `${key}.${i}`;
    chunks.push({ name, value: value2 });
  });
  return chunks;
}
function combineChunks(key, retrieveChunk = () => {
  return null;
}) {
  let values = [];
  for (let i = 0; ; i++) {
    const chunkName = `${key}.${i}`;
    const chunk = retrieveChunk(chunkName);
    if (!chunk) {
      break;
    }
    values.push(chunk);
  }
  return values.length ? values.join("") : null;
}
function createSupabaseClient(supabaseUrl, supabaseKey, options) {
  var _a;
  const browser = isBrowser();
  return (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
    ...options,
    auth: {
      flowType: "pkce",
      autoRefreshToken: browser,
      detectSessionInUrl: browser,
      persistSession: true,
      storage: options.auth.storage,
      // fix this in supabase-js
      ...((_a = options.auth) == null ? void 0 : _a.storageKey) ? {
        storageKey: options.auth.storageKey
      } : {}
    }
  });
}
var import_supabase_js, __create2, __defProp2, __getOwnPropDesc2, __getOwnPropNames2, __getProtoOf2, __hasOwnProp2, __commonJS2, __copyProps2, __toESM2, require_cookie, import_cookie2, import_cookie, DEFAULT_COOKIE_OPTIONS, MAX_CHUNK_SIZE, MAX_CHUNK_REGEXP, CookieAuthStorageAdapter, BrowserCookieAuthStorageAdapter, export_parseCookies, export_serializeCookie;
var init_dist = __esm({
  "../../node_modules/.pnpm/@supabase+auth-helpers-shared@0.7.0_@supabase+supabase-js@2.100.0/node_modules/@supabase/auth-helpers-shared/dist/index.mjs"() {
    "use strict";
    init_esm();
    import_supabase_js = require("@supabase/supabase-js");
    __create2 = Object.create;
    __defProp2 = Object.defineProperty;
    __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    __getOwnPropNames2 = Object.getOwnPropertyNames;
    __getProtoOf2 = Object.getPrototypeOf;
    __hasOwnProp2 = Object.prototype.hasOwnProperty;
    __commonJS2 = (cb, mod) => function __require() {
      return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    };
    __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    require_cookie = __commonJS2({
      "../../node_modules/.pnpm/cookie@0.5.0/node_modules/cookie/index.js"(exports2) {
        "use strict";
        exports2.parse = parse3;
        exports2.serialize = serialize3;
        var __toString = Object.prototype.toString;
        var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
        function parse3(str, options) {
          if (typeof str !== "string") {
            throw new TypeError("argument str must be a string");
          }
          var obj = {};
          var opt = options || {};
          var dec = opt.decode || decode3;
          var index = 0;
          while (index < str.length) {
            var eqIdx = str.indexOf("=", index);
            if (eqIdx === -1) {
              break;
            }
            var endIdx = str.indexOf(";", index);
            if (endIdx === -1) {
              endIdx = str.length;
            } else if (endIdx < eqIdx) {
              index = str.lastIndexOf(";", eqIdx - 1) + 1;
              continue;
            }
            var key = str.slice(index, eqIdx).trim();
            if (void 0 === obj[key]) {
              var val = str.slice(eqIdx + 1, endIdx).trim();
              if (val.charCodeAt(0) === 34) {
                val = val.slice(1, -1);
              }
              obj[key] = tryDecode(val, dec);
            }
            index = endIdx + 1;
          }
          return obj;
        }
        function serialize3(name, val, options) {
          var opt = options || {};
          var enc = opt.encode || encode3;
          if (typeof enc !== "function") {
            throw new TypeError("option encode is invalid");
          }
          if (!fieldContentRegExp.test(name)) {
            throw new TypeError("argument name is invalid");
          }
          var value = enc(val);
          if (value && !fieldContentRegExp.test(value)) {
            throw new TypeError("argument val is invalid");
          }
          var str = name + "=" + value;
          if (null != opt.maxAge) {
            var maxAge = opt.maxAge - 0;
            if (isNaN(maxAge) || !isFinite(maxAge)) {
              throw new TypeError("option maxAge is invalid");
            }
            str += "; Max-Age=" + Math.floor(maxAge);
          }
          if (opt.domain) {
            if (!fieldContentRegExp.test(opt.domain)) {
              throw new TypeError("option domain is invalid");
            }
            str += "; Domain=" + opt.domain;
          }
          if (opt.path) {
            if (!fieldContentRegExp.test(opt.path)) {
              throw new TypeError("option path is invalid");
            }
            str += "; Path=" + opt.path;
          }
          if (opt.expires) {
            var expires = opt.expires;
            if (!isDate(expires) || isNaN(expires.valueOf())) {
              throw new TypeError("option expires is invalid");
            }
            str += "; Expires=" + expires.toUTCString();
          }
          if (opt.httpOnly) {
            str += "; HttpOnly";
          }
          if (opt.secure) {
            str += "; Secure";
          }
          if (opt.priority) {
            var priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
            switch (priority) {
              case "low":
                str += "; Priority=Low";
                break;
              case "medium":
                str += "; Priority=Medium";
                break;
              case "high":
                str += "; Priority=High";
                break;
              default:
                throw new TypeError("option priority is invalid");
            }
          }
          if (opt.sameSite) {
            var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
            switch (sameSite) {
              case true:
                str += "; SameSite=Strict";
                break;
              case "lax":
                str += "; SameSite=Lax";
                break;
              case "strict":
                str += "; SameSite=Strict";
                break;
              case "none":
                str += "; SameSite=None";
                break;
              default:
                throw new TypeError("option sameSite is invalid");
            }
          }
          return str;
        }
        function decode3(str) {
          return str.indexOf("%") !== -1 ? decodeURIComponent(str) : str;
        }
        function encode3(val) {
          return encodeURIComponent(val);
        }
        function isDate(val) {
          return __toString.call(val) === "[object Date]" || val instanceof Date;
        }
        function tryDecode(str, decode22) {
          try {
            return decode22(str);
          } catch (e) {
            return str;
          }
        }
      }
    });
    import_cookie2 = __toESM2(require_cookie());
    import_cookie = __toESM2(require_cookie());
    DEFAULT_COOKIE_OPTIONS = {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 1e3
    };
    MAX_CHUNK_SIZE = 3180;
    MAX_CHUNK_REGEXP = createChunkRegExp(MAX_CHUNK_SIZE);
    CookieAuthStorageAdapter = class {
      constructor(cookieOptions) {
        this.cookieOptions = {
          ...DEFAULT_COOKIE_OPTIONS,
          ...cookieOptions,
          maxAge: DEFAULT_COOKIE_OPTIONS.maxAge
        };
      }
      getItem(key) {
        const value = this.getCookie(key);
        if (key.endsWith("-code-verifier") && value) {
          return value;
        }
        if (value) {
          return JSON.stringify(parseSupabaseCookie(value));
        }
        const chunks = combineChunks(key, (chunkName) => {
          return this.getCookie(chunkName);
        });
        return chunks !== null ? JSON.stringify(parseSupabaseCookie(chunks)) : null;
      }
      setItem(key, value) {
        if (key.endsWith("-code-verifier")) {
          this.setCookie(key, value);
          return;
        }
        let session = JSON.parse(value);
        const sessionStr = stringifySupabaseSession(session);
        const sessionChunks = createChunks(key, sessionStr);
        sessionChunks.forEach((sess) => {
          this.setCookie(sess.name, sess.value);
        });
      }
      removeItem(key) {
        this._deleteSingleCookie(key);
        this._deleteChunkedCookies(key);
      }
      _deleteSingleCookie(key) {
        if (this.getCookie(key)) {
          this.deleteCookie(key);
        }
      }
      _deleteChunkedCookies(key, from = 0) {
        for (let i = from; ; i++) {
          const cookieName = `${key}.${i}`;
          const value = this.getCookie(cookieName);
          if (value === void 0) {
            break;
          }
          this.deleteCookie(cookieName);
        }
      }
    };
    BrowserCookieAuthStorageAdapter = class extends CookieAuthStorageAdapter {
      constructor(cookieOptions) {
        super(cookieOptions);
      }
      getCookie(name) {
        if (!isBrowser())
          return null;
        const cookies = (0, import_cookie2.parse)(document.cookie);
        return cookies[name];
      }
      setCookie(name, value) {
        if (!isBrowser())
          return null;
        document.cookie = (0, import_cookie2.serialize)(name, value, {
          ...this.cookieOptions,
          httpOnly: false
        });
      }
      deleteCookie(name) {
        if (!isBrowser())
          return null;
        document.cookie = (0, import_cookie2.serialize)(name, "", {
          ...this.cookieOptions,
          maxAge: 0,
          httpOnly: false
        });
      }
    };
    export_parseCookies = import_cookie.parse;
    export_serializeCookie = import_cookie.serialize;
  }
});

// ../../node_modules/.pnpm/set-cookie-parser@2.7.2/node_modules/set-cookie-parser/lib/set-cookie.js
var require_set_cookie = __commonJS({
  "../../node_modules/.pnpm/set-cookie-parser@2.7.2/node_modules/set-cookie-parser/lib/set-cookie.js"(exports2, module2) {
    "use strict";
    var defaultParseOptions = {
      decodeValues: true,
      map: false,
      silent: false
    };
    function isForbiddenKey(key) {
      return typeof key !== "string" || key in {};
    }
    function createNullObj() {
      return /* @__PURE__ */ Object.create(null);
    }
    function isNonEmptyString(str) {
      return typeof str === "string" && !!str.trim();
    }
    function parseString(setCookieValue, options) {
      var parts = setCookieValue.split(";").filter(isNonEmptyString);
      var nameValuePairStr = parts.shift();
      var parsed = parseNameValuePair(nameValuePairStr);
      var name = parsed.name;
      var value = parsed.value;
      options = options ? Object.assign({}, defaultParseOptions, options) : defaultParseOptions;
      if (isForbiddenKey(name)) {
        return null;
      }
      try {
        value = options.decodeValues ? decodeURIComponent(value) : value;
      } catch (e) {
        console.error(
          "set-cookie-parser: failed to decode cookie value. Set options.decodeValues=false to disable decoding.",
          e
        );
      }
      var cookie = createNullObj();
      cookie.name = name;
      cookie.value = value;
      parts.forEach(function(part) {
        var sides = part.split("=");
        var key = sides.shift().trimLeft().toLowerCase();
        if (isForbiddenKey(key)) {
          return;
        }
        var value2 = sides.join("=");
        if (key === "expires") {
          cookie.expires = new Date(value2);
        } else if (key === "max-age") {
          var n = parseInt(value2, 10);
          if (!Number.isNaN(n)) cookie.maxAge = n;
        } else if (key === "secure") {
          cookie.secure = true;
        } else if (key === "httponly") {
          cookie.httpOnly = true;
        } else if (key === "samesite") {
          cookie.sameSite = value2;
        } else if (key === "partitioned") {
          cookie.partitioned = true;
        } else if (key) {
          cookie[key] = value2;
        }
      });
      return cookie;
    }
    function parseNameValuePair(nameValuePairStr) {
      var name = "";
      var value = "";
      var nameValueArr = nameValuePairStr.split("=");
      if (nameValueArr.length > 1) {
        name = nameValueArr.shift();
        value = nameValueArr.join("=");
      } else {
        value = nameValuePairStr;
      }
      return { name, value };
    }
    function parse(input, options) {
      options = options ? Object.assign({}, defaultParseOptions, options) : defaultParseOptions;
      if (!input) {
        if (!options.map) {
          return [];
        } else {
          return createNullObj();
        }
      }
      if (input.headers) {
        if (typeof input.headers.getSetCookie === "function") {
          input = input.headers.getSetCookie();
        } else if (input.headers["set-cookie"]) {
          input = input.headers["set-cookie"];
        } else {
          var sch = input.headers[Object.keys(input.headers).find(function(key) {
            return key.toLowerCase() === "set-cookie";
          })];
          if (!sch && input.headers.cookie && !options.silent) {
            console.warn(
              "Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."
            );
          }
          input = sch;
        }
      }
      if (!Array.isArray(input)) {
        input = [input];
      }
      if (!options.map) {
        return input.filter(isNonEmptyString).map(function(str) {
          return parseString(str, options);
        }).filter(Boolean);
      } else {
        var cookies = createNullObj();
        return input.filter(isNonEmptyString).reduce(function(cookies2, str) {
          var cookie = parseString(str, options);
          if (cookie && !isForbiddenKey(cookie.name)) {
            cookies2[cookie.name] = cookie;
          }
          return cookies2;
        }, cookies);
      }
    }
    function splitCookiesString(cookiesString) {
      if (Array.isArray(cookiesString)) {
        return cookiesString;
      }
      if (typeof cookiesString !== "string") {
        return [];
      }
      var cookiesStrings = [];
      var pos = 0;
      var start;
      var ch;
      var lastComma;
      var nextStart;
      var cookiesSeparatorFound;
      function skipWhitespace() {
        while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
          pos += 1;
        }
        return pos < cookiesString.length;
      }
      function notSpecialChar() {
        ch = cookiesString.charAt(pos);
        return ch !== "=" && ch !== ";" && ch !== ",";
      }
      while (pos < cookiesString.length) {
        start = pos;
        cookiesSeparatorFound = false;
        while (skipWhitespace()) {
          ch = cookiesString.charAt(pos);
          if (ch === ",") {
            lastComma = pos;
            pos += 1;
            skipWhitespace();
            nextStart = pos;
            while (pos < cookiesString.length && notSpecialChar()) {
              pos += 1;
            }
            if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
              cookiesSeparatorFound = true;
              pos = nextStart;
              cookiesStrings.push(cookiesString.substring(start, lastComma));
              start = pos;
            } else {
              pos = lastComma + 1;
            }
          } else {
            pos += 1;
          }
        }
        if (!cookiesSeparatorFound || pos >= cookiesString.length) {
          cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
        }
      }
      return cookiesStrings;
    }
    module2.exports = parse;
    module2.exports.parse = parse;
    module2.exports.parseString = parseString;
    module2.exports.splitCookiesString = splitCookiesString;
  }
});

// ../../node_modules/.pnpm/@supabase+auth-helpers-nextjs@0.10.0_@supabase+supabase-js@2.100.0/node_modules/@supabase/auth-helpers-nextjs/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/.pnpm/@supabase+auth-helpers-nextjs@0.10.0_@supabase+supabase-js@2.100.0/node_modules/@supabase/auth-helpers-nextjs/dist/index.js"(exports2, module2) {
    "use strict";
    var __defProp3 = Object.defineProperty;
    var __getOwnPropDesc3 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames3 = Object.getOwnPropertyNames;
    var __hasOwnProp3 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp3(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps3 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames3(from))
          if (!__hasOwnProp3.call(to, key) && key !== except)
            __defProp3(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc3(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps3(__defProp3({}, "__esModule", { value: true }), mod);
    var src_exports = {};
    __export2(src_exports, {
      createBrowserSupabaseClient: () => createBrowserSupabaseClient2,
      createClientComponentClient: () => createClientComponentClient2,
      createMiddlewareClient: () => createMiddlewareClient2,
      createMiddlewareSupabaseClient: () => createMiddlewareSupabaseClient,
      createPagesBrowserClient: () => createPagesBrowserClient,
      createPagesServerClient: () => createPagesServerClient,
      createRouteHandlerClient: () => createRouteHandlerClient2,
      createServerActionClient: () => createServerActionClient,
      createServerComponentClient: () => createServerComponentClient,
      createServerSupabaseClient: () => createServerSupabaseClient2
    });
    module2.exports = __toCommonJS2(src_exports);
    var import_auth_helpers_shared = (init_dist(), __toCommonJS(dist_exports));
    var supabase;
    function createClientComponentClient2({
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions,
      isSingleton = true
    } = {}) {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!"
        );
      }
      const createNewClient = () => {
        var _a;
        return (0, import_auth_helpers_shared.createSupabaseClient)(supabaseUrl, supabaseKey, {
          ...options,
          global: {
            ...options == null ? void 0 : options.global,
            headers: {
              ...(_a = options == null ? void 0 : options.global) == null ? void 0 : _a.headers,
              "X-Client-Info": `${"@supabase/auth-helpers-nextjs"}@${"0.10.0"}`
            }
          },
          auth: {
            storage: new import_auth_helpers_shared.BrowserCookieAuthStorageAdapter(cookieOptions)
          }
        });
      };
      if (isSingleton) {
        const _supabase = supabase ?? createNewClient();
        if (typeof window === "undefined")
          return _supabase;
        if (!supabase)
          supabase = _supabase;
        return supabase;
      }
      return createNewClient();
    }
    var createPagesBrowserClient = createClientComponentClient2;
    var import_auth_helpers_shared2 = (init_dist(), __toCommonJS(dist_exports));
    var import_set_cookie_parser = require_set_cookie();
    var NextServerAuthStorageAdapter = class extends import_auth_helpers_shared2.CookieAuthStorageAdapter {
      constructor(context, cookieOptions) {
        super(cookieOptions);
        this.context = context;
      }
      getCookie(name) {
        var _a, _b, _c;
        const setCookie = (0, import_set_cookie_parser.splitCookiesString)(
          ((_b = (_a = this.context.res) == null ? void 0 : _a.getHeader("set-cookie")) == null ? void 0 : _b.toString()) ?? ""
        ).map((c) => (0, import_auth_helpers_shared2.parseCookies)(c)[name]).find((c) => !!c);
        const value = setCookie ?? ((_c = this.context.req) == null ? void 0 : _c.cookies[name]);
        return value;
      }
      setCookie(name, value) {
        this._setCookie(name, value);
      }
      deleteCookie(name) {
        this._setCookie(name, "", {
          maxAge: 0
        });
      }
      _setCookie(name, value, options) {
        var _a;
        const setCookies = (0, import_set_cookie_parser.splitCookiesString)(
          ((_a = this.context.res.getHeader("set-cookie")) == null ? void 0 : _a.toString()) ?? ""
        ).filter((c) => !(name in (0, import_auth_helpers_shared2.parseCookies)(c)));
        const cookieStr = (0, import_auth_helpers_shared2.serializeCookie)(name, value, {
          ...this.cookieOptions,
          ...options,
          // Allow supabase-js on the client to read the cookie as well
          httpOnly: false
        });
        this.context.res.setHeader("set-cookie", [...setCookies, cookieStr]);
      }
    };
    function createPagesServerClient(context, {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions
    } = {}) {
      var _a;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!"
        );
      }
      return (0, import_auth_helpers_shared2.createSupabaseClient)(supabaseUrl, supabaseKey, {
        ...options,
        global: {
          ...options == null ? void 0 : options.global,
          headers: {
            ...(_a = options == null ? void 0 : options.global) == null ? void 0 : _a.headers,
            "X-Client-Info": `${"@supabase/auth-helpers-nextjs"}@${"0.10.0"}`
          }
        },
        auth: {
          storage: new NextServerAuthStorageAdapter(context, cookieOptions)
        }
      });
    }
    var import_auth_helpers_shared3 = (init_dist(), __toCommonJS(dist_exports));
    var import_set_cookie_parser2 = require_set_cookie();
    var NextMiddlewareAuthStorageAdapter = class extends import_auth_helpers_shared3.CookieAuthStorageAdapter {
      constructor(context, cookieOptions) {
        super(cookieOptions);
        this.context = context;
      }
      getCookie(name) {
        var _a;
        const setCookie = (0, import_set_cookie_parser2.splitCookiesString)(
          ((_a = this.context.res.headers.get("set-cookie")) == null ? void 0 : _a.toString()) ?? ""
        ).map((c) => (0, import_auth_helpers_shared3.parseCookies)(c)[name]).find((c) => !!c);
        if (setCookie) {
          return setCookie;
        }
        const cookies = (0, import_auth_helpers_shared3.parseCookies)(this.context.req.headers.get("cookie") ?? "");
        return cookies[name];
      }
      setCookie(name, value) {
        this._setCookie(name, value);
      }
      deleteCookie(name) {
        this._setCookie(name, "", {
          maxAge: 0
        });
      }
      _setCookie(name, value, options) {
        const newSessionStr = (0, import_auth_helpers_shared3.serializeCookie)(name, value, {
          ...this.cookieOptions,
          ...options,
          // Allow supabase-js on the client to read the cookie as well
          httpOnly: false
        });
        if (this.context.res.headers) {
          this.context.res.headers.append("set-cookie", newSessionStr);
        }
      }
    };
    function createMiddlewareClient2(context, {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions
    } = {}) {
      var _a;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!"
        );
      }
      return (0, import_auth_helpers_shared3.createSupabaseClient)(supabaseUrl, supabaseKey, {
        ...options,
        global: {
          ...options == null ? void 0 : options.global,
          headers: {
            ...(_a = options == null ? void 0 : options.global) == null ? void 0 : _a.headers,
            "X-Client-Info": `${"@supabase/auth-helpers-nextjs"}@${"0.10.0"}`
          }
        },
        auth: {
          storage: new NextMiddlewareAuthStorageAdapter(context, cookieOptions)
        }
      });
    }
    var import_auth_helpers_shared4 = (init_dist(), __toCommonJS(dist_exports));
    var NextServerComponentAuthStorageAdapter = class extends import_auth_helpers_shared4.CookieAuthStorageAdapter {
      constructor(context, cookieOptions) {
        super(cookieOptions);
        this.context = context;
        this.isServer = true;
      }
      getCookie(name) {
        var _a;
        const nextCookies = this.context.cookies();
        return (_a = nextCookies.get(name)) == null ? void 0 : _a.value;
      }
      setCookie(name, value) {
      }
      deleteCookie(name) {
      }
    };
    function createServerComponentClient(context, {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions
    } = {}) {
      var _a;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!"
        );
      }
      return (0, import_auth_helpers_shared4.createSupabaseClient)(supabaseUrl, supabaseKey, {
        ...options,
        global: {
          ...options == null ? void 0 : options.global,
          headers: {
            ...(_a = options == null ? void 0 : options.global) == null ? void 0 : _a.headers,
            "X-Client-Info": `${"@supabase/auth-helpers-nextjs"}@${"0.10.0"}`
          }
        },
        auth: {
          storage: new NextServerComponentAuthStorageAdapter(context, cookieOptions)
        }
      });
    }
    var import_auth_helpers_shared5 = (init_dist(), __toCommonJS(dist_exports));
    var NextRouteHandlerAuthStorageAdapter = class extends import_auth_helpers_shared5.CookieAuthStorageAdapter {
      constructor(context, cookieOptions) {
        super(cookieOptions);
        this.context = context;
      }
      getCookie(name) {
        var _a;
        const nextCookies = this.context.cookies();
        return (_a = nextCookies.get(name)) == null ? void 0 : _a.value;
      }
      setCookie(name, value) {
        const nextCookies = this.context.cookies();
        nextCookies.set(name, value, this.cookieOptions);
      }
      deleteCookie(name) {
        const nextCookies = this.context.cookies();
        nextCookies.set(name, "", {
          ...this.cookieOptions,
          maxAge: 0
        });
      }
    };
    function createRouteHandlerClient2(context, {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions
    } = {}) {
      var _a;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!"
        );
      }
      return (0, import_auth_helpers_shared5.createSupabaseClient)(supabaseUrl, supabaseKey, {
        ...options,
        global: {
          ...options == null ? void 0 : options.global,
          headers: {
            ...(_a = options == null ? void 0 : options.global) == null ? void 0 : _a.headers,
            "X-Client-Info": `${"@supabase/auth-helpers-nextjs"}@${"0.10.0"}`
          }
        },
        auth: {
          storage: new NextRouteHandlerAuthStorageAdapter(context, cookieOptions)
        }
      });
    }
    var createServerActionClient = createRouteHandlerClient2;
    function createBrowserSupabaseClient2({
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions
    } = {}) {
      console.warn(
        "Please utilize the `createPagesBrowserClient` function instead of the deprecated `createBrowserSupabaseClient` function. Learn more: https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages"
      );
      return createPagesBrowserClient({
        supabaseUrl,
        supabaseKey,
        options,
        cookieOptions
      });
    }
    function createServerSupabaseClient2(context, {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions
    } = {}) {
      console.warn(
        "Please utilize the `createPagesServerClient` function instead of the deprecated `createServerSupabaseClient` function. Learn more: https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages"
      );
      return createPagesServerClient(context, {
        supabaseUrl,
        supabaseKey,
        options,
        cookieOptions
      });
    }
    function createMiddlewareSupabaseClient(context, {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options,
      cookieOptions
    } = {}) {
      console.warn(
        "Please utilize the `createMiddlewareClient` function instead of the deprecated `createMiddlewareSupabaseClient` function. Learn more: https://supabase.com/docs/guides/auth/auth-helpers/nextjs#middleware"
      );
      return createMiddlewareClient2(context, {
        supabaseUrl,
        supabaseKey,
        options,
        cookieOptions
      });
    }
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createBrowserSupabaseClient: () => createBrowserSupabaseClient,
  createClientComponentClient: () => import_auth_helpers_nextjs.createClientComponentClient,
  createMiddlewareClient: () => createMiddlewareClient,
  createRouteHandlerClient: () => createRouteHandlerClient,
  createServerSupabaseClient: () => createServerSupabaseClient,
  getSupabaseClient: () => getSupabaseClient
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_supabase_js2 = require("@supabase/supabase-js");
var import_auth_helpers_nextjs = __toESM(require_dist());
var _browserClient = null;
function createBrowserSupabaseClient(config) {
  if (typeof window === "undefined") {
    return (0, import_supabase_js2.createClient)(config.url, config.anonKey);
  }
  if (!_browserClient) {
    if (!config.url || !config.anonKey) {
      throw new Error("[Supabase SDK] Missing required configuration (url/anonKey)");
    }
    _browserClient = (0, import_supabase_js2.createClient)(config.url, config.anonKey);
    console.log("[Supabase SDK] Initialized browser client singleton");
  }
  return _browserClient;
}
function createServerSupabaseClient(url, key) {
  if (!url || !key) {
    throw new Error("[Supabase SDK] Missing required server-side configuration");
  }
  return (0, import_supabase_js2.createClient)(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
function createRouteHandlerClient({ cookies }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (0, import_supabase_js2.createClient)(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        // This is a simplified version; real one would handle cookies correctly
        Cookie: typeof cookies === "function" ? cookies().toString() : ""
      }
    }
  });
}
function createMiddlewareClient(_options) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (0, import_supabase_js2.createClient)(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("[Supabase SDK] Missing environment variables (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createServerSupabaseClient(url, key);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBrowserSupabaseClient,
  createClientComponentClient,
  createMiddlewareClient,
  createRouteHandlerClient,
  createServerSupabaseClient,
  getSupabaseClient
});
/*! Bundled license information:

@supabase/auth-helpers-shared/dist/index.mjs:
  (*! Bundled license information:
  
  cookie/index.js:
    (*!
     * cookie
     * Copyright(c) 2012-2014 Roman Shtylman
     * Copyright(c) 2015 Douglas Christopher Wilson
     * MIT Licensed
     *)
  *)
*/
//# sourceMappingURL=index.js.map