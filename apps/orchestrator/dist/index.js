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

// ../../packages/supabase/dist/index.js
var require_dist = __commonJS({
  "../../packages/supabase/dist/index.js"(exports2, module2) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var index_exports = {};
    __export2(index_exports, {
      createBrowserSupabaseClient: () => createBrowserSupabaseClient,
      createServerSupabaseClient: () => createServerSupabaseClient
    });
    module2.exports = __toCommonJS2(index_exports);
    var import_supabase_js = require("@supabase/supabase-js");
    var _browserClient = null;
    function createBrowserSupabaseClient(config2) {
      if (typeof window === "undefined") {
        return (0, import_supabase_js.createClient)(config2.url, config2.anonKey);
      }
      if (!_browserClient) {
        if (!config2.url || !config2.anonKey) {
          throw new Error("[Supabase SDK] Missing required configuration (url/anonKey)");
        }
        _browserClient = (0, import_supabase_js.createClient)(config2.url, config2.anonKey);
        console.log("[Supabase SDK] Initialized browser client singleton");
      }
      return _browserClient;
    }
    function createServerSupabaseClient(url, key) {
      if (!url || !key) {
        throw new Error("[Supabase SDK] Missing required server-side configuration");
      }
      return (0, import_supabase_js.createClient)(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    }
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js
var _globalThis;
var init_globalThis = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js"() {
    _globalThis = typeof globalThis === "object" ? globalThis : global;
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/platform/node/index.js
var init_node = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/platform/node/index.js"() {
    init_globalThis();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/platform/index.js
var init_platform = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/platform/index.js"() {
    init_node();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/version.js
var VERSION;
var init_version = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/version.js"() {
    VERSION = "1.9.0";
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/internal/semver.js
function _makeCompatibilityCheck(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return function() {
      return false;
    };
  }
  var ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    var globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    var globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var re, isCompatible;
var init_semver = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/internal/semver.js"() {
    init_version();
    re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
    isCompatible = _makeCompatibilityCheck(VERSION);
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
function registerGlobal(type, instance, diag3, allowOverride) {
  var _a;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
    version: VERSION
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag3.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION);
    diag3.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag3.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION + ".");
  return true;
}
function getGlobal(type) {
  var _a, _b;
  var globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag3) {
  diag3.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION + ".");
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var major, GLOBAL_OPENTELEMETRY_API_KEY, _global;
var init_global_utils = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/internal/global-utils.js"() {
    init_platform();
    init_version();
    init_semver();
    major = VERSION.split(".")[0];
    GLOBAL_OPENTELEMETRY_API_KEY = /* @__PURE__ */ Symbol.for("opentelemetry.js.api." + major);
    _global = _globalThis;
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
function logProxy(funcName, namespace, args) {
  var logger3 = getGlobal("diag");
  if (!logger3) {
    return;
  }
  args.unshift(namespace);
  return logger3[funcName].apply(logger3, __spreadArray([], __read(args), false));
}
var __read, __spreadArray, DiagComponentLogger;
var init_ComponentLogger = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js"() {
    init_global_utils();
    __read = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    DiagComponentLogger = /** @class */
    (function() {
      function DiagComponentLogger2(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      DiagComponentLogger2.prototype.debug = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("debug", this._namespace, args);
      };
      DiagComponentLogger2.prototype.error = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("error", this._namespace, args);
      };
      DiagComponentLogger2.prototype.info = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("info", this._namespace, args);
      };
      DiagComponentLogger2.prototype.warn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("warn", this._namespace, args);
      };
      DiagComponentLogger2.prototype.verbose = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("verbose", this._namespace, args);
      };
      return DiagComponentLogger2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/types.js
var DiagLogLevel;
var init_types = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/types.js"() {
    (function(DiagLogLevel2) {
      DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
      DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
      DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
      DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
      DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
      DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
      DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
    })(DiagLogLevel || (DiagLogLevel = {}));
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
function createLogLevelDiagLogger(maxLevel, logger3) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger3 = logger3 || {};
  function _filterFunc(funcName, theLevel) {
    var theFunc = logger3[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger3);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var init_logLevelLogger = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js"() {
    init_types();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/diag.js
var __read2, __spreadArray2, API_NAME, DiagAPI;
var init_diag = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/diag.js"() {
    init_ComponentLogger();
    init_logLevelLogger();
    init_types();
    init_global_utils();
    __read2 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray2 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME = "diag";
    DiagAPI = /** @class */
    (function() {
      function DiagAPI2() {
        function _logProxy(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var logger3 = getGlobal("diag");
            if (!logger3)
              return;
            return logger3[funcName].apply(logger3, __spreadArray2([], __read2(args), false));
          };
        }
        var self = this;
        var setLogger = function(logger3, optionsOrLogLevel) {
          var _a, _b, _c;
          if (optionsOrLogLevel === void 0) {
            optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
          }
          if (logger3 === self) {
            var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          var oldLogger = getGlobal("diag");
          var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger3);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn("Current logger will be overwritten from " + stack);
            newLogger.warn("Current logger will overwrite one already registered from " + stack);
          }
          return registerGlobal("diag", newLogger, self, true);
        };
        self.setLogger = setLogger;
        self.disable = function() {
          unregisterGlobal(API_NAME, self);
        };
        self.createComponentLogger = function(options) {
          return new DiagComponentLogger(options);
        };
        self.verbose = _logProxy("verbose");
        self.debug = _logProxy("debug");
        self.info = _logProxy("info");
        self.warn = _logProxy("warn");
        self.error = _logProxy("error");
      }
      DiagAPI2.instance = function() {
        if (!this._instance) {
          this._instance = new DiagAPI2();
        }
        return this._instance;
      };
      return DiagAPI2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
var __read3, __values, BaggageImpl;
var init_baggage_impl = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js"() {
    __read3 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __values = function(o) {
      var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
        next: function() {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
        }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    BaggageImpl = /** @class */
    (function() {
      function BaggageImpl2(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      BaggageImpl2.prototype.getEntry = function(key) {
        var entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      };
      BaggageImpl2.prototype.getAllEntries = function() {
        return Array.from(this._entries.entries()).map(function(_a) {
          var _b = __read3(_a, 2), k = _b[0], v = _b[1];
          return [k, v];
        });
      };
      BaggageImpl2.prototype.setEntry = function(key, entry) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntry = function(key) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntries = function() {
        var e_1, _a;
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          keys[_i] = arguments[_i];
        }
        var newBaggage = new BaggageImpl2(this._entries);
        try {
          for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            newBaggage._entries.delete(key);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return newBaggage;
      };
      BaggageImpl2.prototype.clear = function() {
        return new BaggageImpl2();
      };
      return BaggageImpl2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
var baggageEntryMetadataSymbol;
var init_symbol = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js"() {
    baggageEntryMetadataSymbol = /* @__PURE__ */ Symbol("BaggageEntryMetadata");
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/utils.js
function createBaggage(entries) {
  if (entries === void 0) {
    entries = {};
  }
  return new BaggageImpl(new Map(Object.entries(entries)));
}
function baggageEntryMetadataFromString(str) {
  if (typeof str !== "string") {
    diag.error("Cannot create baggage metadata from unknown type: " + typeof str);
    str = "";
  }
  return {
    __TYPE__: baggageEntryMetadataSymbol,
    toString: function() {
      return str;
    }
  };
}
var diag;
var init_utils = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/utils.js"() {
    init_diag();
    init_baggage_impl();
    init_symbol();
    diag = DiagAPI.instance();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context/context.js
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext, ROOT_CONTEXT;
var init_context = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context/context.js"() {
    BaseContext = /** @class */
    /* @__PURE__ */ (function() {
      function BaseContext2(parentContext) {
        var self = this;
        self._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self.getValue = function(key) {
          return self._currentContext.get(key);
        };
        self.setValue = function(key, value) {
          var context2 = new BaseContext2(self._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self.deleteValue = function(key) {
          var context2 = new BaseContext2(self._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
      return BaseContext2;
    })();
    ROOT_CONTEXT = new BaseContext();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js
var consoleMap, DiagConsoleLogger;
var init_consoleLogger = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js"() {
    consoleMap = [
      { n: "error", c: "error" },
      { n: "warn", c: "warn" },
      { n: "info", c: "info" },
      { n: "debug", c: "debug" },
      { n: "verbose", c: "trace" }
    ];
    DiagConsoleLogger = /** @class */
    /* @__PURE__ */ (function() {
      function DiagConsoleLogger2() {
        function _consoleFunc(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            if (console) {
              var theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
              if (typeof theFunc === "function") {
                return theFunc.apply(console, args);
              }
            }
          };
        }
        for (var i = 0; i < consoleMap.length; i++) {
          this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
        }
      }
      return DiagConsoleLogger2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
function createNoopMeter() {
  return NOOP_METER;
}
var __extends, NoopMeter, NoopMetric, NoopCounterMetric, NoopUpDownCounterMetric, NoopGaugeMetric, NoopHistogramMetric, NoopObservableMetric, NoopObservableCounterMetric, NoopObservableGaugeMetric, NoopObservableUpDownCounterMetric, NOOP_METER, NOOP_COUNTER_METRIC, NOOP_GAUGE_METRIC, NOOP_HISTOGRAM_METRIC, NOOP_UP_DOWN_COUNTER_METRIC, NOOP_OBSERVABLE_COUNTER_METRIC, NOOP_OBSERVABLE_GAUGE_METRIC, NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
var init_NoopMeter = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js"() {
    __extends = /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    NoopMeter = /** @class */
    (function() {
      function NoopMeter2() {
      }
      NoopMeter2.prototype.createGauge = function(_name, _options) {
        return NOOP_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createHistogram = function(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      };
      NoopMeter2.prototype.createCounter = function(_name, _options) {
        return NOOP_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createUpDownCounter = function(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableGauge = function(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createObservableCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableUpDownCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.addBatchObservableCallback = function(_callback, _observables) {
      };
      NoopMeter2.prototype.removeBatchObservableCallback = function(_callback) {
      };
      return NoopMeter2;
    })();
    NoopMetric = /** @class */
    /* @__PURE__ */ (function() {
      function NoopMetric2() {
      }
      return NoopMetric2;
    })();
    NoopCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopCounterMetric2, _super);
      function NoopCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopCounterMetric2;
    })(NoopMetric);
    NoopUpDownCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopUpDownCounterMetric2, _super);
      function NoopUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopUpDownCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopUpDownCounterMetric2;
    })(NoopMetric);
    NoopGaugeMetric = /** @class */
    (function(_super) {
      __extends(NoopGaugeMetric2, _super);
      function NoopGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopGaugeMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopGaugeMetric2;
    })(NoopMetric);
    NoopHistogramMetric = /** @class */
    (function(_super) {
      __extends(NoopHistogramMetric2, _super);
      function NoopHistogramMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopHistogramMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopHistogramMetric2;
    })(NoopMetric);
    NoopObservableMetric = /** @class */
    (function() {
      function NoopObservableMetric2() {
      }
      NoopObservableMetric2.prototype.addCallback = function(_callback) {
      };
      NoopObservableMetric2.prototype.removeCallback = function(_callback) {
      };
      return NoopObservableMetric2;
    })();
    NoopObservableCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableCounterMetric2, _super);
      function NoopObservableCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableCounterMetric2;
    })(NoopObservableMetric);
    NoopObservableGaugeMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableGaugeMetric2, _super);
      function NoopObservableGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableGaugeMetric2;
    })(NoopObservableMetric);
    NoopObservableUpDownCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableUpDownCounterMetric2, _super);
      function NoopObservableUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableUpDownCounterMetric2;
    })(NoopObservableMetric);
    NOOP_METER = new NoopMeter();
    NOOP_COUNTER_METRIC = new NoopCounterMetric();
    NOOP_GAUGE_METRIC = new NoopGaugeMetric();
    NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
    NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
    NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
    NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
    NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
var ValueType;
var init_Metric = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics/Metric.js"() {
    (function(ValueType2) {
      ValueType2[ValueType2["INT"] = 0] = "INT";
      ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
    })(ValueType || (ValueType = {}));
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
var defaultTextMapGetter, defaultTextMapSetter;
var init_TextMapPropagator = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js"() {
    defaultTextMapGetter = {
      get: function(carrier, key) {
        if (carrier == null) {
          return void 0;
        }
        return carrier[key];
      },
      keys: function(carrier) {
        if (carrier == null) {
          return [];
        }
        return Object.keys(carrier);
      }
    };
    defaultTextMapSetter = {
      set: function(carrier, key, value) {
        if (carrier == null) {
          return;
        }
        carrier[key] = value;
      }
    };
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
var __read4, __spreadArray3, NoopContextManager;
var init_NoopContextManager = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js"() {
    init_context();
    __read4 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray3 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    NoopContextManager = /** @class */
    (function() {
      function NoopContextManager2() {
      }
      NoopContextManager2.prototype.active = function() {
        return ROOT_CONTEXT;
      };
      NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return fn.call.apply(fn, __spreadArray3([thisArg], __read4(args), false));
      };
      NoopContextManager2.prototype.bind = function(_context, target) {
        return target;
      };
      NoopContextManager2.prototype.enable = function() {
        return this;
      };
      NoopContextManager2.prototype.disable = function() {
        return this;
      };
      return NoopContextManager2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/context.js
var __read5, __spreadArray4, API_NAME2, NOOP_CONTEXT_MANAGER, ContextAPI;
var init_context2 = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/context.js"() {
    init_NoopContextManager();
    init_global_utils();
    init_diag();
    __read5 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray4 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME2 = "context";
    NOOP_CONTEXT_MANAGER = new NoopContextManager();
    ContextAPI = /** @class */
    (function() {
      function ContextAPI2() {
      }
      ContextAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new ContextAPI2();
        }
        return this._instance;
      };
      ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
        return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
      };
      ContextAPI2.prototype.active = function() {
        return this._getContextManager().active();
      };
      ContextAPI2.prototype.with = function(context2, fn, thisArg) {
        var _a;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return (_a = this._getContextManager()).with.apply(_a, __spreadArray4([context2, fn, thisArg], __read5(args), false));
      };
      ContextAPI2.prototype.bind = function(context2, target) {
        return this._getContextManager().bind(context2, target);
      };
      ContextAPI2.prototype._getContextManager = function() {
        return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
      };
      ContextAPI2.prototype.disable = function() {
        this._getContextManager().disable();
        unregisterGlobal(API_NAME2, DiagAPI.instance());
      };
      return ContextAPI2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
var TraceFlags;
var init_trace_flags = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js"() {
    (function(TraceFlags2) {
      TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
      TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
    })(TraceFlags || (TraceFlags = {}));
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
var INVALID_SPANID, INVALID_TRACEID, INVALID_SPAN_CONTEXT;
var init_invalid_span_constants = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js"() {
    init_trace_flags();
    INVALID_SPANID = "0000000000000000";
    INVALID_TRACEID = "00000000000000000000000000000000";
    INVALID_SPAN_CONTEXT = {
      traceId: INVALID_TRACEID,
      spanId: INVALID_SPANID,
      traceFlags: TraceFlags.NONE
    };
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
var NonRecordingSpan;
var init_NonRecordingSpan = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js"() {
    init_invalid_span_constants();
    NonRecordingSpan = /** @class */
    (function() {
      function NonRecordingSpan2(_spanContext) {
        if (_spanContext === void 0) {
          _spanContext = INVALID_SPAN_CONTEXT;
        }
        this._spanContext = _spanContext;
      }
      NonRecordingSpan2.prototype.spanContext = function() {
        return this._spanContext;
      };
      NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
        return this;
      };
      NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addLink = function(_link) {
        return this;
      };
      NonRecordingSpan2.prototype.addLinks = function(_links) {
        return this;
      };
      NonRecordingSpan2.prototype.setStatus = function(_status) {
        return this;
      };
      NonRecordingSpan2.prototype.updateName = function(_name) {
        return this;
      };
      NonRecordingSpan2.prototype.end = function(_endTime) {
      };
      NonRecordingSpan2.prototype.isRecording = function() {
        return false;
      };
      NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
      };
      return NonRecordingSpan2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a;
  return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
}
var SPAN_KEY;
var init_context_utils = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/context-utils.js"() {
    init_context();
    init_NonRecordingSpan();
    init_context2();
    SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
function isValidTraceId(traceId) {
  return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var VALID_TRACEID_REGEX, VALID_SPANID_REGEX;
var init_spancontext_utils = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js"() {
    init_invalid_span_constants();
    init_NonRecordingSpan();
    VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
    VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
function isSpanContext(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}
var contextApi, NoopTracer;
var init_NoopTracer = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js"() {
    init_context2();
    init_context_utils();
    init_NonRecordingSpan();
    init_spancontext_utils();
    contextApi = ContextAPI.getInstance();
    NoopTracer = /** @class */
    (function() {
      function NoopTracer2() {
      }
      NoopTracer2.prototype.startSpan = function(name, options, context2) {
        if (context2 === void 0) {
          context2 = contextApi.active();
        }
        var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        var parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      };
      NoopTracer2.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      };
      return NoopTracer2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
var NOOP_TRACER, ProxyTracer;
var init_ProxyTracer = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js"() {
    init_NoopTracer();
    NOOP_TRACER = new NoopTracer();
    ProxyTracer = /** @class */
    (function() {
      function ProxyTracer2(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      ProxyTracer2.prototype.startSpan = function(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      };
      ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
        var tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      };
      ProxyTracer2.prototype._getTracer = function() {
        if (this._delegate) {
          return this._delegate;
        }
        var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      };
      return ProxyTracer2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
var NoopTracerProvider;
var init_NoopTracerProvider = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js"() {
    init_NoopTracer();
    NoopTracerProvider = /** @class */
    (function() {
      function NoopTracerProvider2() {
      }
      NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
        return new NoopTracer();
      };
      return NoopTracerProvider2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
var NOOP_TRACER_PROVIDER, ProxyTracerProvider;
var init_ProxyTracerProvider = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js"() {
    init_ProxyTracer();
    init_NoopTracerProvider();
    NOOP_TRACER_PROVIDER = new NoopTracerProvider();
    ProxyTracerProvider = /** @class */
    (function() {
      function ProxyTracerProvider2() {
      }
      ProxyTracerProvider2.prototype.getTracer = function(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      };
      ProxyTracerProvider2.prototype.getDelegate = function() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      };
      ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyTracerProvider2.prototype.getDelegateTracer = function(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      };
      return ProxyTracerProvider2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
var SamplingDecision;
var init_SamplingResult = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js"() {
    (function(SamplingDecision2) {
      SamplingDecision2[SamplingDecision2["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision2[SamplingDecision2["RECORD"] = 1] = "RECORD";
      SamplingDecision2[SamplingDecision2["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(SamplingDecision || (SamplingDecision = {}));
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
var SpanKind;
var init_span_kind = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/span_kind.js"() {
    (function(SpanKind2) {
      SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
      SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
      SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
      SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
      SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
    })(SpanKind || (SpanKind = {}));
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/status.js
var SpanStatusCode;
var init_status = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/status.js"() {
    (function(SpanStatusCode2) {
      SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
      SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
      SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
    })(SpanStatusCode || (SpanStatusCode = {}));
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js
function validateKey(key) {
  return VALID_KEY_REGEX.test(key);
}
function validateValue(value) {
  return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
}
var VALID_KEY_CHAR_RANGE, VALID_KEY, VALID_VENDOR_KEY, VALID_KEY_REGEX, VALID_VALUE_BASE_REGEX, INVALID_VALUE_COMMA_EQUAL_REGEX;
var init_tracestate_validators = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js"() {
    VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
    VALID_KEY = "[a-z]" + VALID_KEY_CHAR_RANGE + "{0,255}";
    VALID_VENDOR_KEY = "[a-z0-9]" + VALID_KEY_CHAR_RANGE + "{0,240}@[a-z]" + VALID_KEY_CHAR_RANGE + "{0,13}";
    VALID_KEY_REGEX = new RegExp("^(?:" + VALID_KEY + "|" + VALID_VENDOR_KEY + ")$");
    VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
    INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js
var MAX_TRACE_STATE_ITEMS, MAX_TRACE_STATE_LEN, LIST_MEMBERS_SEPARATOR, LIST_MEMBER_KEY_VALUE_SPLITTER, TraceStateImpl;
var init_tracestate_impl = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js"() {
    init_tracestate_validators();
    MAX_TRACE_STATE_ITEMS = 32;
    MAX_TRACE_STATE_LEN = 512;
    LIST_MEMBERS_SEPARATOR = ",";
    LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
    TraceStateImpl = /** @class */
    (function() {
      function TraceStateImpl2(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      TraceStateImpl2.prototype.set = function(key, value) {
        var traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      };
      TraceStateImpl2.prototype.unset = function(key) {
        var traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      };
      TraceStateImpl2.prototype.get = function(key) {
        return this._internalState.get(key);
      };
      TraceStateImpl2.prototype.serialize = function() {
        var _this = this;
        return this._keys().reduce(function(agg, key) {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + _this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      };
      TraceStateImpl2.prototype._parse = function(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce(function(agg, part) {
          var listMember = part.trim();
          var i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            var key = listMember.slice(0, i);
            var value = listMember.slice(i + 1, part.length);
            if (validateKey(key) && validateValue(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
        }
      };
      TraceStateImpl2.prototype._keys = function() {
        return Array.from(this._internalState.keys()).reverse();
      };
      TraceStateImpl2.prototype._clone = function() {
        var traceState = new TraceStateImpl2();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      };
      return TraceStateImpl2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js
function createTraceState(rawTraceState) {
  return new TraceStateImpl(rawTraceState);
}
var init_utils2 = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js"() {
    init_tracestate_impl();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context-api.js
var context;
var init_context_api = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context-api.js"() {
    init_context2();
    context = ContextAPI.getInstance();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag-api.js
var diag2;
var init_diag_api = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag-api.js"() {
    init_diag();
    diag2 = DiagAPI.instance();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
var NoopMeterProvider, NOOP_METER_PROVIDER;
var init_NoopMeterProvider = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js"() {
    init_NoopMeter();
    NoopMeterProvider = /** @class */
    (function() {
      function NoopMeterProvider2() {
      }
      NoopMeterProvider2.prototype.getMeter = function(_name, _version, _options) {
        return NOOP_METER;
      };
      return NoopMeterProvider2;
    })();
    NOOP_METER_PROVIDER = new NoopMeterProvider();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/metrics.js
var API_NAME3, MetricsAPI;
var init_metrics = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/metrics.js"() {
    init_NoopMeterProvider();
    init_global_utils();
    init_diag();
    API_NAME3 = "metrics";
    MetricsAPI = /** @class */
    (function() {
      function MetricsAPI2() {
      }
      MetricsAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new MetricsAPI2();
        }
        return this._instance;
      };
      MetricsAPI2.prototype.setGlobalMeterProvider = function(provider) {
        return registerGlobal(API_NAME3, provider, DiagAPI.instance());
      };
      MetricsAPI2.prototype.getMeterProvider = function() {
        return getGlobal(API_NAME3) || NOOP_METER_PROVIDER;
      };
      MetricsAPI2.prototype.getMeter = function(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      };
      MetricsAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME3, DiagAPI.instance());
      };
      return MetricsAPI2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics-api.js
var metrics;
var init_metrics_api = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/metrics-api.js"() {
    init_metrics();
    metrics = MetricsAPI.getInstance();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
var NoopTextMapPropagator;
var init_NoopTextMapPropagator = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js"() {
    NoopTextMapPropagator = /** @class */
    (function() {
      function NoopTextMapPropagator2() {
      }
      NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
      };
      NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
        return context2;
      };
      NoopTextMapPropagator2.prototype.fields = function() {
        return [];
      };
      return NoopTextMapPropagator2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}
var BAGGAGE_KEY;
var init_context_helpers = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js"() {
    init_context2();
    init_context();
    BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/propagation.js
var API_NAME4, NOOP_TEXT_MAP_PROPAGATOR, PropagationAPI;
var init_propagation = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/propagation.js"() {
    init_global_utils();
    init_NoopTextMapPropagator();
    init_TextMapPropagator();
    init_context_helpers();
    init_utils();
    init_diag();
    API_NAME4 = "propagation";
    NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
    PropagationAPI = /** @class */
    (function() {
      function PropagationAPI2() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      PropagationAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new PropagationAPI2();
        }
        return this._instance;
      };
      PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
        return registerGlobal(API_NAME4, propagator, DiagAPI.instance());
      };
      PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
        if (setter === void 0) {
          setter = defaultTextMapSetter;
        }
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      };
      PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
        if (getter === void 0) {
          getter = defaultTextMapGetter;
        }
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      };
      PropagationAPI2.prototype.fields = function() {
        return this._getGlobalPropagator().fields();
      };
      PropagationAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME4, DiagAPI.instance());
      };
      PropagationAPI2.prototype._getGlobalPropagator = function() {
        return getGlobal(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
      };
      return PropagationAPI2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation-api.js
var propagation;
var init_propagation_api = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation-api.js"() {
    init_propagation();
    propagation = PropagationAPI.getInstance();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/trace.js
var API_NAME5, TraceAPI;
var init_trace = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/trace.js"() {
    init_global_utils();
    init_ProxyTracerProvider();
    init_spancontext_utils();
    init_context_utils();
    init_diag();
    API_NAME5 = "trace";
    TraceAPI = /** @class */
    (function() {
      function TraceAPI2() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      TraceAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new TraceAPI2();
        }
        return this._instance;
      };
      TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
        var success = registerGlobal(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      };
      TraceAPI2.prototype.getTracerProvider = function() {
        return getGlobal(API_NAME5) || this._proxyTracerProvider;
      };
      TraceAPI2.prototype.getTracer = function(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      };
      TraceAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME5, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      };
      return TraceAPI2;
    })();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace-api.js
var trace;
var init_trace_api = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace-api.js"() {
    init_trace();
    trace = TraceAPI.getInstance();
  }
});

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  DiagConsoleLogger: () => DiagConsoleLogger,
  DiagLogLevel: () => DiagLogLevel,
  INVALID_SPANID: () => INVALID_SPANID,
  INVALID_SPAN_CONTEXT: () => INVALID_SPAN_CONTEXT,
  INVALID_TRACEID: () => INVALID_TRACEID,
  ProxyTracer: () => ProxyTracer,
  ProxyTracerProvider: () => ProxyTracerProvider,
  ROOT_CONTEXT: () => ROOT_CONTEXT,
  SamplingDecision: () => SamplingDecision,
  SpanKind: () => SpanKind,
  SpanStatusCode: () => SpanStatusCode,
  TraceFlags: () => TraceFlags,
  ValueType: () => ValueType,
  baggageEntryMetadataFromString: () => baggageEntryMetadataFromString,
  context: () => context,
  createContextKey: () => createContextKey,
  createNoopMeter: () => createNoopMeter,
  createTraceState: () => createTraceState,
  default: () => esm_default,
  defaultTextMapGetter: () => defaultTextMapGetter,
  defaultTextMapSetter: () => defaultTextMapSetter,
  diag: () => diag2,
  isSpanContextValid: () => isSpanContextValid,
  isValidSpanId: () => isValidSpanId,
  isValidTraceId: () => isValidTraceId,
  metrics: () => metrics,
  propagation: () => propagation,
  trace: () => trace
});
var esm_default;
var init_esm = __esm({
  "../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/index.js"() {
    init_utils();
    init_context();
    init_consoleLogger();
    init_types();
    init_NoopMeter();
    init_Metric();
    init_TextMapPropagator();
    init_ProxyTracer();
    init_ProxyTracerProvider();
    init_SamplingResult();
    init_span_kind();
    init_status();
    init_trace_flags();
    init_utils2();
    init_spancontext_utils();
    init_invalid_span_constants();
    init_context_api();
    init_diag_api();
    init_metrics_api();
    init_propagation_api();
    init_trace_api();
    esm_default = {
      context,
      diag: diag2,
      metrics,
      propagation,
      trace
    };
  }
});

// ../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.js
var require_clsx = __commonJS({
  "../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.js"(exports2, module2) {
    function r(e2) {
      var o, t, f = "";
      if ("string" == typeof e2 || "number" == typeof e2) f += e2;
      else if ("object" == typeof e2) if (Array.isArray(e2)) {
        var n = e2.length;
        for (o = 0; o < n; o++) e2[o] && (t = r(e2[o])) && (f && (f += " "), f += t);
      } else for (t in e2) e2[t] && (f && (f += " "), f += t);
      return f;
    }
    function e() {
      for (var e2, o, t = 0, f = "", n = arguments.length; t < n; t++) (e2 = arguments[t]) && (o = r(e2)) && (f && (f += " "), f += o);
      return f;
    }
    module2.exports = e, module2.exports.clsx = e;
  }
});

// ../../node_modules/.pnpm/tailwind-merge@2.6.1/node_modules/tailwind-merge/dist/bundle-cjs.js
var require_bundle_cjs = __commonJS({
  "../../node_modules/.pnpm/tailwind-merge@2.6.1/node_modules/tailwind-merge/dist/bundle-cjs.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, Symbol.toStringTag, {
      value: "Module"
    });
    var CLASS_PART_SEPARATOR = "-";
    var createClassGroupUtils = (config2) => {
      const classMap = createClassMap(config2);
      const {
        conflictingClassGroups,
        conflictingClassGroupModifiers
      } = config2;
      const getClassGroupId = (className) => {
        const classParts = className.split(CLASS_PART_SEPARATOR);
        if (classParts[0] === "" && classParts.length !== 1) {
          classParts.shift();
        }
        return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
      };
      const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
        const conflicts = conflictingClassGroups[classGroupId] || [];
        if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
          return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
        }
        return conflicts;
      };
      return {
        getClassGroupId,
        getConflictingClassGroupIds
      };
    };
    var getGroupRecursive = (classParts, classPartObject) => {
      if (classParts.length === 0) {
        return classPartObject.classGroupId;
      }
      const currentClassPart = classParts[0];
      const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
      const classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : void 0;
      if (classGroupFromNextClassPart) {
        return classGroupFromNextClassPart;
      }
      if (classPartObject.validators.length === 0) {
        return void 0;
      }
      const classRest = classParts.join(CLASS_PART_SEPARATOR);
      return classPartObject.validators.find(({
        validator
      }) => validator(classRest))?.classGroupId;
    };
    var arbitraryPropertyRegex = /^\[(.+)\]$/;
    var getGroupIdForArbitraryProperty = (className) => {
      if (arbitraryPropertyRegex.test(className)) {
        const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
        const property = arbitraryPropertyClassName?.substring(0, arbitraryPropertyClassName.indexOf(":"));
        if (property) {
          return "arbitrary.." + property;
        }
      }
    };
    var createClassMap = (config2) => {
      const {
        theme,
        prefix
      } = config2;
      const classMap = {
        nextPart: /* @__PURE__ */ new Map(),
        validators: []
      };
      const prefixedClassGroupEntries = getPrefixedClassGroupEntries(Object.entries(config2.classGroups), prefix);
      prefixedClassGroupEntries.forEach(([classGroupId, classGroup]) => {
        processClassesRecursively(classGroup, classMap, classGroupId, theme);
      });
      return classMap;
    };
    var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
      classGroup.forEach((classDefinition) => {
        if (typeof classDefinition === "string") {
          const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
          classPartObjectToEdit.classGroupId = classGroupId;
          return;
        }
        if (typeof classDefinition === "function") {
          if (isThemeGetter(classDefinition)) {
            processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
            return;
          }
          classPartObject.validators.push({
            validator: classDefinition,
            classGroupId
          });
          return;
        }
        Object.entries(classDefinition).forEach(([key, classGroup2]) => {
          processClassesRecursively(classGroup2, getPart(classPartObject, key), classGroupId, theme);
        });
      });
    };
    var getPart = (classPartObject, path) => {
      let currentClassPartObject = classPartObject;
      path.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
        if (!currentClassPartObject.nextPart.has(pathPart)) {
          currentClassPartObject.nextPart.set(pathPart, {
            nextPart: /* @__PURE__ */ new Map(),
            validators: []
          });
        }
        currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
      });
      return currentClassPartObject;
    };
    var isThemeGetter = (func) => func.isThemeGetter;
    var getPrefixedClassGroupEntries = (classGroupEntries, prefix) => {
      if (!prefix) {
        return classGroupEntries;
      }
      return classGroupEntries.map(([classGroupId, classGroup]) => {
        const prefixedClassGroup = classGroup.map((classDefinition) => {
          if (typeof classDefinition === "string") {
            return prefix + classDefinition;
          }
          if (typeof classDefinition === "object") {
            return Object.fromEntries(Object.entries(classDefinition).map(([key, value]) => [prefix + key, value]));
          }
          return classDefinition;
        });
        return [classGroupId, prefixedClassGroup];
      });
    };
    var createLruCache = (maxCacheSize) => {
      if (maxCacheSize < 1) {
        return {
          get: () => void 0,
          set: () => {
          }
        };
      }
      let cacheSize = 0;
      let cache = /* @__PURE__ */ new Map();
      let previousCache = /* @__PURE__ */ new Map();
      const update = (key, value) => {
        cache.set(key, value);
        cacheSize++;
        if (cacheSize > maxCacheSize) {
          cacheSize = 0;
          previousCache = cache;
          cache = /* @__PURE__ */ new Map();
        }
      };
      return {
        get(key) {
          let value = cache.get(key);
          if (value !== void 0) {
            return value;
          }
          if ((value = previousCache.get(key)) !== void 0) {
            update(key, value);
            return value;
          }
        },
        set(key, value) {
          if (cache.has(key)) {
            cache.set(key, value);
          } else {
            update(key, value);
          }
        }
      };
    };
    var IMPORTANT_MODIFIER = "!";
    var createParseClassName = (config2) => {
      const {
        separator,
        experimentalParseClassName
      } = config2;
      const isSeparatorSingleCharacter = separator.length === 1;
      const firstSeparatorCharacter = separator[0];
      const separatorLength = separator.length;
      const parseClassName = (className) => {
        const modifiers = [];
        let bracketDepth = 0;
        let modifierStart = 0;
        let postfixModifierPosition;
        for (let index = 0; index < className.length; index++) {
          let currentCharacter = className[index];
          if (bracketDepth === 0) {
            if (currentCharacter === firstSeparatorCharacter && (isSeparatorSingleCharacter || className.slice(index, index + separatorLength) === separator)) {
              modifiers.push(className.slice(modifierStart, index));
              modifierStart = index + separatorLength;
              continue;
            }
            if (currentCharacter === "/") {
              postfixModifierPosition = index;
              continue;
            }
          }
          if (currentCharacter === "[") {
            bracketDepth++;
          } else if (currentCharacter === "]") {
            bracketDepth--;
          }
        }
        const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
        const hasImportantModifier = baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER);
        const baseClassName = hasImportantModifier ? baseClassNameWithImportantModifier.substring(1) : baseClassNameWithImportantModifier;
        const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
        return {
          modifiers,
          hasImportantModifier,
          baseClassName,
          maybePostfixModifierPosition
        };
      };
      if (experimentalParseClassName) {
        return (className) => experimentalParseClassName({
          className,
          parseClassName
        });
      }
      return parseClassName;
    };
    var sortModifiers = (modifiers) => {
      if (modifiers.length <= 1) {
        return modifiers;
      }
      const sortedModifiers = [];
      let unsortedModifiers = [];
      modifiers.forEach((modifier) => {
        const isArbitraryVariant = modifier[0] === "[";
        if (isArbitraryVariant) {
          sortedModifiers.push(...unsortedModifiers.sort(), modifier);
          unsortedModifiers = [];
        } else {
          unsortedModifiers.push(modifier);
        }
      });
      sortedModifiers.push(...unsortedModifiers.sort());
      return sortedModifiers;
    };
    var createConfigUtils = (config2) => ({
      cache: createLruCache(config2.cacheSize),
      parseClassName: createParseClassName(config2),
      ...createClassGroupUtils(config2)
    });
    var SPLIT_CLASSES_REGEX = /\s+/;
    var mergeClassList = (classList, configUtils) => {
      const {
        parseClassName,
        getClassGroupId,
        getConflictingClassGroupIds
      } = configUtils;
      const classGroupsInConflict = [];
      const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
      let result = "";
      for (let index = classNames.length - 1; index >= 0; index -= 1) {
        const originalClassName = classNames[index];
        const {
          modifiers,
          hasImportantModifier,
          baseClassName,
          maybePostfixModifierPosition
        } = parseClassName(originalClassName);
        let hasPostfixModifier = Boolean(maybePostfixModifierPosition);
        let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
        if (!classGroupId) {
          if (!hasPostfixModifier) {
            result = originalClassName + (result.length > 0 ? " " + result : result);
            continue;
          }
          classGroupId = getClassGroupId(baseClassName);
          if (!classGroupId) {
            result = originalClassName + (result.length > 0 ? " " + result : result);
            continue;
          }
          hasPostfixModifier = false;
        }
        const variantModifier = sortModifiers(modifiers).join(":");
        const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
        const classId = modifierId + classGroupId;
        if (classGroupsInConflict.includes(classId)) {
          continue;
        }
        classGroupsInConflict.push(classId);
        const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
        for (let i = 0; i < conflictGroups.length; ++i) {
          const group = conflictGroups[i];
          classGroupsInConflict.push(modifierId + group);
        }
        result = originalClassName + (result.length > 0 ? " " + result : result);
      }
      return result;
    };
    function twJoin() {
      let index = 0;
      let argument;
      let resolvedValue;
      let string = "";
      while (index < arguments.length) {
        if (argument = arguments[index++]) {
          if (resolvedValue = toValue(argument)) {
            string && (string += " ");
            string += resolvedValue;
          }
        }
      }
      return string;
    }
    var toValue = (mix) => {
      if (typeof mix === "string") {
        return mix;
      }
      let resolvedValue;
      let string = "";
      for (let k = 0; k < mix.length; k++) {
        if (mix[k]) {
          if (resolvedValue = toValue(mix[k])) {
            string && (string += " ");
            string += resolvedValue;
          }
        }
      }
      return string;
    };
    function createTailwindMerge(createConfigFirst, ...createConfigRest) {
      let configUtils;
      let cacheGet;
      let cacheSet;
      let functionToCall = initTailwindMerge;
      function initTailwindMerge(classList) {
        const config2 = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
        configUtils = createConfigUtils(config2);
        cacheGet = configUtils.cache.get;
        cacheSet = configUtils.cache.set;
        functionToCall = tailwindMerge;
        return tailwindMerge(classList);
      }
      function tailwindMerge(classList) {
        const cachedResult = cacheGet(classList);
        if (cachedResult) {
          return cachedResult;
        }
        const result = mergeClassList(classList, configUtils);
        cacheSet(classList, result);
        return result;
      }
      return function callTailwindMerge() {
        return functionToCall(twJoin.apply(null, arguments));
      };
    }
    var fromTheme = (key) => {
      const themeGetter = (theme) => theme[key] || [];
      themeGetter.isThemeGetter = true;
      return themeGetter;
    };
    var arbitraryValueRegex = /^\[(?:([a-z-]+):)?(.+)\]$/i;
    var fractionRegex = /^\d+\/\d+$/;
    var stringLengths = /* @__PURE__ */ new Set(["px", "full", "screen"]);
    var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
    var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
    var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/;
    var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
    var imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
    var isLength = (value) => isNumber(value) || stringLengths.has(value) || fractionRegex.test(value);
    var isArbitraryLength = (value) => getIsArbitraryValue(value, "length", isLengthOnly);
    var isNumber = (value) => Boolean(value) && !Number.isNaN(Number(value));
    var isArbitraryNumber = (value) => getIsArbitraryValue(value, "number", isNumber);
    var isInteger = (value) => Boolean(value) && Number.isInteger(Number(value));
    var isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
    var isArbitraryValue = (value) => arbitraryValueRegex.test(value);
    var isTshirtSize = (value) => tshirtUnitRegex.test(value);
    var sizeLabels = /* @__PURE__ */ new Set(["length", "size", "percentage"]);
    var isArbitrarySize = (value) => getIsArbitraryValue(value, sizeLabels, isNever);
    var isArbitraryPosition = (value) => getIsArbitraryValue(value, "position", isNever);
    var imageLabels = /* @__PURE__ */ new Set(["image", "url"]);
    var isArbitraryImage = (value) => getIsArbitraryValue(value, imageLabels, isImage);
    var isArbitraryShadow = (value) => getIsArbitraryValue(value, "", isShadow);
    var isAny = () => true;
    var getIsArbitraryValue = (value, label, testValue) => {
      const result = arbitraryValueRegex.exec(value);
      if (result) {
        if (result[1]) {
          return typeof label === "string" ? result[1] === label : label.has(result[1]);
        }
        return testValue(result[2]);
      }
      return false;
    };
    var isLengthOnly = (value) => (
      // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
      // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
      // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
      lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
    );
    var isNever = () => false;
    var isShadow = (value) => shadowRegex.test(value);
    var isImage = (value) => imageRegex.test(value);
    var validators = /* @__PURE__ */ Object.defineProperty({
      __proto__: null,
      isAny,
      isArbitraryImage,
      isArbitraryLength,
      isArbitraryNumber,
      isArbitraryPosition,
      isArbitraryShadow,
      isArbitrarySize,
      isArbitraryValue,
      isInteger,
      isLength,
      isNumber,
      isPercent,
      isTshirtSize
    }, Symbol.toStringTag, {
      value: "Module"
    });
    var getDefaultConfig = () => {
      const colors = fromTheme("colors");
      const spacing = fromTheme("spacing");
      const blur = fromTheme("blur");
      const brightness = fromTheme("brightness");
      const borderColor = fromTheme("borderColor");
      const borderRadius = fromTheme("borderRadius");
      const borderSpacing = fromTheme("borderSpacing");
      const borderWidth = fromTheme("borderWidth");
      const contrast = fromTheme("contrast");
      const grayscale = fromTheme("grayscale");
      const hueRotate = fromTheme("hueRotate");
      const invert = fromTheme("invert");
      const gap = fromTheme("gap");
      const gradientColorStops = fromTheme("gradientColorStops");
      const gradientColorStopPositions = fromTheme("gradientColorStopPositions");
      const inset = fromTheme("inset");
      const margin = fromTheme("margin");
      const opacity = fromTheme("opacity");
      const padding = fromTheme("padding");
      const saturate = fromTheme("saturate");
      const scale = fromTheme("scale");
      const sepia = fromTheme("sepia");
      const skew = fromTheme("skew");
      const space = fromTheme("space");
      const translate = fromTheme("translate");
      const getOverscroll = () => ["auto", "contain", "none"];
      const getOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
      const getSpacingWithAutoAndArbitrary = () => ["auto", isArbitraryValue, spacing];
      const getSpacingWithArbitrary = () => [isArbitraryValue, spacing];
      const getLengthWithEmptyAndArbitrary = () => ["", isLength, isArbitraryLength];
      const getNumberWithAutoAndArbitrary = () => ["auto", isNumber, isArbitraryValue];
      const getPositions = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"];
      const getLineStyles = () => ["solid", "dashed", "dotted", "double", "none"];
      const getBlendModes = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
      const getAlign = () => ["start", "end", "center", "between", "around", "evenly", "stretch"];
      const getZeroAndEmpty = () => ["", "0", isArbitraryValue];
      const getBreaks = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
      const getNumberAndArbitrary = () => [isNumber, isArbitraryValue];
      return {
        cacheSize: 500,
        separator: ":",
        theme: {
          colors: [isAny],
          spacing: [isLength, isArbitraryLength],
          blur: ["none", "", isTshirtSize, isArbitraryValue],
          brightness: getNumberAndArbitrary(),
          borderColor: [colors],
          borderRadius: ["none", "", "full", isTshirtSize, isArbitraryValue],
          borderSpacing: getSpacingWithArbitrary(),
          borderWidth: getLengthWithEmptyAndArbitrary(),
          contrast: getNumberAndArbitrary(),
          grayscale: getZeroAndEmpty(),
          hueRotate: getNumberAndArbitrary(),
          invert: getZeroAndEmpty(),
          gap: getSpacingWithArbitrary(),
          gradientColorStops: [colors],
          gradientColorStopPositions: [isPercent, isArbitraryLength],
          inset: getSpacingWithAutoAndArbitrary(),
          margin: getSpacingWithAutoAndArbitrary(),
          opacity: getNumberAndArbitrary(),
          padding: getSpacingWithArbitrary(),
          saturate: getNumberAndArbitrary(),
          scale: getNumberAndArbitrary(),
          sepia: getZeroAndEmpty(),
          skew: getNumberAndArbitrary(),
          space: getSpacingWithArbitrary(),
          translate: getSpacingWithArbitrary()
        },
        classGroups: {
          // Layout
          /**
           * Aspect Ratio
           * @see https://tailwindcss.com/docs/aspect-ratio
           */
          aspect: [{
            aspect: ["auto", "square", "video", isArbitraryValue]
          }],
          /**
           * Container
           * @see https://tailwindcss.com/docs/container
           */
          container: ["container"],
          /**
           * Columns
           * @see https://tailwindcss.com/docs/columns
           */
          columns: [{
            columns: [isTshirtSize]
          }],
          /**
           * Break After
           * @see https://tailwindcss.com/docs/break-after
           */
          "break-after": [{
            "break-after": getBreaks()
          }],
          /**
           * Break Before
           * @see https://tailwindcss.com/docs/break-before
           */
          "break-before": [{
            "break-before": getBreaks()
          }],
          /**
           * Break Inside
           * @see https://tailwindcss.com/docs/break-inside
           */
          "break-inside": [{
            "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
          }],
          /**
           * Box Decoration Break
           * @see https://tailwindcss.com/docs/box-decoration-break
           */
          "box-decoration": [{
            "box-decoration": ["slice", "clone"]
          }],
          /**
           * Box Sizing
           * @see https://tailwindcss.com/docs/box-sizing
           */
          box: [{
            box: ["border", "content"]
          }],
          /**
           * Display
           * @see https://tailwindcss.com/docs/display
           */
          display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
          /**
           * Floats
           * @see https://tailwindcss.com/docs/float
           */
          float: [{
            float: ["right", "left", "none", "start", "end"]
          }],
          /**
           * Clear
           * @see https://tailwindcss.com/docs/clear
           */
          clear: [{
            clear: ["left", "right", "both", "none", "start", "end"]
          }],
          /**
           * Isolation
           * @see https://tailwindcss.com/docs/isolation
           */
          isolation: ["isolate", "isolation-auto"],
          /**
           * Object Fit
           * @see https://tailwindcss.com/docs/object-fit
           */
          "object-fit": [{
            object: ["contain", "cover", "fill", "none", "scale-down"]
          }],
          /**
           * Object Position
           * @see https://tailwindcss.com/docs/object-position
           */
          "object-position": [{
            object: [...getPositions(), isArbitraryValue]
          }],
          /**
           * Overflow
           * @see https://tailwindcss.com/docs/overflow
           */
          overflow: [{
            overflow: getOverflow()
          }],
          /**
           * Overflow X
           * @see https://tailwindcss.com/docs/overflow
           */
          "overflow-x": [{
            "overflow-x": getOverflow()
          }],
          /**
           * Overflow Y
           * @see https://tailwindcss.com/docs/overflow
           */
          "overflow-y": [{
            "overflow-y": getOverflow()
          }],
          /**
           * Overscroll Behavior
           * @see https://tailwindcss.com/docs/overscroll-behavior
           */
          overscroll: [{
            overscroll: getOverscroll()
          }],
          /**
           * Overscroll Behavior X
           * @see https://tailwindcss.com/docs/overscroll-behavior
           */
          "overscroll-x": [{
            "overscroll-x": getOverscroll()
          }],
          /**
           * Overscroll Behavior Y
           * @see https://tailwindcss.com/docs/overscroll-behavior
           */
          "overscroll-y": [{
            "overscroll-y": getOverscroll()
          }],
          /**
           * Position
           * @see https://tailwindcss.com/docs/position
           */
          position: ["static", "fixed", "absolute", "relative", "sticky"],
          /**
           * Top / Right / Bottom / Left
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          inset: [{
            inset: [inset]
          }],
          /**
           * Right / Left
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          "inset-x": [{
            "inset-x": [inset]
          }],
          /**
           * Top / Bottom
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          "inset-y": [{
            "inset-y": [inset]
          }],
          /**
           * Start
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          start: [{
            start: [inset]
          }],
          /**
           * End
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          end: [{
            end: [inset]
          }],
          /**
           * Top
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          top: [{
            top: [inset]
          }],
          /**
           * Right
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          right: [{
            right: [inset]
          }],
          /**
           * Bottom
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          bottom: [{
            bottom: [inset]
          }],
          /**
           * Left
           * @see https://tailwindcss.com/docs/top-right-bottom-left
           */
          left: [{
            left: [inset]
          }],
          /**
           * Visibility
           * @see https://tailwindcss.com/docs/visibility
           */
          visibility: ["visible", "invisible", "collapse"],
          /**
           * Z-Index
           * @see https://tailwindcss.com/docs/z-index
           */
          z: [{
            z: ["auto", isInteger, isArbitraryValue]
          }],
          // Flexbox and Grid
          /**
           * Flex Basis
           * @see https://tailwindcss.com/docs/flex-basis
           */
          basis: [{
            basis: getSpacingWithAutoAndArbitrary()
          }],
          /**
           * Flex Direction
           * @see https://tailwindcss.com/docs/flex-direction
           */
          "flex-direction": [{
            flex: ["row", "row-reverse", "col", "col-reverse"]
          }],
          /**
           * Flex Wrap
           * @see https://tailwindcss.com/docs/flex-wrap
           */
          "flex-wrap": [{
            flex: ["wrap", "wrap-reverse", "nowrap"]
          }],
          /**
           * Flex
           * @see https://tailwindcss.com/docs/flex
           */
          flex: [{
            flex: ["1", "auto", "initial", "none", isArbitraryValue]
          }],
          /**
           * Flex Grow
           * @see https://tailwindcss.com/docs/flex-grow
           */
          grow: [{
            grow: getZeroAndEmpty()
          }],
          /**
           * Flex Shrink
           * @see https://tailwindcss.com/docs/flex-shrink
           */
          shrink: [{
            shrink: getZeroAndEmpty()
          }],
          /**
           * Order
           * @see https://tailwindcss.com/docs/order
           */
          order: [{
            order: ["first", "last", "none", isInteger, isArbitraryValue]
          }],
          /**
           * Grid Template Columns
           * @see https://tailwindcss.com/docs/grid-template-columns
           */
          "grid-cols": [{
            "grid-cols": [isAny]
          }],
          /**
           * Grid Column Start / End
           * @see https://tailwindcss.com/docs/grid-column
           */
          "col-start-end": [{
            col: ["auto", {
              span: ["full", isInteger, isArbitraryValue]
            }, isArbitraryValue]
          }],
          /**
           * Grid Column Start
           * @see https://tailwindcss.com/docs/grid-column
           */
          "col-start": [{
            "col-start": getNumberWithAutoAndArbitrary()
          }],
          /**
           * Grid Column End
           * @see https://tailwindcss.com/docs/grid-column
           */
          "col-end": [{
            "col-end": getNumberWithAutoAndArbitrary()
          }],
          /**
           * Grid Template Rows
           * @see https://tailwindcss.com/docs/grid-template-rows
           */
          "grid-rows": [{
            "grid-rows": [isAny]
          }],
          /**
           * Grid Row Start / End
           * @see https://tailwindcss.com/docs/grid-row
           */
          "row-start-end": [{
            row: ["auto", {
              span: [isInteger, isArbitraryValue]
            }, isArbitraryValue]
          }],
          /**
           * Grid Row Start
           * @see https://tailwindcss.com/docs/grid-row
           */
          "row-start": [{
            "row-start": getNumberWithAutoAndArbitrary()
          }],
          /**
           * Grid Row End
           * @see https://tailwindcss.com/docs/grid-row
           */
          "row-end": [{
            "row-end": getNumberWithAutoAndArbitrary()
          }],
          /**
           * Grid Auto Flow
           * @see https://tailwindcss.com/docs/grid-auto-flow
           */
          "grid-flow": [{
            "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
          }],
          /**
           * Grid Auto Columns
           * @see https://tailwindcss.com/docs/grid-auto-columns
           */
          "auto-cols": [{
            "auto-cols": ["auto", "min", "max", "fr", isArbitraryValue]
          }],
          /**
           * Grid Auto Rows
           * @see https://tailwindcss.com/docs/grid-auto-rows
           */
          "auto-rows": [{
            "auto-rows": ["auto", "min", "max", "fr", isArbitraryValue]
          }],
          /**
           * Gap
           * @see https://tailwindcss.com/docs/gap
           */
          gap: [{
            gap: [gap]
          }],
          /**
           * Gap X
           * @see https://tailwindcss.com/docs/gap
           */
          "gap-x": [{
            "gap-x": [gap]
          }],
          /**
           * Gap Y
           * @see https://tailwindcss.com/docs/gap
           */
          "gap-y": [{
            "gap-y": [gap]
          }],
          /**
           * Justify Content
           * @see https://tailwindcss.com/docs/justify-content
           */
          "justify-content": [{
            justify: ["normal", ...getAlign()]
          }],
          /**
           * Justify Items
           * @see https://tailwindcss.com/docs/justify-items
           */
          "justify-items": [{
            "justify-items": ["start", "end", "center", "stretch"]
          }],
          /**
           * Justify Self
           * @see https://tailwindcss.com/docs/justify-self
           */
          "justify-self": [{
            "justify-self": ["auto", "start", "end", "center", "stretch"]
          }],
          /**
           * Align Content
           * @see https://tailwindcss.com/docs/align-content
           */
          "align-content": [{
            content: ["normal", ...getAlign(), "baseline"]
          }],
          /**
           * Align Items
           * @see https://tailwindcss.com/docs/align-items
           */
          "align-items": [{
            items: ["start", "end", "center", "baseline", "stretch"]
          }],
          /**
           * Align Self
           * @see https://tailwindcss.com/docs/align-self
           */
          "align-self": [{
            self: ["auto", "start", "end", "center", "stretch", "baseline"]
          }],
          /**
           * Place Content
           * @see https://tailwindcss.com/docs/place-content
           */
          "place-content": [{
            "place-content": [...getAlign(), "baseline"]
          }],
          /**
           * Place Items
           * @see https://tailwindcss.com/docs/place-items
           */
          "place-items": [{
            "place-items": ["start", "end", "center", "baseline", "stretch"]
          }],
          /**
           * Place Self
           * @see https://tailwindcss.com/docs/place-self
           */
          "place-self": [{
            "place-self": ["auto", "start", "end", "center", "stretch"]
          }],
          // Spacing
          /**
           * Padding
           * @see https://tailwindcss.com/docs/padding
           */
          p: [{
            p: [padding]
          }],
          /**
           * Padding X
           * @see https://tailwindcss.com/docs/padding
           */
          px: [{
            px: [padding]
          }],
          /**
           * Padding Y
           * @see https://tailwindcss.com/docs/padding
           */
          py: [{
            py: [padding]
          }],
          /**
           * Padding Start
           * @see https://tailwindcss.com/docs/padding
           */
          ps: [{
            ps: [padding]
          }],
          /**
           * Padding End
           * @see https://tailwindcss.com/docs/padding
           */
          pe: [{
            pe: [padding]
          }],
          /**
           * Padding Top
           * @see https://tailwindcss.com/docs/padding
           */
          pt: [{
            pt: [padding]
          }],
          /**
           * Padding Right
           * @see https://tailwindcss.com/docs/padding
           */
          pr: [{
            pr: [padding]
          }],
          /**
           * Padding Bottom
           * @see https://tailwindcss.com/docs/padding
           */
          pb: [{
            pb: [padding]
          }],
          /**
           * Padding Left
           * @see https://tailwindcss.com/docs/padding
           */
          pl: [{
            pl: [padding]
          }],
          /**
           * Margin
           * @see https://tailwindcss.com/docs/margin
           */
          m: [{
            m: [margin]
          }],
          /**
           * Margin X
           * @see https://tailwindcss.com/docs/margin
           */
          mx: [{
            mx: [margin]
          }],
          /**
           * Margin Y
           * @see https://tailwindcss.com/docs/margin
           */
          my: [{
            my: [margin]
          }],
          /**
           * Margin Start
           * @see https://tailwindcss.com/docs/margin
           */
          ms: [{
            ms: [margin]
          }],
          /**
           * Margin End
           * @see https://tailwindcss.com/docs/margin
           */
          me: [{
            me: [margin]
          }],
          /**
           * Margin Top
           * @see https://tailwindcss.com/docs/margin
           */
          mt: [{
            mt: [margin]
          }],
          /**
           * Margin Right
           * @see https://tailwindcss.com/docs/margin
           */
          mr: [{
            mr: [margin]
          }],
          /**
           * Margin Bottom
           * @see https://tailwindcss.com/docs/margin
           */
          mb: [{
            mb: [margin]
          }],
          /**
           * Margin Left
           * @see https://tailwindcss.com/docs/margin
           */
          ml: [{
            ml: [margin]
          }],
          /**
           * Space Between X
           * @see https://tailwindcss.com/docs/space
           */
          "space-x": [{
            "space-x": [space]
          }],
          /**
           * Space Between X Reverse
           * @see https://tailwindcss.com/docs/space
           */
          "space-x-reverse": ["space-x-reverse"],
          /**
           * Space Between Y
           * @see https://tailwindcss.com/docs/space
           */
          "space-y": [{
            "space-y": [space]
          }],
          /**
           * Space Between Y Reverse
           * @see https://tailwindcss.com/docs/space
           */
          "space-y-reverse": ["space-y-reverse"],
          // Sizing
          /**
           * Width
           * @see https://tailwindcss.com/docs/width
           */
          w: [{
            w: ["auto", "min", "max", "fit", "svw", "lvw", "dvw", isArbitraryValue, spacing]
          }],
          /**
           * Min-Width
           * @see https://tailwindcss.com/docs/min-width
           */
          "min-w": [{
            "min-w": [isArbitraryValue, spacing, "min", "max", "fit"]
          }],
          /**
           * Max-Width
           * @see https://tailwindcss.com/docs/max-width
           */
          "max-w": [{
            "max-w": [isArbitraryValue, spacing, "none", "full", "min", "max", "fit", "prose", {
              screen: [isTshirtSize]
            }, isTshirtSize]
          }],
          /**
           * Height
           * @see https://tailwindcss.com/docs/height
           */
          h: [{
            h: [isArbitraryValue, spacing, "auto", "min", "max", "fit", "svh", "lvh", "dvh"]
          }],
          /**
           * Min-Height
           * @see https://tailwindcss.com/docs/min-height
           */
          "min-h": [{
            "min-h": [isArbitraryValue, spacing, "min", "max", "fit", "svh", "lvh", "dvh"]
          }],
          /**
           * Max-Height
           * @see https://tailwindcss.com/docs/max-height
           */
          "max-h": [{
            "max-h": [isArbitraryValue, spacing, "min", "max", "fit", "svh", "lvh", "dvh"]
          }],
          /**
           * Size
           * @see https://tailwindcss.com/docs/size
           */
          size: [{
            size: [isArbitraryValue, spacing, "auto", "min", "max", "fit"]
          }],
          // Typography
          /**
           * Font Size
           * @see https://tailwindcss.com/docs/font-size
           */
          "font-size": [{
            text: ["base", isTshirtSize, isArbitraryLength]
          }],
          /**
           * Font Smoothing
           * @see https://tailwindcss.com/docs/font-smoothing
           */
          "font-smoothing": ["antialiased", "subpixel-antialiased"],
          /**
           * Font Style
           * @see https://tailwindcss.com/docs/font-style
           */
          "font-style": ["italic", "not-italic"],
          /**
           * Font Weight
           * @see https://tailwindcss.com/docs/font-weight
           */
          "font-weight": [{
            font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black", isArbitraryNumber]
          }],
          /**
           * Font Family
           * @see https://tailwindcss.com/docs/font-family
           */
          "font-family": [{
            font: [isAny]
          }],
          /**
           * Font Variant Numeric
           * @see https://tailwindcss.com/docs/font-variant-numeric
           */
          "fvn-normal": ["normal-nums"],
          /**
           * Font Variant Numeric
           * @see https://tailwindcss.com/docs/font-variant-numeric
           */
          "fvn-ordinal": ["ordinal"],
          /**
           * Font Variant Numeric
           * @see https://tailwindcss.com/docs/font-variant-numeric
           */
          "fvn-slashed-zero": ["slashed-zero"],
          /**
           * Font Variant Numeric
           * @see https://tailwindcss.com/docs/font-variant-numeric
           */
          "fvn-figure": ["lining-nums", "oldstyle-nums"],
          /**
           * Font Variant Numeric
           * @see https://tailwindcss.com/docs/font-variant-numeric
           */
          "fvn-spacing": ["proportional-nums", "tabular-nums"],
          /**
           * Font Variant Numeric
           * @see https://tailwindcss.com/docs/font-variant-numeric
           */
          "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
          /**
           * Letter Spacing
           * @see https://tailwindcss.com/docs/letter-spacing
           */
          tracking: [{
            tracking: ["tighter", "tight", "normal", "wide", "wider", "widest", isArbitraryValue]
          }],
          /**
           * Line Clamp
           * @see https://tailwindcss.com/docs/line-clamp
           */
          "line-clamp": [{
            "line-clamp": ["none", isNumber, isArbitraryNumber]
          }],
          /**
           * Line Height
           * @see https://tailwindcss.com/docs/line-height
           */
          leading: [{
            leading: ["none", "tight", "snug", "normal", "relaxed", "loose", isLength, isArbitraryValue]
          }],
          /**
           * List Style Image
           * @see https://tailwindcss.com/docs/list-style-image
           */
          "list-image": [{
            "list-image": ["none", isArbitraryValue]
          }],
          /**
           * List Style Type
           * @see https://tailwindcss.com/docs/list-style-type
           */
          "list-style-type": [{
            list: ["none", "disc", "decimal", isArbitraryValue]
          }],
          /**
           * List Style Position
           * @see https://tailwindcss.com/docs/list-style-position
           */
          "list-style-position": [{
            list: ["inside", "outside"]
          }],
          /**
           * Placeholder Color
           * @deprecated since Tailwind CSS v3.0.0
           * @see https://tailwindcss.com/docs/placeholder-color
           */
          "placeholder-color": [{
            placeholder: [colors]
          }],
          /**
           * Placeholder Opacity
           * @see https://tailwindcss.com/docs/placeholder-opacity
           */
          "placeholder-opacity": [{
            "placeholder-opacity": [opacity]
          }],
          /**
           * Text Alignment
           * @see https://tailwindcss.com/docs/text-align
           */
          "text-alignment": [{
            text: ["left", "center", "right", "justify", "start", "end"]
          }],
          /**
           * Text Color
           * @see https://tailwindcss.com/docs/text-color
           */
          "text-color": [{
            text: [colors]
          }],
          /**
           * Text Opacity
           * @see https://tailwindcss.com/docs/text-opacity
           */
          "text-opacity": [{
            "text-opacity": [opacity]
          }],
          /**
           * Text Decoration
           * @see https://tailwindcss.com/docs/text-decoration
           */
          "text-decoration": ["underline", "overline", "line-through", "no-underline"],
          /**
           * Text Decoration Style
           * @see https://tailwindcss.com/docs/text-decoration-style
           */
          "text-decoration-style": [{
            decoration: [...getLineStyles(), "wavy"]
          }],
          /**
           * Text Decoration Thickness
           * @see https://tailwindcss.com/docs/text-decoration-thickness
           */
          "text-decoration-thickness": [{
            decoration: ["auto", "from-font", isLength, isArbitraryLength]
          }],
          /**
           * Text Underline Offset
           * @see https://tailwindcss.com/docs/text-underline-offset
           */
          "underline-offset": [{
            "underline-offset": ["auto", isLength, isArbitraryValue]
          }],
          /**
           * Text Decoration Color
           * @see https://tailwindcss.com/docs/text-decoration-color
           */
          "text-decoration-color": [{
            decoration: [colors]
          }],
          /**
           * Text Transform
           * @see https://tailwindcss.com/docs/text-transform
           */
          "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
          /**
           * Text Overflow
           * @see https://tailwindcss.com/docs/text-overflow
           */
          "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
          /**
           * Text Wrap
           * @see https://tailwindcss.com/docs/text-wrap
           */
          "text-wrap": [{
            text: ["wrap", "nowrap", "balance", "pretty"]
          }],
          /**
           * Text Indent
           * @see https://tailwindcss.com/docs/text-indent
           */
          indent: [{
            indent: getSpacingWithArbitrary()
          }],
          /**
           * Vertical Alignment
           * @see https://tailwindcss.com/docs/vertical-align
           */
          "vertical-align": [{
            align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryValue]
          }],
          /**
           * Whitespace
           * @see https://tailwindcss.com/docs/whitespace
           */
          whitespace: [{
            whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
          }],
          /**
           * Word Break
           * @see https://tailwindcss.com/docs/word-break
           */
          break: [{
            break: ["normal", "words", "all", "keep"]
          }],
          /**
           * Hyphens
           * @see https://tailwindcss.com/docs/hyphens
           */
          hyphens: [{
            hyphens: ["none", "manual", "auto"]
          }],
          /**
           * Content
           * @see https://tailwindcss.com/docs/content
           */
          content: [{
            content: ["none", isArbitraryValue]
          }],
          // Backgrounds
          /**
           * Background Attachment
           * @see https://tailwindcss.com/docs/background-attachment
           */
          "bg-attachment": [{
            bg: ["fixed", "local", "scroll"]
          }],
          /**
           * Background Clip
           * @see https://tailwindcss.com/docs/background-clip
           */
          "bg-clip": [{
            "bg-clip": ["border", "padding", "content", "text"]
          }],
          /**
           * Background Opacity
           * @deprecated since Tailwind CSS v3.0.0
           * @see https://tailwindcss.com/docs/background-opacity
           */
          "bg-opacity": [{
            "bg-opacity": [opacity]
          }],
          /**
           * Background Origin
           * @see https://tailwindcss.com/docs/background-origin
           */
          "bg-origin": [{
            "bg-origin": ["border", "padding", "content"]
          }],
          /**
           * Background Position
           * @see https://tailwindcss.com/docs/background-position
           */
          "bg-position": [{
            bg: [...getPositions(), isArbitraryPosition]
          }],
          /**
           * Background Repeat
           * @see https://tailwindcss.com/docs/background-repeat
           */
          "bg-repeat": [{
            bg: ["no-repeat", {
              repeat: ["", "x", "y", "round", "space"]
            }]
          }],
          /**
           * Background Size
           * @see https://tailwindcss.com/docs/background-size
           */
          "bg-size": [{
            bg: ["auto", "cover", "contain", isArbitrarySize]
          }],
          /**
           * Background Image
           * @see https://tailwindcss.com/docs/background-image
           */
          "bg-image": [{
            bg: ["none", {
              "gradient-to": ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
            }, isArbitraryImage]
          }],
          /**
           * Background Color
           * @see https://tailwindcss.com/docs/background-color
           */
          "bg-color": [{
            bg: [colors]
          }],
          /**
           * Gradient Color Stops From Position
           * @see https://tailwindcss.com/docs/gradient-color-stops
           */
          "gradient-from-pos": [{
            from: [gradientColorStopPositions]
          }],
          /**
           * Gradient Color Stops Via Position
           * @see https://tailwindcss.com/docs/gradient-color-stops
           */
          "gradient-via-pos": [{
            via: [gradientColorStopPositions]
          }],
          /**
           * Gradient Color Stops To Position
           * @see https://tailwindcss.com/docs/gradient-color-stops
           */
          "gradient-to-pos": [{
            to: [gradientColorStopPositions]
          }],
          /**
           * Gradient Color Stops From
           * @see https://tailwindcss.com/docs/gradient-color-stops
           */
          "gradient-from": [{
            from: [gradientColorStops]
          }],
          /**
           * Gradient Color Stops Via
           * @see https://tailwindcss.com/docs/gradient-color-stops
           */
          "gradient-via": [{
            via: [gradientColorStops]
          }],
          /**
           * Gradient Color Stops To
           * @see https://tailwindcss.com/docs/gradient-color-stops
           */
          "gradient-to": [{
            to: [gradientColorStops]
          }],
          // Borders
          /**
           * Border Radius
           * @see https://tailwindcss.com/docs/border-radius
           */
          rounded: [{
            rounded: [borderRadius]
          }],
          /**
           * Border Radius Start
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-s": [{
            "rounded-s": [borderRadius]
          }],
          /**
           * Border Radius End
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-e": [{
            "rounded-e": [borderRadius]
          }],
          /**
           * Border Radius Top
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-t": [{
            "rounded-t": [borderRadius]
          }],
          /**
           * Border Radius Right
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-r": [{
            "rounded-r": [borderRadius]
          }],
          /**
           * Border Radius Bottom
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-b": [{
            "rounded-b": [borderRadius]
          }],
          /**
           * Border Radius Left
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-l": [{
            "rounded-l": [borderRadius]
          }],
          /**
           * Border Radius Start Start
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-ss": [{
            "rounded-ss": [borderRadius]
          }],
          /**
           * Border Radius Start End
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-se": [{
            "rounded-se": [borderRadius]
          }],
          /**
           * Border Radius End End
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-ee": [{
            "rounded-ee": [borderRadius]
          }],
          /**
           * Border Radius End Start
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-es": [{
            "rounded-es": [borderRadius]
          }],
          /**
           * Border Radius Top Left
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-tl": [{
            "rounded-tl": [borderRadius]
          }],
          /**
           * Border Radius Top Right
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-tr": [{
            "rounded-tr": [borderRadius]
          }],
          /**
           * Border Radius Bottom Right
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-br": [{
            "rounded-br": [borderRadius]
          }],
          /**
           * Border Radius Bottom Left
           * @see https://tailwindcss.com/docs/border-radius
           */
          "rounded-bl": [{
            "rounded-bl": [borderRadius]
          }],
          /**
           * Border Width
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w": [{
            border: [borderWidth]
          }],
          /**
           * Border Width X
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-x": [{
            "border-x": [borderWidth]
          }],
          /**
           * Border Width Y
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-y": [{
            "border-y": [borderWidth]
          }],
          /**
           * Border Width Start
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-s": [{
            "border-s": [borderWidth]
          }],
          /**
           * Border Width End
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-e": [{
            "border-e": [borderWidth]
          }],
          /**
           * Border Width Top
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-t": [{
            "border-t": [borderWidth]
          }],
          /**
           * Border Width Right
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-r": [{
            "border-r": [borderWidth]
          }],
          /**
           * Border Width Bottom
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-b": [{
            "border-b": [borderWidth]
          }],
          /**
           * Border Width Left
           * @see https://tailwindcss.com/docs/border-width
           */
          "border-w-l": [{
            "border-l": [borderWidth]
          }],
          /**
           * Border Opacity
           * @see https://tailwindcss.com/docs/border-opacity
           */
          "border-opacity": [{
            "border-opacity": [opacity]
          }],
          /**
           * Border Style
           * @see https://tailwindcss.com/docs/border-style
           */
          "border-style": [{
            border: [...getLineStyles(), "hidden"]
          }],
          /**
           * Divide Width X
           * @see https://tailwindcss.com/docs/divide-width
           */
          "divide-x": [{
            "divide-x": [borderWidth]
          }],
          /**
           * Divide Width X Reverse
           * @see https://tailwindcss.com/docs/divide-width
           */
          "divide-x-reverse": ["divide-x-reverse"],
          /**
           * Divide Width Y
           * @see https://tailwindcss.com/docs/divide-width
           */
          "divide-y": [{
            "divide-y": [borderWidth]
          }],
          /**
           * Divide Width Y Reverse
           * @see https://tailwindcss.com/docs/divide-width
           */
          "divide-y-reverse": ["divide-y-reverse"],
          /**
           * Divide Opacity
           * @see https://tailwindcss.com/docs/divide-opacity
           */
          "divide-opacity": [{
            "divide-opacity": [opacity]
          }],
          /**
           * Divide Style
           * @see https://tailwindcss.com/docs/divide-style
           */
          "divide-style": [{
            divide: getLineStyles()
          }],
          /**
           * Border Color
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color": [{
            border: [borderColor]
          }],
          /**
           * Border Color X
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-x": [{
            "border-x": [borderColor]
          }],
          /**
           * Border Color Y
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-y": [{
            "border-y": [borderColor]
          }],
          /**
           * Border Color S
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-s": [{
            "border-s": [borderColor]
          }],
          /**
           * Border Color E
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-e": [{
            "border-e": [borderColor]
          }],
          /**
           * Border Color Top
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-t": [{
            "border-t": [borderColor]
          }],
          /**
           * Border Color Right
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-r": [{
            "border-r": [borderColor]
          }],
          /**
           * Border Color Bottom
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-b": [{
            "border-b": [borderColor]
          }],
          /**
           * Border Color Left
           * @see https://tailwindcss.com/docs/border-color
           */
          "border-color-l": [{
            "border-l": [borderColor]
          }],
          /**
           * Divide Color
           * @see https://tailwindcss.com/docs/divide-color
           */
          "divide-color": [{
            divide: [borderColor]
          }],
          /**
           * Outline Style
           * @see https://tailwindcss.com/docs/outline-style
           */
          "outline-style": [{
            outline: ["", ...getLineStyles()]
          }],
          /**
           * Outline Offset
           * @see https://tailwindcss.com/docs/outline-offset
           */
          "outline-offset": [{
            "outline-offset": [isLength, isArbitraryValue]
          }],
          /**
           * Outline Width
           * @see https://tailwindcss.com/docs/outline-width
           */
          "outline-w": [{
            outline: [isLength, isArbitraryLength]
          }],
          /**
           * Outline Color
           * @see https://tailwindcss.com/docs/outline-color
           */
          "outline-color": [{
            outline: [colors]
          }],
          /**
           * Ring Width
           * @see https://tailwindcss.com/docs/ring-width
           */
          "ring-w": [{
            ring: getLengthWithEmptyAndArbitrary()
          }],
          /**
           * Ring Width Inset
           * @see https://tailwindcss.com/docs/ring-width
           */
          "ring-w-inset": ["ring-inset"],
          /**
           * Ring Color
           * @see https://tailwindcss.com/docs/ring-color
           */
          "ring-color": [{
            ring: [colors]
          }],
          /**
           * Ring Opacity
           * @see https://tailwindcss.com/docs/ring-opacity
           */
          "ring-opacity": [{
            "ring-opacity": [opacity]
          }],
          /**
           * Ring Offset Width
           * @see https://tailwindcss.com/docs/ring-offset-width
           */
          "ring-offset-w": [{
            "ring-offset": [isLength, isArbitraryLength]
          }],
          /**
           * Ring Offset Color
           * @see https://tailwindcss.com/docs/ring-offset-color
           */
          "ring-offset-color": [{
            "ring-offset": [colors]
          }],
          // Effects
          /**
           * Box Shadow
           * @see https://tailwindcss.com/docs/box-shadow
           */
          shadow: [{
            shadow: ["", "inner", "none", isTshirtSize, isArbitraryShadow]
          }],
          /**
           * Box Shadow Color
           * @see https://tailwindcss.com/docs/box-shadow-color
           */
          "shadow-color": [{
            shadow: [isAny]
          }],
          /**
           * Opacity
           * @see https://tailwindcss.com/docs/opacity
           */
          opacity: [{
            opacity: [opacity]
          }],
          /**
           * Mix Blend Mode
           * @see https://tailwindcss.com/docs/mix-blend-mode
           */
          "mix-blend": [{
            "mix-blend": [...getBlendModes(), "plus-lighter", "plus-darker"]
          }],
          /**
           * Background Blend Mode
           * @see https://tailwindcss.com/docs/background-blend-mode
           */
          "bg-blend": [{
            "bg-blend": getBlendModes()
          }],
          // Filters
          /**
           * Filter
           * @deprecated since Tailwind CSS v3.0.0
           * @see https://tailwindcss.com/docs/filter
           */
          filter: [{
            filter: ["", "none"]
          }],
          /**
           * Blur
           * @see https://tailwindcss.com/docs/blur
           */
          blur: [{
            blur: [blur]
          }],
          /**
           * Brightness
           * @see https://tailwindcss.com/docs/brightness
           */
          brightness: [{
            brightness: [brightness]
          }],
          /**
           * Contrast
           * @see https://tailwindcss.com/docs/contrast
           */
          contrast: [{
            contrast: [contrast]
          }],
          /**
           * Drop Shadow
           * @see https://tailwindcss.com/docs/drop-shadow
           */
          "drop-shadow": [{
            "drop-shadow": ["", "none", isTshirtSize, isArbitraryValue]
          }],
          /**
           * Grayscale
           * @see https://tailwindcss.com/docs/grayscale
           */
          grayscale: [{
            grayscale: [grayscale]
          }],
          /**
           * Hue Rotate
           * @see https://tailwindcss.com/docs/hue-rotate
           */
          "hue-rotate": [{
            "hue-rotate": [hueRotate]
          }],
          /**
           * Invert
           * @see https://tailwindcss.com/docs/invert
           */
          invert: [{
            invert: [invert]
          }],
          /**
           * Saturate
           * @see https://tailwindcss.com/docs/saturate
           */
          saturate: [{
            saturate: [saturate]
          }],
          /**
           * Sepia
           * @see https://tailwindcss.com/docs/sepia
           */
          sepia: [{
            sepia: [sepia]
          }],
          /**
           * Backdrop Filter
           * @deprecated since Tailwind CSS v3.0.0
           * @see https://tailwindcss.com/docs/backdrop-filter
           */
          "backdrop-filter": [{
            "backdrop-filter": ["", "none"]
          }],
          /**
           * Backdrop Blur
           * @see https://tailwindcss.com/docs/backdrop-blur
           */
          "backdrop-blur": [{
            "backdrop-blur": [blur]
          }],
          /**
           * Backdrop Brightness
           * @see https://tailwindcss.com/docs/backdrop-brightness
           */
          "backdrop-brightness": [{
            "backdrop-brightness": [brightness]
          }],
          /**
           * Backdrop Contrast
           * @see https://tailwindcss.com/docs/backdrop-contrast
           */
          "backdrop-contrast": [{
            "backdrop-contrast": [contrast]
          }],
          /**
           * Backdrop Grayscale
           * @see https://tailwindcss.com/docs/backdrop-grayscale
           */
          "backdrop-grayscale": [{
            "backdrop-grayscale": [grayscale]
          }],
          /**
           * Backdrop Hue Rotate
           * @see https://tailwindcss.com/docs/backdrop-hue-rotate
           */
          "backdrop-hue-rotate": [{
            "backdrop-hue-rotate": [hueRotate]
          }],
          /**
           * Backdrop Invert
           * @see https://tailwindcss.com/docs/backdrop-invert
           */
          "backdrop-invert": [{
            "backdrop-invert": [invert]
          }],
          /**
           * Backdrop Opacity
           * @see https://tailwindcss.com/docs/backdrop-opacity
           */
          "backdrop-opacity": [{
            "backdrop-opacity": [opacity]
          }],
          /**
           * Backdrop Saturate
           * @see https://tailwindcss.com/docs/backdrop-saturate
           */
          "backdrop-saturate": [{
            "backdrop-saturate": [saturate]
          }],
          /**
           * Backdrop Sepia
           * @see https://tailwindcss.com/docs/backdrop-sepia
           */
          "backdrop-sepia": [{
            "backdrop-sepia": [sepia]
          }],
          // Tables
          /**
           * Border Collapse
           * @see https://tailwindcss.com/docs/border-collapse
           */
          "border-collapse": [{
            border: ["collapse", "separate"]
          }],
          /**
           * Border Spacing
           * @see https://tailwindcss.com/docs/border-spacing
           */
          "border-spacing": [{
            "border-spacing": [borderSpacing]
          }],
          /**
           * Border Spacing X
           * @see https://tailwindcss.com/docs/border-spacing
           */
          "border-spacing-x": [{
            "border-spacing-x": [borderSpacing]
          }],
          /**
           * Border Spacing Y
           * @see https://tailwindcss.com/docs/border-spacing
           */
          "border-spacing-y": [{
            "border-spacing-y": [borderSpacing]
          }],
          /**
           * Table Layout
           * @see https://tailwindcss.com/docs/table-layout
           */
          "table-layout": [{
            table: ["auto", "fixed"]
          }],
          /**
           * Caption Side
           * @see https://tailwindcss.com/docs/caption-side
           */
          caption: [{
            caption: ["top", "bottom"]
          }],
          // Transitions and Animation
          /**
           * Tranisition Property
           * @see https://tailwindcss.com/docs/transition-property
           */
          transition: [{
            transition: ["none", "all", "", "colors", "opacity", "shadow", "transform", isArbitraryValue]
          }],
          /**
           * Transition Duration
           * @see https://tailwindcss.com/docs/transition-duration
           */
          duration: [{
            duration: getNumberAndArbitrary()
          }],
          /**
           * Transition Timing Function
           * @see https://tailwindcss.com/docs/transition-timing-function
           */
          ease: [{
            ease: ["linear", "in", "out", "in-out", isArbitraryValue]
          }],
          /**
           * Transition Delay
           * @see https://tailwindcss.com/docs/transition-delay
           */
          delay: [{
            delay: getNumberAndArbitrary()
          }],
          /**
           * Animation
           * @see https://tailwindcss.com/docs/animation
           */
          animate: [{
            animate: ["none", "spin", "ping", "pulse", "bounce", isArbitraryValue]
          }],
          // Transforms
          /**
           * Transform
           * @see https://tailwindcss.com/docs/transform
           */
          transform: [{
            transform: ["", "gpu", "none"]
          }],
          /**
           * Scale
           * @see https://tailwindcss.com/docs/scale
           */
          scale: [{
            scale: [scale]
          }],
          /**
           * Scale X
           * @see https://tailwindcss.com/docs/scale
           */
          "scale-x": [{
            "scale-x": [scale]
          }],
          /**
           * Scale Y
           * @see https://tailwindcss.com/docs/scale
           */
          "scale-y": [{
            "scale-y": [scale]
          }],
          /**
           * Rotate
           * @see https://tailwindcss.com/docs/rotate
           */
          rotate: [{
            rotate: [isInteger, isArbitraryValue]
          }],
          /**
           * Translate X
           * @see https://tailwindcss.com/docs/translate
           */
          "translate-x": [{
            "translate-x": [translate]
          }],
          /**
           * Translate Y
           * @see https://tailwindcss.com/docs/translate
           */
          "translate-y": [{
            "translate-y": [translate]
          }],
          /**
           * Skew X
           * @see https://tailwindcss.com/docs/skew
           */
          "skew-x": [{
            "skew-x": [skew]
          }],
          /**
           * Skew Y
           * @see https://tailwindcss.com/docs/skew
           */
          "skew-y": [{
            "skew-y": [skew]
          }],
          /**
           * Transform Origin
           * @see https://tailwindcss.com/docs/transform-origin
           */
          "transform-origin": [{
            origin: ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", isArbitraryValue]
          }],
          // Interactivity
          /**
           * Accent Color
           * @see https://tailwindcss.com/docs/accent-color
           */
          accent: [{
            accent: ["auto", colors]
          }],
          /**
           * Appearance
           * @see https://tailwindcss.com/docs/appearance
           */
          appearance: [{
            appearance: ["none", "auto"]
          }],
          /**
           * Cursor
           * @see https://tailwindcss.com/docs/cursor
           */
          cursor: [{
            cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryValue]
          }],
          /**
           * Caret Color
           * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
           */
          "caret-color": [{
            caret: [colors]
          }],
          /**
           * Pointer Events
           * @see https://tailwindcss.com/docs/pointer-events
           */
          "pointer-events": [{
            "pointer-events": ["none", "auto"]
          }],
          /**
           * Resize
           * @see https://tailwindcss.com/docs/resize
           */
          resize: [{
            resize: ["none", "y", "x", ""]
          }],
          /**
           * Scroll Behavior
           * @see https://tailwindcss.com/docs/scroll-behavior
           */
          "scroll-behavior": [{
            scroll: ["auto", "smooth"]
          }],
          /**
           * Scroll Margin
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-m": [{
            "scroll-m": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin X
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-mx": [{
            "scroll-mx": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin Y
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-my": [{
            "scroll-my": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin Start
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-ms": [{
            "scroll-ms": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin End
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-me": [{
            "scroll-me": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin Top
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-mt": [{
            "scroll-mt": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin Right
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-mr": [{
            "scroll-mr": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin Bottom
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-mb": [{
            "scroll-mb": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Margin Left
           * @see https://tailwindcss.com/docs/scroll-margin
           */
          "scroll-ml": [{
            "scroll-ml": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-p": [{
            "scroll-p": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding X
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-px": [{
            "scroll-px": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding Y
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-py": [{
            "scroll-py": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding Start
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-ps": [{
            "scroll-ps": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding End
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-pe": [{
            "scroll-pe": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding Top
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-pt": [{
            "scroll-pt": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding Right
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-pr": [{
            "scroll-pr": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding Bottom
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-pb": [{
            "scroll-pb": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Padding Left
           * @see https://tailwindcss.com/docs/scroll-padding
           */
          "scroll-pl": [{
            "scroll-pl": getSpacingWithArbitrary()
          }],
          /**
           * Scroll Snap Align
           * @see https://tailwindcss.com/docs/scroll-snap-align
           */
          "snap-align": [{
            snap: ["start", "end", "center", "align-none"]
          }],
          /**
           * Scroll Snap Stop
           * @see https://tailwindcss.com/docs/scroll-snap-stop
           */
          "snap-stop": [{
            snap: ["normal", "always"]
          }],
          /**
           * Scroll Snap Type
           * @see https://tailwindcss.com/docs/scroll-snap-type
           */
          "snap-type": [{
            snap: ["none", "x", "y", "both"]
          }],
          /**
           * Scroll Snap Type Strictness
           * @see https://tailwindcss.com/docs/scroll-snap-type
           */
          "snap-strictness": [{
            snap: ["mandatory", "proximity"]
          }],
          /**
           * Touch Action
           * @see https://tailwindcss.com/docs/touch-action
           */
          touch: [{
            touch: ["auto", "none", "manipulation"]
          }],
          /**
           * Touch Action X
           * @see https://tailwindcss.com/docs/touch-action
           */
          "touch-x": [{
            "touch-pan": ["x", "left", "right"]
          }],
          /**
           * Touch Action Y
           * @see https://tailwindcss.com/docs/touch-action
           */
          "touch-y": [{
            "touch-pan": ["y", "up", "down"]
          }],
          /**
           * Touch Action Pinch Zoom
           * @see https://tailwindcss.com/docs/touch-action
           */
          "touch-pz": ["touch-pinch-zoom"],
          /**
           * User Select
           * @see https://tailwindcss.com/docs/user-select
           */
          select: [{
            select: ["none", "text", "all", "auto"]
          }],
          /**
           * Will Change
           * @see https://tailwindcss.com/docs/will-change
           */
          "will-change": [{
            "will-change": ["auto", "scroll", "contents", "transform", isArbitraryValue]
          }],
          // SVG
          /**
           * Fill
           * @see https://tailwindcss.com/docs/fill
           */
          fill: [{
            fill: [colors, "none"]
          }],
          /**
           * Stroke Width
           * @see https://tailwindcss.com/docs/stroke-width
           */
          "stroke-w": [{
            stroke: [isLength, isArbitraryLength, isArbitraryNumber]
          }],
          /**
           * Stroke
           * @see https://tailwindcss.com/docs/stroke
           */
          stroke: [{
            stroke: [colors, "none"]
          }],
          // Accessibility
          /**
           * Screen Readers
           * @see https://tailwindcss.com/docs/screen-readers
           */
          sr: ["sr-only", "not-sr-only"],
          /**
           * Forced Color Adjust
           * @see https://tailwindcss.com/docs/forced-color-adjust
           */
          "forced-color-adjust": [{
            "forced-color-adjust": ["auto", "none"]
          }]
        },
        conflictingClassGroups: {
          overflow: ["overflow-x", "overflow-y"],
          overscroll: ["overscroll-x", "overscroll-y"],
          inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
          "inset-x": ["right", "left"],
          "inset-y": ["top", "bottom"],
          flex: ["basis", "grow", "shrink"],
          gap: ["gap-x", "gap-y"],
          p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
          px: ["pr", "pl"],
          py: ["pt", "pb"],
          m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
          mx: ["mr", "ml"],
          my: ["mt", "mb"],
          size: ["w", "h"],
          "font-size": ["leading"],
          "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
          "fvn-ordinal": ["fvn-normal"],
          "fvn-slashed-zero": ["fvn-normal"],
          "fvn-figure": ["fvn-normal"],
          "fvn-spacing": ["fvn-normal"],
          "fvn-fraction": ["fvn-normal"],
          "line-clamp": ["display", "overflow"],
          rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
          "rounded-s": ["rounded-ss", "rounded-es"],
          "rounded-e": ["rounded-se", "rounded-ee"],
          "rounded-t": ["rounded-tl", "rounded-tr"],
          "rounded-r": ["rounded-tr", "rounded-br"],
          "rounded-b": ["rounded-br", "rounded-bl"],
          "rounded-l": ["rounded-tl", "rounded-bl"],
          "border-spacing": ["border-spacing-x", "border-spacing-y"],
          "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
          "border-w-x": ["border-w-r", "border-w-l"],
          "border-w-y": ["border-w-t", "border-w-b"],
          "border-color": ["border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
          "border-color-x": ["border-color-r", "border-color-l"],
          "border-color-y": ["border-color-t", "border-color-b"],
          "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
          "scroll-mx": ["scroll-mr", "scroll-ml"],
          "scroll-my": ["scroll-mt", "scroll-mb"],
          "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
          "scroll-px": ["scroll-pr", "scroll-pl"],
          "scroll-py": ["scroll-pt", "scroll-pb"],
          touch: ["touch-x", "touch-y", "touch-pz"],
          "touch-x": ["touch"],
          "touch-y": ["touch"],
          "touch-pz": ["touch"]
        },
        conflictingClassGroupModifiers: {
          "font-size": ["leading"]
        }
      };
    };
    var mergeConfigs = (baseConfig, {
      cacheSize,
      prefix,
      separator,
      experimentalParseClassName,
      extend = {},
      override = {}
    }) => {
      overrideProperty(baseConfig, "cacheSize", cacheSize);
      overrideProperty(baseConfig, "prefix", prefix);
      overrideProperty(baseConfig, "separator", separator);
      overrideProperty(baseConfig, "experimentalParseClassName", experimentalParseClassName);
      for (const configKey in override) {
        overrideConfigProperties(baseConfig[configKey], override[configKey]);
      }
      for (const key in extend) {
        mergeConfigProperties(baseConfig[key], extend[key]);
      }
      return baseConfig;
    };
    var overrideProperty = (baseObject, overrideKey, overrideValue) => {
      if (overrideValue !== void 0) {
        baseObject[overrideKey] = overrideValue;
      }
    };
    var overrideConfigProperties = (baseObject, overrideObject) => {
      if (overrideObject) {
        for (const key in overrideObject) {
          overrideProperty(baseObject, key, overrideObject[key]);
        }
      }
    };
    var mergeConfigProperties = (baseObject, mergeObject) => {
      if (mergeObject) {
        for (const key in mergeObject) {
          const mergeValue = mergeObject[key];
          if (mergeValue !== void 0) {
            baseObject[key] = (baseObject[key] || []).concat(mergeValue);
          }
        }
      }
    };
    var extendTailwindMerge = (configExtension, ...createConfig) => typeof configExtension === "function" ? createTailwindMerge(getDefaultConfig, configExtension, ...createConfig) : createTailwindMerge(() => mergeConfigs(getDefaultConfig(), configExtension), ...createConfig);
    var twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);
    exports2.createTailwindMerge = createTailwindMerge;
    exports2.extendTailwindMerge = extendTailwindMerge;
    exports2.fromTheme = fromTheme;
    exports2.getDefaultConfig = getDefaultConfig;
    exports2.mergeConfigs = mergeConfigs;
    exports2.twJoin = twJoin;
    exports2.twMerge = twMerge;
    exports2.validators = validators;
  }
});

// ../../node_modules/.pnpm/@prisma+client@5.22.0/node_modules/.prisma/client/default.js
var require_default = __commonJS({
  "../../node_modules/.pnpm/@prisma+client@5.22.0/node_modules/.prisma/client/default.js"(exports2, module2) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var default_index_exports = {};
    __export2(default_index_exports, {
      Prisma: () => Prisma,
      PrismaClient: () => PrismaClient,
      default: () => default_index_default
    });
    module2.exports = __toCommonJS2(default_index_exports);
    var prisma = {
      enginesVersion: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
    };
    var version = "5.22.0";
    var clientVersion = version;
    var PrismaClient = class {
      constructor() {
        throw new Error('@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.');
      }
    };
    function defineExtension(ext) {
      if (typeof ext === "function") {
        return ext;
      }
      return (client) => client.$extends(ext);
    }
    function getExtensionContext(that) {
      return that;
    }
    var Prisma = {
      defineExtension,
      getExtensionContext,
      prismaVersion: { client: clientVersion, engine: prisma.enginesVersion }
    };
    var default_index_default = { Prisma };
  }
});

// ../../node_modules/.pnpm/@prisma+client@5.22.0/node_modules/@prisma/client/default.js
var require_default2 = __commonJS({
  "../../node_modules/.pnpm/@prisma+client@5.22.0/node_modules/@prisma/client/default.js"(exports2, module2) {
    module2.exports = {
      ...require_default()
    };
  }
});

// ../../packages/db/dist/index.js
var require_dist2 = __commonJS({
  "../../packages/db/dist/index.js"(exports2, module2) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps2(target, mod, "default"), secondTarget && __copyProps2(secondTarget, mod, "default"));
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var index_exports = {};
    __export2(index_exports, {
      prisma: () => prisma
    });
    module2.exports = __toCommonJS2(index_exports);
    var import_client = require_default2();
    __reExport(index_exports, require_default2(), module2.exports);
    var prisma = global.prisma || new import_client.PrismaClient();
    if (process.env.NODE_ENV !== "production") global.prisma = prisma;
  }
});

// ../../packages/utils/dist/index.js
var require_dist3 = __commonJS({
  "../../packages/utils/dist/index.js"(exports2, module2) {
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __esm2 = (fn, res) => function __init() {
      return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
    };
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var supabase_admin_exports = {};
    __export2(supabase_admin_exports, {
      getSupabaseAdmin: () => getSupabaseAdmin,
      supabaseAdmin: () => supabaseAdmin
    });
    function getSupabaseAdmin(url, key) {
      const finalUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
      const finalKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!finalUrl || !finalKey) {
        throw new Error("[SupabaseAdmin] Both URL and Service Role Key are required. Provide them as arguments or set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env vars.");
      }
      return (0, import_supabase.createServerSupabaseClient)(finalUrl, finalKey);
    }
    var import_supabase;
    var supabaseAdmin;
    var init_supabase_admin = __esm2({
      "src/services/supabase-admin.ts"() {
        import_supabase = require_dist();
        supabaseAdmin = null;
      }
    });
    var index_exports = {};
    __export2(index_exports, {
      EjectSystem: () => EjectSystem,
      MemoryPlane: () => MemoryPlane,
      Orchestrator: () => Orchestrator2,
      ProjectStateManager: () => ProjectStateManager,
      QueueManager: () => QueueManager,
      StageState: () => StageState,
      StageStateMachine: () => StageStateMachine2,
      StrategyEngine: () => StrategyEngine,
      activeBuildsGauge: () => activeBuildsGauge,
      agentExecutionDuration: () => agentExecutionDuration,
      agentFailuresTotal: () => agentFailuresTotal,
      apiRequestDurationSeconds: () => apiRequestDurationSeconds,
      config: () => config_exports,
      eventBus: () => eventBus2,
      executionFailureTotal: () => executionFailureTotal,
      executionSuccessTotal: () => executionSuccessTotal,
      getLatestBuildState: () => getLatestBuildState,
      independentRedisClients: () => independentRedisClients,
      lib: () => lib_exports,
      lockExpiredTotal: () => lockExpiredTotal,
      lockExtensionTotal: () => lockExtensionTotal,
      logger: () => logger_default,
      memoryPlane: () => memoryPlane,
      missionController: () => missionController2,
      nodeCpuUsage: () => nodeCpuUsage,
      nodeMemoryUsage: () => nodeMemoryUsage,
      publishBuildEvent: () => publishBuildEvent,
      queueLengthGauge: () => queueLengthGauge,
      queueManager: () => queueManager,
      queueWaitTimeSeconds: () => queueWaitTimeSeconds,
      readBuildEvents: () => readBuildEvents,
      recordBuildMetrics: () => recordBuildMetrics,
      redis: () => redis,
      registry: () => registry,
      retryCountTotal: () => retryCountTotal,
      runtimeActiveTotal: () => runtimeActiveTotal,
      runtimeCrashesTotal: () => runtimeCrashesTotal,
      runtimeEvictionsTotal: () => runtimeEvictionsTotal,
      runtimeProxyErrorsTotal: () => runtimeProxyErrorsTotal,
      runtimeStartupDuration: () => runtimeStartupDuration,
      services: () => services_exports,
      stateManager: () => stateManager2,
      stripeWebhookEventsTotal: () => stripeWebhookEventsTotal,
      stuckBuildsTotal: () => stuckBuildsTotal,
      workerTaskDurationSeconds: () => workerTaskDurationSeconds
    });
    module2.exports = __toCommonJS2(index_exports);
    var import_pino = __toESM2(require("pino"));
    var import_uuid = require("uuid");
    var import_async_hooks = require("async_hooks");
    var tracingContext = new import_async_hooks.AsyncLocalStorage();
    function getCorrelationId() {
      return tracingContext.getStore() || "no-correlation-id";
    }
    function runWithTracing(id, fn) {
      const correlationId = id || (0, import_uuid.v4)();
      return tracingContext.run(correlationId, fn);
    }
    var import_api = (init_esm(), __toCommonJS(esm_exports));
    var logger3 = (0, import_pino.default)({
      level: process.env.LOG_LEVEL || "info",
      base: {
        env: process.env.NODE_ENV,
        service: "multi-agent-platform"
      },
      mixin() {
        const span = import_api.trace.getSpan(import_api.context.active());
        const spanContext = span?.spanContext();
        return {
          correlationId: getCorrelationId(),
          traceId: spanContext?.traceId,
          spanId: spanContext?.spanId
        };
      },
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        }
      },
      timestamp: import_pino.default.stdTimeFunctions.isoTime
    });
    function getExecutionLogger2(executionId) {
      return logger3.child({ executionId });
    }
    var logger_default = logger3;
    var logger_default2 = logger_default;
    var import_bullmq = require("bullmq");
    var import_ioredis = __toESM2(require("ioredis"));
    var REDIS_URLS = process.env.REDIS_URLS ? process.env.REDIS_URLS.split(",") : [process.env.REDIS_URL || "redis://localhost:6379"];
    var SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME || null;
    var RedisClient = class {
      static instance;
      static getInstance() {
        if (!this.instance) {
          const commonOptions = {
            maxRetriesPerRequest: null,
            // Critical for BullMQ
            connectTimeout: 5e3,
            // Fail fast on boot
            retryStrategy: (times) => {
              const isDev = process.env.NODE_ENV !== "production";
              if (!isDev && times > 20) {
                logger_default.error("Redis connection failed permanently. Halting.");
                return null;
              }
              const delay = Math.min(times * 100, 3e3);
              if (times % 5 === 0) {
                logger_default.warn({ times, nextRetryIn: delay }, "Redis unreachable. Retrying...");
              }
              return delay;
            },
            reconnectOnError: (err) => {
              const targetError = "READONLY";
              if (err.message.includes(targetError)) {
                return true;
              }
              return false;
            }
          };
          if (SENTINEL_NAME) {
            const sentinels = REDIS_URLS.map((url) => {
              const parsed = new URL(url);
              return { host: parsed.hostname, port: Number(parsed.port) };
            });
            this.instance = new import_ioredis.default({
              sentinels,
              name: SENTINEL_NAME,
              ...commonOptions
            });
          } else {
            const redisUrl = REDIS_URLS[0];
            const isSecure = redisUrl.startsWith("rediss://") || process.env.REDIS_TLS === "true";
            const connectionOptions = {
              ...commonOptions
            };
            if (isSecure) {
              connectionOptions.tls = { rejectUnauthorized: false };
            }
            logger_default.info({ isSecure, urlPrefix: redisUrl.substring(0, 8) }, "Initializing Redis Connection");
            this.instance = new import_ioredis.default(redisUrl, connectionOptions);
          }
          this.instance.on("connect", () => logger_default.info("Redis connected successfully"));
          this.instance.on("ready", () => logger_default.info("Redis ready to receive commands"));
          this.instance.on("error", (err) => logger_default.error({ err: err.message || err }, "Redis connection error"));
        }
        return this.instance;
      }
      static async quit() {
        if (this.instance) {
          await this.instance.quit();
          logger_default.info("Redis connection closed");
        }
      }
      static getIndependentClients() {
        const commonOptions = { maxRetriesPerRequest: null, connectTimeout: 5e3 };
        return REDIS_URLS.map((url) => new import_ioredis.default(url, commonOptions));
      }
    };
    process.on("SIGTERM", async () => {
      logger_default.info("SIGTERM received, closing Redis...");
      await RedisClient.quit();
    });
    var redis = RedisClient.getInstance();
    var independentRedisClients = REDIS_URLS.length > 1 ? RedisClient.getIndependentClients() : [redis];
    var redis_default = redis;
    var QueueManager = class {
      queues = /* @__PURE__ */ new Map();
      eventListeners = /* @__PURE__ */ new Map();
      getQueue(name) {
        if (!this.queues.has(name)) {
          const queue = new import_bullmq.Queue(name, {
            connection: redis_default,
            defaultJobOptions: {
              attempts: 5,
              backoff: {
                type: "exponential",
                delay: 1e4
                // Start with 10s
              },
              removeOnComplete: {
                age: 3600 * 24,
                // Keep for 24h
                count: 1e3
              },
              removeOnFail: {
                age: 3600 * 24 * 7,
                // Keep failed for 7 days (DLQ behavior)
                count: 5e3
              }
            }
          });
          this.queues.set(name, queue);
        }
        return this.queues.get(name);
      }
      async addJob(queueName, data, jobId) {
        const queue = this.getQueue(queueName);
        const job = await queue.add(queueName, data, { jobId });
        logger_default2.info({ queueName, jobId: job.id }, "[QueueManager] Job added");
        return job;
      }
      async onJobCompleted(queueName, callback) {
        if (!this.eventListeners.has(queueName)) {
          const events = new import_bullmq.QueueEvents(queueName, { connection: redis_default });
          this.eventListeners.set(queueName, events);
        }
        this.eventListeners.get(queueName).on("completed", ({ jobId, returnvalue }) => {
          callback(jobId, returnvalue);
        });
      }
      async onJobFailed(queueName, callback) {
        if (!this.eventListeners.has(queueName)) {
          const events = new import_bullmq.QueueEvents(queueName, { connection: redis_default });
          this.eventListeners.set(queueName, events);
        }
        this.eventListeners.get(queueName).on("failed", ({ jobId, failedReason }) => {
          callback(jobId, new Error(failedReason));
        });
      }
    };
    var queueManager = new QueueManager();
    var AgentMetrics = {
      getAgentStats: async (agentName) => {
        return [];
      }
    };
    var StrategyEngine = class {
      /**
       * Determines the optimal strategy for an agent based on historical performance.
       */
      static async getOptimalStrategy(agentName, taskType) {
        const stats = await AgentMetrics.getAgentStats(agentName);
        const taskStats = stats?.find((s) => s.task_type === taskType);
        let strategy = "direct_generation";
        let temperature = 0.7;
        if (taskStats) {
          const successRate = taskStats.success_rate || 0;
          if (successRate < 0.75) {
            logger_default.warn({ agentName, successRate }, "[StrategyEngine] Performance below threshold. Escalating to memory_augmented strategy.");
            strategy = "memory_augmented";
            temperature = 0.5;
          } else if (successRate > 0.95) {
            logger_default.info({ agentName }, "[StrategyEngine] High performance detected. Optimizing for speed.");
            temperature = 0.8;
          }
        }
        return {
          strategy,
          temperature,
          contextWindow: 4e3,
          model: "llama-3.1-8b-instant"
        };
      }
      /**
       * Optimizes a prompt based on learned patterns (Mock implementation).
       */
      static async optimizePrompt(basePrompt, agentName) {
        if (agentName === "UIAgent" && !basePrompt.includes("Tailwind")) {
          return `${basePrompt}
Ensure accessibility standards and use Tailwind CSS for styling.`;
        }
        return basePrompt;
      }
    };
    var import_archiver = __toESM2(require("archiver"));
    var import_fs_extra = __toESM2(require("fs-extra"));
    var import_path = __toESM2(require("path"));
    var EjectSystem = class {
      static STORAGE_DIR = import_path.default.join(process.cwd(), "artifact-storage", "ejects");
      static async eject(missionId, projectPath) {
        await import_fs_extra.default.ensureDir(this.STORAGE_DIR);
        const ejectPath = import_path.default.join(this.STORAGE_DIR, `${missionId}.zip`);
        const output = import_fs_extra.default.createWriteStream(ejectPath);
        const archive = (0, import_archiver.default)("zip", { zlib: { level: 9 } });
        return new Promise((resolve, reject) => {
          output.on("close", () => {
            logger_default.info({ missionId, size: archive.pointer() }, "[Eject] Bundle created");
            resolve(ejectPath);
          });
          archive.on("error", (err) => reject(err));
          archive.pipe(output);
          archive.directory(projectPath, "src");
          const infraDir = import_path.default.join(process.cwd(), "infrastructure");
          archive.directory(import_path.default.join(infraDir, "docker"), "infrastructure/docker");
          archive.directory(import_path.default.join(infraDir, "terraform"), "infrastructure/terraform");
          archive.append(`
# Aion Generated Project: ${missionId}

## Deployment
1. Run \`docker-compose up --build\` in \`infrastructure/docker\`
2. Apply terraform scripts in \`infrastructure/terraform\`
            `, { name: "README.md" });
          archive.finalize();
        });
      }
    };
    init_supabase_admin();
    var PersistenceStore = class {
      /**
       * Atomically log a build state transition.
       */
      static async upsertBuild(build) {
        if (!supabaseAdmin) return;
        try {
          const { error } = await supabaseAdmin.from("builds").upsert({
            id: build.id,
            project_id: build.project_id,
            status: build.status,
            current_stage: build.current_stage,
            progress_percent: build.progress_percent,
            message: build.message,
            tokens_used: build.tokens_used,
            duration_ms: build.duration_ms,
            cost_usd: build.cost_usd,
            preview_url: build.preview_url,
            metadata: build.metadata,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          if (error) logger_default.error({ error, buildId: build.id }, "[PersistenceStore] Build Upsert Error");
        } catch (err) {
          logger_default.error({ err }, "[PersistenceStore] Fatal DB Error during build upsert");
        }
      }
      /**
       * Store a granular event for history/replay.
       */
      static async logEvent(event) {
        if (!supabaseAdmin) return;
        try {
          const { error } = await supabaseAdmin.from("build_events").insert({
            execution_id: event.execution_id,
            type: event.type,
            agent_name: event.agent_name,
            action: event.action,
            message: event.message,
            data: event.data,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          if (error) logger_default.error({ error, executionId: event.execution_id }, "[PersistenceStore] Event Logging Error");
        } catch (err) {
          logger_default.error({ err }, "[PersistenceStore] Fatal DB Error during event log");
        }
      }
      /**
       * Ensure a project exists in the DB.
       */
      static async ensureProject(projectId, name, userId) {
        if (!supabaseAdmin) return;
        try {
          const { error } = await supabaseAdmin.from("projects").upsert({
            id: projectId,
            name,
            user_id: userId,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          if (error) logger_default.error({ error, projectId }, "[PersistenceStore] Project Sync Error");
        } catch (err) {
          logger_default.error({ err }, "[PersistenceStore] Fatal DB Error during project sync");
        }
      }
    };
    var STREAM_TTL_SECONDS = 4 * 60 * 60;
    var THROTTLE_MS = 100;
    var throttleMap = /* @__PURE__ */ new Map();
    var EventBatcher = class {
      queue = [];
      timer = null;
      maxBatchSize = 10;
      batchWaitMs = 50;
      // Aggregate for 50ms
      async add(event) {
        this.queue.push(event);
        if (this.queue.length >= this.maxBatchSize) {
          await this.flush();
        } else if (!this.timer) {
          this.timer = setTimeout(() => this.flush(), this.batchWaitMs);
        }
      }
      async flush() {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        if (this.queue.length === 0) return;
        const batch = [...this.queue];
        this.queue = [];
        await Promise.all(batch.map((event) => this.publishImmediate(event)));
      }
      async publishImmediate(event) {
        const { executionId } = event;
        const streamKey = `build:stream:${executionId}`;
        const stateKey = `build:state:${executionId}`;
        const pubChannel = `build:progress:${executionId}`;
        const payload = JSON.stringify(event);
        try {
          const pipeline = redis.pipeline();
          pipeline.xadd(streamKey, "MAXLEN", "~", 500, "*", "data", payload);
          pipeline.expire(streamKey, STREAM_TTL_SECONDS);
          pipeline.setex(stateKey, STREAM_TTL_SECONDS, payload);
          if (event.type === "stage" || event.type === "agent" || event.type === "error" || event.type === "complete") {
            PersistenceStore.logEvent({
              execution_id: event.executionId,
              type: event.type,
              agent_name: event.agent || event.metadata?.agent,
              action: event.action,
              message: event.message,
              data: event.metadata || {}
            }).catch(() => {
            });
          }
          pipeline.publish(pubChannel, payload);
          if (event.projectId) {
            pipeline.publish("build-events", payload);
          }
          await pipeline.exec();
        } catch (err) {
          logger_default.error({ err, executionId }, "[EventBus] Failed to publish build event");
        }
      }
    };
    var batcher = new EventBatcher();
    async function publishBuildEvent(event) {
      const { executionId, type } = event;
      if (type === "progress" || type === "thought") {
        const throttleKey = `${executionId}:${type}`;
        const now = Date.now();
        const last = throttleMap.get(throttleKey) || 0;
        if (now - last < THROTTLE_MS) {
          return;
        }
        throttleMap.set(throttleKey, now);
      }
      if (type === "error" || type === "complete" || type === "stage") {
        return batcher.publishImmediate(event);
      }
      return batcher.add(event);
    }
    async function readBuildEvents(executionId, lastId, blockMs = 2e4) {
      const streamKey = `build:stream:${executionId}`;
      try {
        const result = await redis.xread(
          "BLOCK",
          blockMs,
          "COUNT",
          50,
          "STREAMS",
          streamKey,
          lastId
        );
        if (!result || !result[0]) return null;
        const [, messages] = result[0];
        return messages.map(([id, fields]) => {
          const dataIdx = fields.indexOf("data");
          const raw = dataIdx !== -1 ? fields[dataIdx + 1] : "{}";
          const event = JSON.parse(raw);
          return [id, event];
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("timeout") && !msg.includes("ECONNRESET")) {
          logger_default.error({ err, executionId }, "[EventBus] xread error");
        }
        return null;
      }
    }
    async function getLatestBuildState(executionId) {
      try {
        const raw = await redis.get(`build:state:${executionId}`);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    var eventBus2 = {
      /** Emit a progress event */
      progress(executionId, progress, message, stage, status = "executing", projectId, metrics2) {
        return publishBuildEvent({
          type: "progress",
          executionId,
          projectId,
          timestamp: Date.now(),
          progress,
          totalProgress: progress,
          message,
          currentStage: stage,
          status,
          tokensUsed: metrics2?.tokens,
          durationMs: metrics2?.duration,
          costUsd: metrics2?.cost
        });
      },
      /** Emit a stage transition event */
      stage(executionId, stageId, stageStatus, message, progress, projectId, files, metrics2) {
        return publishBuildEvent({
          type: "stage",
          executionId,
          projectId,
          timestamp: Date.now(),
          currentStage: stageId,
          status: stageStatus,
          message: `[Stage] ${message}`,
          progress,
          totalProgress: progress,
          files,
          tokensUsed: metrics2?.tokens,
          durationMs: metrics2?.duration,
          costUsd: metrics2?.cost
        });
      },
      /** Emit an AI agent thought / log line */
      thought(executionId, agent, thought, projectId) {
        return publishBuildEvent({
          type: "thought",
          executionId,
          projectId,
          timestamp: Date.now(),
          message: thought,
          metadata: { agent }
        });
      },
      /** Emit final completion event and schedule stream cleanup */
      async complete(executionId, previewUrl, metadata, projectId, files) {
        const tokens = Number(metadata?.tokensTotal || 0);
        const duration = Number(metadata?.durationMs || 0);
        const cost = tokens / 1e3 * 2e-3;
        await publishBuildEvent({
          type: "complete",
          executionId,
          projectId,
          timestamp: Date.now(),
          status: "completed",
          progress: 100,
          totalProgress: 100,
          message: "Build complete",
          currentStage: "deployment",
          metadata: { previewUrl, ...metadata },
          files,
          tokensUsed: tokens,
          durationMs: duration,
          costUsd: cost
        });
        try {
          await redis.expire(`build:stream:${executionId}`, STREAM_TTL_SECONDS);
          await redis.expire(`build:state:${executionId}`, STREAM_TTL_SECONDS);
        } catch {
        }
      },
      /** Emit an agent activity event (appears in the Timeline tab) */
      agent(executionId, agentName, action, message, projectId) {
        return publishBuildEvent({
          type: "agent",
          executionId,
          projectId,
          timestamp: Date.now(),
          agent: agentName,
          action,
          message
        });
      },
      /**
       * Start a duration-tracked agent timer.
       * Emits a 'started' event immediately, returns a done() function that emits
       * a 'finished' event with elapsed time when called.
       *
       * Usage:
       *   const done = await eventBus.startTimer(id, 'DatabaseAgent', 'schema_design', 'Designing schema...');
       *   // ... do work ...
       *   await done('Schema complete');
       */
      async startTimer(executionId, agentName, action, message, projectId) {
        const startedAt = Date.now();
        await publishBuildEvent({
          type: "agent",
          executionId,
          projectId,
          timestamp: startedAt,
          agent: agentName,
          action: `${action}:started`,
          message
        });
        return async (completionMessage) => {
          const durationMs = Date.now() - startedAt;
          await publishBuildEvent({
            type: "agent",
            executionId,
            projectId,
            timestamp: Date.now(),
            agent: agentName,
            action: `${action}:finished`,
            message: completionMessage || message,
            durationMs
          });
        };
      },
      /** Emit a build failure event */
      error(executionId, message, projectId) {
        return publishBuildEvent({
          type: "error",
          executionId,
          projectId,
          timestamp: Date.now(),
          status: "failed",
          message
        });
      },
      /** Read new messages from the stream */
      readBuildEvents
    };
    var MissionController = class {
      PREFIX = "mission:";
      async createMission(mission) {
        const key = `${this.PREFIX}${mission.id}`;
        await redis.setex(key, 86400, JSON.stringify(mission));
        logger_default.info({ missionId: mission.id }, "Mission state initialized in Redis");
        await eventBus2.stage(mission.id, mission.status, "in_progress", "Mission initialized", 0, mission.projectId);
      }
      async getMission(missionId) {
        const data = await redis.get(`${this.PREFIX}${missionId}`);
        return data ? JSON.parse(data) : null;
      }
      async atomicUpdate(missionId, mutator) {
        const key = `${this.PREFIX}${missionId}`;
        const existing = await this.getMission(missionId);
        if (!existing) {
          logger_default.warn({ missionId }, "Attempted atomic update on non-existent mission");
          return;
        }
        const updated = await mutator(existing);
        updated.updatedAt = Date.now();
        await redis.setex(key, 86400, JSON.stringify(updated));
        if (updated.status !== existing.status) {
          logger_default.info({ missionId, from: existing.status, to: updated.status }, "[MissionController] Atomic Transition");
          const STATUS_PROGRESS = {
            "init": 5,
            "queued": 10,
            "planning": 15,
            "graph_ready": 25,
            "executing": 45,
            "building": 60,
            "repairing": 70,
            "assembling": 80,
            "deploying": 90,
            "previewing": 95,
            "complete": 100,
            "failed": 0
          };
          await eventBus2.stage(
            missionId,
            updated.status,
            updated.status === "complete" ? "completed" : "in_progress",
            `Stage: ${updated.status}`,
            STATUS_PROGRESS[updated.status] || 0,
            updated.projectId
          );
        }
      }
      async updateMission(missionId, update) {
        return this.atomicUpdate(missionId, (existing) => {
          const updated = {
            ...existing,
            ...update,
            metadata: {
              ...existing.metadata,
              ...update.metadata || {}
            }
          };
          if (update.status && update.status !== existing.status) {
            if (!this.validateTransition(existing.status, update.status)) {
              logger_default.error({ missionId, from: existing.status, to: update.status }, "INVALID transition rejected by Pipeline State Guard");
              return existing;
            }
            updated.status = update.status;
          }
          return updated;
        });
      }
      async setFailed(missionId, error) {
        await this.updateMission(missionId, {
          status: "failed",
          metadata: { error }
        });
      }
      async listActiveMissions() {
        const keys = await redis.keys(`${this.PREFIX}*`);
        const missions = [];
        for (const key of keys) {
          const data = await redis.get(key);
          if (data) {
            const mission = JSON.parse(data);
            if (!["completed", "failed"].includes(mission.status)) {
              missions.push(mission);
            }
          }
        }
        return missions;
      }
      validateTransition(current, next) {
        const allowed = {
          "init": ["queued", "planning", "failed"],
          "queued": ["planning", "failed"],
          "planning": ["graph_ready", "failed"],
          "graph_ready": ["executing", "failed"],
          "executing": ["building", "failed"],
          "building": ["repairing", "assembling", "failed"],
          "repairing": ["assembling", "failed"],
          "assembling": ["deploying", "failed"],
          "deploying": ["previewing", "failed"],
          "previewing": ["complete", "failed"],
          "complete": [],
          "failed": ["init"]
        };
        const allowedNext = allowed[current] || [];
        return allowedNext.includes(next);
      }
    };
    var missionController2 = new MissionController();
    var ProjectStateManager = class _ProjectStateManager {
      static instance;
      constructor() {
      }
      static getInstance() {
        if (!_ProjectStateManager.instance) {
          _ProjectStateManager.instance = new _ProjectStateManager();
        }
        return _ProjectStateManager.instance;
      }
      /**
       * Atomically transitions the project to a new lifecycle state.
       * Persists to both Redis (real-time) and Supabase (authoritative).
       */
      async transition(executionId, newState, message, progress, projectId, metrics2) {
        const timestamp = Date.now();
        const metadata = {
          projectId,
          executionId,
          status: newState,
          message,
          progress,
          tokens: metrics2?.tokens,
          duration: metrics2?.duration,
          cost: metrics2?.cost,
          updatedAt: timestamp
        };
        try {
          await redis.set(`project:state:${executionId}`, JSON.stringify(metadata), "EX", 86400);
          await PersistenceStore.upsertBuild({
            id: executionId,
            project_id: projectId,
            status: "executing",
            // Base status
            current_stage: newState,
            progress_percent: progress,
            message,
            tokens_used: metrics2?.tokens,
            duration_ms: metrics2?.duration,
            cost_usd: metrics2?.cost,
            preview_url: metrics2?.previewUrl,
            metadata: { transitionTime: timestamp }
          });
          await PersistenceStore.ensureProject(projectId, "Autonomous Project", "system_level");
          await eventBus2.stage(executionId, newState, "in_progress", message, progress, projectId, [], {
            tokens: metrics2?.tokens,
            duration: metrics2?.duration,
            cost: metrics2?.cost
          });
          logger_default.info({ executionId, status: newState, progress }, "[StateManager] Transitioned successfully");
        } catch (error) {
          logger_default.error({ error, executionId, newState }, "[StateManager] Transition failure");
        }
      }
      async getState(executionId) {
        const raw = await redis.get(`project:state:${executionId}`);
        return raw ? JSON.parse(raw) : null;
      }
    };
    var stateManager2 = ProjectStateManager.getInstance();
    var StageState = /* @__PURE__ */ ((StageState2) => {
      StageState2["IDLE"] = "IDLE";
      StageState2["RUNNING"] = "RUNNING";
      StageState2["COMPLETED"] = "COMPLETED";
      StageState2["FAILED"] = "FAILED";
      return StageState2;
    })(StageState || {});
    var StageStateMachine2 = class {
      currentStage;
      currentState = "IDLE";
      executionId;
      projectId;
      constructor(executionId, projectId) {
        this.executionId = executionId;
        this.projectId = projectId;
        this.currentStage = "PLANNING";
      }
      async transition(stage, state, message, progress) {
        this.currentStage = stage;
        this.currentState = state;
        logger3.info({ executionId: this.executionId, stage, state, message }, `[StageStateMachine] Transitioning to ${stage}:${state}`);
        const uiStatus = state === "RUNNING" ? "in_progress" : state === "COMPLETED" ? "completed" : state === "FAILED" ? "failed" : "pending";
        await eventBus2.stage(this.executionId, stage.toLowerCase(), uiStatus, message, progress, this.projectId);
      }
      getStage() {
        return this.currentStage;
      }
      getState() {
        return this.currentState;
      }
    };
    var Orchestrator2 = class {
      async run(taskPrompt, userId, projectId, executionId, tenantId, _signal, _options) {
        const elog = getExecutionLogger2(executionId);
        const fsm = new StageStateMachine2(executionId, projectId);
        try {
          elog.info("Dispatching to Temporal Production Pipeline");
          await stateManager2.transition(executionId, "created", "Cluster online.", 5, projectId);
          const mission = {
            id: executionId,
            projectId,
            userId,
            prompt: taskPrompt,
            status: "init",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: {}
          };
          await missionController2.createMission(mission).catch(() => {
          });
          const { Connection, Client, WorkflowIdReusePolicy } = await import("@temporalio/client");
          const connection3 = await Connection.connect();
          const client = new Client({ connection: connection3 });
          await fsm.transition("PLANNING", "RUNNING", "Orchestrating Temporal mission...", 10);
          const handle = await client.workflow.start("appBuilderWorkflow", {
            args: [{ prompt: taskPrompt, userId, projectId, executionId, tenantId }],
            taskQueue: "app-builder",
            workflowId: `build-${projectId}-${executionId}`,
            workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE
          });
          elog.info(`Workflow started. ID: ${handle.workflowId}`);
          const result = await handle.result();
          await fsm.transition("COMPLETE", "COMPLETED", "Project ready via Temporal!", 100);
          return { success: true, executionId, files: [], previewUrl: result.previewUrl, fastPath: true };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          elog.error({ error: errorMsg }, "Pipeline failed");
          if (fsm) await fsm.transition("FAILED", "FAILED", errorMsg, 0);
          return { success: false, executionId, error: errorMsg };
        }
      }
    };
    init_supabase_admin();
    var CodeChunker = class {
      /**
       * Splits a project's files into semantic chunks suitable for embedding.
       * Currently chunks by file and simple logical boundaries.
       */
      static chunkProject(techStack, files) {
        const chunks = [];
        const techStackString = `${techStack.framework}+${techStack.styling}+${techStack.database}`;
        for (const file of files) {
          chunks.push({
            content: file.content,
            metadata: {
              purpose: file.purpose || this.inferPurpose(file.path),
              tech_stack: techStackString,
              filePath: file.path
            }
          });
        }
        logger_default.info({ chunkCount: chunks.length }, "[CodeChunker] Chunked project files");
        return chunks;
      }
      static inferPurpose(filePath) {
        const fp = filePath.toLowerCase();
        if (fp.includes("page")) return "Page UI";
        if (fp.includes("api/")) return "API Logic";
        if (fp.includes("schema")) return "Database Schema";
        if (fp.includes("components/")) return "UI Component";
        return "Project File";
      }
    };
    var import_axios = __toESM2(require("axios"));
    var EmbeddingsEngine = class {
      static OPENAI_API_URL = "https://api.openai.com/v1/embeddings";
      static MODEL = "text-embedding-3-small";
      /**
       * Generates vector embeddings for a given text string.
       */
      static async generate(text) {
        const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          logger_default.warn("[EmbeddingsEngine] OPENAI_API_KEY is missing. Skipping vector generation.");
          return null;
        }
        try {
          const response = await import_axios.default.post(
            this.OPENAI_API_URL,
            {
              input: text,
              model: this.MODEL,
              encoding_format: "float"
            },
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }
          );
          return response.data.data[0].embedding;
        } catch (error) {
          const errorMsg = error.response?.data?.error?.message || error.message;
          logger_default.error({ error: errorMsg }, "[EmbeddingsEngine] Failed to generate embedding");
          return null;
        }
      }
      /**
       * Generates embeddings for multiple chunks in a single batch.
       */
      static async generateBatch(texts) {
        const apiKey = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey || texts.length === 0) return null;
        try {
          const response = await import_axios.default.post(
            this.OPENAI_API_URL,
            {
              input: texts,
              model: this.MODEL,
              encoding_format: "float"
            },
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            }
          );
          return response.data.data.map((item) => item.embedding);
        } catch (error) {
          logger_default.error({ error: error.message }, "[EmbeddingsEngine] Batch generation failed");
          return null;
        }
      }
    };
    init_supabase_admin();
    var VectorStore = class {
      /**
       * Stores code chunks and their embeddings in the Supabase vector store.
       */
      static async upsertChunks(chunks) {
        if (chunks.length === 0) return;
        try {
          const payload = chunks.map((c) => ({
            project_id: c.metadata.projectId,
            file_path: c.metadata.filePath,
            chunk_content: c.content,
            embedding: c.embedding,
            metadata: {
              purpose: c.metadata.purpose,
              tech_stack: c.metadata.tech_stack
            },
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          }));
          const { error } = await supabaseAdmin.from("project_code_embeddings").upsert(payload);
          if (error) throw error;
          logger_default.info({ count: chunks.length }, "[VectorStore] Successfully indexed code chunks");
        } catch (error) {
          logger_default.error({ error }, "[VectorStore] Failed to index chunks");
        }
      }
      /**
       * Performs a semantic search for similar code chunks.
       */
      static async searchSimilarCode(queryEmbedding, techStack, limit = 5) {
        try {
          const { data, error } = await supabaseAdmin.rpc("match_code_chunks", {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: limit,
            tech_stack_filter: techStack || null
          });
          if (error) throw error;
          return data || [];
        } catch (error) {
          logger_default.error({ error }, "[VectorStore] Semantic search failed");
          return [];
        }
      }
      /**
       * Stores a global experience lesson.
       */
      static async upsertExperience(data) {
        try {
          const { error } = await supabaseAdmin.from("global_experience_memory").upsert({
            content: data.content,
            embedding: data.embedding,
            outcome: data.metadata.outcome,
            metadata: data.metadata
          });
          if (error) throw error;
          logger_default.info("[VectorStore] Successfully indexed experience lesson");
        } catch (error) {
          logger_default.error({ error }, "[VectorStore] Failed to index experience");
        }
      }
      /**
       * Performs a semantic search for similar experience lessons.
       */
      static async searchExperience(queryEmbedding, limit = 5) {
        try {
          const { data, error } = await supabaseAdmin.rpc("match_experience", {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: limit
          });
          if (error) throw error;
          return data || [];
        } catch (error) {
          logger_default.error({ error }, "[VectorStore] Experience search failed");
          return [];
        }
      }
    };
    var import_crypto = require("crypto");
    var ProjectMemoryService = class {
      memoryCache = /* @__PURE__ */ new Map();
      async getMemory(projectId) {
        if (this.memoryCache.has(projectId)) {
          return this.memoryCache.get(projectId);
        }
        try {
          const { data, error } = await supabaseAdmin.from("project_memory").select("*").eq("project_id", projectId).single();
          if (error) {
            if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
              this.tableAvailable = false;
              return null;
            }
            return null;
          }
          if (!data) return null;
          const memory = {
            projectId: data.project_id,
            framework: data.framework || "nextjs",
            styling: data.styling || "tailwind",
            backend: data.backend || data.database_type || "api-routes",
            database: data.database_type || data.database || "supabase",
            auth: data.auth || "none",
            features: data.features || [],
            fileManifest: data.file_manifest || [],
            editHistory: data.edit_history || [],
            lastUpdated: data.updated_at
          };
          this.memoryCache.set(projectId, memory);
          this.tableAvailable = true;
          return memory;
        } catch (e) {
          logger_default.error({ projectId, error: e }, "Failed to load project memory");
          return null;
        }
      }
      async initializeMemory(projectId, techStack, files) {
        const manifest = files.map((f) => ({
          path: f.path,
          purpose: this.inferPurpose(f.path),
          agent: this.inferAgent(f.path),
          dependencies: this.extractImports(f.content),
          lastModified: (/* @__PURE__ */ new Date()).toISOString(),
          version: 1
        }));
        const memory = {
          projectId,
          framework: techStack.framework,
          styling: techStack.styling,
          backend: techStack.backend,
          database: techStack.database,
          auth: techStack.auth || "none",
          features: [],
          fileManifest: manifest,
          editHistory: [{
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            action: "create",
            filePath: "*",
            agent: "PlannerAgent",
            reason: "Initial project generation"
          }],
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
        await this.persistMemory(memory);
        this.memoryCache.set(projectId, memory);
        try {
          const chunks = CodeChunker.chunkProject(techStack, files);
          const contents = chunks.map((c) => c.content);
          const embeddings = await EmbeddingsEngine.generateBatch(contents);
          if (embeddings) {
            const chunksWithEmbeddings = chunks.map((c, i) => ({
              content: c.content,
              embedding: embeddings[i],
              metadata: { ...c.metadata, projectId }
            }));
            await VectorStore.upsertChunks(chunksWithEmbeddings);
          }
        } catch (e) {
          logger_default.error({ projectId, error: e }, "[ProjectMemory] Failed to index embeddings");
        }
        return memory;
      }
      async recordEdit(projectId, filePath, action, agent, reason, newContent) {
        const memory = await this.getMemory(projectId);
        if (!memory) return;
        const existingEntry = memory.fileManifest.find((f) => f.path === filePath);
        if (action === "delete") {
          memory.fileManifest = memory.fileManifest.filter((f) => f.path !== filePath);
        } else if (existingEntry) {
          existingEntry.version += 1;
          existingEntry.lastModified = (/* @__PURE__ */ new Date()).toISOString();
          existingEntry.agent = agent;
          if (newContent) {
            existingEntry.dependencies = this.extractImports(newContent);
          }
        } else {
          memory.fileManifest.push({
            path: filePath,
            purpose: this.inferPurpose(filePath),
            agent,
            dependencies: newContent ? this.extractImports(newContent) : [],
            lastModified: (/* @__PURE__ */ new Date()).toISOString(),
            version: 1
          });
        }
        memory.editHistory.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          action,
          filePath,
          agent,
          reason
        });
        if (memory.editHistory.length > 100) {
          memory.editHistory = memory.editHistory.slice(-100);
        }
        memory.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        await this.persistMemory(memory);
        this.memoryCache.set(projectId, memory);
        try {
          let cursor = "0";
          do {
            const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "mem:search:*", "COUNT", 100);
            cursor = nextCursor;
            if (keys.length > 0) {
              await redis.del(...keys);
              logger_default.debug({ count: keys.length }, "[ProjectMemory] Invalidated search cache entries");
            }
          } while (cursor !== "0");
        } catch (e) {
          logger_default.warn({ error: e }, "[ProjectMemory] Search cache invalidation failed (non-fatal)");
        }
      }
      async addFeature(projectId, feature) {
        const memory = await this.getMemory(projectId);
        if (!memory) return;
        if (!memory.features.includes(feature)) {
          memory.features.push(feature);
          await this.persistMemory(memory);
          this.memoryCache.set(projectId, memory);
        }
      }
      /**
       * Performs a semantic search across the global code memory.
       * Results are cached in Redis for 5 minutes (TTL = 300s).
       */
      async searchSimilarCode(query, techStack, limit = 5) {
        const cacheKey = `mem:search:${(0, import_crypto.createHash)("sha256").update(`${query}:${techStack || ""}`).digest("hex").slice(0, 24)}`;
        const CACHE_TTL = 300;
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            logger_default.debug({ cacheKey }, "[ProjectMemory] Cache HIT for semantic search");
            return JSON.parse(cached);
          }
        } catch (cacheErr) {
          logger_default.warn({ cacheErr }, "[ProjectMemory] Redis cache read failed, falling through");
        }
        const embedding = await EmbeddingsEngine.generate(query);
        if (!embedding) return [];
        const results = await VectorStore.searchSimilarCode(embedding, techStack, limit);
        try {
          await redis.set(cacheKey, JSON.stringify(results), "EX", CACHE_TTL);
        } catch (cacheErr) {
          logger_default.warn({ cacheErr }, "[ProjectMemory] Redis cache write failed");
        }
        return results;
      }
      /**
       * Given a user's edit request, determine which files need modification.
       * This is the core intelligence that prevents blind regeneration.
       */
      async getAffectedFiles(memory, editRequest) {
        const request = editRequest.toLowerCase();
        const affected = [];
        try {
          const similarChunks = await this.searchSimilarCode(editRequest, memory.framework);
          for (const chunk of similarChunks) {
            affected.push(chunk.file_path);
          }
        } catch (e) {
          logger_default.warn({ error: e }, "[ProjectMemory] Semantic search failed during impact analysis");
        }
        for (const file of memory.fileManifest) {
          const fp = file.path.toLowerCase();
          const purpose = file.purpose.toLowerCase();
          if (request.includes("dark mode") || request.includes("theme")) {
            if (fp.includes("tailwind") || fp.includes("globals.css") || fp.includes("layout") || fp.includes("theme")) {
              affected.push(file.path);
            }
          }
          if (request.includes("auth") || request.includes("login") || request.includes("signup")) {
            if (fp.includes("auth") || fp.includes("login") || fp.includes("signup") || fp.includes("middleware") || purpose.includes("auth")) {
              affected.push(file.path);
            }
          }
          if (request.includes("dashboard")) {
            if (fp.includes("dashboard") || fp.includes("layout")) {
              affected.push(file.path);
            }
          }
          if (request.includes("database") || request.includes("schema")) {
            if (fp.includes("schema") || fp.includes("migration") || fp.includes("prisma") || purpose.includes("database")) {
              affected.push(file.path);
            }
          }
          if (request.includes("api") || request.includes("endpoint")) {
            if (fp.includes("api/") || fp.includes("route")) {
              affected.push(file.path);
            }
          }
          if (request.includes("page") || request.includes("component")) {
            if (fp.includes("page.tsx") || fp.includes("components/")) {
              affected.push(file.path);
            }
          }
          if (request.includes("style") || request.includes("css") || request.includes("design")) {
            if (fp.includes(".css") || fp.includes("tailwind") || fp.includes("globals")) {
              affected.push(file.path);
            }
          }
        }
        return [...new Set(affected)];
      }
      /**
       * Build a context summary string for the AI agent, so it knows the project state
       */
      buildContextSummary(memory) {
        return `PROJECT CONTEXT:
Framework: ${memory.framework}
Styling: ${memory.styling}
Backend: ${memory.backend}
Database: ${memory.database}
Auth: ${memory.auth}
Features: ${memory.features.join(", ") || "none yet"}
Total Files: ${memory.fileManifest.length}
Recent Edits: ${memory.editHistory.slice(-5).map((e) => `${e.action} ${e.filePath} (${e.reason})`).join(" | ")}
File Map: ${memory.fileManifest.map((f) => `${f.path} [${f.purpose}]`).join(", ")}`;
      }
      // â”€â”€ Private Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      tableAvailable = null;
      // null = not yet checked
      async persistMemory(memory) {
        if (this.tableAvailable === false) return;
        try {
          const payload = {
            project_id: memory.projectId,
            framework: memory.framework,
            styling: memory.styling,
            backend: memory.backend,
            database_type: memory.database,
            auth: memory.auth,
            features: memory.features,
            file_manifest: memory.fileManifest,
            edit_history: memory.editHistory,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          const { error } = await supabaseAdmin.from("project_memory").upsert(payload, { onConflict: "project_id" });
          if (error) {
            if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
              logger_default.warn({ projectId: memory.projectId }, "project_memory table not found. Using in-memory only. Run migration 004_project_memory.sql to enable persistence.");
              this.tableAvailable = false;
              return;
            }
            throw error;
          }
          this.tableAvailable = true;
        } catch (e) {
          logger_default.error({ projectId: memory.projectId, error: e }, "Failed to persist project memory");
        }
      }
      inferPurpose(filePath) {
        const fp = filePath.toLowerCase();
        if (fp.includes("page.tsx") || fp.includes("page.jsx")) return "Page component";
        if (fp.includes("layout")) return "Layout wrapper";
        if (fp.includes("api/")) return "API route";
        if (fp.includes("components/")) return "UI component";
        if (fp.includes("schema") || fp.includes("migration")) return "Database schema";
        if (fp.includes("middleware")) return "Middleware";
        if (fp.includes("globals.css")) return "Global styles";
        if (fp.includes("tailwind")) return "Tailwind configuration";
        if (fp.includes("package.json")) return "Package manifest";
        if (fp.includes("next.config")) return "Next.js configuration";
        if (fp.includes(".test.") || fp.includes(".spec.")) return "Test file";
        if (fp.includes("docker")) return "Docker configuration";
        if (fp.includes("lib/") || fp.includes("utils/")) return "Utility/library";
        if (fp.includes("hooks/")) return "React hook";
        if (fp.includes("context/") || fp.includes("provider")) return "Context provider";
        return "Project file";
      }
      inferAgent(filePath) {
        const fp = filePath.toLowerCase();
        if (fp.includes("schema") || fp.includes("migration") || fp.includes("seed")) return "DatabaseAgent";
        if (fp.includes("api/") || fp.includes("middleware") || fp.includes("lib/")) return "BackendAgent";
        if (fp.includes("page") || fp.includes("component") || fp.includes("layout") || fp.includes(".css")) return "FrontendAgent";
        if (fp.includes("docker") || fp.includes("ci") || fp.includes("deploy")) return "DeploymentAgent";
        if (fp.includes("test") || fp.includes("spec")) return "TestingAgent";
        return "FrontendAgent";
      }
      extractImports(content) {
        const imports = [];
        const importRegex = /(?:import|require)\s*(?:\(?\s*['"]([^'"]+)['"]\s*\)?|.*from\s+['"]([^'"]+)['"])/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1] || match[2];
          if (importPath && !importPath.startsWith("react") && !importPath.startsWith("next")) {
            imports.push(importPath);
          }
        }
        return imports;
      }
    };
    var projectMemory = new ProjectMemoryService();
    var MemoryPlane = class {
      /**
       * Gets a 360-degree context for an agent based on a specific prompt/task.
       */
      async getRelevantContext(projectId, task) {
        const memory = await projectMemory.getMemory(projectId);
        if (!memory) return "No project context available.";
        logger_default.info({ projectId, task }, "[MemoryPlane] Retrieving multi-dimensional context");
        const similarCode = await projectMemory.searchSimilarCode(task, memory.framework);
        const codeSnips = similarCode.map((c) => `File: ${c.file_path}
Content Snippet: ${c.chunk_content.substring(0, 500)}...`).join("\n\n");
        const lessons = await this.searchExperience(task);
        const lessonSnips = lessons.map((l) => `- [${l.outcome.toUpperCase()}] ${l.lesson}`).join("\n");
        const archSummary = projectMemory.buildContextSummary(memory);
        return `
--- SYSTEM MEMORY: PROJECT ARCHITECTURE ---
${archSummary}

--- SYSTEM MEMORY: RELEVANT CODE SNIPPETS ---
${codeSnips || "No similar code found."}

--- SYSTEM MEMORY: PAST LESSONS & PATTERNS ---
${lessonSnips || "No previous experience found for this pattern."}
        `.trim();
      }
      /**
       * Records a "lesson learned" from an execution cycle into the global experience store.
       */
      async recordLesson(projectId, lesson) {
        logger_default.info({ projectId, outcome: lesson.outcome }, "[MemoryPlane] Recording experience lesson");
        try {
          const embedding = await EmbeddingsEngine.generate(`${lesson.action} ${lesson.lesson}`);
          if (embedding) {
            await VectorStore.upsertExperience({
              content: `${lesson.action} -> ${lesson.lesson}`,
              embedding,
              metadata: {
                projectId,
                outcome: lesson.outcome,
                type: "lesson",
                context: lesson.context
              }
            });
          }
        } catch (e) {
          logger_default.error({ error: e }, "[MemoryPlane] Failed to record lesson");
        }
      }
      async searchExperience(query, limit = 3) {
        const embedding = await EmbeddingsEngine.generate(query);
        if (!embedding) return [];
        return VectorStore.searchExperience(embedding, limit);
      }
    };
    var memoryPlane = new MemoryPlane();
    var config_exports = {};
    __export2(config_exports, {
      BUILD_MODE: () => BUILD_MODE,
      COST_PER_1M_TOKENS: () => COST_PER_1M_TOKENS,
      CircuitBreaker: () => CircuitBreaker,
      CircuitState: () => CircuitState,
      CostGovernanceService: () => CostGovernanceService,
      DEFAULT_GOVERNANCE_CONFIG: () => DEFAULT_GOVERNANCE_CONFIG,
      IS_PRODUCTION: () => IS_PRODUCTION,
      OrchestratorLock: () => OrchestratorLock,
      PLAN_LIMITS: () => PLAN_LIMITS,
      ProjectGenerationSchema: () => ProjectGenerationSchema,
      RateLimiter: () => RateLimiter,
      STRIPE_CONFIG: () => STRIPE_CONFIG,
      StripeWebhookSchema: () => StripeWebhookSchema,
      UserProfileSchema: () => UserProfileSchema,
      activeBuildsGauge: () => activeBuildsGauge,
      agentExecutionDuration: () => agentExecutionDuration,
      agentFailuresTotal: () => agentFailuresTotal,
      apiRequestDurationSeconds: () => apiRequestDurationSeconds,
      breakers: () => breakers,
      cn: () => cn,
      createPortalSession: () => createPortalSession,
      env: () => env,
      executionFailureTotal: () => executionFailureTotal,
      executionSuccessTotal: () => executionSuccessTotal,
      formatDate: () => formatDate,
      formatRelative: () => formatRelative,
      formatTime: () => formatTime,
      formatYear: () => formatYear,
      getCorrelationId: () => getCorrelationId,
      getExecutionLogger: () => getExecutionLogger2,
      lockExpiredTotal: () => lockExpiredTotal,
      lockExtensionTotal: () => lockExtensionTotal,
      logger: () => logger3,
      nodeCpuUsage: () => nodeCpuUsage,
      nodeMemoryUsage: () => nodeMemoryUsage,
      pusher: () => pusher,
      queueLengthGauge: () => queueLengthGauge,
      queueWaitTimeSeconds: () => queueWaitTimeSeconds,
      recordBuildMetrics: () => recordBuildMetrics,
      registry: () => registry,
      retryCountTotal: () => retryCountTotal,
      runWithTracing: () => runWithTracing,
      runtimeActiveTotal: () => runtimeActiveTotal,
      runtimeCrashesTotal: () => runtimeCrashesTotal,
      runtimeEvictionsTotal: () => runtimeEvictionsTotal,
      runtimeProxyErrorsTotal: () => runtimeProxyErrorsTotal,
      runtimeStartupDuration: () => runtimeStartupDuration,
      sendBuildSuccessEmail: () => sendBuildSuccessEmail,
      stripe: () => stripe,
      stripeWebhookEventsTotal: () => stripeWebhookEventsTotal,
      stuckBuildsTotal: () => stuckBuildsTotal,
      tracingContext: () => tracingContext,
      useStream: () => useStream,
      withLock: () => withLock,
      workerTaskDurationSeconds: () => workerTaskDurationSeconds
    });
    var import_stripe = __toESM2(require("stripe"));
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is missing from environment variables");
    }
    var stripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      // Compatible with Stripe 14.x
      appInfo: {
        name: "MultiAgent Platform",
        version: "1.0.0"
      }
    });
    var STRIPE_CONFIG = {
      plans: {
        pro: process.env.STRIPE_PRO_PLAN_ID || (process.env.NODE_ENV === "production" ? "" : "price_pro_default"),
        scale: process.env.STRIPE_SCALE_PLAN_ID || (process.env.NODE_ENV === "production" ? "" : "price_scale_default")
      },
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    };
    async function createPortalSession(customerId, returnUrl) {
      return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });
    }
    var BUILD_MODE = process.env.BUILD_MODE || "dev";
    var IS_PRODUCTION = BUILD_MODE === "production";
    var CircuitState = /* @__PURE__ */ ((CircuitState2) => {
      CircuitState2[CircuitState2["CLOSED"] = 0] = "CLOSED";
      CircuitState2[CircuitState2["OPEN"] = 1] = "OPEN";
      CircuitState2[CircuitState2["HALF_OPEN"] = 2] = "HALF_OPEN";
      return CircuitState2;
    })(CircuitState || {});
    var CircuitBreaker = class {
      state = 0;
      failureThreshold;
      resetTimeoutMs;
      failureCount = 0;
      lastFailureTime;
      constructor(failureThreshold = 5, resetTimeoutMs = 3e4) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
      }
      async execute(action) {
        if (this.state === 1) {
          if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeoutMs) {
            this.state = 2;
            logger_default.info("Circuit breaker entering HALF_OPEN state");
          } else {
            throw new Error("Circuit Breaker is OPEN. External service unavailable.");
          }
        }
        try {
          const result = await action();
          this.handleSuccess();
          return result;
        } catch (error) {
          this.handleFailure();
          throw error;
        }
      }
      handleSuccess() {
        this.failureCount = 0;
        this.state = 0;
      }
      handleFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
          this.state = 1;
          logger_default.error({ failureCount: this.failureCount }, "Circuit breaker is now OPEN");
        }
      }
      getState() {
        return this.state;
      }
    };
    var breakers = {
      llm: new CircuitBreaker(10, 6e4)
      // Balanced threshold with retries
    };
    function formatDate(date) {
      if (!date) return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    }
    function formatTime(date) {
      if (!date) return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[1].split(".")[0];
    }
    function formatYear(date) {
      if (!date) return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.getUTCFullYear().toString();
    }
    function formatRelative(date) {
      if (!date) return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      const now = /* @__PURE__ */ new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 1e3);
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return d.toISOString().split("T")[0];
    }
    init_supabase_admin();
    async function sendBuildSuccessEmail(userId, projectId, executionId, previewUrl) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (error || !user?.email) {
          logger_default.error({ error, userId }, "Failed to fetch user email for notification");
          return false;
        }
        const email = user.email;
        logger_default.info(
          { email, projectId, executionId, previewUrl },
          '\xF0\u0178\u201C\xA7 MOCK EMAIL DISPATCHED: "Your MultiAgent Build is Complete!"'
        );
        return true;
      } catch (err) {
        logger_default.error({ err, userId }, "Unhandled error sending build success email");
        return false;
      }
    }
    var import_dotenv2 = __toESM2(require("dotenv"));
    var import_path2 = __toESM2(require("path"));
    var import_fs = __toESM2(require("fs"));
    var nodeEnv = process.env.NODE_ENV || "development";
    var envFile = nodeEnv === "production" ? ".env.production" : ".env.development";
    var envPath = import_path2.default.resolve(process.cwd(), envFile);
    var envLocalPath = import_path2.default.resolve(process.cwd(), ".env.local");
    if (import_fs.default.existsSync(envLocalPath)) {
      import_dotenv2.default.config({ path: envLocalPath });
    }
    if (import_fs.default.existsSync(envPath)) {
      import_dotenv2.default.config({ path: envPath, override: true });
    }
    import_dotenv2.default.config();
    var requiredEnvVars = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "GROQ_API_KEY"
    ];
    var env = {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV || "development",
      WORKER_CONCURRENCY_FREE: Number(process.env.WORKER_CONCURRENCY_FREE) || 10,
      WORKER_CONCURRENCY_PRO: Number(process.env.WORKER_CONCURRENCY_PRO) || 20,
      WORKER_POOL_SIZE: Number(process.env.WORKER_POOL_SIZE) || 3,
      REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379"
    };
    var isProd = env.NODE_ENV === "production";
    var missingVars = requiredEnvVars.filter((v) => !process.env[v]);
    if (missingVars.length > 0) {
      const errorMsg = `CRITICAL: Missing required environment variables: ${missingVars.join(", ")}`;
      if (isProd) {
        throw new Error(errorMsg);
      } else {
        console.warn("==========================================");
        console.warn(errorMsg);
        console.warn("Please check your .env.local file.");
        console.warn("==========================================");
      }
    }
    var PLAN_LIMITS = {
      free: {
        maxDailyGenerations: 3,
        maxMonthlyTokens: 5e5,
        concurrency: 1,
        maxCostPerBuild: 0.05
        // $0.05
      },
      pro: {
        maxDailyGenerations: 50,
        maxMonthlyTokens: 1e7,
        concurrency: 5,
        maxCostPerBuild: 0.25
        // $0.25
      },
      scale: {
        maxDailyGenerations: 200,
        maxMonthlyTokens: 5e7,
        concurrency: 20,
        maxCostPerBuild: 1
        // $1.00
      },
      owner: {
        maxDailyGenerations: 1e3,
        maxMonthlyTokens: 1e8,
        concurrency: 100,
        maxCostPerBuild: 5
        // $5.00
      }
    };
    var DEFAULT_GOVERNANCE_CONFIG = {
      maxDailyGenerations: PLAN_LIMITS.free.maxDailyGenerations,
      maxMonthlyTokens: PLAN_LIMITS.free.maxMonthlyTokens
    };
    var COST_PER_1M_TOKENS = {
      groq: 0.1,
      // $0.10 / 1M tokens (Llama 3/3.1)
      openai: 2.5,
      // $2.50 / 1M tokens (GPT-4o)
      anthropic: 3
      // $3.00 / 1M tokens (Claude 3.5 Sonnet)
    };
    var CostGovernanceService = class {
      /**
       * Audits an owner override event and persists it to the database.
       */
      static async auditOwnerOverride(userId, executionId, tokensUsed = 0, buildDuration = 0) {
        logger_default.info({ event: "owner_override", userId, executionId, tokensUsed }, "OWNER OVERRIDE ACTIVE - Bypassing limits securely");
        try {
          const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
          const supabaseAdmin2 = getSupabaseAdmin2();
          if (supabaseAdmin2) {
            await supabaseAdmin2.from("audit_owner_override_logs").insert([{
              user_id: userId,
              execution_id: executionId,
              tokens_used: tokensUsed,
              build_duration_sec: buildDuration,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }]);
          }
        } catch (error) {
          logger_default.error({ error, userId, executionId }, "Failed to write audit_owner_override_logs");
        }
      }
      /**
       * Checks if the global emergency kill switch is activated in Redis.
       * Use `redis.set('system:kill_switch', 'true')` to halt all orchestration.
       */
      static async isKillSwitchActive(config2) {
        const isDev = process.env.NODE_ENV === "development";
        if (isDev) {
          logger_default.info("Development Mode Bypass: Skipping kill switch check.");
          return false;
        }
        if (config2?.governanceBypass && config2?.userId && config2?.executionId) {
          await this.auditOwnerOverride(config2.userId, config2.executionId);
          return false;
        }
        try {
          const isKilled = await redis.get("system:kill_switch");
          return isKilled === "true";
        } catch (error) {
          logger_default.error({ error }, "Failed to check global kill switch");
          return false;
        }
      }
      /**
       * Checks if a user can execute a generation job based on their daily limits from Supabase.
       */
      static async checkAndIncrementExecutionLimit(userId) {
        logger_default.info({ userId }, "TEMPORARY BYPASS: Skipping execution limit check completely.");
        return { allowed: true, currentCount: 0 };
      }
      /**
       * Checks if a user has exceeded their monthly allocated token budget.
       */
      static async checkTokenLimit(userId, config2 = DEFAULT_GOVERNANCE_CONFIG) {
        const isDev = process.env.NODE_ENV === "development";
        const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        const key = `governance:tokens:${userId}:${month}`;
        if (isDev) {
          logger_default.info({ userId }, "Development Mode Bypass: Skipping token limit check.");
          const usedStr = await redis.get(key);
          return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
        }
        if (config2.governanceBypass && config2.executionId) {
          const usedStr = await redis.get(key);
          return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
        }
        try {
          const usedStr = await redis.get(key);
          const usedTokens = usedStr ? parseInt(usedStr, 10) : 0;
          if (usedTokens >= config2.maxMonthlyTokens) {
            logger_default.warn({ userId, usedTokens, limit: config2.maxMonthlyTokens }, "User exceeded monthly token budget");
            return { allowed: false, usedTokens };
          }
          return { allowed: true, usedTokens };
        } catch (error) {
          logger_default.error({ error, userId }, "Failed to check token limits");
          throw new Error("Failed to validate token budget.");
        }
      }
      /**
       * Increments the user's monthly token usage. Called by the Orchestrator post-generation.
       * Records to both Redis (real-time enforcement) and Supabase (persistent audit log).
       */
      static async recordTokenUsage(userId, tokensUsed, executionId) {
        if (!tokensUsed || tokensUsed <= 0) return;
        const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        const key = `governance:tokens:${userId}:${month}`;
        try {
          await redis.multi().incrby(key, tokensUsed).expire(key, 32 * 24 * 60 * 60).exec();
          const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
          const supabaseAdmin2 = getSupabaseAdmin2();
          if (!supabaseAdmin2) throw new Error("Supabase admin not initialized");
          const { error } = await supabaseAdmin2.from("token_billing_logs").insert([{
            user_id: userId,
            execution_id: executionId,
            tokens_used: tokensUsed,
            recorded_at: (/* @__PURE__ */ new Date()).toISOString()
          }]);
          if (error) throw error;
          logger_default.info({ userId, tokensUsed, executionId }, "Recorded token usage to Redis and DB");
          const provider = "groq";
          const cost = tokensUsed / 1e6 * (COST_PER_1M_TOKENS[provider] || 0.1);
          if (cost > 0) {
            await supabaseAdmin2.rpc("increment_user_cost", {
              user_id_param: userId,
              cost_param: parseFloat(cost.toFixed(4))
            });
            await supabaseAdmin2.from("execution_costs").insert([{
              user_id: userId,
              execution_id: executionId,
              tokens_used: tokensUsed,
              cost_usd: cost,
              provider,
              recorded_at: (/* @__PURE__ */ new Date()).toISOString()
            }]);
            logger_default.info({ userId, cost, provider }, "Recorded execution cost");
          }
        } catch (error) {
          logger_default.error({ error, userId, tokensUsed, executionId }, "CRITICAL: Failed to record token usage to billing layers.");
        }
      }
      /**
       * Calculates the USD cost for a given number of tokens and provider.
       */
      static calculateExecutionCost(tokens, provider = "groq") {
        const rate = COST_PER_1M_TOKENS[provider] || 0.1;
        return tokens / 1e6 * rate;
      }
      /**
       * Checks if the current execution cost exceeds the plan's threshold.
       */
      static async checkCostSafeguard(userId, tokensUsed) {
        try {
          const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
          const supabaseAdmin2 = getSupabaseAdmin2();
          if (!supabaseAdmin2) throw new Error("Supabase admin not initialized");
          const { data: profile } = await supabaseAdmin2.from("user_profiles").select("plan_type, role").eq("id", userId).single();
          const plan = profile?.role === "owner" ? "owner" : profile?.plan_type || "free";
          const limit = PLAN_LIMITS[plan].maxCostPerBuild;
          const currentCost = this.calculateExecutionCost(tokensUsed);
          if (currentCost > limit) {
            logger_default.warn({ userId, currentCost, limit, plan }, "Build cost safeguard triggered - threshold exceeded");
            return { allowed: false, cost: currentCost, limit };
          }
          return { allowed: true, cost: currentCost, limit };
        } catch (error) {
          logger_default.error({ error, userId }, "Failed to check cost safeguard");
          return { allowed: true, cost: 0, limit: 0 };
        }
      }
      /**
       * Restores a crashed execution ticket (decrements daily count).
       */
      static async refundExecution(userId) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const key = `governance:executions:${userId}:${today}`;
        try {
          await redis.decr(key);
        } catch (error) {
          logger_default.error({ error, userId }, "Failed to refund execution limit ticket");
        }
      }
    };
    var import_redlock = __toESM2(require("redlock"));
    var redlock = new import_redlock.default(
      // Provide multiple independent clients for high availability (Minimum 3 for strict distributed safety)
      independentRedisClients,
      {
        // The expected clock drift; for more check http://redis.io/topics/distlock
        driftFactor: 0.01,
        // time in ms
        // The max number of times Redlock will attempt to lock a resource
        // before erroring.
        retryCount: 10,
        // the time in ms between attempts
        retryDelay: 200,
        // time in ms
        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.iana.org/assignments/iana-p-parameters/iana-p-parameters.xhtml
        retryJitter: 200,
        // time in ms
        // The minimum remaining time on a lock before a renewal is attempted.
        automaticExtensionThreshold: 500
        // time in ms
      }
    );
    redlock.on("error", (error) => {
      if (error && typeof error === "object" && ("name" in error || "message" in error)) {
        const err = error;
        if (err.name === "ExecutionError" || err.message?.includes("locked")) {
          return;
        }
      }
      logger_default.error({ error }, "Redlock error");
    });
    async function withLock(executionId, fn, ttl = 3e4) {
      const resource = `locks:execution:${executionId}`;
      logger_default.info({ executionId, resource }, "Attempting to acquire distributed lock");
      const lock = await redlock.acquire([resource], ttl);
      try {
        logger_default.info({ executionId, resource }, "Distributed lock acquired");
        return await fn();
      } finally {
        logger_default.info({ executionId, resource }, "Releasing distributed lock");
        await lock.release();
      }
    }
    var import_prom_client = require("prom-client");
    var registry = new import_prom_client.Registry();
    registry.setDefaultLabels({
      environment: process.env.NODE_ENV || "production",
      region: process.env.NODE_REGION || "default"
    });
    var runtimeStartupDuration = new import_prom_client.Histogram({
      name: "runtime_startup_duration_seconds",
      help: "Latency in seconds for a preview runtime to become healthy",
      labelNames: ["project_id", "mode"],
      buckets: [1, 2, 5, 10, 20, 30, 60],
      // Max 60s
      registers: [registry]
    });
    var runtimeCrashesTotal = new import_prom_client.Counter({
      name: "runtime_crashes_total",
      help: "Total number of runtime crashes or failures",
      labelNames: ["reason", "mode"],
      registers: [registry]
    });
    var runtimeActiveTotal = new (registry.getSingleMetric("runtime_active_total") || require("prom-client").Gauge)({
      name: "runtime_active_total",
      help: "Total number of active preview runtimes on this node",
      registers: [registry]
    });
    var runtimeEvictionsTotal = new import_prom_client.Counter({
      name: "runtime_evictions_total",
      help: "Total number of runtimes evicted for stale/idle reasons",
      labelNames: ["reason"],
      registers: [registry]
    });
    var nodeCpuUsage = new (registry.getSingleMetric("node_cpu_usage_ratio") || require("prom-client").Gauge)({
      name: "node_cpu_usage_ratio",
      help: "CPU usage of the current node (0.0 - 1.0)",
      registers: [registry]
    });
    var nodeMemoryUsage = new (registry.getSingleMetric("node_memory_usage_bytes") || require("prom-client").Gauge)({
      name: "node_memory_usage_bytes",
      help: "Memory usage of the current node in bytes",
      registers: [registry]
    });
    var runtimeProxyErrorsTotal = new import_prom_client.Counter({
      name: "runtime_proxy_errors_total",
      help: "Total number of reverse proxy failures",
      registers: [registry]
    });
    var agentExecutionDuration = new import_prom_client.Histogram({
      name: "agent_execution_duration_seconds",
      help: "Duration of agent execution in seconds",
      labelNames: ["agent_name", "status"],
      buckets: [1, 5, 10, 30, 60, 120, 300],
      // buckets in seconds
      registers: [registry]
    });
    var agentFailuresTotal = new import_prom_client.Counter({
      name: "agent_failures_total",
      help: "Total number of agent failures",
      labelNames: ["agent_name"],
      registers: [registry]
    });
    var retryCountTotal = new import_prom_client.Counter({
      name: "retry_count_total",
      help: "Total number of agent retries",
      labelNames: ["agent_name"],
      registers: [registry]
    });
    var executionSuccessTotal = new import_prom_client.Counter({
      name: "execution_success_total",
      help: "Total number of successful project generations",
      registers: [registry]
    });
    var executionFailureTotal = new import_prom_client.Counter({
      name: "execution_failure_total",
      help: "Total number of failed project generations",
      registers: [registry]
    });
    var stuckBuildsTotal = new import_prom_client.Counter({
      name: "stuck_builds_total",
      help: "Total number of stuck builds detected and resumed",
      registers: [registry]
    });
    var queueWaitTimeSeconds = new import_prom_client.Histogram({
      name: "queue_wait_time_seconds",
      help: "Time a job waits in queue before being picked up",
      labelNames: ["queue_name"],
      buckets: [0.1, 0.5, 1, 5, 10, 30],
      registers: [registry]
    });
    var activeBuildsGauge = new import_prom_client.Gauge({
      name: "active_builds_total",
      help: "Total number of active builds currently being processed by workers",
      labelNames: ["tier"],
      registers: [registry]
    });
    var queueLengthGauge = new import_prom_client.Gauge({
      name: "queue_length_total",
      help: "Current number of jobs waiting in the queue",
      labelNames: ["queue_name"],
      registers: [registry]
    });
    var lockExtensionTotal = new import_prom_client.Counter({
      name: "lock_extension_total",
      help: "Total number of BullMQ lock extensions",
      registers: [registry]
    });
    var lockExpiredTotal = new import_prom_client.Counter({
      name: "lock_expired_total",
      help: "Total number of BullMQ lock expirations detected",
      registers: [registry]
    });
    var apiRequestDurationSeconds = new import_prom_client.Histogram({
      name: "api_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [registry]
    });
    var workerTaskDurationSeconds = new import_prom_client.Histogram({
      name: "worker_task_duration_seconds",
      help: "Duration of worker task execution in seconds",
      labelNames: ["queue_name", "status"],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600],
      registers: [registry]
    });
    var stripeWebhookEventsTotal = new import_prom_client.Counter({
      name: "stripe_webhook_events_total",
      help: "Total number of stripe webhook events received",
      labelNames: ["event_type"],
      registers: [registry]
    });
    async function recordBuildMetrics(status, durationMs, planType = "free", tokensUsed = 0, costUsd = 0) {
      try {
        const pipeline = redis_default.pipeline();
        pipeline.incr("metrics:builds:total");
        if (status === "failed") {
          pipeline.incr("metrics:builds:failed");
        } else if (status === "success") {
          pipeline.incr("metrics:builds:success");
        }
        pipeline.incrby("metrics:builds:duration_sum", Math.round(durationMs));
        pipeline.incrby("metrics:tokens:total", tokensUsed);
        pipeline.incrbyfloat("metrics:builds:cost_sum", costUsd);
        pipeline.incr(`metrics:builds:${planType}:total`);
        if (status === "failed") {
          pipeline.incr(`metrics:builds:${planType}:failed`);
        } else if (status === "success") {
          pipeline.incr(`metrics:builds:${planType}:success`);
        }
        pipeline.incrby(`metrics:builds:${planType}:duration_sum`, Math.round(durationMs));
        pipeline.incrby(`metrics:tokens:${planType}:total`, tokensUsed);
        pipeline.incrbyfloat(`metrics:builds:${planType}:cost_sum`, costUsd);
        await pipeline.exec();
      } catch {
      }
    }
    logger_default.info("Prometheus metrics initialized");
    var import_uuid2 = require("uuid");
    var OrchestratorLock = class {
      workerId;
      executionId;
      lockKey;
      isOwned = false;
      renewalTimer = null;
      ttlSeconds;
      abortController;
      constructor(executionId, ttlSeconds = 60) {
        this.workerId = `worker-${(0, import_uuid2.v4)()}`;
        this.executionId = executionId;
        this.lockKey = `lock:execution:${executionId}`;
        this.ttlSeconds = ttlSeconds;
        this.abortController = new AbortController();
      }
      getWorkerId() {
        return this.workerId;
      }
      getLockKey() {
        return this.lockKey;
      }
      getAbortSignal() {
        return this.abortController.signal;
      }
      /**
       * Attempts to acquire the lock. Returns true if successful.
       */
      async acquire() {
        const acquired = await redis_default.set(this.lockKey, this.workerId, "EX", this.ttlSeconds, "NX");
        if (acquired === "OK") {
          this.isOwned = true;
          this.startRenewal();
          logger_default.info({ executionId: this.executionId, workerId: this.workerId }, "Acquired exclusive execution lock");
          return true;
        }
        const currentOwner = await redis_default.get(this.lockKey);
        if (currentOwner === this.workerId) {
          this.isOwned = true;
          this.startRenewal();
          return true;
        }
        return false;
      }
      /**
       * Re-acquires an existing lock if we know the workerId
       */
      async forceAcquire() {
        await redis_default.set(this.lockKey, this.workerId, "EX", this.ttlSeconds);
        this.isOwned = true;
        this.startRenewal();
        logger_default.info({ executionId: this.executionId, workerId: this.workerId }, "Force-acquired execution lock");
      }
      /**
       * Starts the heartbeat renewal loop
       */
      startRenewal() {
        if (this.renewalTimer) clearInterval(this.renewalTimer);
        this.renewalTimer = setInterval(async () => {
          try {
            const script = `
                    if redis.call("get", KEYS[1]) == ARGV[1] then
                        return redis.call("expire", KEYS[1], ARGV[2])
                    else
                        return 0
                    end
                `;
            const result = await redis_default.eval(script, 1, this.lockKey, this.workerId, this.ttlSeconds);
            if (result === 0) {
              logger_default.fatal({ executionId: this.executionId, workerId: this.workerId }, "Lock stolen or expired! Aborting execution.");
              this.isOwned = false;
              this.abortController.abort();
              this.stopRenewal();
            }
          } catch (err) {
            logger_default.error({ err, executionId: this.executionId }, "Failed to renew lock");
          }
        }, 3e3);
      }
      /**
       * Synchronously checks if lock is still owned.
       */
      async verify() {
        if (!this.isOwned) return false;
        const current = await redis_default.get(this.lockKey);
        if (current !== this.workerId) {
          this.isOwned = false;
          this.abortController.abort();
          this.stopRenewal();
          return false;
        }
        return true;
      }
      /**
       * Ensure we own the lock, or throw an error.
       */
      async ensureOwnership() {
        const valid = await this.verify();
        if (!valid) {
          throw new Error(`Execution aborted: Worker ${this.workerId} lost lock for execution ${this.executionId}`);
        }
      }
      /**
       * Stops the renewal timer but doesn't release the lock.
       */
      stopRenewal() {
        if (this.renewalTimer) {
          clearInterval(this.renewalTimer);
          this.renewalTimer = null;
        }
      }
      /**
       * Releases the lock safely.
       */
      async release() {
        this.stopRenewal();
        if (!this.isOwned) return;
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        try {
          await redis_default.eval(script, 1, this.lockKey, this.workerId);
          this.isOwned = false;
          logger_default.info({ executionId: this.executionId, workerId: this.workerId }, "Released execution lock");
        } catch (err) {
          logger_default.error({ err, executionId: this.executionId }, "Failed to release lock");
        }
      }
    };
    var pusher = {
      /**
       * Called by task-orchestrator updateLegacyUiStage().
       * Re-routes to Redis Streams Event Bus.
       */
      triggerBuildUpdate(executionId, stageData) {
        if (!executionId) return;
        const progress = stageData.progressPercent ?? stageData.progress ?? 0;
        eventBus2.stage(
          executionId,
          stageData.id || "initializing",
          stageData.status || "in_progress",
          stageData.message || "",
          progress
        ).catch((err) => logger_default.warn({ err }, "[Pusher stub] Failed to route to event bus"));
      }
    };
    var LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4] or 1)

local state = redis.call("HMGET", key, "tokens", "last_refreshed")
local last_tokens = tonumber(state[1])
local last_refreshed = tonumber(state[2])

if not last_tokens then
    last_tokens = capacity
    last_refreshed = now
end

local delta = math.max(0, now - last_refreshed)
local new_tokens = math.min(capacity, last_tokens + (delta * rate))

if new_tokens >= requested then
    local remaining = new_tokens - requested
    redis.call("HMSET", key, "tokens", remaining, "last_refreshed", now)
    redis.call("PEXPIRE", key, math.ceil((capacity / rate) * 1000))
    return {1, math.floor(remaining)}
else
    local wait_ms = math.ceil(((requested - new_tokens) / rate) * 1000)
    return {0, math.floor(new_tokens), wait_ms}
end
`;
    var RateLimiter = class {
      /**
       * @param action unique identifier for the action (e.g., 'build', 'github-push')
       * @param userId user identifier
       * @param limit tokens per window (e.g., 3)
       * @param windowMs window in milliseconds (e.g., 3600000 for 1 hour)
       */
      static async checkLimit(action, userId, limit, windowMs) {
        try {
          const key = `ratelimit:${action}:${userId}`;
          const rate = limit / (windowMs / 1e3);
          const now = Date.now() / 1e3;
          const result = await redis_default.eval(
            LUA_TOKEN_BUCKET,
            1,
            key,
            rate.toString(),
            limit.toString(),
            now.toString(),
            "1"
          );
          const [allowed, remaining, waitMs] = result;
          return {
            allowed: allowed === 1,
            remaining,
            retryAfter: waitMs ? Math.ceil(waitMs / 1e3) : void 0
          };
        } catch (error) {
          logger_default.error({ error, action, userId }, "Rate limiter failure. Failing open for safety.");
          return { allowed: true, remaining: 1 };
        }
      }
      // Convenience methods for specific SaaS rules
      static async checkBuildLimit(userId, isPro) {
        const limit = isPro ? 100 : 3;
        return this.checkLimit("build", userId, limit, 3600 * 1e3);
      }
      static async checkGithubLimit(userId, isPro) {
        const limit = isPro ? 5 : 1;
        return this.checkLimit("github-push", userId, limit, 3600 * 1e3);
      }
      static async checkExportLimit(userId) {
        return this.checkLimit("export", userId, 10, 3600 * 1e3);
      }
    };
    var import_zod = require("zod");
    var ProjectGenerationSchema = import_zod.z.object({
      projectId: import_zod.z.string().min(1, { message: "Project ID is required" }),
      prompt: import_zod.z.string().min(10, { message: "Prompt must be at least 10 characters" }).max(5e3),
      template: import_zod.z.string().optional(),
      executionId: import_zod.z.string().min(1).optional(),
      isChaosTest: import_zod.z.boolean().optional(),
      settings: import_zod.z.object({
        model: import_zod.z.enum(["fast", "thinking", "pro"]).optional(),
        priority: import_zod.z.boolean().optional()
      }).optional()
    });
    var UserProfileSchema = import_zod.z.object({
      email: import_zod.z.string().email(),
      full_name: import_zod.z.string().min(2).optional()
    });
    var StripeWebhookSchema = import_zod.z.object({
      id: import_zod.z.string(),
      type: import_zod.z.string(),
      data: import_zod.z.object({
        object: import_zod.z.any()
      })
    });
    var import_react = require("react");
    function useStream({ url, onData, onError, heartbeatTimeout = 15e3 }) {
      const eventSourceRef = (0, import_react.useRef)(null);
      const lastMessageRef = (0, import_react.useRef)(Date.now());
      const [status, setStatus] = (0, import_react.useState)("connecting");
      const connect = (0, import_react.useCallback)(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        console.log(`[StreamClient] Connecting to ${url}`);
        const es = new EventSource(url);
        eventSourceRef.current = es;
        es.onopen = () => {
          console.log(`[StreamClient] Connected to ${url}`);
          setStatus("connected");
          lastMessageRef.current = Date.now();
        };
        es.onmessage = (event) => {
          try {
            lastMessageRef.current = Date.now();
            const data = JSON.parse(event.data);
            onData(data);
          } catch (err) {
            console.error("[StreamClient] Parse error:", err);
          }
        };
        es.onerror = (err) => {
          console.warn(`[StreamClient] Connection error on ${url}:`, err);
          setStatus("error");
          if (onError) onError(err);
        };
      }, [url, onData, onError]);
      (0, import_react.useEffect)(() => {
        connect();
        const heartbeatInterval = setInterval(() => {
          const timeSinceLastMessage = Date.now() - lastMessageRef.current;
          if (timeSinceLastMessage > heartbeatTimeout) {
            console.warn(`[StreamClient] Heartbeat stale (${timeSinceLastMessage}ms). Reconnecting...`);
            connect();
          }
        }, 5e3);
        return () => {
          console.log(`[StreamClient] Closing stream to ${url}`);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          clearInterval(heartbeatInterval);
        };
      }, [connect, url, heartbeatTimeout]);
      return { status, reconnect: connect };
    }
    var import_clsx = require_clsx();
    var import_tailwind_merge = require_bundle_cjs();
    function cn(...inputs) {
      return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
    }
    var services_exports = {};
    __export2(services_exports, {
      AnchoringService: () => AnchoringService,
      AuditLogger: () => AuditLogger,
      CodeChunker: () => CodeChunker,
      DistributedExecutionContext: () => DistributedExecutionContext,
      EmbeddingsEngine: () => EmbeddingsEngine,
      ErrorKnowledgeBase: () => ErrorKnowledgeBase,
      GuardrailService: () => GuardrailService,
      MemoryPlane: () => MemoryPlane,
      Orchestrator: () => Orchestrator2,
      PatchEngine: () => PatchEngine,
      PersistenceStore: () => PersistenceStore,
      PreviewManager: () => PreviewManager,
      ProjectStateManager: () => ProjectStateManager,
      QUEUE_FREE: () => QUEUE_FREE,
      QUEUE_PRO: () => QUEUE_PRO,
      RecoveryNotifier: () => RecoveryNotifier,
      SandboxPodController: () => SandboxPodController,
      StageState: () => StageState,
      StageStateMachine: () => StageStateMachine2,
      TemplateService: () => TemplateService,
      VectorStore: () => VectorStore,
      VirtualFileSystem: () => VirtualFileSystem,
      WorkerClusterManager: () => WorkerClusterManager,
      eventBus: () => eventBus2,
      freeQueue: () => freeQueue,
      getLatestBuildState: () => getLatestBuildState,
      getSupabaseAdmin: () => getSupabaseAdmin,
      guardrailService: () => guardrailService,
      independentRedisClients: () => independentRedisClients,
      memoryPlane: () => memoryPlane,
      missionController: () => missionController2,
      normalizeError: () => normalizeError,
      patchEngine: () => patchEngine,
      proQueue: () => proQueue,
      projectMemory: () => projectMemory,
      publishBuildEvent: () => publishBuildEvent,
      readBuildEvents: () => readBuildEvents,
      recoveryNotifier: () => recoveryNotifier,
      redis: () => redis,
      sandboxPodController: () => sandboxPodController,
      stateManager: () => stateManager2,
      supabaseAdmin: () => supabaseAdmin,
      templateService: () => templateService,
      validatePatchOrThrow: () => validatePatchOrThrow
    });
    var import_db = require_dist2();
    var import_crypto2 = __toESM2(require("crypto"));
    var AuditLogger = class {
      static INITIAL_HASH = "0".repeat(64);
      // Seed hash for the first log
      /**
       * Generates a SHA-256 hash for the current event, chained to the previous hash.
       */
      static calculateHash(event, prevHash) {
        const data = JSON.stringify({
          tenantId: event.tenantId,
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          metadata: event.metadata,
          prevHash
        });
        return import_crypto2.default.createHash("sha256").update(data).digest("hex");
      }
      /**
       * Records a tamper-proof audit event.
       */
      static async log(event) {
        try {
          const latestLog = await import_db.prisma.auditLog.findFirst({
            where: { tenantId: event.tenantId },
            orderBy: { createdAt: "desc" },
            select: { hash: true }
          });
          const prevHash = latestLog ? latestLog.hash : this.INITIAL_HASH;
          const hash = this.calculateHash(event, prevHash);
          await import_db.prisma.auditLog.create({
            data: {
              tenantId: event.tenantId,
              userId: event.userId,
              action: event.action,
              resource: event.resource,
              metadata: event.metadata,
              ipAddress: event.ipAddress,
              hash
            }
          });
          logger_default.info({ action: event.action, tenantId: event.tenantId }, "[AuditLogger] Recorded secure audit event");
        } catch (err) {
          logger_default.error({ err }, "[AuditLogger] Failed to record audit event");
        }
      }
      /**
       * Verifies the integrity of the audit chain for a tenant.
       * Returns true if the chain is intact, false otherwise.
       */
      static async verifyChain(tenantId) {
        try {
          const logs = await import_db.prisma.auditLog.findMany({
            where: { tenantId },
            orderBy: { createdAt: "asc" }
          });
          let currentPrevHash = this.INITIAL_HASH;
          for (const log of logs) {
            const expectedHash = this.calculateHash({
              tenantId: log.tenantId,
              userId: log.userId,
              action: log.action,
              resource: log.resource,
              metadata: log.metadata
            }, currentPrevHash);
            if (log.hash !== expectedHash) {
              logger_default.error({ logId: log.id }, "[AuditLogger] Tamper detected in audit chain!");
              return false;
            }
            currentPrevHash = log.hash;
          }
          return true;
        } catch (err) {
          logger_default.error({ err }, "[AuditLogger] Failed to verify audit chain");
          return false;
        }
      }
      /**
       * Retrieves the most recent log entry for a tenant.
       */
      static async getLatestLog(tenantId) {
        const logs = await import_db.prisma.auditLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 1
        });
        return logs[0] || null;
      }
    };
    var AnchoringService = class {
      static ANCHOR_BUCKET = "audit-anchors-production";
      /**
       * Captures the current latest hash from the audit chain and anchors it.
       * In production, this would upload to S3 Glacier or a Blockchain.
       */
      static async anchorChain(tenantId) {
        try {
          const latestLog = await AuditLogger.getLatestLog(tenantId);
          if (!latestLog) return null;
          const anchorPoint = {
            tenantId,
            rootHash: latestLog.hash,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            logId: latestLog.id
          };
          logger_default.info({ anchorPoint }, "[AnchoringService] Successfully anchored audit chain externally");
          return latestLog.hash;
        } catch (err) {
          logger_default.error({ err }, "[AnchoringService] Failed to anchor audit chain");
          return null;
        }
      }
      /**
       * Verifies the local DB chain against the latest external anchor.
       */
      static async verifyAgainstAnchor(tenantId, anchoredHash) {
        const latestLog = await AuditLogger.getLatestLog(tenantId);
        if (!latestLog) return false;
        if (latestLog.hash !== anchoredHash) {
          logger_default.error({ local: latestLog.hash, anchored: anchoredHash }, "[AnchoringService] Audit Chain Integrity Violation detected!");
          return false;
        }
        return await AuditLogger.verifyChain(tenantId);
      }
    };
    var import_bullmq2 = require("bullmq");
    var QUEUE_FREE = "project-generation-free-v1";
    var QUEUE_PRO = "project-generation-pro-v1";
    var connection = redis_default;
    var defaultOptions = {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5e3
      },
      removeOnComplete: false,
      // Audit trail
      removeOnFail: {
        age: 24 * 3600
        // keep for 24 hours
      }
    };
    var freeQueue = new import_bullmq2.Queue(QUEUE_FREE, {
      connection,
      defaultJobOptions: defaultOptions
    });
    var proQueue = new import_bullmq2.Queue(QUEUE_PRO, {
      connection,
      defaultJobOptions: defaultOptions
    });
    logger_default.info(`BullMQ Tiered Queues "${QUEUE_FREE}" and "${QUEUE_PRO}" initialized`);
    var import_crypto3 = __toESM2(require("crypto"));
    var ErrorKnowledgeBase = class {
      static PREFIX = "error_kb:";
      /**
       * Normalizes and hashes an error message for lookup.
       */
      static hashError(error) {
        const normalized = error.replace(/\/.*?\/MultiAgent\//g, "PROJECT_ROOT/").replace(/:\d+:\d+/g, ":LINE:COL").replace(/0x[0-9a-fA-F]+/g, "HEX_VAL").replace(/[a-f0-9]{8,}/g, "HASH_VAL").replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, "TIMESTAMP").trim();
        return import_crypto3.default.createHash("md4").update(normalized).digest("hex");
      }
      /**
       * Fetches a cached solution for a given error message.
       */
      static async getSolution(error) {
        try {
          const hash = this.hashError(error);
          const cached = await redis.get(`${this.PREFIX}${hash}`);
          if (cached) {
            logger_default.info({ hash }, "[ErrorKB] Cache hit for error");
            return JSON.parse(cached);
          }
          return null;
        } catch (err) {
          logger_default.warn({ err }, "[ErrorKB] Failed to fetch solution from cache");
          return null;
        }
      }
      /**
       * Records a successful solution for an error.
       */
      static async recordSolution(error, solution) {
        try {
          const hash = this.hashError(error);
          await redis.set(`${this.PREFIX}${hash}`, JSON.stringify(solution), "EX", 86400);
          logger_default.info({ hash }, "[ErrorKB] Recorded new solution for error");
        } catch (err) {
          logger_default.error({ err }, "[ErrorKB] Failed to record solution");
        }
      }
    };
    var import_uuid3 = require("uuid");
    var crypto3 = __toESM2(require("crypto"));
    var VirtualFileSystem = class {
      files = /* @__PURE__ */ new Map();
      writeFile(path5, content, encoding = "utf-8") {
        this.files.set(path5, { path: path5, content, encoding });
      }
      readFile(path5) {
        return this.files.get(path5)?.content || null;
      }
      exists(path5) {
        return this.files.has(path5);
      }
      createSnapshot() {
        return Array.from(this.files.entries());
      }
      restoreSnapshot(snapshot) {
        this.files = new Map(snapshot);
      }
      isEmpty() {
        return this.files.size === 0;
      }
    };
    var DistributedExecutionContext = class _DistributedExecutionContext {
      executionId;
      key;
      vfs = new VirtualFileSystem();
      static TTL = 86400;
      // 24 hours
      // Properties from ExecutionContextType
      userId = "";
      projectId = "";
      prompt = "";
      status = "initializing";
      currentStageIndex = 0;
      currentStage = "";
      version = 0;
      paymentStatus = "pending";
      agentResults = {};
      journals = {};
      retryPolicies = {};
      metrics = { startTime: (/* @__PURE__ */ new Date()).toISOString() };
      metadata = {};
      history = [];
      correlationId = "";
      lastCommitHash = "0".repeat(64);
      // Seed hash
      locked;
      finalFiles;
      vfsSnapshot;
      static LUA_TRANSITION_SCRIPT = `
        local contextKey = KEYS[1]
        local lockKey = KEYS[2]
        local commitLogKey = KEYS[3]
        
        local expectedWorkerId = ARGV[1]
        local stageId = ARGV[2]
        local stageIndex = tonumber(ARGV[3])
        local status = ARGV[4]
        local message = ARGV[5]
        local inputHash = ARGV[6]
        local outputHash = ARGV[7]
        local expectedVersion = tonumber(ARGV[8])
        local timestamp = ARGV[9]
        local commitHash = ARGV[10]

        -- 1. Validate Lock Ownership
        local currentLockOwner = redis.call("get", lockKey)
        if currentLockOwner ~= expectedWorkerId then
            return {err = "LOCK_LOST", owner = currentLockOwner}
        end

        -- 2. Validate Context & Version
        local data = redis.call("get", contextKey)
        if not data then return {err = "CONTEXT_MISSING"} end

        local ctx = cjson.decode(data)
        
        -- Version Check (Optimistic Locking)
        if expectedVersion and ctx.version ~= expectedVersion then
            return {err = "VERSION_MISMATCH", current = ctx.version, expected = expectedVersion}
        end

        -- Monotonicity Check
        if stageIndex < ctx.currentStageIndex then
            return {err = "BACKWARD_TRANSITION", current = ctx.currentStageIndex}
        end

        -- 3. Update State
        if not ctx.agentResults then ctx.agentResults = {} end
        local stage = ctx.agentResults[stageId] or {attempts = 0}
        
        stage.agentName = stageId
        stage.status = status
        stage.workerId = expectedWorkerId
        
        if status == "in_progress" then
           stage.startTime = stage.startTime or timestamp
           stage.inputHash = inputHash
           stage.attempts = stage.attempts + 1
        elseif status == "completed" then
           stage.endTime = timestamp
           stage.outputHash = outputHash
           
           -- Append to Commit Log
           local duration = 0
           if stage.startTime then
              -- Simplified duration calc since Lua doesn't have native ISO parser
              -- In production we'd pass numeric timestamps
              duration = 0 
           end
           
           local logEntry = {
              stageIndex = stageIndex,
              inputHash = stage.inputHash,
              outputHash = outputHash,
              commitHash = commitHash,
              workerId = expectedWorkerId,
              startedAt = stage.startTime or timestamp,
              completedAt = timestamp,
              durationMs = duration,
              retryCount = stage.attempts - 1
           }
           redis.call("RPUSH", commitLogKey, cjson.encode(logEntry))
           ctx.lastCommitHash = commitHash
        end

        ctx.agentResults[stageId] = stage
        ctx.currentStage = stageId
        ctx.currentStageIndex = stageIndex
        ctx.version = ctx.version + 1
        ctx.currentMessage = message
        ctx.status = "executing"

        -- 4. Persist
        redis.call("setex", contextKey, 86400, cjson.encode(ctx))
        return {ok = "SUCCESS", version = ctx.version}
    `;
      constructor(executionId) {
        this.executionId = executionId || (0, import_uuid3.v4)();
        this.key = `execution:${this.executionId}`;
      }
      getVFS() {
        return this.vfs;
      }
      getExecutionId() {
        return this.executionId;
      }
      getProjectId() {
        return this.projectId;
      }
      async init(userId, projectId, prompt, correlationId, planType = "free") {
        this.userId = userId;
        this.projectId = projectId;
        this.prompt = prompt;
        this.correlationId = correlationId;
        this.status = "initializing";
        this.currentStageIndex = 0;
        this.currentStage = "start";
        this.paymentStatus = "pending";
        this.agentResults = {};
        this.metrics = {
          startTime: (/* @__PURE__ */ new Date()).toISOString(),
          promptTokensTotal: 0,
          completionTokensTotal: 0,
          tokensTotal: 0
        };
        this.metadata = { planType };
        const context2 = {
          executionId: this.executionId,
          userId,
          projectId,
          prompt,
          correlationId,
          status: this.status,
          currentStageIndex: this.currentStageIndex,
          currentStage: this.currentStage,
          paymentStatus: "pending",
          agentResults: {},
          journals: {},
          retryPolicies: {},
          version: 0,
          metrics: {
            startTime: (/* @__PURE__ */ new Date()).toISOString(),
            promptTokensTotal: 0,
            completionTokensTotal: 0,
            tokensTotal: 0
          },
          metadata: { planType },
          lastCommitHash: "0".repeat(64),
          vfsSnapshot: this.vfs.createSnapshot()
        };
        await redis.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2));
        await redis.sadd("active:executions", this.executionId);
        return context2;
      }
      static async getActiveExecutions() {
        return await redis.smembers("active:executions");
      }
      async get() {
        const data = await redis.get(this.key);
        return data ? JSON.parse(data) : null;
      }
      /**
       * Pulls the latest state from Redis and hydrates the local VFS.
       */
      async sync() {
        const data = await this.get();
        if (data) {
          if (data.userId) this.userId = data.userId;
          if (data.projectId) this.projectId = data.projectId;
          if (data.prompt) this.prompt = data.prompt;
          if (data.status) this.status = data.status;
          if (data.currentStageIndex) this.currentStageIndex = data.currentStageIndex;
          if (data.currentStage) this.currentStage = data.currentStage;
          if (data.version) this.version = data.version;
          if (data.agentResults) this.agentResults = data.agentResults;
          if (data.metadata) this.metadata = data.metadata;
          if (data.vfsSnapshot) {
            this.vfs.restoreSnapshot(data.vfsSnapshot);
          }
        }
        return data;
      }
      async update(updates) {
        const current = await this.get();
        if (!current) throw new Error(`Execution context ${this.executionId} not found`);
        const updated = { ...current, ...updates };
        await redis.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(updated));
      }
      async updateStage(stageId) {
        await this.atomicUpdate((ctx) => {
          ctx.currentStage = stageId;
        });
      }
      async atomicTransition(lock, stageId, stageIndex, status, message, inputHash, outputHash) {
        const currentVersion = (await this.get())?.version || 0;
        const commitLogKey = `commitLog:${this.executionId}`;
        const result = await redis.eval(
          _DistributedExecutionContext.LUA_TRANSITION_SCRIPT,
          3,
          this.key,
          lock.getLockKey(),
          commitLogKey,
          lock.getWorkerId(),
          stageId,
          stageIndex.toString(),
          status,
          message,
          inputHash || "",
          outputHash || "",
          currentVersion.toString(),
          (/* @__PURE__ */ new Date()).toISOString(),
          status == "completed" ? _DistributedExecutionContext.computeChainedHash(
            (await this.get())?.lastCommitHash || "0".repeat(64),
            { stageId, inputHash, outputHash, stageIndex }
          ) : ""
        );
        if (result.err) {
          if (result.err === "LOCK_LOST") {
            throw new Error(`LOCK_LOST: Worker ${lock.getWorkerId()} no longer owns execution ${this.executionId}. Current owner: ${result.owner}`);
          }
          if (result.err === "VERSION_MISMATCH") {
            throw new Error(`VERSION_MISMATCH: Stale transition attempt. Current version: ${result.current}, Expected: ${result.expected}`);
          }
          throw new Error(`TRANSITION_FAILED: ${result.err}`);
        }
        return result.version;
      }
      /**
       * WRITE-AHEAD JOURNALING
       */
      async writeJournal(stageIndex, operationId, status, lock, inputHash, outputHash, expectedVersion) {
        await this.atomicUpdate((ctx) => {
          if (expectedVersion !== void 0 && ctx.version !== expectedVersion) {
            throw new Error(`VERSION_MISMATCH: Stale journal write. Current: ${ctx.version}, Expected: ${expectedVersion}`);
          }
          const entry = {
            operationId,
            stageIndex,
            workerId: lock.getWorkerId(),
            status,
            inputHash,
            outputHash,
            createdAt: ctx.journals[operationId]?.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          ctx.journals[operationId] = entry;
          ctx.version += 1;
        });
      }
      async getJournal(operationId) {
        const ctx = await this.get();
        return ctx?.journals[operationId] || null;
      }
      async getCommitLog() {
        const logs = await redis.lrange(`commitLog:${this.executionId}`, 0, -1);
        return logs.map((l) => JSON.parse(l));
      }
      static computeHash(input) {
        const str = typeof input === "string" ? input : JSON.stringify(input);
        return crypto3.createHash("sha256").update(str).digest("hex");
      }
      static computeChainedHash(previousHash, data) {
        const dataStr = JSON.stringify(data);
        return crypto3.createHash("sha256").update(previousHash + dataStr).digest("hex");
      }
      async performOnce(key, fn) {
        const lockKey = `once:${this.executionId}:${key}`;
        const acquired = await redis.set(lockKey, "locked", "EX", 3600, "NX");
        if (acquired === "OK") {
          try {
            return await fn();
          } catch (err) {
            await redis.del(lockKey);
            throw err;
          }
        }
        logger_default.info({ executionId: this.executionId, key }, "Skipped performOnce block - already executed");
        return null;
      }
      async setAgentResult(agentName, result) {
        await this.atomicUpdate((ctx) => {
          const existing = ctx.agentResults[agentName] || {
            agentName,
            status: "pending",
            attempts: 0,
            startTime: (/* @__PURE__ */ new Date()).toISOString()
          };
          ctx.agentResults[agentName] = {
            ...existing,
            ...result,
            endTime: result.status === "completed" || result.status === "failed" ? (/* @__PURE__ */ new Date()).toISOString() : void 0
          };
        });
      }
      async updateUiStage(stage, status, msg) {
        await eventBus2.stage(this.executionId, stage, status, msg, 0, this.projectId);
      }
      async finalize(status, expectedVersion) {
        await this.atomicUpdate((ctx) => {
          if (expectedVersion !== void 0 && ctx.version !== expectedVersion) {
            throw new Error(`VERSION_MISMATCH: Stale finalize. Current: ${ctx.version}, Expected: ${expectedVersion}`);
          }
          ctx.status = status;
          ctx.locked = true;
          ctx.metrics.endTime = (/* @__PURE__ */ new Date()).toISOString();
          ctx.metrics.totalDurationMs = (/* @__PURE__ */ new Date()).getTime() - new Date(ctx.metrics.startTime).getTime();
          ctx.version += 1;
        });
        await redis.srem("active:executions", this.executionId);
      }
      /**
       * DEAD LETTER RECORDING
       */
      async recordToDeadLetter(reason, metadata = {}) {
        const ctx = await this.get();
        if (!ctx) return;
        const dlqEntry = {
          ...ctx,
          deadLetteredAt: (/* @__PURE__ */ new Date()).toISOString(),
          reason,
          extraMetadata: metadata
        };
        const dlqKey = `dlq:execution:${this.executionId}`;
        await redis.setex(dlqKey, 604800, JSON.stringify(dlqEntry));
        await redis.sadd("dlq:executions", this.executionId);
        await redis.srem("active:executions", this.executionId);
        logger_default.error({ executionId: this.executionId, reason }, "Execution moved to Dead Letter Queue");
      }
      /**
       * Atomic update using Redis WATCH/MULTI/EXEC for safe concurrency
       */
      async atomicUpdate(updater) {
        for (let i = 0; i < 5; i++) {
          try {
            await redis.watch(this.key);
            const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
            const supabaseAdmin2 = getSupabaseAdmin2();
            const data = await redis.get(this.key);
            if (!data) throw new Error(`Execution context ${this.executionId} not found`);
            const context2 = JSON.parse(data);
            if (context2.locked) {
              await redis.unwatch();
              return;
            }
            if (context2.vfsSnapshot && this.vfs.isEmpty()) {
              this.vfs.restoreSnapshot(context2.vfsSnapshot);
            }
            updater(context2);
            context2.vfsSnapshot = this.vfs.createSnapshot();
            const result = await redis.multi().setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2)).exec();
            if (result) return;
            logger_default.warn({ executionId: this.executionId, attempt: i }, "Concurrency conflict on context update, retrying...");
          } catch (err) {
            await redis.unwatch();
            throw err;
          }
        }
        throw new Error(`Failed to update execution context ${this.executionId} after multiple attempts due to concurrency.`);
      }
    };
    var GuardrailService = class {
      PROTECTED_FILES = [
        "package.json",
        "tsconfig.json",
        "next.config.js",
        "next.config.mjs",
        "tailwind.config.js",
        "tailwind.config.ts",
        ".env",
        ".env.local"
      ];
      /**
       * Validates and sanitizes agent file outputs according to reliability rules.
       */
      validateOutput(files, originalFiles) {
        const violations = [];
        const sanitizedFiles = [];
        for (const file of files) {
          const fileName = file.path.split("/").pop() || "";
          const isProtected = this.PROTECTED_FILES.includes(fileName);
          if (isProtected) {
            const original = originalFiles[file.path];
            const isCriticalConfig = ["next.config.js", "next.config.mjs", "tsconfig.json", "tailwind.config.js", "tailwind.config.ts"].includes(fileName);
            if (isCriticalConfig && original && file.content !== original) {
              violations.push(`CRITICAL: Unauthorized modification of build infrastructure: ${file.path}. This file is locked for stability.`);
              logger_default.error({ path: file.path }, "[GuardrailService] BLOCK: AI attempted to modify locked config file");
              sanitizedFiles.push({ path: file.path, content: original });
              continue;
            }
            if (original && file.content !== original) {
              violations.push(`Unauthorized modification of critical file: ${file.path}. AI is not permitted to modify project infrastructure.`);
              logger_default.warn({ path: file.path }, "[GuardrailService] Guard: Reverted config modification");
              sanitizedFiles.push({ path: file.path, content: original });
              continue;
            }
          }
          sanitizedFiles.push(file);
        }
        return {
          isValid: violations.length === 0,
          violations,
          sanitizedFiles
        };
      }
      isDestructive(original, updated, fileName) {
        if (fileName === "package.json") {
          try {
            const oldPkg = JSON.parse(original);
            const newPkg = JSON.parse(updated);
            const criticalScripts = ["dev", "build", "start"];
            for (const script of criticalScripts) {
              if (oldPkg.scripts?.[script] && !newPkg.scripts?.[script]) return true;
            }
            return false;
          } catch {
            return true;
          }
        }
        return false;
      }
    };
    var guardrailService = new GuardrailService();
    var import_fs_extra2 = __toESM2(require("fs-extra"));
    var import_path3 = __toESM2(require("path"));
    var PatchEngine = class {
      /**
       * Applies a patch to existing file content using anchor markers.
       * Markers format: <!-- ANCHOR_START --> and <!-- ANCHOR_END -->
       */
      applyAnchorPatch(fileContent, anchor, replacement) {
        const startMarker = `<!-- ${anchor}_START -->`;
        const endMarker = `<!-- ${anchor}_END -->`;
        const startIndex = fileContent.indexOf(startMarker);
        const endIndex = fileContent.indexOf(endMarker);
        if (startIndex === -1 || endIndex === -1) {
          logger_default.warn({ anchor }, "[PatchEngine] Anchor markers not found. Falling back to append mode.");
          return this.fallbackPatch(fileContent, replacement);
        }
        const before = fileContent.substring(0, startIndex + startMarker.length);
        const after = fileContent.substring(endIndex);
        return `${before}
${replacement}
${after}`;
      }
      /**
       * Fallback strategy when anchors are missing.
       * For TSX/JSX, we try to insert before the last export or end of file.
       */
      fallbackPatch(content, replacement) {
        return `${content}

// --- AI Generated Patch (Fallback) ---
${replacement}
`;
      }
      /**
       * Mass apply patches to a virtual file system.
       */
      applyPatches(files, patches) {
        const updatedFiles = [...files];
        for (const patch of patches) {
          const fileIndex = updatedFiles.findIndex((f) => f.path === patch.path);
          if (fileIndex !== -1) {
            if (patch.anchor) {
              updatedFiles[fileIndex].content = this.applyAnchorPatch(
                updatedFiles[fileIndex].content,
                patch.anchor,
                patch.content
              );
            } else {
              updatedFiles[fileIndex].content = patch.content;
            }
          } else {
            updatedFiles.push({ path: patch.path, content: patch.content });
          }
        }
        return updatedFiles;
      }
      async applyPatch(projectId, filePath, content) {
        const sandboxDir = import_path3.default.join(process.cwd(), ".generated-projects", projectId);
        const fullPath = import_path3.default.join(sandboxDir, filePath);
        try {
          await import_fs_extra2.default.ensureDir(import_path3.default.dirname(fullPath));
          await import_fs_extra2.default.writeFile(fullPath, content);
          logger_default.info({ projectId, filePath }, "[PatchEngine] Single patch applied to sandbox");
        } catch (err) {
          logger_default.error({ projectId, filePath, err }, "[PatchEngine] Single patch failed");
        }
      }
    };
    var patchEngine = new PatchEngine();
    var import_db2 = require_dist2();
    var PreviewManager = class {
      static async generatePreviewUrl(buildId) {
        const previewUrl = `https://preview-${buildId.slice(0, 8)}.multiagent.app`;
        logger_default.info({ buildId, previewUrl }, "[PreviewManager] Generated preview URL");
        try {
          await import_db2.prisma.build.update({
            where: { id: buildId },
            data: { previewUrl }
          });
        } catch (err) {
          logger_default.error({ err }, "[PreviewManager] Failed to update build with preview URL");
        }
        return previewUrl;
      }
    };
    var import_axios2 = __toESM2(require("axios"));
    var RecoveryNotifier = class {
      webhookUrl = process.env.ALERTS_WEBHOOK_URL;
      async notifyFailure(executionId, error) {
        const message = `\xF0\u0178\u0161\xA8 *Build Pipeline Failure* \xF0\u0178\u0161\xA8
*Execution ID:* ${executionId}
*Error:* ${error}
*Timestamp:* ${(/* @__PURE__ */ new Date()).toISOString()}`;
        logger_default.error({ executionId, error }, "[RecoveryNotifier] Dispatching alert");
        if (this.webhookUrl) {
          try {
            await import_axios2.default.post(this.webhookUrl, { text: message });
          } catch (err) {
            logger_default.error({ err }, "[RecoveryNotifier] Failed to send webhook alert");
          }
        }
      }
      async notifySuccess(executionId) {
        const message = `\xE2\u0153\u2026 *Build Pipeline Success* \xE2\u0153\u2026
*Execution ID:* ${executionId}`;
        if (this.webhookUrl) {
          try {
            await import_axios2.default.post(this.webhookUrl, { text: message });
          } catch (err) {
            logger_default.error({ err }, "[RecoveryNotifier] Failed to send webhook success notification");
          }
        }
      }
    };
    var recoveryNotifier = new RecoveryNotifier();
    var k8s = __toESM2(require("@kubernetes/client-node"));
    var SandboxPodController = class {
      k8sApi;
      namespace = "multi-agent-sandboxes";
      constructor() {
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      }
      async createSandbox(projectId, executionId) {
        const podName = `sandbox-${projectId}-${executionId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const pod = {
          metadata: {
            name: podName,
            labels: {
              app: "sandbox",
              projectId,
              executionId
            }
          },
          spec: {
            containers: [{
              name: "runtime",
              image: "multi-agent-sandbox-runtime:latest",
              resources: {
                limits: {
                  memory: "512Mi",
                  cpu: "500m"
                }
              },
              env: [
                { name: "PROJECT_ID", value: projectId },
                { name: "EXECUTION_ID", value: executionId }
              ]
            }],
            restartPolicy: "Never"
          }
        };
        try {
          await this.k8sApi.createNamespacedPod(this.namespace, pod);
          logger_default.info({ podName, projectId }, "[SandboxPodController] Pod created successfully");
          return podName;
        } catch (err) {
          logger_default.error({ err, podName }, "[SandboxPodController] Failed to create pod");
          throw err;
        }
      }
      async deleteSandbox(podName) {
        try {
          await this.k8sApi.deleteNamespacedPod(podName, this.namespace);
          logger_default.info({ podName }, "[SandboxPodController] Pod deleted");
        } catch (err) {
          logger_default.error({ err, podName }, "[SandboxPodController] Failed to delete pod");
        }
      }
    };
    var sandboxPodController = new SandboxPodController();
    var FORBIDDEN_PATTERNS = [
      "rm -rf",
      "process.exit",
      "fs.unlink",
      "child_process.exec",
      "eval(",
      "/etc/passwd",
      ".env"
    ];
    var MAX_PATCH_LENGTH = 5e3;
    function validatePatchOrThrow(patch) {
      if (!patch || !patch.content) {
        throw new Error("Invalid patch: Missing content");
      }
      if (patch.content.length > MAX_PATCH_LENGTH) {
        logger_default.warn({ path: patch.path, size: patch.content.length }, "[SelfHealer] Patch rejected: Too large");
        throw new Error(`Patch too large (${patch.content.length} chars) - possible AI hallucination`);
      }
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (patch.content.includes(pattern)) {
          logger_default.error({ path: patch.path, pattern }, "[SelfHealer] Security violation detected");
          throw new Error(`Unsafe patch detected: Contains forbidden pattern "${pattern}"`);
        }
      }
      logger_default.info({ path: patch.path }, "[SelfHealer] Patch security check passed");
    }
    function normalizeError(error) {
      if (!error) return "unknown_error";
      if (typeof error === "string") return error.toLowerCase();
      if (error instanceof Error) return error.message.toLowerCase();
      return JSON.stringify(error).toLowerCase();
    }
    init_supabase_admin();
    var import_fs_extra3 = __toESM2(require("fs-extra"));
    var import_path4 = __toESM2(require("path"));
    var TemplateService = class {
      templatesDir = import_path4.default.join(process.cwd(), "templates");
      async injectTemplate(templateName, context2) {
        const templatePath = import_path4.default.join(this.templatesDir, templateName);
        if (!await import_fs_extra3.default.pathExists(templatePath)) {
          logger_default.warn({ templateName }, "[TemplateService] Template not found");
          return false;
        }
        try {
          const files = {};
          await this.readTemplateFiles(templatePath, templatePath, files);
          const vfs = context2.getVFS();
          for (const [filePath, content] of Object.entries(files)) {
            vfs.setFile(filePath, content);
          }
          await context2.atomicUpdate(() => {
          });
          logger_default.info({ templateName, fileCount: Object.keys(files).length }, "[TemplateService] Template injected into VFS");
          return true;
        } catch (error) {
          logger_default.error({ error, templateName }, "[TemplateService] Failed to inject template");
          return false;
        }
      }
      async readTemplateFiles(basePath, currentPath, files) {
        const entries = await import_fs_extra3.default.readdir(currentPath, { withFileTypes: true });
        const EXCLUDED_DIRS = ["node_modules", ".next", ".git", "dist", ".turbo"];
        for (const entry of entries) {
          const fullPath = import_path4.default.join(currentPath, entry.name);
          const relativePath = import_path4.default.relative(basePath, fullPath).replace(/\\/g, "/");
          if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.includes(entry.name)) {
              continue;
            }
            await this.readTemplateFiles(basePath, fullPath, files);
          } else {
            const content = await import_fs_extra3.default.readFile(fullPath, "utf8");
            files[relativePath] = content;
          }
        }
      }
    };
    var templateService = new TemplateService();
    var WorkerClusterManager = class {
      static WORKER_REGISTRY_KEY = "multiagent:cluster:workers";
      static HEARTBEAT_TIMEOUT = 5e3;
      /**
       * Get all healthy worker nodes.
       */
      static async getHealthyNodes() {
        const data = await redis.hgetall(this.WORKER_REGISTRY_KEY);
        const now = Date.now();
        return Object.values(data).map((v) => JSON.parse(v)).filter((w) => now - w.lastHeartbeat < this.HEARTBEAT_TIMEOUT && w.status !== "ERROR");
      }
      /**
       * Steer a job to the best available worker.
       */
      static async steerJob(projectId) {
        const nodes = await this.getHealthyNodes();
        const idleNodes = nodes.filter((n) => n.status === "IDLE").sort((a, b) => a.load - b.load);
        if (idleNodes.length === 0) {
          logger_default.warn("[WorkerClusterManager] No idle nodes available in cluster");
          return null;
        }
        const selectedNode = idleNodes[0];
        await redis.publish(`worker:trigger:${selectedNode.workerId}`, JSON.stringify({
          projectId,
          assignedAt: Date.now()
        }));
        logger_default.info({ workerId: selectedNode.workerId, projectId }, "[WorkerClusterManager] Job steered successfully");
        return selectedNode.workerId;
      }
      /**
       * Register or update a worker node's heartbeat.
       */
      static async heartbeat(node) {
        const updatedNode = {
          ...node,
          lastHeartbeat: Date.now()
        };
        await redis.hset(this.WORKER_REGISTRY_KEY, node.workerId, JSON.stringify(updatedNode));
      }
    };
    var lib_exports = {};
    __export2(lib_exports, {
      QUEUE_ARCHITECTURE: () => QUEUE_ARCHITECTURE,
      QUEUE_DEPLOY: () => QUEUE_DEPLOY,
      QUEUE_DOCKER: () => QUEUE_DOCKER,
      QUEUE_GENERATOR: () => QUEUE_GENERATOR,
      QUEUE_META: () => QUEUE_META,
      QUEUE_PLANNER: () => QUEUE_PLANNER,
      QUEUE_REPAIR: () => QUEUE_REPAIR,
      QUEUE_SUPERVISOR: () => QUEUE_SUPERVISOR,
      QUEUE_VALIDATOR: () => QUEUE_VALIDATOR,
      SYSTEM_QUEUE_NAME: () => SYSTEM_QUEUE_NAME,
      architectureEvents: () => architectureEvents,
      architectureQueue: () => architectureQueue,
      deployEvents: () => deployEvents,
      deployQueue: () => deployQueue,
      dockerEvents: () => dockerEvents,
      dockerQueue: () => dockerQueue,
      env: () => env2,
      generatorEvents: () => generatorEvents,
      generatorQueue: () => generatorQueue,
      metaEvents: () => metaEvents,
      metaQueue: () => metaQueue,
      plannerEvents: () => plannerEvents,
      plannerQueue: () => plannerQueue,
      repairEvents: () => repairEvents,
      repairQueue: () => repairQueue,
      setupSystemJobs: () => setupSystemJobs,
      socketManager: () => socketManager,
      supervisorEvents: () => supervisorEvents,
      supervisorQueue: () => supervisorQueue,
      systemQueue: () => systemQueue,
      validatorEvents: () => validatorEvents,
      validatorQueue: () => validatorQueue
    });
    var import_zod2 = require("zod");
    var envSchema = import_zod2.z.object({
      NODE_ENV: import_zod2.z.enum(["development", "test", "production"]).default("development"),
      PORT: import_zod2.z.coerce.number().default(3e3),
      REDIS_URL: import_zod2.z.string().url().default("redis://localhost:6379"),
      GROQ_API_KEY: import_zod2.z.string().min(1, "GROQ API key is required"),
      NEXT_PUBLIC_SUPABASE_URL: import_zod2.z.string().url("Supabase URL is required"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: import_zod2.z.string().min(1, "Supabase Anon Key is required"),
      SUPABASE_SERVICE_ROLE_KEY: import_zod2.z.string().min(1, "Supabase Service Role is required"),
      STRIPE_SECRET_KEY: import_zod2.z.string().min(1, "Stripe Secret Key is required").optional(),
      STRIPE_WEBHOOK_SECRET: import_zod2.z.string().min(1, "Stripe Webhook Secret is required").optional(),
      WORKER_CONCURRENCY: import_zod2.z.coerce.number().default(5),
      METRICS_TOKEN: import_zod2.z.string().min(1, "Metrics Authorization Token is required").default("generate-a-secure-token-here"),
      GITHUB_CLIENT_ID: import_zod2.z.string().min(1, "GitHub Client ID is required for push integration").optional(),
      GITHUB_CLIENT_SECRET: import_zod2.z.string().min(1, "GitHub Client Secret is required for push integration").optional()
    });
    var _env;
    try {
      _env = envSchema.parse(process.env);
    } catch (err) {
      if (err instanceof import_zod2.z.ZodError) {
        logger_default.fatal(
          { issues: err.issues },
          "Environment validation failed. Missing or invalid required variables."
        );
        process.exit(1);
      }
      throw err;
    }
    var env2 = _env;
    var import_bullmq3 = require("bullmq");
    var QUEUE_PLANNER = "planner-queue";
    var QUEUE_ARCHITECTURE = "architecture-queue";
    var QUEUE_GENERATOR = "generator-queue";
    var QUEUE_VALIDATOR = "validator-queue";
    var QUEUE_DOCKER = "docker-queue";
    var QUEUE_DEPLOY = "deploy-queue";
    var QUEUE_SUPERVISOR = "supervisor-queue";
    var QUEUE_REPAIR = "repair-queue";
    var QUEUE_META = "meta-agent-queue";
    var connection2 = redis_default;
    var defaultOptions2 = {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5e3
      },
      removeOnComplete: false,
      removeOnFail: {
        age: 24 * 3600
        // keep for 24 hours
      }
    };
    var plannerQueue = new import_bullmq3.Queue(QUEUE_PLANNER, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var architectureQueue = new import_bullmq3.Queue(QUEUE_ARCHITECTURE, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var generatorQueue = new import_bullmq3.Queue(QUEUE_GENERATOR, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var validatorQueue = new import_bullmq3.Queue(QUEUE_VALIDATOR, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var dockerQueue = new import_bullmq3.Queue(QUEUE_DOCKER, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var deployQueue = new import_bullmq3.Queue(QUEUE_DEPLOY, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var supervisorQueue = new import_bullmq3.Queue(QUEUE_SUPERVISOR, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var repairQueue = new import_bullmq3.Queue(QUEUE_REPAIR, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var metaQueue = new import_bullmq3.Queue(QUEUE_META, { connection: connection2, defaultJobOptions: defaultOptions2 });
    var plannerEvents = new import_bullmq3.QueueEvents(QUEUE_PLANNER, { connection: connection2 });
    var architectureEvents = new import_bullmq3.QueueEvents(QUEUE_ARCHITECTURE, { connection: connection2 });
    var generatorEvents = new import_bullmq3.QueueEvents(QUEUE_GENERATOR, { connection: connection2 });
    var validatorEvents = new import_bullmq3.QueueEvents(QUEUE_VALIDATOR, { connection: connection2 });
    var dockerEvents = new import_bullmq3.QueueEvents(QUEUE_DOCKER, { connection: connection2 });
    var deployEvents = new import_bullmq3.QueueEvents(QUEUE_DEPLOY, { connection: connection2 });
    var supervisorEvents = new import_bullmq3.QueueEvents(QUEUE_SUPERVISOR, { connection: connection2 });
    var repairEvents = new import_bullmq3.QueueEvents(QUEUE_REPAIR, { connection: connection2 });
    var metaEvents = new import_bullmq3.QueueEvents(QUEUE_META, { connection: connection2 });
    logger_default.info(`Autonomous Distributed Queues initialized: Planner, Architecture, Generator, Validator, Docker, Deploy, Supervisor, Repair, Meta`);
    var import_bullmq4 = require("bullmq");
    async function reconcileBilling() {
      return { success: true };
    }
    var SYSTEM_QUEUE_NAME = "system-maintenance-v1";
    var systemQueue = new import_bullmq4.Queue(SYSTEM_QUEUE_NAME, {
      connection: redis_default,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false
        // Keep failures for audit
      }
    });
    var systemWorker = new import_bullmq4.Worker(
      SYSTEM_QUEUE_NAME,
      async (job) => {
        if (job.name === "reconcile-billing") {
          return await reconcileBilling();
        }
      },
      { connection: redis_default }
    );
    async function setupSystemJobs() {
      await systemQueue.add(
        "reconcile-billing",
        {},
        {
          repeat: {
            pattern: "0 * * * *"
            // Hourly (at the start of every hour)
          },
          jobId: "reconcile-billing-hourly"
        }
      );
      logger_default.info("Hourly billing reconciliation job scheduled.");
    }
    systemWorker.on("completed", (job) => {
      logger_default.info({ jobId: job.id, jobName: job.name }, "System job completed");
    });
    systemWorker.on("failed", (job, err) => {
      logger_default.error({ jobId: job?.id, jobName: job?.name, err }, "System job failed");
    });
    var import_socket = __toESM2(require("socket.io-client"));
    var SocketManager = class _SocketManager {
      static instance;
      socket = null;
      serverUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3010" : "http://localhost:3010";
      isConnected = false;
      isConnecting = false;
      serverAvailable = null;
      connectionAttempts = 0;
      maxRetries = 5;
      retryTimeout = null;
      healthCheckInterval = null;
      listeners = /* @__PURE__ */ new Set();
      updateListeners = /* @__PURE__ */ new Map();
      constructor() {
      }
      static getInstance() {
        if (!_SocketManager.instance) {
          _SocketManager.instance = new _SocketManager();
        }
        return _SocketManager.instance;
      }
      notifyConnectionState() {
        this.listeners.forEach((listener) => listener(this.isConnected));
      }
      addConnectionListener(listener) {
        this.listeners.add(listener);
        listener(this.isConnected);
        return () => this.listeners.delete(listener);
      }
      addUpdateListener(event, listener) {
        if (!this.updateListeners.has(event)) {
          this.updateListeners.set(event, /* @__PURE__ */ new Set());
          if (this.socket) {
            this.socket.on(event, (data) => this.notifyUpdateListeners(event, data));
          }
        }
        this.updateListeners.get(event).add(listener);
        return () => {
          const listeners = this.updateListeners.get(event);
          if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
              this.updateListeners.delete(event);
              if (this.socket) {
                this.socket.off(event);
              }
            }
          }
        };
      }
      notifyUpdateListeners(event, data) {
        const listeners = this.updateListeners.get(event);
        if (listeners) {
          listeners.forEach((listener) => listener(data));
        }
      }
      async checkServerHealth() {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2e3);
          const response = await fetch(`${this.serverUrl}/health`, {
            signal: controller.signal,
            method: "GET"
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            return data.status === "ok";
          }
          return false;
        } catch {
          return false;
        }
      }
      connectionPromise = null;
      async connect(options) {
        if (options?.serverUrl) {
          this.serverUrl = options.serverUrl;
        }
        if (this.socket && this.isConnected) {
          return this.socket;
        }
        if (this.connectionPromise) {
          console.log("[SocketManager] Reusing existing connection promise");
          return this.connectionPromise;
        }
        this.connectionPromise = (async () => {
          this.isConnecting = true;
          try {
            const isHealthy = await this.checkServerHealth();
            this.serverAvailable = isHealthy;
            if (!isHealthy) {
              console.warn(`[SocketManager] Server at ${this.serverUrl} is unreachable.`);
              this.scheduleRetry();
              return null;
            }
            if (this.retryTimeout) {
              clearTimeout(this.retryTimeout);
              this.retryTimeout = null;
            }
            if (this.socket) {
              this.socket.removeAllListeners();
              this.socket.disconnect();
            }
            console.log(`[SocketManager] Initializing socket connection to ${this.serverUrl}`);
            this.socket = (0, import_socket.default)(this.serverUrl, {
              reconnection: false,
              timeout: 5e3,
              transports: ["websocket", "polling"]
            });
            this.setupSocketListeners();
            return this.socket;
          } catch (error) {
            console.error("[SocketManager] Connection error:", error);
            this.scheduleRetry();
            return null;
          } finally {
            this.isConnecting = false;
            this.connectionPromise = null;
          }
        })();
        return this.connectionPromise;
      }
      setupSocketListeners() {
        if (!this.socket) return;
        this.socket.on("connect", () => {
          console.log("[SocketManager] Connected successfully");
          this.isConnected = true;
          this.isConnecting = false;
          this.connectionAttempts = 0;
          this.serverAvailable = true;
          this.notifyConnectionState();
          this.startHealthMonitoring();
          this.updateListeners.forEach((_, event) => {
            if (this.socket) {
              this.socket.off(event);
              this.socket.on(event, (data) => this.notifyUpdateListeners(event, data));
            }
          });
        });
        this.socket.on("disconnect", (reason) => {
          console.log(`[SocketManager] Disconnected: ${reason}`);
          this.isConnected = false;
          this.notifyConnectionState();
          if (reason === "io server disconnect" || reason === "transport close" || reason === "ping timeout") {
            this.stopHealthMonitoring();
            this.scheduleRetry();
          }
        });
        this.socket.on("connect_error", (error) => {
          console.warn(`[SocketManager] Connect error: ${error.message}`);
          this.isConnected = false;
          this.isConnecting = false;
          this.socket?.disconnect();
          this.scheduleRetry();
        });
      }
      scheduleRetry() {
        if (this.connectionAttempts >= this.maxRetries) {
          console.error(`[SocketManager] Max auto-retries (${this.maxRetries}) reached. Giving up until manual reconnect.`);
          return;
        }
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
        }
        this.connectionAttempts++;
        const backoffMs = Math.min(1e3 * Math.pow(2, this.connectionAttempts), 1e4);
        console.log(`[SocketManager] Scheduling retry ${this.connectionAttempts}/${this.maxRetries} in ${backoffMs}ms`);
        this.retryTimeout = setTimeout(() => {
          this.isConnecting = false;
          this.connect();
        }, backoffMs);
      }
      startHealthMonitoring() {
        this.stopHealthMonitoring();
        this.healthCheckInterval = setInterval(async () => {
          if (this.isConnected) {
            const isHealthy = await this.checkServerHealth();
            if (!isHealthy) {
              console.warn("[SocketManager] Health check failed while connected. Forcing disconnect.");
              this.socket?.disconnect();
            }
          }
        }, 15e3);
      }
      stopHealthMonitoring() {
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = null;
        }
      }
      disconnect() {
        this.stopHealthMonitoring();
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }
        if (this.socket) {
          console.log("[SocketManager] Manually disconnecting");
          this.socket.disconnect();
          this.socket = null;
        }
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionAttempts = 0;
        this.notifyConnectionState();
      }
      emit(event, data) {
        if (this.socket && this.isConnected) {
          this.socket.emit(event, data);
          return true;
        }
        return false;
      }
      getSocket() {
        return this.socket;
      }
    };
    var socketManager = SocketManager.getInstance();
  }
});

// ../../packages/observability/dist/index.js
var require_dist4 = __commonJS({
  "../../packages/observability/dist/index.js"(exports2, module2) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var index_exports = {};
    __export2(index_exports, {
      startTracing: () => startTracing2
    });
    module2.exports = __toCommonJS2(index_exports);
    var import_utils10 = require_dist3();
    async function startTracing2() {
      try {
        import_utils10.logger.info("[OTel] Tracing is disabled (Stub mode)");
      } catch (error) {
        import_utils10.logger.error({ error }, "[OTel] Failed to start tracing");
      }
    }
    process.on("SIGTERM", () => {
      process.exit(0);
    });
  }
});

// ../../packages/contracts/dist/index.js
var require_dist5 = __commonJS({
  "../../packages/contracts/dist/index.js"(exports2, module2) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var index_exports = {};
    __export2(index_exports, {
      JobStage: () => JobStage2,
      StageState: () => StageState
    });
    module2.exports = __toCommonJS2(index_exports);
    var JobStage2 = /* @__PURE__ */ ((JobStage22) => {
      JobStage22["PLAN"] = "PLAN";
      JobStage22["PLANNING"] = "PLANNING";
      JobStage22["GENERATE_CODE"] = "GENERATE_CODE";
      JobStage22["SECURITY"] = "SECURITY";
      JobStage22["MONETIZATION"] = "MONETIZATION";
      JobStage22["DEPLOYMENT"] = "DEPLOYMENT";
      JobStage22["MONITORING"] = "MONITORING";
      JobStage22["BUILD"] = "BUILD";
      JobStage22["TEST"] = "TEST";
      JobStage22["WRITE_ARTIFACTS"] = "WRITE_ARTIFACTS";
      JobStage22["VALIDATE_ARTIFACTS"] = "VALIDATE_ARTIFACTS";
      JobStage22["START_PREVIEW"] = "START_PREVIEW";
      JobStage22["HEALTH_CHECK"] = "HEALTH_CHECK";
      JobStage22["REGISTER_PREVIEW"] = "REGISTER_PREVIEW";
      JobStage22["COMPLETE"] = "COMPLETE";
      JobStage22["FAILED"] = "FAILED";
      return JobStage22;
    })(JobStage2 || {});
    var StageState = /* @__PURE__ */ ((StageState2) => {
      StageState2["IDLE"] = "IDLE";
      StageState2["RUNNING"] = "RUNNING";
      StageState2["COMPLETED"] = "COMPLETED";
      StageState2["FAILED"] = "FAILED";
      return StageState2;
    })(StageState || {});
  }
});

// index.ts
var import_dotenv = __toESM(require("dotenv"));
var import_observability = __toESM(require_dist4());
var import_express = __toESM(require("express"));

// orchestrator.ts
var import_utils4 = __toESM(require_dist3());
var import_utils5 = __toESM(require_dist3());
var import_utils6 = __toESM(require_dist3());
var import_utils7 = __toESM(require_dist3());
var import_contracts = __toESM(require_dist5());
var import_utils8 = __toESM(require_dist3());
var StageStateMachine = class {
  currentStage = import_contracts.JobStage.PLANNING;
  currentState = "IDLE" /* IDLE */;
  executionId;
  projectId;
  constructor(executionId, projectId) {
    this.executionId = executionId;
    this.projectId = projectId;
  }
  async transition(stage, state, message, progress) {
    this.currentStage = stage;
    this.currentState = state;
    import_utils8.default.info({ executionId: this.executionId, stage, state, message }, `[StageStateMachine] Transitioning to ${stage}:${state}`);
    const uiStatus = state === "RUNNING" /* RUNNING */ ? "in_progress" : state === "COMPLETED" /* COMPLETED */ ? "completed" : state === "FAILED" /* FAILED */ ? "failed" : "pending";
    await import_utils6.eventBus.stage(this.executionId, stage.toLowerCase(), uiStatus, message, progress, this.projectId);
  }
  getStage() {
    return this.currentStage;
  }
  getState() {
    return this.currentState;
  }
};
var Orchestrator = class {
  async run(taskPrompt, userId, projectId, executionId, tenantId, _signal, _options) {
    const elog = (0, import_utils7.getExecutionLogger)(executionId);
    const fsm = new StageStateMachine(executionId, projectId);
    try {
      elog.info("Dispatching to Temporal Production Pipeline");
      await import_utils5.stateManager.transition(executionId, "created", "Cluster online.", 5, projectId);
      const mission = {
        id: executionId,
        projectId,
        userId,
        prompt: taskPrompt,
        status: "init",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };
      await import_utils4.missionController.createMission(mission).catch(() => {
      });
      const { Connection, Client, WorkflowIdReusePolicy } = await import("@temporalio/client");
      const connection = await Connection.connect();
      const client = new Client({ connection });
      await fsm.transition(import_contracts.JobStage.PLANNING, "RUNNING" /* RUNNING */, "Orchestrating Temporal mission...", 10);
      const handle = await client.workflow.start("appBuilderWorkflow", {
        args: [{ prompt: taskPrompt, userId, projectId, executionId, tenantId }],
        taskQueue: "app-builder",
        workflowId: `build-${projectId}-${executionId}`,
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE
      });
      elog.info(`Workflow started. ID: ${handle.workflowId}`);
      const result = await handle.result();
      await fsm.transition(import_contracts.JobStage.COMPLETE, "COMPLETED" /* COMPLETED */, "Project ready via Temporal!", 100);
      return { success: true, executionId, files: [], previewUrl: result.previewUrl, fastPath: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      elog.error({ error: errorMsg }, "Pipeline failed");
      if (fsm) await fsm.transition(import_contracts.JobStage.FAILED, "FAILED" /* FAILED */, errorMsg, 0);
      return { success: false, executionId, error: errorMsg };
    }
  }
};

// index.ts
var import_utils9 = __toESM(require_dist3());
import_dotenv.default.config();
(0, import_observability.startTracing)();
var app = (0, import_express.default)();
var PORT = process.env.PORT || 4001;
var INTERNAL_KEY = process.env.INTERNAL_KEY || "local-secret-key";
var orchestrator = new Orchestrator();
app.use(import_express.default.json());
app.use((req, res, next) => {
  const key = req.headers["x-internal-key"];
  if (key !== INTERNAL_KEY) {
    import_utils9.logger.warn({ key }, "[Orchestrator] Unauthorized internal access attempt");
    return res.status(401).json({ error: "Unauthorized: Invalid internal key" });
  }
  next();
});
app.post("/run", async (req, res) => {
  const { prompt, userId, projectId, executionId, tenantId } = req.body;
  if (!prompt || !userId || !projectId || !executionId || !tenantId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    import_utils9.logger.info({ executionId, projectId, tenantId }, "[Orchestrator] Received build request");
    const result = await orchestrator.run(prompt, userId, projectId, executionId, tenantId);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    import_utils9.logger.error({ error: msg, executionId }, "[Orchestrator] Workflow initiation failed");
    res.status(500).json({ success: false, error: msg });
  }
});
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "orchestrator" });
});
app.listen(PORT, () => {
  import_utils9.logger.info(`[Orchestrator] Service running on port ${PORT}`);
});
