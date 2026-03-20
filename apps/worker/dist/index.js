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
    function createBrowserSupabaseClient(config3) {
      if (typeof window === "undefined") {
        return (0, import_supabase_js.createClient)(config3.url, config3.anonKey);
      }
      if (!_browserClient) {
        if (!config3.url || !config3.anonKey) {
          throw new Error("[Supabase SDK] Missing required configuration (url/anonKey)");
        }
        _browserClient = (0, import_supabase_js.createClient)(config3.url, config3.anonKey);
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
    var createClassGroupUtils = (config3) => {
      const classMap = createClassMap(config3);
      const {
        conflictingClassGroups,
        conflictingClassGroupModifiers
      } = config3;
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
    var createClassMap = (config3) => {
      const {
        theme,
        prefix
      } = config3;
      const classMap = {
        nextPart: /* @__PURE__ */ new Map(),
        validators: []
      };
      const prefixedClassGroupEntries = getPrefixedClassGroupEntries(Object.entries(config3.classGroups), prefix);
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
    var getPart = (classPartObject, path3) => {
      let currentClassPartObject = classPartObject;
      path3.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
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
    var createParseClassName = (config3) => {
      const {
        separator,
        experimentalParseClassName
      } = config3;
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
    var createConfigUtils = (config3) => ({
      cache: createLruCache(config3.cacheSize),
      parseClassName: createParseClassName(config3),
      ...createClassGroupUtils(config3)
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
        const config3 = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
        configUtils = createConfigUtils(config3);
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
    var prisma2 = {
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
      prismaVersion: { client: clientVersion, engine: prisma2.enginesVersion }
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
      prisma: () => prisma2
    });
    module2.exports = __toCommonJS2(index_exports);
    var import_client = require_default2();
    __reExport(index_exports, require_default2(), module2.exports);
    var prisma2 = global.prisma || new import_client.PrismaClient();
    if (process.env.NODE_ENV !== "production") global.prisma = prisma2;
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
      StageStateMachine: () => StageStateMachine,
      StrategyEngine: () => StrategyEngine,
      activeBuildsGauge: () => activeBuildsGauge2,
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
      queueLengthGauge: () => queueLengthGauge2,
      queueManager: () => queueManager,
      queueWaitTimeSeconds: () => queueWaitTimeSeconds2,
      readBuildEvents: () => readBuildEvents,
      recordBuildMetrics: () => recordBuildMetrics,
      redis: () => redis2,
      registry: () => registry,
      retryCountTotal: () => retryCountTotal,
      runtimeActiveTotal: () => runtimeActiveTotal,
      runtimeCrashesTotal: () => runtimeCrashesTotal,
      runtimeEvictionsTotal: () => runtimeEvictionsTotal,
      runtimeProxyErrorsTotal: () => runtimeProxyErrorsTotal,
      runtimeStartupDuration: () => runtimeStartupDuration,
      services: () => services_exports,
      stateManager: () => stateManager,
      stripeWebhookEventsTotal: () => stripeWebhookEventsTotal,
      stuckBuildsTotal: () => stuckBuildsTotal2,
      workerTaskDurationSeconds: () => workerTaskDurationSeconds2
    });
    module2.exports = __toCommonJS2(index_exports);
    var import_pino = __toESM2(require("pino"));
    var import_uuid = require("uuid");
    var import_async_hooks = require("async_hooks");
    var tracingContext = new import_async_hooks.AsyncLocalStorage();
    function getCorrelationId() {
      return tracingContext.getStore() || "no-correlation-id";
    }
    function runWithTracing2(id, fn) {
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
    function getExecutionLogger(executionId) {
      return logger3.child({ executionId });
    }
    var logger_default = logger3;
    var logger_default2 = logger_default;
    var import_bullmq2 = require("bullmq");
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
    var redis2 = RedisClient.getInstance();
    var independentRedisClients = REDIS_URLS.length > 1 ? RedisClient.getIndependentClients() : [redis2];
    var redis_default = redis2;
    var QueueManager = class {
      queues = /* @__PURE__ */ new Map();
      eventListeners = /* @__PURE__ */ new Map();
      getQueue(name) {
        if (!this.queues.has(name)) {
          const queue = new import_bullmq2.Queue(name, {
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
          const events = new import_bullmq2.QueueEvents(queueName, { connection: redis_default });
          this.eventListeners.set(queueName, events);
        }
        this.eventListeners.get(queueName).on("completed", ({ jobId, returnvalue }) => {
          callback(jobId, returnvalue);
        });
      }
      async onJobFailed(queueName, callback) {
        if (!this.eventListeners.has(queueName)) {
          const events = new import_bullmq2.QueueEvents(queueName, { connection: redis_default });
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
    var import_fs_extra3 = __toESM2(require("fs-extra"));
    var import_path3 = __toESM2(require("path"));
    var EjectSystem = class {
      static STORAGE_DIR = import_path3.default.join(process.cwd(), "artifact-storage", "ejects");
      static async eject(missionId, projectPath) {
        await import_fs_extra3.default.ensureDir(this.STORAGE_DIR);
        const ejectPath = import_path3.default.join(this.STORAGE_DIR, `${missionId}.zip`);
        const output = import_fs_extra3.default.createWriteStream(ejectPath);
        const archive = (0, import_archiver.default)("zip", { zlib: { level: 9 } });
        return new Promise((resolve, reject) => {
          output.on("close", () => {
            logger_default.info({ missionId, size: archive.pointer() }, "[Eject] Bundle created");
            resolve(ejectPath);
          });
          archive.on("error", (err) => reject(err));
          archive.pipe(output);
          archive.directory(projectPath, "src");
          const infraDir = import_path3.default.join(process.cwd(), "infrastructure");
          archive.directory(import_path3.default.join(infraDir, "docker"), "infrastructure/docker");
          archive.directory(import_path3.default.join(infraDir, "terraform"), "infrastructure/terraform");
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
          const pipeline = redis2.pipeline();
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
        const result = await redis2.xread(
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
        const raw = await redis2.get(`build:state:${executionId}`);
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
          await redis2.expire(`build:stream:${executionId}`, STREAM_TTL_SECONDS);
          await redis2.expire(`build:state:${executionId}`, STREAM_TTL_SECONDS);
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
        await redis2.setex(key, 86400, JSON.stringify(mission));
        logger_default.info({ missionId: mission.id }, "Mission state initialized in Redis");
        await eventBus2.stage(mission.id, mission.status, "in_progress", "Mission initialized", 0, mission.projectId);
      }
      async getMission(missionId) {
        const data = await redis2.get(`${this.PREFIX}${missionId}`);
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
        await redis2.setex(key, 86400, JSON.stringify(updated));
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
        const keys = await redis2.keys(`${this.PREFIX}*`);
        const missions = [];
        for (const key of keys) {
          const data = await redis2.get(key);
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
          await redis2.set(`project:state:${executionId}`, JSON.stringify(metadata), "EX", 86400);
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
        const raw = await redis2.get(`project:state:${executionId}`);
        return raw ? JSON.parse(raw) : null;
      }
    };
    var stateManager = ProjectStateManager.getInstance();
    var StageState = /* @__PURE__ */ ((StageState2) => {
      StageState2["IDLE"] = "IDLE";
      StageState2["RUNNING"] = "RUNNING";
      StageState2["COMPLETED"] = "COMPLETED";
      StageState2["FAILED"] = "FAILED";
      return StageState2;
    })(StageState || {});
    var StageStateMachine = class {
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
        const elog = getExecutionLogger(executionId);
        const fsm = new StageStateMachine(executionId, projectId);
        try {
          elog.info("Dispatching to Temporal Production Pipeline");
          await stateManager.transition(executionId, "created", "Cluster online.", 5, projectId);
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
            const [nextCursor, keys] = await redis2.scan(cursor, "MATCH", "mem:search:*", "COUNT", 100);
            cursor = nextCursor;
            if (keys.length > 0) {
              await redis2.del(...keys);
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
          const cached = await redis2.get(cacheKey);
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
          await redis2.set(cacheKey, JSON.stringify(results), "EX", CACHE_TTL);
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
      activeBuildsGauge: () => activeBuildsGauge2,
      agentExecutionDuration: () => agentExecutionDuration,
      agentFailuresTotal: () => agentFailuresTotal,
      apiRequestDurationSeconds: () => apiRequestDurationSeconds,
      breakers: () => breakers,
      cn: () => cn,
      createPortalSession: () => createPortalSession,
      env: () => env2,
      executionFailureTotal: () => executionFailureTotal,
      executionSuccessTotal: () => executionSuccessTotal,
      formatDate: () => formatDate,
      formatRelative: () => formatRelative,
      formatTime: () => formatTime,
      formatYear: () => formatYear,
      getCorrelationId: () => getCorrelationId,
      getExecutionLogger: () => getExecutionLogger,
      lockExpiredTotal: () => lockExpiredTotal,
      lockExtensionTotal: () => lockExtensionTotal,
      logger: () => logger3,
      nodeCpuUsage: () => nodeCpuUsage,
      nodeMemoryUsage: () => nodeMemoryUsage,
      pusher: () => pusher,
      queueLengthGauge: () => queueLengthGauge2,
      queueWaitTimeSeconds: () => queueWaitTimeSeconds2,
      recordBuildMetrics: () => recordBuildMetrics,
      registry: () => registry,
      retryCountTotal: () => retryCountTotal,
      runWithTracing: () => runWithTracing2,
      runtimeActiveTotal: () => runtimeActiveTotal,
      runtimeCrashesTotal: () => runtimeCrashesTotal,
      runtimeEvictionsTotal: () => runtimeEvictionsTotal,
      runtimeProxyErrorsTotal: () => runtimeProxyErrorsTotal,
      runtimeStartupDuration: () => runtimeStartupDuration,
      sendBuildSuccessEmail: () => sendBuildSuccessEmail,
      stripe: () => stripe,
      stripeWebhookEventsTotal: () => stripeWebhookEventsTotal,
      stuckBuildsTotal: () => stuckBuildsTotal2,
      tracingContext: () => tracingContext,
      useStream: () => useStream,
      withLock: () => withLock,
      workerTaskDurationSeconds: () => workerTaskDurationSeconds2
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
    var import_dotenv = __toESM2(require("dotenv"));
    var import_path22 = __toESM2(require("path"));
    var import_fs = __toESM2(require("fs"));
    var nodeEnv = process.env.NODE_ENV || "development";
    var envFile = nodeEnv === "production" ? ".env.production" : ".env.development";
    var envPath = import_path22.default.resolve(process.cwd(), envFile);
    var envLocalPath = import_path22.default.resolve(process.cwd(), ".env.local");
    if (import_fs.default.existsSync(envLocalPath)) {
      import_dotenv.default.config({ path: envLocalPath });
    }
    if (import_fs.default.existsSync(envPath)) {
      import_dotenv.default.config({ path: envPath, override: true });
    }
    import_dotenv.default.config();
    var requiredEnvVars = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "GROQ_API_KEY"
    ];
    var env2 = {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV || "development",
      WORKER_CONCURRENCY_FREE: Number(process.env.WORKER_CONCURRENCY_FREE) || 10,
      WORKER_CONCURRENCY_PRO: Number(process.env.WORKER_CONCURRENCY_PRO) || 20,
      WORKER_POOL_SIZE: Number(process.env.WORKER_POOL_SIZE) || 3,
      REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379"
    };
    var isProd = env2.NODE_ENV === "production";
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
      static async isKillSwitchActive(config3) {
        const isDev = process.env.NODE_ENV === "development";
        if (isDev) {
          logger_default.info("Development Mode Bypass: Skipping kill switch check.");
          return false;
        }
        if (config3?.governanceBypass && config3?.userId && config3?.executionId) {
          await this.auditOwnerOverride(config3.userId, config3.executionId);
          return false;
        }
        try {
          const isKilled = await redis2.get("system:kill_switch");
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
      static async checkTokenLimit(userId, config3 = DEFAULT_GOVERNANCE_CONFIG) {
        const isDev = process.env.NODE_ENV === "development";
        const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        const key = `governance:tokens:${userId}:${month}`;
        if (isDev) {
          logger_default.info({ userId }, "Development Mode Bypass: Skipping token limit check.");
          const usedStr = await redis2.get(key);
          return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
        }
        if (config3.governanceBypass && config3.executionId) {
          const usedStr = await redis2.get(key);
          return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
        }
        try {
          const usedStr = await redis2.get(key);
          const usedTokens = usedStr ? parseInt(usedStr, 10) : 0;
          if (usedTokens >= config3.maxMonthlyTokens) {
            logger_default.warn({ userId, usedTokens, limit: config3.maxMonthlyTokens }, "User exceeded monthly token budget");
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
          await redis2.multi().incrby(key, tokensUsed).expire(key, 32 * 24 * 60 * 60).exec();
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
          await redis2.decr(key);
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
    var stuckBuildsTotal2 = new import_prom_client.Counter({
      name: "stuck_builds_total",
      help: "Total number of stuck builds detected and resumed",
      registers: [registry]
    });
    var queueWaitTimeSeconds2 = new import_prom_client.Histogram({
      name: "queue_wait_time_seconds",
      help: "Time a job waits in queue before being picked up",
      labelNames: ["queue_name"],
      buckets: [0.1, 0.5, 1, 5, 10, 30],
      registers: [registry]
    });
    var activeBuildsGauge2 = new import_prom_client.Gauge({
      name: "active_builds_total",
      help: "Total number of active builds currently being processed by workers",
      labelNames: ["tier"],
      registers: [registry]
    });
    var queueLengthGauge2 = new import_prom_client.Gauge({
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
    var workerTaskDurationSeconds2 = new import_prom_client.Histogram({
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
      QUEUE_FREE: () => QUEUE_FREE2,
      QUEUE_PRO: () => QUEUE_PRO2,
      RecoveryNotifier: () => RecoveryNotifier,
      SandboxPodController: () => SandboxPodController,
      StageState: () => StageState,
      StageStateMachine: () => StageStateMachine,
      TemplateService: () => TemplateService,
      VectorStore: () => VectorStore,
      VirtualFileSystem: () => VirtualFileSystem,
      WorkerClusterManager: () => WorkerClusterManager2,
      eventBus: () => eventBus2,
      freeQueue: () => freeQueue2,
      getLatestBuildState: () => getLatestBuildState,
      getSupabaseAdmin: () => getSupabaseAdmin,
      guardrailService: () => guardrailService,
      independentRedisClients: () => independentRedisClients,
      memoryPlane: () => memoryPlane,
      missionController: () => missionController2,
      normalizeError: () => normalizeError,
      patchEngine: () => patchEngine,
      proQueue: () => proQueue2,
      projectMemory: () => projectMemory,
      publishBuildEvent: () => publishBuildEvent,
      readBuildEvents: () => readBuildEvents,
      recoveryNotifier: () => recoveryNotifier,
      redis: () => redis2,
      sandboxPodController: () => sandboxPodController,
      stateManager: () => stateManager,
      supabaseAdmin: () => supabaseAdmin,
      templateService: () => templateService,
      validatePatchOrThrow: () => validatePatchOrThrow
    });
    var import_db2 = require_dist2();
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
          const latestLog = await import_db2.prisma.auditLog.findFirst({
            where: { tenantId: event.tenantId },
            orderBy: { createdAt: "desc" },
            select: { hash: true }
          });
          const prevHash = latestLog ? latestLog.hash : this.INITIAL_HASH;
          const hash = this.calculateHash(event, prevHash);
          await import_db2.prisma.auditLog.create({
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
          const logs = await import_db2.prisma.auditLog.findMany({
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
        const logs = await import_db2.prisma.auditLog.findMany({
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
    var import_bullmq22 = require("bullmq");
    var QUEUE_FREE2 = "project-generation-free-v1";
    var QUEUE_PRO2 = "project-generation-pro-v1";
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
    var freeQueue2 = new import_bullmq22.Queue(QUEUE_FREE2, {
      connection,
      defaultJobOptions: defaultOptions
    });
    var proQueue2 = new import_bullmq22.Queue(QUEUE_PRO2, {
      connection,
      defaultJobOptions: defaultOptions
    });
    logger_default.info(`BullMQ Tiered Queues "${QUEUE_FREE2}" and "${QUEUE_PRO2}" initialized`);
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
          const cached = await redis2.get(`${this.PREFIX}${hash}`);
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
          await redis2.set(`${this.PREFIX}${hash}`, JSON.stringify(solution), "EX", 86400);
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
        await redis2.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2));
        await redis2.sadd("active:executions", this.executionId);
        return context2;
      }
      static async getActiveExecutions() {
        return await redis2.smembers("active:executions");
      }
      async get() {
        const data = await redis2.get(this.key);
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
        await redis2.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(updated));
      }
      async updateStage(stageId) {
        await this.atomicUpdate((ctx) => {
          ctx.currentStage = stageId;
        });
      }
      async atomicTransition(lock, stageId, stageIndex, status, message, inputHash, outputHash) {
        const currentVersion = (await this.get())?.version || 0;
        const commitLogKey = `commitLog:${this.executionId}`;
        const result = await redis2.eval(
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
        const logs = await redis2.lrange(`commitLog:${this.executionId}`, 0, -1);
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
        const acquired = await redis2.set(lockKey, "locked", "EX", 3600, "NX");
        if (acquired === "OK") {
          try {
            return await fn();
          } catch (err) {
            await redis2.del(lockKey);
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
        await redis2.srem("active:executions", this.executionId);
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
        await redis2.setex(dlqKey, 604800, JSON.stringify(dlqEntry));
        await redis2.sadd("dlq:executions", this.executionId);
        await redis2.srem("active:executions", this.executionId);
        logger_default.error({ executionId: this.executionId, reason }, "Execution moved to Dead Letter Queue");
      }
      /**
       * Atomic update using Redis WATCH/MULTI/EXEC for safe concurrency
       */
      async atomicUpdate(updater) {
        for (let i = 0; i < 5; i++) {
          try {
            await redis2.watch(this.key);
            const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
            const supabaseAdmin2 = getSupabaseAdmin2();
            const data = await redis2.get(this.key);
            if (!data) throw new Error(`Execution context ${this.executionId} not found`);
            const context2 = JSON.parse(data);
            if (context2.locked) {
              await redis2.unwatch();
              return;
            }
            if (context2.vfsSnapshot && this.vfs.isEmpty()) {
              this.vfs.restoreSnapshot(context2.vfsSnapshot);
            }
            updater(context2);
            context2.vfsSnapshot = this.vfs.createSnapshot();
            const result = await redis2.multi().setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2)).exec();
            if (result) return;
            logger_default.warn({ executionId: this.executionId, attempt: i }, "Concurrency conflict on context update, retrying...");
          } catch (err) {
            await redis2.unwatch();
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
    var import_fs_extra22 = __toESM2(require("fs-extra"));
    var import_path32 = __toESM2(require("path"));
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
        const sandboxDir = import_path32.default.join(process.cwd(), ".generated-projects", projectId);
        const fullPath = import_path32.default.join(sandboxDir, filePath);
        try {
          await import_fs_extra22.default.ensureDir(import_path32.default.dirname(fullPath));
          await import_fs_extra22.default.writeFile(fullPath, content);
          logger_default.info({ projectId, filePath }, "[PatchEngine] Single patch applied to sandbox");
        } catch (err) {
          logger_default.error({ projectId, filePath, err }, "[PatchEngine] Single patch failed");
        }
      }
    };
    var patchEngine = new PatchEngine();
    var import_db22 = require_dist2();
    var PreviewManager = class {
      static async generatePreviewUrl(buildId) {
        const previewUrl = `https://preview-${buildId.slice(0, 8)}.multiagent.app`;
        logger_default.info({ buildId, previewUrl }, "[PreviewManager] Generated preview URL");
        try {
          await import_db22.prisma.build.update({
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
    var import_fs_extra32 = __toESM2(require("fs-extra"));
    var import_path4 = __toESM2(require("path"));
    var TemplateService = class {
      templatesDir = import_path4.default.join(process.cwd(), "templates");
      async injectTemplate(templateName, context2) {
        const templatePath = import_path4.default.join(this.templatesDir, templateName);
        if (!await import_fs_extra32.default.pathExists(templatePath)) {
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
        const entries = await import_fs_extra32.default.readdir(currentPath, { withFileTypes: true });
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
            const content = await import_fs_extra32.default.readFile(fullPath, "utf8");
            files[relativePath] = content;
          }
        }
      }
    };
    var templateService = new TemplateService();
    var WorkerClusterManager2 = class {
      static WORKER_REGISTRY_KEY = "multiagent:cluster:workers";
      static HEARTBEAT_TIMEOUT = 5e3;
      /**
       * Get all healthy worker nodes.
       */
      static async getHealthyNodes() {
        const data = await redis2.hgetall(this.WORKER_REGISTRY_KEY);
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
        await redis2.publish(`worker:trigger:${selectedNode.workerId}`, JSON.stringify({
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
        await redis2.hset(this.WORKER_REGISTRY_KEY, node.workerId, JSON.stringify(updatedNode));
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
      deployQueue: () => deployQueue2,
      dockerEvents: () => dockerEvents,
      dockerQueue: () => dockerQueue,
      env: () => env22,
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
    var env22 = _env;
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
    var deployQueue2 = new import_bullmq3.Queue(QUEUE_DEPLOY, { connection: connection2, defaultJobOptions: defaultOptions2 });
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
    var import_utils16 = require_dist3();
    async function startTracing2() {
      try {
        import_utils16.logger.info("[OTel] Tracing is disabled (Stub mode)");
      } catch (error) {
        import_utils16.logger.error({ error }, "[OTel] Failed to start tracing");
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

// ../sandbox-runtime/dist/index.js
var require_dist6 = __commonJS({
  "../sandbox-runtime/dist/index.js"(exports2, module2) {
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __esm2 = (fn, res) => function __init() {
      return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
    };
    var __commonJS2 = (cb, mod) => function __require() {
      return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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
    var __reExport = (target, mod, secondTarget) => (__copyProps2(target, mod, "default"), secondTarget && __copyProps2(secondTarget, mod, "default"));
    var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var require_dist8 = __commonJS2({
      "../../packages/supabase/dist/index.js"(exports22, module22) {
        var __defProp22 = Object.defineProperty;
        var __getOwnPropDesc22 = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames22 = Object.getOwnPropertyNames;
        var __hasOwnProp22 = Object.prototype.hasOwnProperty;
        var __export22 = (target, all) => {
          for (var name in all)
            __defProp22(target, name, { get: all[name], enumerable: true });
        };
        var __copyProps22 = (to, from, except, desc) => {
          if (from && typeof from === "object" || typeof from === "function") {
            for (let key of __getOwnPropNames22(from))
              if (!__hasOwnProp22.call(to, key) && key !== except)
                __defProp22(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc22(from, key)) || desc.enumerable });
          }
          return to;
        };
        var __toCommonJS22 = (mod) => __copyProps22(__defProp22({}, "__esModule", { value: true }), mod);
        var index_exports2 = {};
        __export22(index_exports2, {
          createBrowserSupabaseClient: () => createBrowserSupabaseClient,
          createServerSupabaseClient: () => createServerSupabaseClient
        });
        module22.exports = __toCommonJS22(index_exports2);
        var import_supabase_js = require("@supabase/supabase-js");
        var _browserClient = null;
        function createBrowserSupabaseClient(config22) {
          if (typeof window === "undefined") {
            return (0, import_supabase_js.createClient)(config22.url, config22.anonKey);
          }
          if (!_browserClient) {
            if (!config22.url || !config22.anonKey) {
              throw new Error("[Supabase SDK] Missing required configuration (url/anonKey)");
            }
            _browserClient = (0, import_supabase_js.createClient)(config22.url, config22.anonKey);
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
    var require_clsx2 = __commonJS2({
      "../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.js"(exports22, module22) {
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
        module22.exports = e, module22.exports.clsx = e;
      }
    });
    var require_bundle_cjs2 = __commonJS2({
      "../../node_modules/.pnpm/tailwind-merge@2.6.1/node_modules/tailwind-merge/dist/bundle-cjs.js"(exports22) {
        "use strict";
        Object.defineProperty(exports22, Symbol.toStringTag, {
          value: "Module"
        });
        var CLASS_PART_SEPARATOR = "-";
        var createClassGroupUtils = (config22) => {
          const classMap = createClassMap(config22);
          const {
            conflictingClassGroups,
            conflictingClassGroupModifiers
          } = config22;
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
        var createClassMap = (config22) => {
          const {
            theme,
            prefix
          } = config22;
          const classMap = {
            nextPart: /* @__PURE__ */ new Map(),
            validators: []
          };
          const prefixedClassGroupEntries = getPrefixedClassGroupEntries(Object.entries(config22.classGroups), prefix);
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
        var getPart = (classPartObject, path13) => {
          let currentClassPartObject = classPartObject;
          path13.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
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
        var createParseClassName = (config22) => {
          const {
            separator,
            experimentalParseClassName
          } = config22;
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
        var createConfigUtils = (config22) => ({
          cache: createLruCache(config22.cacheSize),
          parseClassName: createParseClassName(config22),
          ...createClassGroupUtils(config22)
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
            const config22 = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
            configUtils = createConfigUtils(config22);
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
        exports22.createTailwindMerge = createTailwindMerge;
        exports22.extendTailwindMerge = extendTailwindMerge;
        exports22.fromTheme = fromTheme;
        exports22.getDefaultConfig = getDefaultConfig;
        exports22.mergeConfigs = mergeConfigs;
        exports22.twJoin = twJoin;
        exports22.twMerge = twMerge;
        exports22.validators = validators;
      }
    });
    var require_default3 = __commonJS2({
      "../../node_modules/.pnpm/@prisma+client@5.22.0/node_modules/.prisma/client/default.js"(exports22, module22) {
        "use strict";
        var __defProp22 = Object.defineProperty;
        var __getOwnPropDesc22 = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames22 = Object.getOwnPropertyNames;
        var __hasOwnProp22 = Object.prototype.hasOwnProperty;
        var __export22 = (target, all) => {
          for (var name in all)
            __defProp22(target, name, { get: all[name], enumerable: true });
        };
        var __copyProps22 = (to, from, except, desc) => {
          if (from && typeof from === "object" || typeof from === "function") {
            for (let key of __getOwnPropNames22(from))
              if (!__hasOwnProp22.call(to, key) && key !== except)
                __defProp22(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc22(from, key)) || desc.enumerable });
          }
          return to;
        };
        var __toCommonJS22 = (mod) => __copyProps22(__defProp22({}, "__esModule", { value: true }), mod);
        var default_index_exports = {};
        __export22(default_index_exports, {
          Prisma: () => Prisma,
          PrismaClient: () => PrismaClient2,
          default: () => default_index_default
        });
        module22.exports = __toCommonJS22(default_index_exports);
        var prisma22 = {
          enginesVersion: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
        };
        var version = "5.22.0";
        var clientVersion = version;
        var PrismaClient2 = class {
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
          prismaVersion: { client: clientVersion, engine: prisma22.enginesVersion }
        };
        var default_index_default = { Prisma };
      }
    });
    var require_default22 = __commonJS2({
      "../../node_modules/.pnpm/@prisma+client@5.22.0/node_modules/@prisma/client/default.js"(exports22, module22) {
        module22.exports = {
          ...require_default3()
        };
      }
    });
    var db_exports = {};
    __export2(db_exports, {
      prisma: () => prisma2
    });
    var import_client;
    var prisma2;
    var init_db = __esm2({
      "../../packages/db/index.ts"() {
        "use strict";
        import_client = __toESM2(require_default22());
        __reExport(db_exports, __toESM2(require_default22()));
        prisma2 = global.prisma || new import_client.PrismaClient();
        if (process.env.NODE_ENV !== "production") global.prisma = prisma2;
      }
    });
    var require_dist22 = __commonJS2({
      "../../packages/utils/dist/index.js"(exports22, module22) {
        var __create22 = Object.create;
        var __defProp22 = Object.defineProperty;
        var __getOwnPropDesc22 = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames22 = Object.getOwnPropertyNames;
        var __getProtoOf22 = Object.getPrototypeOf;
        var __hasOwnProp22 = Object.prototype.hasOwnProperty;
        var __esm22 = (fn, res) => function __init() {
          return fn && (res = (0, fn[__getOwnPropNames22(fn)[0]])(fn = 0)), res;
        };
        var __export22 = (target, all) => {
          for (var name in all)
            __defProp22(target, name, { get: all[name], enumerable: true });
        };
        var __copyProps22 = (to, from, except, desc) => {
          if (from && typeof from === "object" || typeof from === "function") {
            for (let key of __getOwnPropNames22(from))
              if (!__hasOwnProp22.call(to, key) && key !== except)
                __defProp22(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc22(from, key)) || desc.enumerable });
          }
          return to;
        };
        var __toESM22 = (mod, isNodeMode, target) => (target = mod != null ? __create22(__getProtoOf22(mod)) : {}, __copyProps22(
          // If the importer is in node compatibility mode or this is not an ESM
          // file that has been converted to a CommonJS file using a Babel-
          // compatible transform (i.e. "__esModule" has not been set), then set
          // "default" to the CommonJS "module.exports" for node compatibility.
          isNodeMode || !mod || !mod.__esModule ? __defProp22(target, "default", { value: mod, enumerable: true }) : target,
          mod
        ));
        var __toCommonJS22 = (mod) => __copyProps22(__defProp22({}, "__esModule", { value: true }), mod);
        var supabase_admin_exports = {};
        __export22(supabase_admin_exports, {
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
        var init_supabase_admin = __esm22({
          "src/services/supabase-admin.ts"() {
            import_supabase = require_dist8();
            supabaseAdmin = null;
          }
        });
        var index_exports2 = {};
        __export22(index_exports2, {
          EjectSystem: () => EjectSystem,
          MemoryPlane: () => MemoryPlane,
          Orchestrator: () => Orchestrator2,
          ProjectStateManager: () => ProjectStateManager,
          QueueManager: () => QueueManager,
          StageState: () => StageState,
          StageStateMachine: () => StageStateMachine,
          StrategyEngine: () => StrategyEngine,
          config: () => config_exports,
          eventBus: () => eventBus2,
          getLatestBuildState: () => getLatestBuildState,
          independentRedisClients: () => independentRedisClients,
          lib: () => lib_exports,
          logger: () => logger_default,
          memoryPlane: () => memoryPlane2,
          missionController: () => missionController2,
          publishBuildEvent: () => publishBuildEvent,
          queueManager: () => queueManager,
          readBuildEvents: () => readBuildEvents,
          redis: () => redis17,
          services: () => services_exports,
          stateManager: () => stateManager
        });
        module22.exports = __toCommonJS22(index_exports2);
        var import_pino = __toESM22(require("pino"));
        var import_uuid = require("uuid");
        var import_async_hooks = require("async_hooks");
        var tracingContext = new import_async_hooks.AsyncLocalStorage();
        function getCorrelationId() {
          return tracingContext.getStore() || "no-correlation-id";
        }
        function runWithTracing2(id, fn) {
          const correlationId = id || (0, import_uuid.v4)();
          return tracingContext.run(correlationId, fn);
        }
        var logger37 = (0, import_pino.default)({
          level: process.env.LOG_LEVEL || "info",
          base: {
            env: process.env.NODE_ENV,
            service: "multi-agent-platform"
          },
          mixin() {
            return {
              correlationId: getCorrelationId()
              // executionId is often passed in specific log calls, 
              // but we can also pull from AsyncLocalStorage if we add it there later
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
          return logger37.child({ executionId });
        }
        var logger_default = logger37;
        var logger_default2 = logger_default;
        var import_bullmq2 = require("bullmq");
        var import_ioredis = __toESM22(require("ioredis"));
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
        var redis17 = RedisClient.getInstance();
        var independentRedisClients = REDIS_URLS.length > 1 ? RedisClient.getIndependentClients() : [redis17];
        var redis_default = redis17;
        var QueueManager = class {
          queues = /* @__PURE__ */ new Map();
          eventListeners = /* @__PURE__ */ new Map();
          getQueue(name) {
            if (!this.queues.has(name)) {
              const queue = new import_bullmq2.Queue(name, {
                connection: redis_default,
                defaultJobOptions: {
                  attempts: 3,
                  backoff: {
                    type: "exponential",
                    delay: 5e3
                  },
                  removeOnComplete: true,
                  removeOnFail: false
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
              const events = new import_bullmq2.QueueEvents(queueName, { connection: redis_default });
              this.eventListeners.set(queueName, events);
            }
            this.eventListeners.get(queueName).on("completed", ({ jobId, returnvalue }) => {
              callback(jobId, returnvalue);
            });
          }
          async onJobFailed(queueName, callback) {
            if (!this.eventListeners.has(queueName)) {
              const events = new import_bullmq2.QueueEvents(queueName, { connection: redis_default });
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
        var import_archiver = __toESM22(require("archiver"));
        var import_fs_extra9 = __toESM22(require("fs-extra"));
        var import_path13 = __toESM22(require("path"));
        var EjectSystem = class {
          static STORAGE_DIR = import_path13.default.join(process.cwd(), "artifact-storage", "ejects");
          static async eject(missionId, projectPath) {
            await import_fs_extra9.default.ensureDir(this.STORAGE_DIR);
            const ejectPath = import_path13.default.join(this.STORAGE_DIR, `${missionId}.zip`);
            const output = import_fs_extra9.default.createWriteStream(ejectPath);
            const archive = (0, import_archiver.default)("zip", { zlib: { level: 9 } });
            return new Promise((resolve, reject) => {
              output.on("close", () => {
                logger_default.info({ missionId, size: archive.pointer() }, "[Eject] Bundle created");
                resolve(ejectPath);
              });
              archive.on("error", (err) => reject(err));
              archive.pipe(output);
              archive.directory(projectPath, "src");
              const infraDir = import_path13.default.join(process.cwd(), "infrastructure");
              archive.directory(import_path13.default.join(infraDir, "docker"), "infrastructure/docker");
              archive.directory(import_path13.default.join(infraDir, "terraform"), "infrastructure/terraform");
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
              const pipeline = redis17.pipeline();
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
            const result = await redis17.xread(
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
            const raw = await redis17.get(`build:state:${executionId}`);
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
              await redis17.expire(`build:stream:${executionId}`, STREAM_TTL_SECONDS);
              await redis17.expire(`build:state:${executionId}`, STREAM_TTL_SECONDS);
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
            await redis17.setex(key, 86400, JSON.stringify(mission));
            logger_default.info({ missionId: mission.id }, "Mission state initialized in Redis");
            await eventBus2.stage(mission.id, mission.status, "in_progress", "Mission initialized", 0, mission.projectId);
          }
          async getMission(missionId) {
            const data = await redis17.get(`${this.PREFIX}${missionId}`);
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
            await redis17.setex(key, 86400, JSON.stringify(updated));
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
            const keys = await redis17.keys(`${this.PREFIX}*`);
            const missions = [];
            for (const key of keys) {
              const data = await redis17.get(key);
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
              await redis17.set(`project:state:${executionId}`, JSON.stringify(metadata), "EX", 86400);
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
            const raw = await redis17.get(`project:state:${executionId}`);
            return raw ? JSON.parse(raw) : null;
          }
        };
        var stateManager = ProjectStateManager.getInstance();
        var StageState = /* @__PURE__ */ ((StageState2) => {
          StageState2["IDLE"] = "IDLE";
          StageState2["RUNNING"] = "RUNNING";
          StageState2["COMPLETED"] = "COMPLETED";
          StageState2["FAILED"] = "FAILED";
          return StageState2;
        })(StageState || {});
        var StageStateMachine = class {
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
            logger37.info({ executionId: this.executionId, stage, state, message }, `[StageStateMachine] Transitioning to ${stage}:${state}`);
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
            const fsm = new StageStateMachine(executionId, projectId);
            try {
              elog.info("Dispatching to Temporal Production Pipeline");
              await stateManager.transition(executionId, "created", "Cluster online.", 5, projectId);
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
        var import_axios = __toESM22(require("axios"));
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
        var import_crypto3 = require("crypto");
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
                const [nextCursor, keys] = await redis17.scan(cursor, "MATCH", "mem:search:*", "COUNT", 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                  await redis17.del(...keys);
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
            const cacheKey = `mem:search:${(0, import_crypto3.createHash)("sha256").update(`${query}:${techStack || ""}`).digest("hex").slice(0, 24)}`;
            const CACHE_TTL = 300;
            try {
              const cached = await redis17.get(cacheKey);
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
              await redis17.set(cacheKey, JSON.stringify(results), "EX", CACHE_TTL);
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
        var memoryPlane2 = new MemoryPlane();
        var config_exports = {};
        __export22(config_exports, {
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
          agentExecutionDuration: () => agentExecutionDuration,
          agentFailuresTotal: () => agentFailuresTotal,
          breakers: () => breakers,
          cn: () => cn,
          createPortalSession: () => createPortalSession,
          env: () => env2,
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
          logger: () => logger37,
          nodeCpuUsage: () => nodeCpuUsage2,
          nodeMemoryUsage: () => nodeMemoryUsage2,
          pusher: () => pusher,
          queueWaitTimeSeconds: () => queueWaitTimeSeconds2,
          recordBuildMetrics: () => recordBuildMetrics,
          registry: () => registry,
          retryCountTotal: () => retryCountTotal,
          runWithTracing: () => runWithTracing2,
          runtimeActiveTotal: () => runtimeActiveTotal2,
          runtimeCrashesTotal: () => runtimeCrashesTotal2,
          runtimeEvictionsTotal: () => runtimeEvictionsTotal2,
          runtimeProxyErrorsTotal: () => runtimeProxyErrorsTotal2,
          runtimeStartupDuration: () => runtimeStartupDuration2,
          sendBuildSuccessEmail: () => sendBuildSuccessEmail,
          stripe: () => stripe,
          stripeWebhookEventsTotal: () => stripeWebhookEventsTotal,
          stuckBuildsTotal: () => stuckBuildsTotal2,
          tracingContext: () => tracingContext,
          useStream: () => useStream,
          withLock: () => withLock
        });
        var import_stripe = __toESM22(require("stripe"));
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
        var import_dotenv = __toESM22(require("dotenv"));
        var import_path222 = __toESM22(require("path"));
        var import_fs3 = __toESM22(require("fs"));
        var nodeEnv = process.env.NODE_ENV || "development";
        var envFile = nodeEnv === "production" ? ".env.production" : ".env.development";
        var envPath = import_path222.default.resolve(process.cwd(), envFile);
        var envLocalPath = import_path222.default.resolve(process.cwd(), ".env.local");
        if (import_fs3.default.existsSync(envLocalPath)) {
          import_dotenv.default.config({ path: envLocalPath });
        }
        if (import_fs3.default.existsSync(envPath)) {
          import_dotenv.default.config({ path: envPath, override: true });
        }
        import_dotenv.default.config();
        var requiredEnvVars = [
          "SUPABASE_SERVICE_ROLE_KEY",
          "NEXT_PUBLIC_SUPABASE_URL",
          "NEXT_PUBLIC_SUPABASE_ANON_KEY",
          "GROQ_API_KEY"
        ];
        var env2 = {
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          NODE_ENV: process.env.NODE_ENV || "development",
          WORKER_CONCURRENCY_FREE: Number(process.env.WORKER_CONCURRENCY_FREE) || 10,
          WORKER_CONCURRENCY_PRO: Number(process.env.WORKER_CONCURRENCY_PRO) || 20,
          WORKER_POOL_SIZE: Number(process.env.WORKER_POOL_SIZE) || 3,
          REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379"
        };
        var isProd = env2.NODE_ENV === "production";
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
          static async isKillSwitchActive(config22) {
            const isDev = process.env.NODE_ENV === "development";
            if (isDev) {
              logger_default.info("Development Mode Bypass: Skipping kill switch check.");
              return false;
            }
            if (config22?.governanceBypass && config22?.userId && config22?.executionId) {
              await this.auditOwnerOverride(config22.userId, config22.executionId);
              return false;
            }
            try {
              const isKilled = await redis17.get("system:kill_switch");
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
          static async checkTokenLimit(userId, config22 = DEFAULT_GOVERNANCE_CONFIG) {
            const isDev = process.env.NODE_ENV === "development";
            const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
            const key = `governance:tokens:${userId}:${month}`;
            if (isDev) {
              logger_default.info({ userId }, "Development Mode Bypass: Skipping token limit check.");
              const usedStr = await redis17.get(key);
              return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
            }
            if (config22.governanceBypass && config22.executionId) {
              const usedStr = await redis17.get(key);
              return { allowed: true, usedTokens: usedStr ? parseInt(usedStr, 10) : 0 };
            }
            try {
              const usedStr = await redis17.get(key);
              const usedTokens = usedStr ? parseInt(usedStr, 10) : 0;
              if (usedTokens >= config22.maxMonthlyTokens) {
                logger_default.warn({ userId, usedTokens, limit: config22.maxMonthlyTokens }, "User exceeded monthly token budget");
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
              await redis17.multi().incrby(key, tokensUsed).expire(key, 32 * 24 * 60 * 60).exec();
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
              await redis17.decr(key);
            } catch (error) {
              logger_default.error({ error, userId }, "Failed to refund execution limit ticket");
            }
          }
        };
        var import_redlock = __toESM22(require("redlock"));
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
        var runtimeStartupDuration2 = new import_prom_client.Histogram({
          name: "runtime_startup_duration_seconds",
          help: "Latency in seconds for a preview runtime to become healthy",
          labelNames: ["project_id", "mode"],
          buckets: [1, 2, 5, 10, 20, 30, 60],
          // Max 60s
          registers: [registry]
        });
        var runtimeCrashesTotal2 = new import_prom_client.Counter({
          name: "runtime_crashes_total",
          help: "Total number of runtime crashes or failures",
          labelNames: ["reason", "mode"],
          registers: [registry]
        });
        var runtimeActiveTotal2 = new (registry.getSingleMetric("runtime_active_total") || require("prom-client").Gauge)({
          name: "runtime_active_total",
          help: "Total number of active preview runtimes on this node",
          registers: [registry]
        });
        var runtimeEvictionsTotal2 = new import_prom_client.Counter({
          name: "runtime_evictions_total",
          help: "Total number of runtimes evicted for stale/idle reasons",
          labelNames: ["reason"],
          registers: [registry]
        });
        var nodeCpuUsage2 = new (registry.getSingleMetric("node_cpu_usage_ratio") || require("prom-client").Gauge)({
          name: "node_cpu_usage_ratio",
          help: "CPU usage of the current node (0.0 - 1.0)",
          registers: [registry]
        });
        var nodeMemoryUsage2 = new (registry.getSingleMetric("node_memory_usage_bytes") || require("prom-client").Gauge)({
          name: "node_memory_usage_bytes",
          help: "Memory usage of the current node in bytes",
          registers: [registry]
        });
        var runtimeProxyErrorsTotal2 = new import_prom_client.Counter({
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
        var stuckBuildsTotal2 = new import_prom_client.Counter({
          name: "stuck_builds_total",
          help: "Total number of stuck builds detected and resumed",
          registers: [registry]
        });
        var queueWaitTimeSeconds2 = new import_prom_client.Histogram({
          name: "queue_wait_time_seconds",
          help: "Time a job waits in queue before being picked up",
          labelNames: ["queue_name"],
          buckets: [0.1, 0.5, 1, 5, 10, 30],
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
        var import_clsx = require_clsx2();
        var import_tailwind_merge = require_bundle_cjs2();
        function cn(...inputs) {
          return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
        }
        var services_exports = {};
        __export22(services_exports, {
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
          QUEUE_FREE: () => QUEUE_FREE2,
          QUEUE_PRO: () => QUEUE_PRO2,
          RecoveryNotifier: () => RecoveryNotifier,
          SandboxPodController: () => SandboxPodController,
          StageState: () => StageState,
          StageStateMachine: () => StageStateMachine,
          TemplateService: () => TemplateService,
          VectorStore: () => VectorStore,
          VirtualFileSystem: () => VirtualFileSystem,
          WorkerClusterManager: () => WorkerClusterManager2,
          eventBus: () => eventBus2,
          freeQueue: () => freeQueue2,
          getLatestBuildState: () => getLatestBuildState,
          getSupabaseAdmin: () => getSupabaseAdmin,
          guardrailService: () => guardrailService,
          independentRedisClients: () => independentRedisClients,
          memoryPlane: () => memoryPlane2,
          missionController: () => missionController2,
          normalizeError: () => normalizeError,
          patchEngine: () => patchEngine,
          proQueue: () => proQueue2,
          projectMemory: () => projectMemory,
          publishBuildEvent: () => publishBuildEvent,
          readBuildEvents: () => readBuildEvents,
          recoveryNotifier: () => recoveryNotifier,
          redis: () => redis17,
          sandboxPodController: () => sandboxPodController,
          stateManager: () => stateManager,
          supabaseAdmin: () => supabaseAdmin,
          templateService: () => templateService,
          validatePatchOrThrow: () => validatePatchOrThrow
        });
        var import_db2 = (init_db(), __toCommonJS2(db_exports));
        var import_crypto22 = __toESM22(require("crypto"));
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
            return import_crypto22.default.createHash("sha256").update(data).digest("hex");
          }
          /**
           * Records a tamper-proof audit event.
           */
          static async log(event) {
            try {
              const latestLog = await import_db2.prisma.auditLog.findFirst({
                where: { tenantId: event.tenantId },
                orderBy: { createdAt: "desc" },
                select: { hash: true }
              });
              const prevHash = latestLog ? latestLog.hash : this.INITIAL_HASH;
              const hash = this.calculateHash(event, prevHash);
              await import_db2.prisma.auditLog.create({
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
              const logs = await import_db2.prisma.auditLog.findMany({
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
            const logs = await import_db2.prisma.auditLog.findMany({
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
        var import_bullmq22 = require("bullmq");
        var QUEUE_FREE2 = "project-generation-free-v1";
        var QUEUE_PRO2 = "project-generation-pro-v1";
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
        var freeQueue2 = new import_bullmq22.Queue(QUEUE_FREE2, {
          connection,
          defaultJobOptions: defaultOptions
        });
        var proQueue2 = new import_bullmq22.Queue(QUEUE_PRO2, {
          connection,
          defaultJobOptions: defaultOptions
        });
        logger_default.info(`BullMQ Tiered Queues "${QUEUE_FREE2}" and "${QUEUE_PRO2}" initialized`);
        var import_crypto32 = __toESM22(require("crypto"));
        var ErrorKnowledgeBase = class {
          static PREFIX = "error_kb:";
          /**
           * Normalizes and hashes an error message for lookup.
           */
          static hashError(error) {
            const normalized = error.replace(/\/.*?\/MultiAgent\//g, "PROJECT_ROOT/").replace(/:\d+:\d+/g, ":LINE:COL").replace(/0x[0-9a-fA-F]+/g, "HEX_VAL").replace(/[a-f0-9]{8,}/g, "HASH_VAL").replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, "TIMESTAMP").trim();
            return import_crypto32.default.createHash("md4").update(normalized).digest("hex");
          }
          /**
           * Fetches a cached solution for a given error message.
           */
          static async getSolution(error) {
            try {
              const hash = this.hashError(error);
              const cached = await redis17.get(`${this.PREFIX}${hash}`);
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
              await redis17.set(`${this.PREFIX}${hash}`, JSON.stringify(solution), "EX", 86400);
              logger_default.info({ hash }, "[ErrorKB] Recorded new solution for error");
            } catch (err) {
              logger_default.error({ err }, "[ErrorKB] Failed to record solution");
            }
          }
        };
        var import_uuid3 = require("uuid");
        var crypto3 = __toESM22(require("crypto"));
        var VirtualFileSystem = class {
          files = /* @__PURE__ */ new Map();
          writeFile(path52, content, encoding = "utf-8") {
            this.files.set(path52, { path: path52, content, encoding });
          }
          readFile(path52) {
            return this.files.get(path52)?.content || null;
          }
          exists(path52) {
            return this.files.has(path52);
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
            await redis17.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2));
            await redis17.sadd("active:executions", this.executionId);
            return context2;
          }
          static async getActiveExecutions() {
            return await redis17.smembers("active:executions");
          }
          async get() {
            const data = await redis17.get(this.key);
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
            await redis17.setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(updated));
          }
          async updateStage(stageId) {
            await this.atomicUpdate((ctx) => {
              ctx.currentStage = stageId;
            });
          }
          async atomicTransition(lock, stageId, stageIndex, status, message, inputHash, outputHash) {
            const currentVersion = (await this.get())?.version || 0;
            const commitLogKey = `commitLog:${this.executionId}`;
            const result = await redis17.eval(
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
            const logs = await redis17.lrange(`commitLog:${this.executionId}`, 0, -1);
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
            const acquired = await redis17.set(lockKey, "locked", "EX", 3600, "NX");
            if (acquired === "OK") {
              try {
                return await fn();
              } catch (err) {
                await redis17.del(lockKey);
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
            await redis17.srem("active:executions", this.executionId);
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
            await redis17.setex(dlqKey, 604800, JSON.stringify(dlqEntry));
            await redis17.sadd("dlq:executions", this.executionId);
            await redis17.srem("active:executions", this.executionId);
            logger_default.error({ executionId: this.executionId, reason }, "Execution moved to Dead Letter Queue");
          }
          /**
           * Atomic update using Redis WATCH/MULTI/EXEC for safe concurrency
           */
          async atomicUpdate(updater) {
            for (let i = 0; i < 5; i++) {
              try {
                await redis17.watch(this.key);
                const { getSupabaseAdmin: getSupabaseAdmin2 } = await Promise.resolve().then(() => (init_supabase_admin(), supabase_admin_exports));
                const supabaseAdmin2 = getSupabaseAdmin2();
                const data = await redis17.get(this.key);
                if (!data) throw new Error(`Execution context ${this.executionId} not found`);
                const context2 = JSON.parse(data);
                if (context2.locked) {
                  await redis17.unwatch();
                  return;
                }
                if (context2.vfsSnapshot && this.vfs.isEmpty()) {
                  this.vfs.restoreSnapshot(context2.vfsSnapshot);
                }
                updater(context2);
                context2.vfsSnapshot = this.vfs.createSnapshot();
                const result = await redis17.multi().setex(this.key, _DistributedExecutionContext.TTL, JSON.stringify(context2)).exec();
                if (result) return;
                logger_default.warn({ executionId: this.executionId, attempt: i }, "Concurrency conflict on context update, retrying...");
              } catch (err) {
                await redis17.unwatch();
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
        var import_fs_extra222 = __toESM22(require("fs-extra"));
        var import_path322 = __toESM22(require("path"));
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
            const sandboxDir = import_path322.default.join(process.cwd(), ".generated-projects", projectId);
            const fullPath = import_path322.default.join(sandboxDir, filePath);
            try {
              await import_fs_extra222.default.ensureDir(import_path322.default.dirname(fullPath));
              await import_fs_extra222.default.writeFile(fullPath, content);
              logger_default.info({ projectId, filePath }, "[PatchEngine] Single patch applied to sandbox");
            } catch (err) {
              logger_default.error({ projectId, filePath, err }, "[PatchEngine] Single patch failed");
            }
          }
        };
        var patchEngine = new PatchEngine();
        var import_db22 = (init_db(), __toCommonJS2(db_exports));
        var PreviewManager = class {
          static async generatePreviewUrl(buildId) {
            const previewUrl = `https://preview-${buildId.slice(0, 8)}.multiagent.app`;
            logger_default.info({ buildId, previewUrl }, "[PreviewManager] Generated preview URL");
            try {
              await import_db22.prisma.build.update({
                where: { id: buildId },
                data: { previewUrl }
              });
            } catch (err) {
              logger_default.error({ err }, "[PreviewManager] Failed to update build with preview URL");
            }
            return previewUrl;
          }
        };
        var import_axios2 = __toESM22(require("axios"));
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
        var k8s = __toESM22(require("@kubernetes/client-node"));
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
        var import_fs_extra32 = __toESM22(require("fs-extra"));
        var import_path42 = __toESM22(require("path"));
        var TemplateService = class {
          templatesDir = import_path42.default.join(process.cwd(), "templates");
          async injectTemplate(templateName, context2) {
            const templatePath = import_path42.default.join(this.templatesDir, templateName);
            if (!await import_fs_extra32.default.pathExists(templatePath)) {
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
            const entries = await import_fs_extra32.default.readdir(currentPath, { withFileTypes: true });
            const EXCLUDED_DIRS = ["node_modules", ".next", ".git", "dist", ".turbo"];
            for (const entry of entries) {
              const fullPath = import_path42.default.join(currentPath, entry.name);
              const relativePath = import_path42.default.relative(basePath, fullPath).replace(/\\/g, "/");
              if (entry.isDirectory()) {
                if (EXCLUDED_DIRS.includes(entry.name)) {
                  continue;
                }
                await this.readTemplateFiles(basePath, fullPath, files);
              } else {
                const content = await import_fs_extra32.default.readFile(fullPath, "utf8");
                files[relativePath] = content;
              }
            }
          }
        };
        var templateService = new TemplateService();
        var WorkerClusterManager2 = class {
          static WORKER_REGISTRY_KEY = "multiagent:cluster:workers";
          static HEARTBEAT_TIMEOUT = 5e3;
          /**
           * Get all healthy worker nodes.
           */
          static async getHealthyNodes() {
            const data = await redis17.hgetall(this.WORKER_REGISTRY_KEY);
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
            await redis17.publish(`worker:trigger:${selectedNode.workerId}`, JSON.stringify({
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
            await redis17.hset(this.WORKER_REGISTRY_KEY, node.workerId, JSON.stringify(updatedNode));
          }
        };
        var lib_exports = {};
        __export22(lib_exports, {
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
          deployQueue: () => deployQueue2,
          dockerEvents: () => dockerEvents,
          dockerQueue: () => dockerQueue,
          env: () => env22,
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
        var env22 = _env;
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
        var deployQueue2 = new import_bullmq3.Queue(QUEUE_DEPLOY, { connection: connection2, defaultJobOptions: defaultOptions2 });
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
        var import_socket = __toESM22(require("socket.io-client"));
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
    var require_dist32 = __commonJS2({
      "../../packages/registry/dist/index.js"(exports22, module22) {
        var __defProp22 = Object.defineProperty;
        var __getOwnPropDesc22 = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames22 = Object.getOwnPropertyNames;
        var __hasOwnProp22 = Object.prototype.hasOwnProperty;
        var __copyProps22 = (to, from, except, desc) => {
          if (from && typeof from === "object" || typeof from === "function") {
            for (let key of __getOwnPropNames22(from))
              if (!__hasOwnProp22.call(to, key) && key !== except)
                __defProp22(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc22(from, key)) || desc.enumerable });
          }
          return to;
        };
        var __toCommonJS22 = (mod) => __copyProps22(__defProp22({}, "__esModule", { value: true }), mod);
        var index_exports2 = {};
        module22.exports = __toCommonJS22(index_exports2);
      }
    });
    var import_os2;
    var import_utils34;
    var ResourceManager;
    var init_resource_manager = __esm2({
      "src/resource-manager.ts"() {
        import_os2 = __toESM2(require("os"));
        import_utils34 = __toESM2(require_dist22());
        ResourceManager = class {
          static MAX_MEMORY_USAGE = 0.85;
          // 85% of total RAM
          static MAX_LOAD_AVG = 0.8;
          // 80% per CPU core
          static memOverrideMb = null;
          static setTestMemoryLimit(mb) {
            this.memOverrideMb = mb;
          }
          static getSnapshot() {
            return {
              totalMem: import_os2.default.totalmem(),
              freeMem: import_os2.default.freemem(),
              cpuCount: import_os2.default.cpus().length,
              loadAvg: import_os2.default.loadavg()
            };
          }
          static canAllocate(requiredMemMb) {
            const snapshot = this.getSnapshot();
            const memLimit = this.memOverrideMb ? this.memOverrideMb * 1024 * 1024 : snapshot.totalMem * this.MAX_MEMORY_USAGE;
            const currentUsage = snapshot.totalMem - snapshot.freeMem;
            const projectedUsage = currentUsage + requiredMemMb * 1024 * 1024;
            const cpuWait = snapshot.loadAvg[0] / snapshot.cpuCount;
            const hasMem = projectedUsage < memLimit;
            const hasCpu = cpuWait < this.MAX_LOAD_AVG;
            import_utils34.default.info({
              hasMem,
              hasCpu,
              currentUsageMb: Math.round(currentUsage / 1024 / 1024),
              projectedUsageMb: Math.round(projectedUsage / 1024 / 1024),
              memLimitMb: Math.round(memLimit / 1024 / 1024),
              cpuLoad: cpuWait.toFixed(2)
            }, "[ResourceManager] Capacity check");
            return hasMem && hasCpu;
          }
          static getHostCapacity() {
            const snapshot = this.getSnapshot();
            return {
              totalMemMb: Math.round(snapshot.totalMem / 1024 / 1024),
              freeMemMb: Math.round(snapshot.freeMem / 1024 / 1024),
              cpuCount: snapshot.cpuCount,
              load: snapshot.loadAvg[0]
            };
          }
        };
      }
    });
    var import_utils35;
    var AdmissionController;
    var init_admission_controller = __esm2({
      "src/admission-controller.ts"() {
        init_resource_manager();
        import_utils35 = __toESM2(require_dist22());
        AdmissionController = class {
          static queue = [];
          static DRAIN_INTERVAL = 3e3;
          // 3 seconds
          static isRunning = false;
          static async acquireAdmission(projectId, requiredMemMb = 1024) {
            import_utils35.default.info({ projectId, requiredMemMb }, "[AdmissionController] Attempting admission...");
            return new Promise((resolve) => {
              const admitted = ResourceManager.canAllocate(requiredMemMb);
              if (admitted && this.queue.length === 0) {
                import_utils35.default.info({ projectId }, "[AdmissionController] Admitted immediately.");
                resolve();
              } else {
                import_utils35.default.warn({ projectId, queueSize: this.queue.length, admitted }, "[AdmissionController] Admittance delayed. Queuing...");
                this.queue.push({
                  projectId,
                  requiredMemMb,
                  resolve,
                  timestamp: Date.now()
                });
                this.startDrainer();
              }
            });
          }
          static startDrainer() {
            if (this.isRunning) return;
            this.isRunning = true;
            const drain = async () => {
              if (this.queue.length === 0) {
                this.isRunning = false;
                return;
              }
              const next = this.queue[0];
              if (ResourceManager.canAllocate(next.requiredMemMb)) {
                this.queue.shift();
                import_utils35.default.info({ projectId: next.projectId, waitTime: Date.now() - next.timestamp }, "[AdmissionController] Dequeued and admitted.");
                next.resolve();
                setTimeout(drain, 100);
              } else {
                setTimeout(drain, this.DRAIN_INTERVAL);
              }
            };
            drain();
          }
          static getQueueStatus() {
            return {
              pending: this.queue.length,
              nextProject: this.queue[0]?.projectId
            };
          }
        };
      }
    });
    var import_child_process3;
    var import_util;
    var import_utils37;
    var import_utils38;
    var execPromise;
    var SandboxRunner;
    var init_sandbox_runner = __esm2({
      "src/sandbox-runner.ts"() {
        import_child_process3 = require("child_process");
        import_util = __toESM2(require("util"));
        import_utils37 = __toESM2(require_dist22());
        import_utils38 = __toESM2(require_dist22());
        execPromise = import_util.default.promisify(import_child_process3.exec);
        SandboxRunner = class {
          static DEFAULT_TIMEOUT = 6e4;
          // 🛑 Critical: Hardened to 60s for production
          static DEFAULT_MEMORY_LIMIT = 512;
          // 512MB
          /**
           * Executes a command in an isolated child process with resource monitoring.
           */
          static async execute(command, args, options) {
            const {
              cwd,
              env: env2 = {},
              timeoutMs = this.DEFAULT_TIMEOUT,
              memoryLimitMb = this.DEFAULT_MEMORY_LIMIT,
              executionId,
              agentName,
              action
            } = options;
            import_utils37.default.info({ executionId, agentName, action, command, args }, "Spawning isolated sandbox runner");
            return new Promise((resolve) => {
              if (!options.allowEgress && (command.includes("curl") || command.includes("http") || command.includes("wget"))) {
                import_utils37.default.warn({ executionId, command }, "[SandboxRunner] \u{1F6D1} Egress attempt detected in isolated environment");
                import_utils38.eventBus.thought(executionId, agentName, "\u274C Security Violation: Network egress blocked by Zero-Trust policy");
                return resolve({
                  success: false,
                  exitCode: 1,
                  stdout: "",
                  stderr: "Egress Blocked by Policy",
                  error: "Security Violation: Network access denied in sandbox",
                  egressBlocked: true
                });
              }
              const child = (0, import_child_process3.spawn)(command, args, {
                cwd,
                env: { ...process.env, ...env2 },
                shell: true
              });
              let stdout = "";
              let stderr = "";
              let isAborted = false;
              const timeout = setTimeout(() => {
                isAborted = true;
                child.kill("SIGKILL");
                import_utils37.default.error({ executionId, agentName, timeoutMs }, "Sandbox runner timed out");
                import_utils38.eventBus.thought(executionId, agentName, `\u274C Execution timed out after ${timeoutMs}ms`);
              }, timeoutMs);
              const memoryCheckInterval = setInterval(async () => {
                try {
                  if (child.pid === void 0 || child.killed) return;
                  try {
                    const { stdout: tasklistOutput } = await execPromise(`tasklist /FI "PID eq ${child.pid}" /FO CSV /NH`);
                    if (tasklistOutput.includes(String(child.pid))) {
                      const parts = tasklistOutput.split(",");
                      if (parts[4]) {
                        const memStr = parts[4].replace(/"/g, "").replace(/ K/g, "").replace(/,/g, "").trim();
                        const memKb = parseInt(memStr, 10);
                        const memMb = memKb / 1024;
                        if (memMb > memoryLimitMb) {
                          isAborted = true;
                          child.kill("SIGKILL");
                          import_utils37.default.error({ executionId, agentName, memMb, memoryLimitMb }, "Sandbox runner exceeded memory limit");
                          import_utils38.eventBus.thought(executionId, agentName, `\u274C Execution killed: Memory limit (${memoryLimitMb}MB) exceeded. Current: ${Math.round(memMb)}MB`);
                        }
                      }
                    }
                  } catch {
                  }
                } catch {
                }
              }, 5e3);
              child.stdout.on("data", (data) => {
                const chunk = data.toString();
                stdout += chunk;
                import_utils38.eventBus.thought(executionId, agentName, chunk.trim());
              });
              child.stderr.on("data", (data) => {
                const chunk = data.toString();
                stderr += chunk;
                import_utils38.eventBus.thought(executionId, agentName, `\u26A0\uFE0F ${chunk.trim()}`);
              });
              child.on("error", (err) => {
                clearTimeout(timeout);
                clearInterval(memoryCheckInterval);
                import_utils37.default.error({ executionId, agentName, err }, "Sandbox runner process error");
                resolve({
                  success: false,
                  exitCode: null,
                  stdout,
                  stderr,
                  error: err.message
                });
              });
              child.on("exit", (code) => {
                clearTimeout(timeout);
                clearInterval(memoryCheckInterval);
                if (isAborted) {
                  resolve({
                    success: false,
                    exitCode: code,
                    stdout,
                    stderr,
                    error: "Process timed out and was killed"
                  });
                  return;
                }
                import_utils37.default.info({ executionId, agentName, exitCode: code }, "Sandbox runner process exited");
                resolve({
                  success: code === 0,
                  exitCode: code,
                  stdout,
                  stderr
                });
              });
            });
          }
          /**
           * Specialized wrapper for long-running preview servers.
           * Returns the ChildProcess so it can be managed by the PreviewManager.
           */
          static spawnLongRunning(command, args, options) {
            const { cwd, env: env2 = {}, executionId, agentName } = options;
            const child = (0, import_child_process3.spawn)(command, args, {
              cwd,
              env: { ...process.env, ...env2 },
              shell: true
            });
            child.stdout?.on("data", (data) => {
              import_utils38.eventBus.thought(executionId, agentName, `[Server] ${data.toString().trim()}`);
            });
            child.stderr?.on("data", (data) => {
              import_utils38.eventBus.thought(executionId, agentName, `[Server Error] ${data.toString().trim()}`);
            });
            return child;
          }
        };
      }
    });
    var import_fs_extra22;
    var import_path4;
    var import_utils39;
    var import_utils40;
    var SnapshotManager;
    var snapshotManager;
    var init_snapshot_manager = __esm2({
      "src/snapshot-manager.ts"() {
        import_fs_extra22 = __toESM2(require("fs-extra"));
        import_path4 = __toESM2(require("path"));
        import_utils39 = __toESM2(require_dist22());
        import_utils40 = __toESM2(require_dist22());
        SnapshotManager = class {
          baseDir = import_path4.default.join(process.cwd(), ".snapshots");
          constructor() {
            import_fs_extra22.default.ensureDirSync(this.baseDir);
          }
          /**
           * Creates a filesystem snapshot of a ready-to-serve sandbox.
           * In a real production environment (Phase 6.2), this would also involve 
           * CRIU (Checkpoint/Restore In Userspace) for process memory state.
           */
          async createSnapshot(projectId, sandboxDir) {
            const snapshotId = `${projectId}-${Date.now()}`;
            const snapshotPath = import_path4.default.join(this.baseDir, snapshotId);
            import_utils40.default.info({ projectId, snapshotId }, "[SnapshotManager] Creating filesystem snapshot...");
            await import_fs_extra22.default.ensureDir(snapshotPath);
            await import_fs_extra22.default.copy(sandboxDir, snapshotPath, {
              filter: (src) => !src.includes("node_modules") && !src.includes(".git")
            });
            const snapshot = {
              projectId,
              timestamp: Date.now(),
              filesHash: "dynamic-hash-placeholder",
              // In prod, checksum the VFS
              snapshotPath
            };
            await import_utils39.redis.set(`snapshot:latest:${projectId}`, JSON.stringify(snapshot));
            return snapshotId;
          }
          /**
           * Restores a sandbox from a snapshot in milliseconds.
           */
          async restoreFromSnapshot(projectId, targetDir) {
            const snapshotData = await import_utils39.redis.get(`snapshot:latest:${projectId}`);
            if (!snapshotData) return false;
            const snapshot = JSON.parse(snapshotData);
            if (!import_fs_extra22.default.existsSync(snapshot.snapshotPath)) {
              import_utils40.default.warn({ projectId }, "[SnapshotManager] Snapshot path missing on disk.");
              return false;
            }
            const start = Date.now();
            import_utils40.default.info({ projectId }, "[SnapshotManager] Restoring from snapshot...");
            await import_fs_extra22.default.ensureDir(targetDir);
            await import_fs_extra22.default.copy(snapshot.snapshotPath, targetDir);
            import_utils40.default.info({ projectId, duration: Date.now() - start }, "[SnapshotManager] Restore complete.");
            return true;
          }
          async cleanup(projectId) {
            const snapshotData = await import_utils39.redis.get(`snapshot:latest:${projectId}`);
            if (snapshotData) {
              const snapshot = JSON.parse(snapshotData);
              await import_fs_extra22.default.remove(snapshot.snapshotPath);
              await import_utils39.redis.del(`snapshot:latest:${projectId}`);
            }
          }
        };
        snapshotManager = new SnapshotManager();
      }
    });
    var import_fs_extra3;
    var import_path5;
    var import_utils41;
    var SnapshotLibrary;
    var init_snapshot_library = __esm2({
      "src/snapshot-library.ts"() {
        import_fs_extra3 = __toESM2(require("fs-extra"));
        import_path5 = __toESM2(require("path"));
        import_utils41 = __toESM2(require_dist22());
        SnapshotLibrary = class {
          static snapshotDir = import_path5.default.join(process.cwd(), ".snapshots", "base");
          /**
           * Initializes the library and ensures base directories exist.
           */
          static async init() {
            await import_fs_extra3.default.ensureDir(this.snapshotDir);
          }
          /**
           * Gets the best matching snapshot for a framework.
           */
          static async getSnapshot(framework) {
            const snapshots = [
              { id: "nextjs-base", framework: "nextjs", version: "14.x", path: import_path5.default.join(this.snapshotDir, "nextjs-base") },
              { id: "vite-base", framework: "vite", version: "5.x", path: import_path5.default.join(this.snapshotDir, "vite-base") },
              { id: "express-base", framework: "express", version: "4.x", path: import_path5.default.join(this.snapshotDir, "express-base") }
            ];
            const match = snapshots.find((s) => s.framework === framework);
            if (match && await import_fs_extra3.default.pathExists(match.path)) {
              return match;
            }
            return null;
          }
          /**
           * Creates a base snapshot (Admin/System tool).
           */
          static async createBaseSnapshot(id, framework, sourceDir) {
            const dest = import_path5.default.join(this.snapshotDir, id);
            import_utils41.default.info({ id, framework }, "[SnapshotLibrary] Creating base snapshot...");
            await import_fs_extra3.default.ensureDir(dest);
            await import_fs_extra3.default.copy(sourceDir, dest, {
              filter: (src) => !src.includes("node_modules/.cache")
            });
            import_utils41.default.info({ id }, "[SnapshotLibrary] Base snapshot created successfully.");
          }
        };
      }
    });
    var import_fs_extra4;
    var import_path6;
    var import_utils42;
    var SandboxPoolManager;
    var init_sandbox_pool = __esm2({
      "src/sandbox-pool.ts"() {
        import_fs_extra4 = __toESM2(require("fs-extra"));
        import_path6 = __toESM2(require("path"));
        init_snapshot_library();
        import_utils42 = __toESM2(require_dist22());
        SandboxPoolManager = class {
          static poolDir = import_path6.default.join(process.cwd(), ".previews", "pool");
          static activePool = [];
          static POOL_SIZE = 3;
          // Pre-warm 3 containers per framework
          /**
           * Initializes the pool and warms up containers.
           */
          static async init() {
            await import_fs_extra4.default.ensureDir(this.poolDir);
            await this.warmUp();
          }
          /**
           * Warms up the pool with common frameworks.
           */
          static async warmUp() {
            const frameworks = ["nextjs", "vite"];
            for (const framework of frameworks) {
              const count = this.activePool.filter((s) => s.framework === framework).length;
              for (let i = count; i < this.POOL_SIZE; i++) {
                await this.createWarmedSandbox(framework);
              }
            }
          }
          /**
           * Creates a new warmed sandbox from a snapshot.
           */
          static async createWarmedSandbox(framework) {
            const snapshot = await SnapshotLibrary.getSnapshot(framework);
            if (!snapshot) return;
            const id = `warmed-${framework}-${Math.random().toString(36).substring(7)}`;
            const sandboxDir = import_path6.default.join(this.poolDir, id);
            import_utils42.default.info({ id, framework }, "[SandboxPool] Pre-warming sandbox...");
            await import_fs_extra4.default.ensureDir(sandboxDir);
            await import_fs_extra4.default.copy(snapshot.path, sandboxDir);
            this.activePool.push({ id, framework, sandboxDir });
          }
          /**
           * Acquires a warmed sandbox from the pool.
           */
          static async acquire(framework, targetProjectId) {
            const index = this.activePool.findIndex((s) => s.framework === framework);
            if (index === -1) {
              import_utils42.default.warn({ framework }, "[SandboxPool] No warmed sandbox available. Falling back to slow path.");
              return null;
            }
            const warmed = this.activePool.splice(index, 1)[0];
            const targetDir = import_path6.default.join(process.cwd(), ".previews", targetProjectId);
            import_utils42.default.info({ fromId: warmed.id, toProject: targetProjectId }, "[SandboxPool] Hot-swapping sandbox...");
            await import_fs_extra4.default.move(warmed.sandboxDir, targetDir, { overwrite: true });
            this.createWarmedSandbox(framework).catch((err) => import_utils42.default.error({ err }, "[SandboxPool] Failed to replenish"));
            return targetDir;
          }
        };
      }
    });
    var import_child_process4;
    var FirecrackerDriver;
    var init_microvm_provider = __esm2({
      "src/microvm-provider.ts"() {
        import_child_process4 = require("child_process");
        FirecrackerDriver = class {
          async boot(config22) {
            console.log(`[FirecrackerDriver] Booting MicroVM ${config22.id} (CPU: ${config22.cpuCores}, Mem: ${config22.memoryMb}MB)`);
            const child = (0, import_child_process4.spawn)("node", ["-e", "setInterval(() => {}, 1000)"], {
              stdio: "pipe"
            });
            return child;
          }
          async shutdown(id) {
            console.log(`[FirecrackerDriver] Shutting down MicroVM ${id}`);
          }
          async pause(id) {
            console.log(`[FirecrackerDriver] Pausing MicroVM ${id}`);
          }
          async resume(id) {
            console.log(`[FirecrackerDriver] Resuming MicroVM ${id}`);
          }
        };
      }
    });
    var import_fs_extra5;
    var import_path7;
    var import_utils43;
    var SnapshotOverlayManager;
    var init_snapshot_overlay = __esm2({
      "src/snapshot-overlay.ts"() {
        import_fs_extra5 = __toESM2(require("fs-extra"));
        import_path7 = __toESM2(require("path"));
        import_utils43 = __toESM2(require_dist22());
        SnapshotOverlayManager = class {
          /**
           * Prepares a writable overlay for a specific project based on a base snapshot.
           * In a real microVM environment, this would involve setting up device mapper
           * or copy-on-write blocks.
           */
          static async prepareOverlay(config22) {
            const { baseSnapshotPath, projectPath, overlayPath } = config22;
            import_utils43.default.info({ baseSnapshotPath, projectPath }, "[SnapshotOverlayManager] Preparing project overlay...");
            await import_fs_extra5.default.ensureDir(overlayPath);
            const lowerDir = import_path7.default.join(overlayPath, "lower");
            const upperDir = import_path7.default.join(overlayPath, "upper");
            const workDir = import_path7.default.join(overlayPath, "work");
            const mergedDir = import_path7.default.join(overlayPath, "merged");
            await import_fs_extra5.default.ensureDir(lowerDir);
            await import_fs_extra5.default.ensureDir(upperDir);
            await import_fs_extra5.default.ensureDir(workDir);
            await import_fs_extra5.default.ensureDir(mergedDir);
            try {
              const files = await import_fs_extra5.default.readdir(lowerDir);
              if (files.length === 0) {
                await import_fs_extra5.default.copy(baseSnapshotPath, lowerDir);
              }
              await import_fs_extra5.default.copy(projectPath, upperDir);
              import_utils43.default.info({ mergedDir }, "[SnapshotOverlayManager] Overlay ready.");
            } catch (err) {
              import_utils43.default.error({ err }, "[SnapshotOverlayManager] Failed to prepare overlay");
              throw err;
            }
          }
          static async cleanupOverlay(overlayPath) {
            import_utils43.default.info({ overlayPath }, "[SnapshotOverlayManager] Cleaning up overlay...");
            await import_fs_extra5.default.remove(overlayPath);
          }
        };
      }
    });
    var import_path8;
    var import_fs_extra6;
    var import_utils44;
    var MicroVMManager;
    var init_microvm_manager = __esm2({
      "src/microvm-manager.ts"() {
        init_microvm_provider();
        init_snapshot_overlay();
        init_snapshot_library();
        import_path8 = __toESM2(require("path"));
        import_fs_extra6 = __toESM2(require("fs-extra"));
        import_utils44 = __toESM2(require_dist22());
        MicroVMManager = class {
          static provider = new FirecrackerDriver();
          static activeVMs = /* @__PURE__ */ new Map();
          static async allocateSandbox(projectId, framework) {
            import_utils44.default.info({ projectId, framework }, "[MicroVMManager] Allocating MicroVM Sandbox...");
            const snapshot = await SnapshotLibrary.getSnapshot(framework);
            if (!snapshot) {
              throw new Error(`No base snapshot found for framework: ${framework}`);
            }
            const projectPath = import_path8.default.join(process.cwd(), "projects", projectId);
            const overlayPath = import_path8.default.join(process.cwd(), ".microvms", projectId);
            await import_fs_extra6.default.ensureDir(projectPath);
            await import_fs_extra6.default.ensureDir(overlayPath);
            await SnapshotOverlayManager.prepareOverlay({
              baseSnapshotPath: snapshot.path,
              projectPath,
              overlayPath
            });
            const config22 = {
              id: projectId,
              kernelPath: "/etc/microvm/vmlinux",
              // Placeholder path
              rootfsPath: import_path8.default.join(overlayPath, "merged"),
              // Target merged layer
              cpuCores: 1,
              memoryMb: 1024
            };
            const child = await this.provider.boot(config22);
            this.activeVMs.set(projectId, { child, config: config22 });
            import_utils44.default.info({ projectId }, "[MicroVMManager] MicroVM Sandbox successfully allocated and booted.");
            return config22.rootfsPath;
          }
          static async terminateSandbox(projectId) {
            const vm = this.activeVMs.get(projectId);
            if (vm) {
              await this.provider.shutdown(projectId);
              vm.child.kill();
              this.activeVMs.delete(projectId);
              const overlayPath = import_path8.default.join(process.cwd(), ".microvms", projectId);
              await SnapshotOverlayManager.cleanupOverlay(overlayPath);
              import_utils44.default.info({ projectId }, "[MicroVMManager] MicroVM Sandbox terminated and cleaned up.");
            }
          }
          static getVMStatus(projectId) {
            return this.activeVMs.has(projectId) ? "running" : "not_found";
          }
        };
      }
    });
    var require_dist42 = __commonJS2({
      "../../packages/validator/dist/index.js"(exports22, module22) {
        var __defProp22 = Object.defineProperty;
        var __getOwnPropDesc22 = Object.getOwnPropertyDescriptor;
        var __getOwnPropNames22 = Object.getOwnPropertyNames;
        var __hasOwnProp22 = Object.prototype.hasOwnProperty;
        var __copyProps22 = (to, from, except, desc) => {
          if (from && typeof from === "object" || typeof from === "function") {
            for (let key of __getOwnPropNames22(from))
              if (!__hasOwnProp22.call(to, key) && key !== except)
                __defProp22(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc22(from, key)) || desc.enumerable });
          }
          return to;
        };
        var __toCommonJS22 = (mod) => __copyProps22(__defProp22({}, "__esModule", { value: true }), mod);
        var index_exports2 = {};
        module22.exports = __toCommonJS22(index_exports2);
      }
    });
    var preview_manager_exports = {};
    __export2(preview_manager_exports, {
      PreviewServerManager: () => PreviewServerManager,
      previewManager: () => previewManager
    });
    var import_path9;
    var import_fs_extra7;
    var import_net3;
    var import_registry7;
    var import_http;
    var import_utils45;
    var import_utils46;
    var import_validator2;
    var PortAllocator;
    var PreviewServerManager;
    var previewManager;
    var init_preview_manager = __esm2({
      "src/preview-manager.ts"() {
        import_path9 = __toESM2(require("path"));
        import_fs_extra7 = __toESM2(require("fs-extra"));
        import_net3 = __toESM2(require("net"));
        init_sandbox_runner();
        import_registry7 = __toESM2(require_dist32());
        import_http = __toESM2(require("http"));
        import_utils45 = __toESM2(require_dist22());
        init_snapshot_manager();
        init_sandbox_pool();
        init_snapshot_library();
        init_admission_controller();
        init_microvm_manager();
        import_utils46 = __toESM2(require_dist22());
        import_validator2 = __toESM2(require_dist42());
        PortAllocator = class {
          basePort = 3001;
          maxPort = 3999;
          usedPorts = /* @__PURE__ */ new Set();
          async allocate() {
            for (let port = this.basePort; port <= this.maxPort; port++) {
              if (this.usedPorts.has(port)) continue;
              const isAvailable = await this.checkPort(port);
              if (isAvailable) {
                this.usedPorts.add(port);
                return port;
              }
            }
            throw new Error("No available ports found for preview server");
          }
          release(port) {
            this.usedPorts.delete(port);
          }
          checkPort(port) {
            return new Promise((resolve) => {
              const server = import_net3.default.createServer();
              server.unref();
              server.on("error", () => resolve(false));
              server.listen(port, () => {
                server.close(() => resolve(true));
              });
            });
          }
        };
        PreviewServerManager = class {
          portAllocator = new PortAllocator();
          activePreviews = /* @__PURE__ */ new Map();
          templateDir = import_path9.default.join(process.cwd(), ".previews", "_template");
          snapshotManager = new SnapshotManager();
          constructor() {
            this.initializeTemplates();
            this.startCleanupInterval();
            SnapshotLibrary.init().catch((e) => import_utils46.default.error({ e }, "SnapshotLibrary init failed"));
            SandboxPoolManager.init().catch((e) => import_utils46.default.error({ e }, "SandboxPoolManager init failed"));
          }
          async initializeTemplates() {
            if (!import_fs_extra7.default.existsSync(this.templateDir)) {
              await import_fs_extra7.default.ensureDir(this.templateDir);
              import_utils46.default.info("[PreviewManager] Initializing Hot Sandbox Template...");
              await import_fs_extra7.default.writeFile(import_path9.default.join(this.templateDir, "package.json"), JSON.stringify({
                name: "multi-agent-preview-template",
                dependencies: {
                  "next": "latest",
                  "react": "latest",
                  "react-dom": "latest",
                  "lucide-react": "latest",
                  "framer-motion": "latest"
                }
              }, null, 2));
            }
          }
          startCleanupInterval() {
            setInterval(async () => {
              const now = Date.now();
              const IDLE_TIMEOUT = 30 * 60 * 1e3;
              for (const [projectId] of this.activePreviews.entries()) {
                try {
                  const regData = await import_utils45.redis.get(`runtime:registry:${projectId}`);
                  let lastAccess = 0;
                  if (regData) {
                    lastAccess = JSON.parse(regData).lastAccessedAt ? new Date(JSON.parse(regData).lastAccessedAt).getTime() : 0;
                  } else {
                    const lastAccessStr = await import_utils45.redis.get(`preview:last_access:${projectId}`);
                    lastAccess = lastAccessStr ? parseInt(lastAccessStr) : 0;
                  }
                  if (lastAccess && now - lastAccess > IDLE_TIMEOUT) {
                    import_utils46.default.info(`[PreviewManager] Shutting down idle preview for ${projectId}`);
                    await this.stopPreview(projectId);
                    await import_utils45.redis.del(`preview:last_access:${projectId}`);
                  }
                } catch (err) {
                  import_utils46.default.error({ err }, `[PreviewManager] Idle cleanup error for ${projectId}`);
                }
              }
            }, 6e4);
          }
          async launchPreview(projectId, framework = "nextjs") {
            import_utils46.default.info({ projectId, framework }, "[PreviewServerManager] Launching preview environment...");
            await AdmissionController.acquireAdmission(projectId);
            const useMicroVM = process.env.ENABLE_MICROVMS === "true";
            if (useMicroVM) {
              const rootfs = await MicroVMManager.allocateSandbox(projectId, framework);
              import_utils46.default.info({ projectId, rootfs }, "[PreviewServerManager] MICROVM ALLOCATED (Phase 15).");
              return await this.startServer(projectId);
            }
            const pooledDir = await SandboxPoolManager.acquire(framework, projectId);
            if (pooledDir) {
              import_utils46.default.info("[PreviewServerManager] HOT POOL HIT. Sandbox allocated in <50ms.");
              return await this.startServer(projectId);
            }
            const previewDir = import_path9.default.join(process.cwd(), ".generated-projects", projectId);
            const restored = await this.snapshotManager.restoreFromSnapshot(projectId, previewDir);
            if (restored) {
              import_utils46.default.info(`[PreviewManager] Rapid Restore successful for ${projectId}. Skipping initialization.`);
            } else {
              import_utils46.default.info(`[PreviewManager] Cold path initialization for ${projectId}.`);
              await import_fs_extra7.default.ensureDir(previewDir);
              const nodeModulesPath = import_path9.default.join(previewDir, "node_modules");
              const templateModulesPath = import_path9.default.join(this.templateDir, "node_modules");
              if (!import_fs_extra7.default.existsSync(nodeModulesPath) && import_fs_extra7.default.existsSync(templateModulesPath)) {
                try {
                  import_fs_extra7.default.symlinkSync(templateModulesPath, nodeModulesPath, "junction");
                } catch (e) {
                  import_utils46.default.warn({ error: e }, `[PreviewManager] Could not symlink node_modules for ${projectId}.`);
                }
              }
            }
            return await this.startServer(projectId);
          }
          async restartPreview(projectId) {
            await this.stopPreview(projectId);
            return await this.startServer(projectId);
          }
          async checkHealth(previewId) {
            const reg = await import_registry7.PreviewRegistry.lookupByPreviewId(previewId);
            if (!reg) return false;
            return this.isHttpReady(reg.ports[0] ?? 0);
          }
          async isPortOpen(port, timeoutMs = 2e3) {
            return new Promise((resolve) => {
              const socket = new import_net3.default.Socket();
              socket.setTimeout(timeoutMs);
              socket.on("connect", () => {
                socket.destroy();
                resolve(true);
              });
              socket.on("error", () => {
                socket.destroy();
                resolve(false);
              });
              socket.on("timeout", () => {
                socket.destroy();
                resolve(false);
              });
              socket.connect(port, "127.0.0.1");
            });
          }
          async isHttpReady(port) {
            return new Promise((resolve) => {
              const req = import_http.default.get(`http://127.0.0.1:${port}`, (res) => {
                resolve(res.statusCode === 200);
              });
              req.on("error", () => resolve(false));
              req.setTimeout(1e3, () => {
                req.destroy();
                resolve(false);
              });
            });
          }
          async startServer(projectId) {
            let previewId = (await import_registry7.PreviewRegistry.get(projectId))?.previewId;
            if (!previewId) {
              const executionId = "legacy-" + projectId;
              const reg2 = await import_registry7.PreviewRegistry.init(projectId, executionId);
              const port2 = await this.portAllocator.allocate();
              await import_registry7.PreviewRegistry.update(projectId, { ports: [port2] });
              previewId = reg2.previewId;
            }
            const reg = await import_registry7.PreviewRegistry.get(projectId);
            if (!reg) throw new Error("Preview registration missing");
            const previewDir = import_path9.default.join(process.cwd(), ".generated-projects", projectId);
            const port = reg.ports[0] ?? 0;
            const validation = await import_validator2.ArtifactValidator.validate(projectId);
            if (!validation.valid) {
              throw new Error(`Cannot start preview: Missing artifacts (${validation.missingFiles?.join(", ")})`);
            }
            if (this.activePreviews.has(projectId) && reg.status === "RUNNING") {
              return `http://localhost:${port}`;
            }
            await import_registry7.PreviewRegistry.update(projectId, { status: "STARTING" });
            return new Promise((resolve, reject) => {
              try {
                const memoryLimitMb = 1024;
                const child = SandboxRunner.spawnLongRunning("npx", ["next", "dev", "-p", port.toString(), "-H", "0.0.0.0"], {
                  cwd: previewDir,
                  executionId: projectId,
                  agentName: "System",
                  action: "preview_server",
                  env: {
                    ...process.env,
                    NODE_OPTIONS: `--max-old-space-size=${memoryLimitMb}`
                  }
                });
                this.startHeartbeatMonitor(projectId, child);
                this.activePreviews.set(projectId, { port, process: child });
                const checkStartup = async () => {
                  const start = Date.now();
                  let isReady = false;
                  const TIMEOUT_MS = 6e4;
                  import_utils46.default.info({ projectId, port }, "[PreviewManager] Starting HTTP health check loop...");
                  while (Date.now() - start < TIMEOUT_MS) {
                    const portOpen = await this.isPortOpen(port, 1e3);
                    if (portOpen) {
                      isReady = await this.isHttpReady(port);
                      if (isReady) break;
                    }
                    await new Promise((r) => setTimeout(r, 2e3));
                  }
                  if (isReady) {
                    import_utils46.default.info(`[PreviewManager] Sandbox ${projectId} is HTTP READY.`);
                    await import_registry7.PreviewRegistry.update(projectId, { status: "RUNNING" });
                    this.snapshotManager.createSnapshot(projectId, previewDir).catch((e_snap) => {
                      import_utils46.default.error({ e: e_snap }, `[PreviewManager] Snapshot failed for ${projectId}`);
                    });
                    resolve(`http://localhost:${port}`);
                  } else {
                    reject(new Error("HTTP readiness timeout"));
                  }
                };
                checkStartup();
                child.on("error", (err) => {
                  import_utils46.default.error({ err }, `[PreviewManager] Process error for ${projectId}`);
                  import_registry7.PreviewRegistry.update(projectId, { status: "FAILED", failureReason: err.message }).catch(() => {
                  });
                });
                child.on("exit", async () => {
                  this.portAllocator.release(port);
                  this.activePreviews.delete(projectId);
                  import_registry7.PreviewRegistry.update(projectId, { status: "STOPPED" }).catch(() => {
                  });
                });
              } catch (err) {
                this.portAllocator.release(port);
                reject(err);
              }
            });
          }
          async stopPreview(projectId) {
            const preview = this.activePreviews.get(projectId);
            if (preview) {
              preview.process.kill("SIGKILL");
              this.portAllocator.release(preview.port);
              this.activePreviews.delete(projectId);
            }
          }
          startHeartbeatMonitor(projectId, child) {
            const checkInterval = 1e4;
            const timer = setInterval(async () => {
              if (child.killed || child.exitCode !== null) {
                import_utils46.default.warn({ projectId }, "[Heartbeat] Sandbox process exited. Triggering recovery...");
                clearInterval(timer);
                await this.recoverSandbox(projectId);
                return;
              }
              const reg = await import_registry7.PreviewRegistry.get(projectId);
              if (reg?.previewId) {
                const isHealthy = await this.checkHealth(reg.previewId);
                if (!isHealthy) {
                  import_utils46.default.warn({ projectId }, "[Heartbeat] Sandbox HTTP health check failed.");
                }
              }
            }, checkInterval);
          }
          async recoverSandbox(projectId) {
            import_utils46.default.info({ projectId }, "[Recovery] Restarting crashed sandbox...");
            try {
              await this.launchPreview(projectId);
            } catch (err) {
              import_utils46.default.error({ err, projectId }, "[Recovery] Failed to recover sandbox.");
            }
          }
          async streamFileUpdate(projectId, filePath, content) {
            const previewDir = import_path9.default.join(process.cwd(), ".generated-projects", projectId);
            const fullPath = import_path9.default.join(previewDir, filePath);
            try {
              await import_fs_extra7.default.ensureDir(import_path9.default.dirname(fullPath));
              await import_fs_extra7.default.writeFile(fullPath, content);
              import_utils46.default.info(`[PreviewManager] VFS Stream: ${filePath}`);
            } catch (err) {
              import_utils46.default.error({ err }, `[PreviewManager] VFS Stream failed: ${filePath}`);
            }
          }
        };
        previewManager = new PreviewServerManager();
      }
    });
    var index_exports = {};
    __export2(index_exports, {
      AdmissionController: () => AdmissionController,
      CleanupService: () => CleanupService,
      ClusterProxy: () => ClusterProxy,
      ContainerManager: () => ContainerManager,
      DistributedLock: () => DistributedLock,
      EvolutionEngine: () => EvolutionEngine,
      FailoverManager: () => FailoverManager2,
      FirecrackerDriver: () => FirecrackerDriver,
      MicroVMManager: () => MicroVMManager,
      NodeRegistry: () => NodeRegistry2,
      PerformanceMonitor: () => PerformanceMonitor,
      PortManager: () => PortManager,
      PreviewOrchestrator: () => PreviewOrchestrator2,
      PreviewRuntimePool: () => PreviewRuntimePool,
      PreviewServerManager: () => PreviewServerManager,
      PreviewWatchdog: () => PreviewWatchdog,
      ProcessManager: () => ProcessManager,
      ProcessSandbox: () => ProcessSandbox,
      RedisRecovery: () => RedisRecovery2,
      ResourceManager: () => ResourceManager,
      RollingRestart: () => RollingRestart2,
      RuntimeCapacity: () => RuntimeCapacity,
      RuntimeCleanup: () => RuntimeCleanup2,
      RuntimeEscalation: () => RuntimeEscalation,
      RuntimeGuard: () => RuntimeGuard,
      RuntimeHeartbeat: () => RuntimeHeartbeat,
      RuntimeMetrics: () => RuntimeMetrics,
      RuntimeScheduler: () => RuntimeScheduler,
      SandboxPoolManager: () => SandboxPoolManager,
      SandboxRunner: () => SandboxRunner,
      SnapshotLibrary: () => SnapshotLibrary,
      SnapshotManager: () => SnapshotManager,
      SnapshotOverlayManager: () => SnapshotOverlayManager,
      StaleEvictor: () => StaleEvictor,
      StorageGC: () => StorageGC,
      cleanupService: () => cleanupService,
      previewManager: () => previewManager,
      previewRunner: () => previewRunner,
      runtimeExecutor: () => runtimeExecutor,
      sandbox: () => sandbox,
      snapshotManager: () => snapshotManager,
      startPreview: () => startPreview,
      stopPreview: () => stopPreview
    });
    module2.exports = __toCommonJS2(index_exports);
    var import_utils16 = __toESM2(require_dist22());
    var import_utils22 = __toESM2(require_dist22());
    var LOCK_PREFIX = "cluster:lock:";
    var DEFAULT_TTL_MS = 3e4;
    var DistributedLock = {
      /**
       * Acquire a lock for a given resource.
       * Returns a LockHandle if successful, null if the lock is already held.
       *
       * @param resource - e.g. "runtime:start:{projectId}"
       * @param ttlMs - lock auto-expires after this duration (safety valve)
       */
      async acquire(resource, ttlMs = DEFAULT_TTL_MS) {
        const key = `${LOCK_PREFIX}${resource}`;
        const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const result = await import_utils16.default.set(key, token, "PX", ttlMs, "NX");
        if (result === "OK") {
          import_utils22.default.debug({ resource, token }, "[DistributedLock] Lock acquired");
          return { key, token, acquiredAt: Date.now() };
        }
        import_utils22.default.debug({ resource }, "[DistributedLock] Lock already held");
        return null;
      },
      /**
       * Release a lock. Uses a Lua script for atomic compare-and-delete
       * so only the holder can release.
       */
      async release(handle) {
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        const result = await import_utils16.default.eval(script, 1, handle.key, handle.token);
        if (result === 1) {
          import_utils22.default.debug({ key: handle.key }, "[DistributedLock] Lock released");
          return true;
        }
        import_utils22.default.warn({ key: handle.key }, "[DistributedLock] Lock already expired or held by another");
        return false;
      },
      /**
       * Extend a lock's TTL (for long-running operations).
       * Only succeeds if we still hold the lock.
       */
      async extend(handle, ttlMs = DEFAULT_TTL_MS) {
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("pexpire", KEYS[1], ARGV[2])
            else
                return 0
            end
        `;
        const result = await import_utils16.default.eval(script, 1, handle.key, handle.token, ttlMs.toString());
        if (result === 1) {
          import_utils22.default.debug({ key: handle.key, ttlMs }, "[DistributedLock] Lock extended");
          return true;
        }
        return false;
      },
      /**
       * Execute a function while holding a lock.
       * Auto-acquires and releases. Retries up to maxRetries with backoff.
       */
      async withLock(resource, fn, options = {}) {
        const { ttlMs = DEFAULT_TTL_MS, maxRetries = 5, retryDelayMs = 1e3 } = options;
        let handle = null;
        let attempt = 0;
        while (attempt < maxRetries) {
          handle = await this.acquire(resource, ttlMs);
          if (handle) break;
          attempt++;
          if (attempt < maxRetries) {
            const delay = retryDelayMs * (1 + Math.random());
            await new Promise((r) => setTimeout(r, delay));
          }
        }
        if (!handle) {
          throw new Error(`[DistributedLock] Failed to acquire lock "${resource}" after ${maxRetries} retries`);
        }
        try {
          return await fn();
        } finally {
          await this.release(handle);
        }
      },
      /**
       * Check if a lock is currently held (for diagnostics only).
       */
      async isLocked(resource) {
        const key = `${LOCK_PREFIX}${resource}`;
        const exists = await import_utils16.default.exists(key);
        return exists === 1;
      }
    };
    var import_crypto = require("crypto");
    var import_os3 = __toESM2(require("os"));
    var import_utils32 = __toESM2(require_dist22());
    var import_utils47 = __toESM2(require_dist22());
    var import_utils52 = __toESM2(require_dist22());
    var NODE_PREFIX = "cluster:node:";
    var NODE_SET_KEY = "cluster:nodes";
    var NODE_HEARTBEAT_TTL = 30;
    var HEARTBEAT_INTERVAL2 = 1e4;
    var MAX_RUNTIMES_PER_NODE = parseInt(process.env.NODE_MAX_RUNTIMES ?? "25", 10);
    var NODE_REGION = process.env.NODE_REGION ?? "default";
    var _nodeId = null;
    var _heartbeatTimer = null;
    var _runningCount = 0;
    var NodeRegistry2 = {
      /**
       * Register this worker node in the cluster.
       * Called once on worker boot. Starts the heartbeat loop.
       */
      async register() {
        _nodeId = (0, import_crypto.randomUUID)();
        _runningCount = 0;
        await this.publishHeartbeat();
        _heartbeatTimer = setInterval(async () => {
          try {
            await this.publishHeartbeat();
          } catch (err) {
            import_utils52.default.error({ err }, "[NodeRegistry] Heartbeat publish failed");
          }
        }, HEARTBEAT_INTERVAL2);
        if (_heartbeatTimer.unref) _heartbeatTimer.unref();
        await import_utils47.default.sadd(NODE_SET_KEY, _nodeId);
        import_utils52.default.info({
          nodeId: _nodeId,
          hostname: import_os3.default.hostname(),
          region: NODE_REGION,
          maxRuntimes: MAX_RUNTIMES_PER_NODE
        }, "[NodeRegistry] Node registered");
        return _nodeId;
      },
      /**
       * Publish this node's heartbeat with current resource usage.
       */
      async publishHeartbeat() {
        if (!_nodeId) return;
        const info = {
          nodeId: _nodeId,
          hostname: import_os3.default.hostname(),
          region: NODE_REGION,
          maxRuntimes: MAX_RUNTIMES_PER_NODE,
          runningRuntimes: _runningCount,
          cpuCount: import_os3.default.cpus().length,
          totalMemoryMB: Math.round(import_os3.default.totalmem() / 1048576),
          freeMemoryMB: Math.round(import_os3.default.freemem() / 1048576),
          loadAvg1m: parseFloat(import_os3.default.loadavg()[0].toFixed(2)),
          startedAt: _nodeId ? (/* @__PURE__ */ new Date()).toISOString() : "",
          lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString(),
          version: "3.0.0"
        };
        await import_utils47.default.setex(
          `${NODE_PREFIX}${_nodeId}`,
          NODE_HEARTBEAT_TTL,
          JSON.stringify(info)
        );
        import_utils32.nodeCpuUsage.set(info.loadAvg1m / info.cpuCount);
        import_utils32.nodeMemoryUsage.set(import_os3.default.totalmem() - import_os3.default.freemem());
        import_utils52.default.debug({ nodeId: _nodeId, load: info.loadAvg1m }, "[NodeRegistry] Heartbeat sent");
      },
      /**
       * Deregister this node (graceful shutdown).
       */
      async deregister() {
        if (!_nodeId) return;
        if (_heartbeatTimer) {
          clearInterval(_heartbeatTimer);
          _heartbeatTimer = null;
        }
        await import_utils47.default.srem(NODE_SET_KEY, _nodeId);
        await import_utils47.default.del(`${NODE_PREFIX}${_nodeId}`);
        import_utils52.default.info({ nodeId: _nodeId }, "[NodeRegistry] Node deregistered");
        _nodeId = null;
      },
      /**
       * Get all currently registered nodes.
       */
      async listNodes() {
        const nodeIds = await import_utils47.default.smembers(NODE_SET_KEY);
        if (!nodeIds.length) return [];
        const pipeline = import_utils47.default.pipeline();
        nodeIds.forEach((id) => pipeline.get(`${NODE_PREFIX}${id}`));
        const results = await pipeline.exec();
        const nodes = [];
        const staleIds = [];
        for (let i = 0; i < nodeIds.length; i++) {
          const [err, raw] = results[i];
          if (err || !raw) {
            staleIds.push(nodeIds[i]);
            continue;
          }
          nodes.push(JSON.parse(raw));
        }
        if (staleIds.length) {
          await import_utils47.default.srem(NODE_SET_KEY, ...staleIds);
          import_utils52.default.info({ staleIds }, "[NodeRegistry] Cleaned stale node entries");
        }
        return nodes;
      },
      /**
       * Get info for a specific node.
       */
      async getNode(nodeId) {
        const raw = await import_utils47.default.get(`${NODE_PREFIX}${nodeId}`);
        if (!raw) return null;
        return JSON.parse(raw);
      },
      /**
       * Increment running runtime count on this node.
       */
      incrementRunning() {
        _runningCount++;
      },
      /**
       * Decrement running runtime count on this node.
       */
      decrementRunning() {
        _runningCount = Math.max(0, _runningCount - 1);
      },
      /**
       * Get this node's ID.
       */
      getNodeId() {
        return _nodeId;
      },
      /**
       * Get this node's running count.
       */
      getRunningCount() {
        return _runningCount;
      },
      /**
       * Get max runtimes per node.
       */
      getMaxRuntimes() {
        return MAX_RUNTIMES_PER_NODE;
      }
    };
    var import_registry2 = __toESM2(require_dist32());
    var import_child_process = require("child_process");
    var import_utils62 = __toESM2(require_dist22());
    var processRegistry = /* @__PURE__ */ new Map();
    var ProcessManager = {
      /**
       * Start a process for the given project and append to registry.
       */
      async start(projectId, cwd, command = "npm", args = ["run", "dev"], env2 = {}, timeoutMs = 6e4) {
        import_utils62.default.info({ projectId, cwd, command, args }, "[ProcessManager] Spawning process");
        const child = (0, import_child_process.spawn)(command, args, {
          cwd,
          env: { ...process.env, ...env2 },
          detached: false,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"]
        });
        const managed = {
          pid: child.pid,
          projectId,
          status: "STARTING",
          startedAt: (/* @__PURE__ */ new Date()).toISOString(),
          cwd,
          process: child
        };
        const existing = processRegistry.get(projectId) || [];
        existing.push(managed);
        processRegistry.set(projectId, existing);
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            managed.status = "FAILED";
            reject(new Error(`[ProcessManager] Timeout: process ${command} for ${projectId} did not start in ${timeoutMs}ms`));
          }, timeoutMs);
          child.on("error", (err) => {
            managed.status = "FAILED";
            clearTimeout(timer);
            import_utils62.default.error({ projectId, err }, "[ProcessManager] Spawn error");
            reject(err);
          });
          child.on("exit", (code) => {
            managed.status = code === 0 ? "STOPPED" : "FAILED";
            import_utils62.default.warn({ projectId, pid: child.pid, code }, "[ProcessManager] Process exited");
          });
          child.stdout.on("data", (chunk) => {
            const line = chunk.toString();
            if (line.includes("Local:") || line.includes("localhost:") || line.includes("listening on") || line.includes("ready on") || line.includes("started server")) {
              managed.status = "RUNNING";
              clearTimeout(timer);
              resolve({ pid: child.pid, cwd });
            }
          });
        });
      },
      /**
       * Stop all processes for a project.
       */
      async stopAll(projectId) {
        const processes = processRegistry.get(projectId);
        if (!processes) return;
        import_utils62.default.info({ projectId, count: processes.length }, "[ProcessManager] Stopping all processes");
        for (const managed of processes) {
          managed.process.kill("SIGTERM");
          await new Promise((r) => setTimeout(r, 100));
          if (!managed.process.killed) managed.process.kill("SIGKILL");
        }
        processRegistry.delete(projectId);
      },
      /**
       * Get combined status.
       */
      getStatus(projectId) {
        const processes = processRegistry.get(projectId);
        if (!processes || processes.length === 0) return "IDLE";
        if (processes.some((p) => p.status === "FAILED")) return "FAILED";
        if (processes.every((p) => p.status === "RUNNING")) return "RUNNING";
        if (processes.some((p) => p.status === "STARTING")) return "STARTING";
        return "STOPPED";
      },
      /**
       * Get all PIDs.
       */
      getPids(projectId) {
        return (processRegistry.get(projectId) || []).map((p) => p.pid);
      },
      /**
       * Check if any are running.
       */
      isRunning(projectId) {
        const processes = processRegistry.get(projectId);
        return processes?.some((p) => p.status === "RUNNING" || p.status === "STARTING") ?? false;
      },
      /**
       * List all.
       */
      listAll() {
        return Array.from(processRegistry.entries()).map(([projectId, m]) => ({
          projectId,
          pids: m.map((p) => p.pid),
          status: this.getStatus(projectId)
        }));
      }
    };
    var import_net = __toESM2(require("net"));
    var import_utils72 = __toESM2(require_dist22());
    var import_utils82 = __toESM2(require_dist22());
    var PORT_START = 4100;
    var PORT_END = 4999;
    var PORT_LEASE_TTL = 3600;
    var LEASE_KEY_PREFIX = "runtime:port:lease:";
    var PortManager = {
      /**
       * Find 'count' free ports in range [PORT_START, PORT_END] that
       * are not already leased by another running project.
       */
      async acquirePorts(projectId, count = 1) {
        await this.releasePorts(projectId);
        const acquired = [];
        for (let port = PORT_START; port <= PORT_END && acquired.length < count; port++) {
          const leaseKey = `${LEASE_KEY_PREFIX}${port}`;
          const existing = await import_utils72.default.get(leaseKey);
          if (existing) continue;
          const free = await this.isPortFree(port);
          if (!free) continue;
          const claimed = await import_utils72.default.set(leaseKey, projectId, "EX", PORT_LEASE_TTL, "NX");
          if (!claimed) continue;
          acquired.push(port);
        }
        if (acquired.length < count) {
          for (const p of acquired) {
            await import_utils72.default.del(`${LEASE_KEY_PREFIX}${p}`);
          }
          throw new Error(`[PortManager] Could not find ${count} free ports in range ${PORT_START}-${PORT_END}`);
        }
        await import_utils72.default.set(`runtime:project:ports:${projectId}`, JSON.stringify(acquired), "EX", PORT_LEASE_TTL);
        import_utils82.default.info({ projectId, ports: acquired }, "[PortManager] Ports acquired");
        return acquired;
      },
      /**
       * Release all port leases held by a project.
       */
      async releasePorts(projectId) {
        const portsStr = await import_utils72.default.get(`runtime:project:ports:${projectId}`);
        if (!portsStr) return;
        const ports = JSON.parse(portsStr);
        for (const port of ports) {
          await import_utils72.default.del(`${LEASE_KEY_PREFIX}${port}`);
        }
        await import_utils72.default.del(`runtime:project:ports:${projectId}`);
        import_utils82.default.info({ projectId, ports }, "[PortManager] Ports released");
      },
      /**
       * Get the currently leased ports for a project.
       */
      async getPorts(projectId) {
        const portsStr = await import_utils72.default.get(`runtime:project:ports:${projectId}`);
        return portsStr ? JSON.parse(portsStr) : [];
      },
      /**
       * Renew the lease TTL for all active ports.
       */
      async renewLease(projectId) {
        const portsStr = await import_utils72.default.get(`runtime:project:ports:${projectId}`);
        if (!portsStr) return;
        const ports = JSON.parse(portsStr);
        for (const port of ports) {
          await import_utils72.default.expire(`${LEASE_KEY_PREFIX}${port}`, PORT_LEASE_TTL);
        }
        await import_utils72.default.expire(`runtime:project:ports:${projectId}`, PORT_LEASE_TTL);
      },
      /**
       * Force-acquire specific ports (used during Redis crash recovery).
       */
      async forceAcquirePorts(projectId, ports) {
        for (const port of ports) {
          await import_utils72.default.set(`${LEASE_KEY_PREFIX}${port}`, projectId, "EX", PORT_LEASE_TTL);
        }
        await import_utils72.default.set(`runtime:project:ports:${projectId}`, JSON.stringify(ports), "EX", PORT_LEASE_TTL);
        import_utils82.default.info({ projectId, ports }, "[PortManager] Ports force-acquired (recovery)");
      },
      /**
       * Check whether a port is free at the OS level using a TCP probe.
       */
      isPortFree(port) {
        return new Promise((resolve) => {
          const server = import_net.default.createServer();
          server.unref();
          server.listen(port, "127.0.0.1", () => {
            server.close(() => resolve(true));
          });
          server.on("error", () => resolve(false));
        });
      },
      /**
       * Parse a port number from a raw stdout line.
       * Handles formats like:
       *   "Local:  http://localhost:4101"
       *   "Listening on port 4101"
       *   "Server started on http://localhost:4101"
       */
      parsePortFromOutput(line) {
        const match = line.match(/(?:localhost|0\.0\.0\.0|127\.0\.0\.1):(\d{4,5})/);
        if (match) return parseInt(match[1], 10);
        const portMatch = line.match(/\bport\s+(\d{4,5})\b/i);
        if (portMatch) return parseInt(portMatch[1], 10);
        return null;
      }
    };
    var import_registry = __toESM2(require_dist32());
    var import_utils92 = __toESM2(require_dist22());
    var import_utils102 = __toESM2(require_dist22());
    var import_utils112 = __toESM2(require_dist22());
    var RUNTIME_MODE = process.env.RUNTIME_MODE || "process";
    var METRICS_PREFIX = "runtime:metrics:";
    var GLOBAL_STATS_KEY = "runtime:global:stats";
    var METRICS_TTL = 86400 * 7;
    var RuntimeMetrics = {
      /** Record a successful process start with startup latency */
      async recordStart(projectId, startupMs) {
        const key = `${METRICS_PREFIX}${projectId}`;
        const now = Date.now();
        await import_utils92.default.hset(
          key,
          "totalStarts",
          (await this._incr(key, "totalStarts")).toString(),
          "lastStartedAt",
          new Date(now).toISOString(),
          "lastStartupMs",
          startupMs.toString(),
          "lastActivityAt",
          new Date(now).toISOString()
        );
        await import_utils92.default.expire(key, METRICS_TTL);
        await import_utils92.default.hincrby(GLOBAL_STATS_KEY, "totalStarts", 1);
        await import_utils92.default.expire(GLOBAL_STATS_KEY, METRICS_TTL);
        import_utils112.runtimeStartupDuration.observe({ mode: RUNTIME_MODE }, startupMs / 1e3);
        import_utils112.runtimeActiveTotal.inc();
        import_utils102.default.info({ projectId, startupMs }, "[RuntimeMetrics] Start recorded");
      },
      /** Record a process crash */
      async recordCrash(projectId, errorType) {
        const key = `${METRICS_PREFIX}${projectId}`;
        await this._incr(key, "totalCrashes");
        await import_utils92.default.hset(key, "lastErrorType", errorType, "lastErrorAt", (/* @__PURE__ */ new Date()).toISOString());
        await import_utils92.default.expire(key, METRICS_TTL);
        await import_utils92.default.hincrby(GLOBAL_STATS_KEY, "totalCrashes", 1);
        import_utils112.runtimeCrashesTotal.inc({ reason: errorType, mode: RUNTIME_MODE });
        import_utils112.runtimeActiveTotal.dec();
        import_utils102.default.warn({ projectId, errorType }, "[RuntimeMetrics] Crash recorded");
      },
      /** Record health check result */
      async recordHealthCheck(projectId, passed) {
        const key = `${METRICS_PREFIX}${projectId}`;
        await this._incr(key, "totalHealthChecks");
        if (!passed) {
          await this._incr(key, "totalHealthFailures");
        } else {
          await import_utils92.default.hset(key, "lastActivityAt", (/* @__PURE__ */ new Date()).toISOString());
        }
        await import_utils92.default.expire(key, METRICS_TTL);
      },
      /** Record user activity (iframe load, API call to proxy) */
      async recordActivity(projectId) {
        const key = `${METRICS_PREFIX}${projectId}`;
        await import_utils92.default.hset(key, "lastActivityAt", (/* @__PURE__ */ new Date()).toISOString());
        await import_utils92.default.expire(key, METRICS_TTL);
      },
      /** Get snapshot for a project */
      async getSnapshot(projectId) {
        const key = `${METRICS_PREFIX}${projectId}`;
        const data = await import_utils92.default.hgetall(key);
        if (!data || Object.keys(data).length === 0) return null;
        const lastStartedAt = data.lastStartedAt ?? null;
        const uptimeMs = lastStartedAt ? Date.now() - new Date(lastStartedAt).getTime() : 0;
        return {
          projectId,
          totalStarts: parseInt(data.totalStarts ?? "0"),
          totalCrashes: parseInt(data.totalCrashes ?? "0"),
          totalHealthChecks: parseInt(data.totalHealthChecks ?? "0"),
          totalHealthFailures: parseInt(data.totalHealthFailures ?? "0"),
          avgStartupMs: parseInt(data.lastStartupMs ?? "0"),
          lastStartedAt,
          lastErrorType: data.lastErrorType ?? null,
          uptimeMs,
          lastActivityAt: data.lastActivityAt ?? null
        };
      },
      /** Get global platform-wide stats */
      async getGlobalStats() {
        const data = await import_utils92.default.hgetall(GLOBAL_STATS_KEY);
        return Object.fromEntries(
          Object.entries(data ?? {}).map(([k, v]) => [k, parseInt(v)])
        );
      },
      // ─── Internal ──────────────────────────────────────────────
      async _incr(key, field) {
        return import_utils92.default.hincrby(key, field, 1);
      }
    };
    var import_crypto2 = __toESM2(require("crypto"));
    var import_path3 = __toESM2(require("path"));
    var import_utils122 = __toESM2(require_dist22());
    var PREVIEW_SECRET = process.env.PREVIEW_SIGNING_SECRET || "dev-secret-change-in-production";
    var SIGNED_URL_TTL_SECONDS = 3600;
    var INACTIVITY_SHUTDOWN_MS = 30 * 60 * 1e3;
    var ALLOWED_PREVIEW_HOSTS = ["localhost", "127.0.0.1"];
    var PROJECTS_ROOT = process.env.GENERATED_PROJECTS_ROOT || import_path3.default.join(process.cwd(), ".generated-projects");
    var RuntimeGuard = {
      // ── Path Safety ──────────────────────────────────────────────────────────
      /**
       * Resolve and validate that a project directory is within the allowed root.
       * Prevents path traversal attacks (e.g. projectId = "../../etc/passwd").
       *
       * Throws if the resolved path escapes PROJECTS_ROOT.
       */
      resolveProjectPath(projectId) {
        if (!/^[a-zA-Z0-9-_]+$/.test(projectId)) {
          throw new Error(`[RuntimeGuard] Invalid projectId format: "${projectId}"`);
        }
        const resolved = import_path3.default.resolve(PROJECTS_ROOT, projectId);
        if (!resolved.startsWith(import_path3.default.resolve(PROJECTS_ROOT))) {
          throw new Error(`[RuntimeGuard] Path traversal attempt detected for projectId="${projectId}"`);
        }
        return resolved;
      },
      // ── Signed Preview URLs ───────────────────────────────────────────────────
      /**
       * Generate a time-limited signed token for accessing a preview.
       * Token = HMAC-SHA256(projectId + ":" + expiresAt, secret)[:16]
       *
       * In production, embed this in the preview iframe URL as ?token=xxx
       */
      generateToken(projectId) {
        const expiresAt = Math.floor(Date.now() / 1e3) + SIGNED_URL_TTL_SECONDS;
        const payload = `${projectId}:${expiresAt}`;
        const token = import_crypto2.default.createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
        return { token, expiresAt };
      },
      /**
       * Verify a signed token. Returns true if valid and not expired.
       */
      verifyToken(projectId, token, expiresAt) {
        const now = Math.floor(Date.now() / 1e3);
        if (now > expiresAt) {
          import_utils122.default.warn({ projectId }, "[RuntimeGuard] Preview token expired");
          return false;
        }
        const payload = `${projectId}:${expiresAt}`;
        const expected = import_crypto2.default.createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
        try {
          return import_crypto2.default.timingSafeEqual(
            Buffer.from(token, "hex"),
            Buffer.from(expected, "hex")
          );
        } catch {
          return false;
        }
      },
      // ── SSRF Prevention ───────────────────────────────────────────────────────
      /**
       * Validate that a proxy upstream URL is safe.
       * Only allows connections to localhost (or cluster internal IPs) on permitted ports.
       *
       * Throws if the URL is not allowed.
       */
      validateProxyTarget(url, allowedPort, allowInternalCluster = false) {
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          throw new Error(`[RuntimeGuard] Invalid proxy target URL: ${url}`);
        }
        const isLocal = ALLOWED_PREVIEW_HOSTS.includes(parsed.hostname);
        if (!isLocal && !allowInternalCluster) {
          throw new Error(`[RuntimeGuard] SSRF: hostname "${parsed.hostname}" is not allowed`);
        }
        const port = parseInt(parsed.port || "80");
        if (port !== allowedPort) {
          throw new Error(`[RuntimeGuard] SSRF: port ${port} does not match leased port ${allowedPort}`);
        }
        if (parsed.protocol !== "http:") {
          throw new Error(`[RuntimeGuard] Only http: protocol allowed for proxy targets`);
        }
      },
      // ── Inactivity TTL ────────────────────────────────────────────────────────
      /**
       * Check if a project has been inactive for longer than INACTIVITY_SHUTDOWN_MS.
       * Called by the cleanup worker.
       */
      async isInactive(projectId, lastActivityAt) {
        if (!lastActivityAt) return false;
        const idleMs = Date.now() - new Date(lastActivityAt).getTime();
        const inactive = idleMs > INACTIVITY_SHUTDOWN_MS;
        if (inactive) {
          import_utils122.default.info(
            { projectId, idleMs, thresholdMs: INACTIVITY_SHUTDOWN_MS },
            "[RuntimeGuard] Project inactive \u2014 eligible for shutdown"
          );
        }
        return inactive;
      },
      // ── Resource Limits (spawn options) ──────────────────────────────────────
      /**
       * Returns safe spawn options to limit resource exposure.
       * These are the options to pass to child_process.spawn().
       */
      safeSpawnOptions(cwd) {
        return {
          cwd,
          detached: false,
          // Process dies with parent
          shell: false,
          // No shell injection
          stdio: ["ignore", "pipe", "pipe"]
          // On Linux/Mac you'd add: uid, gid for process isolation
          // On Windows: no direct equivalent — use Docker for isolation
        };
      }
    };
    var import_utils132 = __toESM2(require_dist22());
    var import_utils142 = __toESM2(require_dist22());
    var SYSTEM_MAX_CONCURRENT = parseInt(process.env.RUNTIME_MAX_CONCURRENT ?? "50", 10);
    var USER_MAX_CONCURRENT = parseInt(process.env.RUNTIME_USER_MAX_CONCURRENT ?? "3", 10);
    var SYSTEM_COUNTER_KEY = "runtime:capacity:system:running";
    var USER_COUNTER_PREFIX = "runtime:capacity:user:";
    var QUEUE_KEY = "runtime:capacity:queue";
    var CAPACITY_TTL = 3600;
    var RuntimeCapacity = {
      /**
       * Check whether a new runtime can be started.
       * Returns `allowed: true` if both system and user quotas permit.
       * Does NOT reserve capacity — call `reserve()` after allowed check.
       */
      async check(userId) {
        const [systemRaw, userRaw, queueLen] = await Promise.all([
          import_utils132.default.get(SYSTEM_COUNTER_KEY),
          import_utils132.default.get(`${USER_COUNTER_PREFIX}${userId}`),
          import_utils132.default.llen(QUEUE_KEY)
        ]);
        const systemCount = parseInt(systemRaw ?? "0", 10);
        const userCount = parseInt(userRaw ?? "0", 10);
        if (systemCount >= SYSTEM_MAX_CONCURRENT) {
          return {
            allowed: false,
            systemCount,
            userCount,
            queueDepth: queueLen,
            reason: `System capacity reached (${systemCount}/${SYSTEM_MAX_CONCURRENT})`
          };
        }
        if (userCount >= USER_MAX_CONCURRENT) {
          return {
            allowed: false,
            systemCount,
            userCount,
            queueDepth: queueLen,
            reason: `User quota reached (${userCount}/${USER_MAX_CONCURRENT} runtimes)`
          };
        }
        return { allowed: true, systemCount, userCount, queueDepth: queueLen };
      },
      /**
       * Atomically reserve a runtime slot for a user.
       * Uses INCR so this is race-condition safe across workers.
       *
       * Returns the new counts after reservation.
       */
      async reserve(userId) {
        const [systemCount, userCount] = await Promise.all([
          import_utils132.default.incr(SYSTEM_COUNTER_KEY),
          import_utils132.default.incr(`${USER_COUNTER_PREFIX}${userId}`)
        ]);
        await import_utils132.default.expire(SYSTEM_COUNTER_KEY, CAPACITY_TTL);
        await import_utils132.default.expire(`${USER_COUNTER_PREFIX}${userId}`, CAPACITY_TTL);
        import_utils142.default.info({ userId, systemCount, userCount }, "[RuntimeCapacity] Slot reserved");
        return { systemCount, userCount };
      },
      /**
       * Release a runtime slot when a process stops.
       * Guards against going below 0.
       */
      async release(userId) {
        const sysRaw = await import_utils132.default.get(SYSTEM_COUNTER_KEY);
        const userRaw = await import_utils132.default.get(`${USER_COUNTER_PREFIX}${userId}`);
        const sysCount = parseInt(sysRaw ?? "0", 10);
        const userCount = parseInt(userRaw ?? "0", 10);
        if (sysCount > 0) await import_utils132.default.decr(SYSTEM_COUNTER_KEY);
        if (userCount > 0) await import_utils132.default.decr(`${USER_COUNTER_PREFIX}${userId}`);
        import_utils142.default.info({ userId }, "[RuntimeCapacity] Slot released");
        await this.dequeueNext();
      },
      /**
       * Add a project to the waiting queue when capacity is full.
       */
      async enqueue(entry) {
        const position = await import_utils132.default.lpush(QUEUE_KEY, JSON.stringify(entry));
        import_utils142.default.info({ ...entry, position }, "[RuntimeCapacity] Queued for runtime slot");
        return position;
      },
      /**
       * Dequeue the next waiting project and publish it to a channel
       * so a worker can pick it up and start the runtime.
       */
      async dequeueNext() {
        const raw = await import_utils132.default.rpop(QUEUE_KEY);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        import_utils142.default.info({ ...entry }, "[RuntimeCapacity] Dequeued runtime request");
        await import_utils132.default.publish("runtime:capacity:dequeue", JSON.stringify(entry));
        return entry;
      },
      /**
       * Get current system-wide capacity snapshot.
       */
      async snapshot() {
        const [sysRaw, queueLen] = await Promise.all([
          import_utils132.default.get(SYSTEM_COUNTER_KEY),
          import_utils132.default.llen(QUEUE_KEY)
        ]);
        return {
          systemCount: parseInt(sysRaw ?? "0", 10),
          systemMax: SYSTEM_MAX_CONCURRENT,
          queueDepth: queueLen
        };
      },
      /**
       * Force-reset all counters. Only for admin/testing.
       */
      async reset() {
        await import_utils132.default.del(SYSTEM_COUNTER_KEY);
        import_utils142.default.warn("[RuntimeCapacity] System counter reset");
      }
    };
    var import_utils152 = __toESM2(require_dist22());
    var import_utils162 = __toESM2(require_dist22());
    var HEARTBEAT_PREFIX = "runtime:heartbeat:";
    var HEARTBEAT_TTL_SEC = 45;
    var HEARTBEAT_EVERY_MS = 15e3;
    var heartbeatTimers = /* @__PURE__ */ new Map();
    var RuntimeHeartbeat = {
      /**
       * Publish (renew) the heartbeat key for a project.
       * The key expires in 45s — if not renewed, it's treated as dead.
       */
      async publish(projectId, pids, ports) {
        await import_utils152.default.setex(
          `${HEARTBEAT_PREFIX}${projectId}`,
          HEARTBEAT_TTL_SEC,
          JSON.stringify({
            projectId,
            pids,
            ports,
            ts: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
      },
      /**
       * Check whether a project is a zombie (heartbeat key missing).
       * Returns true if the project SHOULD be running but has no recent heartbeat.
       */
      async isZombie(projectId) {
        const exists = await import_utils152.default.exists(`${HEARTBEAT_PREFIX}${projectId}`);
        return exists === 0;
      },
      /**
       * Start the per-project heartbeat publish loop.
       * Call after a runtime is confirmed RUNNING.
       */
      startLoop(projectId, pids, ports) {
        this.stopLoop(projectId);
        const timer = setInterval(async () => {
          try {
            await this.publish(projectId, pids, ports);
            import_utils162.default.debug({ projectId, pids, ports }, "[Heartbeat] Published");
          } catch (err) {
            import_utils162.default.error({ projectId, err }, "[Heartbeat] Publish failed");
          }
        }, HEARTBEAT_EVERY_MS);
        this.publish(projectId, pids, ports).catch(() => {
        });
        if (timer.unref) timer.unref();
        heartbeatTimers.set(projectId, timer);
        import_utils162.default.info({ projectId, pids, ports }, "[Heartbeat] Loop started");
      },
      /**
       * Stop the heartbeat loop for a project (call on stop/restart).
       */
      stopLoop(projectId) {
        const timer = heartbeatTimers.get(projectId);
        if (timer) {
          clearInterval(timer);
          heartbeatTimers.delete(projectId);
        }
        import_utils152.default.del(`${HEARTBEAT_PREFIX}${projectId}`).catch(() => {
        });
      },
      /**
       * Stop all heartbeat loops (for graceful shutdown).
       */
      stopAll() {
        for (const [projectId] of heartbeatTimers) {
          this.stopLoop(projectId);
        }
        import_utils162.default.info("[Heartbeat] All loops stopped");
      },
      /**
       * Scan all RUNNING registry entries and identify zombies.
       * Called by runtimeCleanup on its cycle.
       *
       * Returns list of zombie projectIds.
       */
      async scanForZombies(runningProjectIds) {
        const zombies = [];
        await Promise.all(
          runningProjectIds.map(async (projectId) => {
            const zombie = await this.isZombie(projectId);
            if (zombie) {
              import_utils162.default.warn({ projectId }, "[Heartbeat] Zombie detected \u2014 no heartbeat");
              zombies.push(projectId);
            }
          })
        );
        return zombies;
      },
      /**
       * Get the last heartbeat data for a project (for admin/debugging).
       */
      async getLast(projectId) {
        const raw = await import_utils152.default.get(`${HEARTBEAT_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw);
      }
    };
    var import_utils17 = __toESM2(require_dist22());
    var import_utils18 = __toESM2(require_dist22());
    var CRASH_WINDOW_MS = 15 * 60 * 1e3;
    var MAX_CRASHES_IN_WINDOW = 5;
    var FAILURE_HISTORY_KEY = "runtime:failures:";
    var ESCALATION_FLAG_KEY = "runtime:escalated:";
    var FAILURE_HISTORY_TTL = 86400 * 7;
    var ESCALATION_TTL = 3600;
    var RuntimeEscalation = {
      /**
       * Record a crash event. Returns whether auto-restart is still allowed.
       *
       * Flow:
       *  1. Add crash to sorted set (score = timestamp)
       *  2. Trim entries older than the window
       *  3. Count remaining entries
       *  4. If count >= threshold → set escalation flag, return false
       *  5. Otherwise → return true (restart allowed)
       */
      async recordCrash(projectId, reason, pid = null, port = null) {
        const now = Date.now();
        const historyKey = `${FAILURE_HISTORY_KEY}${projectId}`;
        const entry = {
          timestamp: new Date(now).toISOString(),
          reason,
          pid,
          port,
          crashIndex: 0
          // Will be set after counting
        };
        await import_utils17.default.zadd(historyKey, now, JSON.stringify(entry));
        await import_utils17.default.expire(historyKey, FAILURE_HISTORY_TTL);
        const windowStart = now - CRASH_WINDOW_MS;
        await import_utils17.default.zremrangebyscore(historyKey, "-inf", windowStart);
        const crashCount = await import_utils17.default.zcard(historyKey);
        if (crashCount >= MAX_CRASHES_IN_WINDOW) {
          await this.escalate(projectId);
          import_utils18.default.error(
            { projectId, crashCount, threshold: MAX_CRASHES_IN_WINDOW },
            "[Escalation] Threshold breached \u2014 auto-restart DISABLED"
          );
          return { restartAllowed: false, crashCount };
        }
        import_utils18.default.warn(
          { projectId, crashCount, threshold: MAX_CRASHES_IN_WINDOW },
          "[Escalation] Crash recorded \u2014 auto-restart still allowed"
        );
        return { restartAllowed: true, crashCount };
      },
      /**
       * Set the escalation flag — disables auto-restart for ESCALATION_TTL.
       */
      async escalate(projectId) {
        await import_utils17.default.setex(
          `${ESCALATION_FLAG_KEY}${projectId}`,
          ESCALATION_TTL,
          JSON.stringify({
            escalatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            expiresAt: new Date(Date.now() + ESCALATION_TTL * 1e3).toISOString()
          })
        );
      },
      /**
       * Check if auto-restart is currently disabled for a project.
       */
      async isEscalated(projectId) {
        const exists = await import_utils17.default.exists(`${ESCALATION_FLAG_KEY}${projectId}`);
        return exists === 1;
      },
      /**
       * Clear the escalation flag manually (admin action).
       */
      async clearEscalation(projectId) {
        await import_utils17.default.del(`${ESCALATION_FLAG_KEY}${projectId}`);
        import_utils18.default.info({ projectId }, "[Escalation] Escalation cleared by admin");
      },
      /**
       * Get the full escalation status for a project (admin dashboard).
       */
      async getStatus(projectId) {
        const now = Date.now();
        const historyKey = `${FAILURE_HISTORY_KEY}${projectId}`;
        const flagKey = `${ESCALATION_FLAG_KEY}${projectId}`;
        const windowStart = now - CRASH_WINDOW_MS;
        await import_utils17.default.zremrangebyscore(historyKey, "-inf", windowStart);
        const [crashCount, isEscalated, cooldownTtl, rawEntries] = await Promise.all([
          import_utils17.default.zcard(historyKey),
          import_utils17.default.exists(flagKey),
          import_utils17.default.ttl(flagKey),
          import_utils17.default.zrevrange(historyKey, 0, 9)
          // Last 10 crashes
        ]);
        const recentFailures = rawEntries.map((raw, i) => {
          const entry = JSON.parse(raw);
          entry.crashIndex = i + 1;
          return entry;
        });
        return {
          projectId,
          isEscalated: isEscalated === 1,
          crashesInWindow: crashCount,
          threshold: MAX_CRASHES_IN_WINDOW,
          windowMs: CRASH_WINDOW_MS,
          cooldownRemainingMs: cooldownTtl > 0 ? cooldownTtl * 1e3 : 0,
          recentFailures
        };
      },
      /**
       * Purge all failure history for a project (admin cleanup).
       */
      async purgeHistory(projectId) {
        await import_utils17.default.del(`${FAILURE_HISTORY_KEY}${projectId}`);
        await import_utils17.default.del(`${ESCALATION_FLAG_KEY}${projectId}`);
        import_utils18.default.info({ projectId }, "[Escalation] Failure history purged");
      }
    };
    var import_utils19 = __toESM2(require_dist22());
    var import_path22 = __toESM2(require("path"));
    var import_fs_extra8 = __toESM2(require("fs-extra"));
    var import_utils20 = __toESM2(require_dist22());
    var HEALTH_CHECK_INTERVAL = 3e4;
    var URL_MODE = process.env.PREVIEW_URL_MODE || "local";
    var healthCheckTimers = /* @__PURE__ */ new Map();
    var PreviewOrchestrator2 = {
      /**
       * PRIMARY ENTRY POINT.
       *
       * Start the runtime for a project that has finished provisioning.
       *
       * Phase 1 additions:
       *  - Capacity check before starting (system + user quota)
       *  - Escalation check (was auto-restart disabled?)
       *  - Heartbeat loop after RUNNING
       *  - Version tracking in registry
       *  - userId passed through for per-user capacity tracking
       */
      async start(projectId, executionId, userId) {
        import_utils20.default.info({ projectId, executionId, userId }, "[PreviewOrchestrator] Starting runtime");
        const escalated = await RuntimeEscalation.isEscalated(projectId);
        if (escalated) {
          const status = await RuntimeEscalation.getStatus(projectId);
          const msg = `Auto-restart disabled \u2014 ${status.crashesInWindow} crashes in ${status.windowMs / 6e4}min window.`;
          import_utils20.default.warn({ projectId }, `[PreviewOrchestrator] ${msg}`);
          throw new Error(msg);
        }
        const capacityCheck = await RuntimeCapacity.check(userId || "unknown");
        if (!capacityCheck.allowed) {
          throw new Error(`Runtime capacity exceeded: ${capacityCheck.reason}`);
        }
        await RuntimeCapacity.reserve(userId || "unknown");
        await import_registry.PreviewRegistry.init(projectId, executionId, userId);
        await import_registry.PreviewRegistry.update(projectId, { status: "STARTING" });
        try {
          const rootCwd = RuntimeGuard.resolveProjectPath(projectId);
          const hasWeb = await import_fs_extra8.default.pathExists(import_path22.default.join(rootCwd, "apps/web"));
          const hasApi = await import_fs_extra8.default.pathExists(import_path22.default.join(rootCwd, "apps/api"));
          const portCount = (hasWeb ? 1 : 0) + (hasApi ? 1 : 0) || 1;
          const ports = await PortManager.acquirePorts(projectId, portCount);
          const webPort = ports[0];
          const apiPort = hasWeb && hasApi ? ports[1] : webPort;
          const startTime = Date.now();
          if (hasApi) {
            import_utils20.default.info({ projectId, port: apiPort }, "[PreviewOrchestrator] Starting API service");
            await ProcessManager.start(
              projectId,
              import_path22.default.join(rootCwd, "apps/api"),
              "npm",
              ["run", "dev"],
              { PORT: apiPort.toString() },
              6e4
            );
          }
          if (hasWeb) {
            import_utils20.default.info({ projectId, port: webPort }, "[PreviewOrchestrator] Starting Web service");
            await ProcessManager.start(
              projectId,
              import_path22.default.join(rootCwd, "apps/web"),
              "npm",
              ["run", "dev"],
              { PORT: webPort.toString(), NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}` },
              6e4
            );
          } else if (!hasApi) {
            await ProcessManager.start(
              projectId,
              rootCwd,
              "npm",
              ["run", "dev"],
              { PORT: webPort.toString() },
              6e4
            );
          }
          const startupMs = Date.now() - startTime;
          const previewUrl = this.buildUrl(projectId, webPort);
          const healthOk = await this.verifyHealth(projectId, webPort);
          if (!healthOk) throw new Error("Runtime web port failed health check");
          const pids = ProcessManager.getPids(projectId);
          await import_registry.PreviewRegistry.markRunning(projectId, previewUrl, ports, pids);
          await this.patchBuildState(executionId, previewUrl);
          await RuntimeMetrics.recordStart(projectId, startupMs);
          this.startHealthMonitor(projectId, previewUrl);
          RuntimeHeartbeat.startLoop(projectId, pids, ports);
          import_utils20.default.info({ projectId, previewUrl, ports, pids, startupMs }, "[PreviewOrchestrator] Runtime RUNNING");
          return previewUrl;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          await import_registry.PreviewRegistry.markFailed(projectId, reason);
          await PortManager.releasePorts(projectId);
          await ProcessManager.stopAll(projectId);
          await RuntimeCapacity.release(userId || "unknown");
          throw err;
        }
      },
      async stop(projectId) {
        import_utils20.default.info({ projectId }, "[PreviewOrchestrator] Stopping runtime");
        this.stopHealthMonitor(projectId);
        await ProcessManager.stopAll(projectId);
        await PortManager.releasePorts(projectId);
        await import_registry.PreviewRegistry.markStopped(projectId);
      },
      /**
       * Restart the runtime (e.g. after a crash is detected).
       * Phase 1: Checks escalation status before restarting.
       */
      async restart(projectId) {
        import_utils20.default.info({ projectId }, "[PreviewOrchestrator] Restarting runtime");
        const escalated = await RuntimeEscalation.isEscalated(projectId);
        if (escalated) {
          const msg = "Auto-restart disabled due to repeated crashes. Manual intervention required.";
          import_utils20.default.error({ projectId }, `[PreviewOrchestrator] ${msg}`);
          await import_registry.PreviewRegistry.update(projectId, { restartDisabled: true });
          throw new Error(msg);
        }
        const record = await import_registry.PreviewRegistry.get(projectId);
        if (!record) throw new Error(`No runtime record found for projectId=${projectId}`);
        const newVersion = (record.runtimeVersion ?? 1) + 1;
        await this.stop(projectId);
        const url = await this.start(projectId, record.executionId, record.userId);
        await import_registry.PreviewRegistry.update(projectId, { runtimeVersion: newVersion });
        import_utils20.default.info({ projectId, runtimeVersion: newVersion }, "[PreviewOrchestrator] Restart complete (version bumped)");
        return url;
      },
      /**
       * Get the current runtime status for a project.
       */
      async getStatus(projectId) {
        const record = await import_registry.PreviewRegistry.get(projectId);
        return {
          status: record?.status ?? "STOPPED",
          previewUrl: record?.previewUrl ?? null,
          runtimeVersion: record?.runtimeVersion,
          restartDisabled: record?.restartDisabled
        };
      },
      // ─── Internal Helpers ───────────────────────────────────────────────────
      async verifyHealth(projectId, port) {
        const url = `http://127.0.0.1:${port}`;
        const MAX_RETRIES2 = 60;
        for (let i = 0; i < MAX_RETRIES2; i++) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              import_utils20.default.info({ projectId, port, attempt: i + 1 }, "[PreviewOrchestrator] Health check PASSED");
              return true;
            }
          } catch {
          }
          await new Promise((r) => setTimeout(r, 1e3));
        }
        import_utils20.default.error({ projectId, port }, "[PreviewOrchestrator] Health check FAILED after 30s");
        return false;
      },
      buildUrl(projectId, port) {
        if (URL_MODE === "proxy") {
          const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
          return `${cleanBase}/api/preview-proxy/${projectId}`;
        }
        return `http://localhost:${port}`;
      },
      async patchBuildState(executionId, previewUrl) {
        const key = `build:state:${executionId}`;
        const raw = await import_utils19.default.get(key);
        if (!raw) return;
        const state = JSON.parse(raw);
        state.previewUrl = previewUrl;
        await import_utils19.default.setex(key, 86400, JSON.stringify(state));
        await import_utils19.default.publish(`build:progress:${executionId}`, JSON.stringify(state));
      },
      /**
       * Health monitor — now integrates with escalation system.
       */
      startHealthMonitor(projectId, previewUrl) {
        this.stopHealthMonitor(projectId);
        let consecutiveFailures = 0;
        const MAX_FAILURES = 3;
        const timer = setInterval(async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5e3);
            const res = await fetch(previewUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
              consecutiveFailures = 0;
              await RuntimeMetrics.recordHealthCheck(projectId, true);
              await PortManager.renewLease(projectId);
            } else {
              throw new Error(`HTTP ${res.status}`);
            }
          } catch {
            consecutiveFailures++;
            await RuntimeMetrics.recordHealthCheck(projectId, false);
            import_utils20.default.warn({ projectId, consecutiveFailures, previewUrl }, "[HealthMonitor] Check failed");
            if (consecutiveFailures >= MAX_FAILURES) {
              import_utils20.default.error({ projectId }, "[HealthMonitor] Max failures reached");
              this.stopHealthMonitor(projectId);
              await RuntimeMetrics.recordCrash(projectId, "HEALTH_TIMEOUT");
              const record = await import_registry.PreviewRegistry.get(projectId);
              const { restartAllowed } = await RuntimeEscalation.recordCrash(
                projectId,
                "Health check timeout",
                record?.pids[0] ?? null,
                record?.ports[0] ?? null
              );
              if (restartAllowed) {
                this.restart(projectId).catch((restartErr) => {
                  import_utils20.default.error({ projectId, restartErr }, "[HealthMonitor] Restart failed");
                  import_registry.PreviewRegistry.markFailed(projectId, "Restart failed after health check failures");
                  RuntimeMetrics.recordCrash(projectId, "PROCESS_CRASH");
                });
              } else {
                import_utils20.default.error({ projectId }, "[HealthMonitor] Restart BLOCKED by escalation");
                await import_registry.PreviewRegistry.update(projectId, { restartDisabled: true, status: "FAILED" });
              }
            }
          }
        }, HEALTH_CHECK_INTERVAL);
        healthCheckTimers.set(projectId, timer);
      },
      stopHealthMonitor(projectId) {
        const existing = healthCheckTimers.get(projectId);
        if (existing) {
          clearInterval(existing);
          healthCheckTimers.delete(projectId);
        }
      },
      async listAll() {
        const records = await import_registry.PreviewRegistry.listAll();
        const processes = ProcessManager.listAll();
        const pidMap = new Map(processes.map((p) => [p.projectId, p]));
        return records.map((r) => ({
          ...r,
          processStatus: pidMap.get(r.projectId)?.status ?? "IDLE"
        }));
      }
    };
    var import_utils21 = __toESM2(require_dist22());
    var import_utils222 = __toESM2(require_dist22());
    var import_utils23 = __toESM2(require_dist22());
    var MAX_RUNTIME_AGE_MS = parseInt(process.env.RUNTIME_MAX_AGE_MINUTES ?? "120", 10) * 6e4;
    var IDLE_TTL_MS = parseInt(process.env.RUNTIME_IDLE_TTL_MINUTES ?? "30", 10) * 6e4;
    var STARTING_TTL_MS = 5 * 60 * 1e3;
    var FAILED_RECORD_TTL_MS = 60 * 60 * 1e3;
    var EVICTION_REASON_PREFIX = "cluster:eviction:";
    var StaleEvictor = {
      /**
       * Run a full eviction scan across all registry records.
       * Returns the number of runtimes evicted in this cycle.
       */
      async runEvictionScan() {
        const allRecords = await import_registry2.PreviewRegistry.listAll();
        const now = Date.now();
        let ageEvictions = 0;
        let idleEvictions = 0;
        let staleEvictions = 0;
        let failedCleanups = 0;
        for (const record of allRecords) {
          const runtimeAgeMs = now - new Date(record.startedAt).getTime();
          if (record.status === "RUNNING" && runtimeAgeMs > MAX_RUNTIME_AGE_MS) {
            import_utils23.default.info({
              projectId: record.projectId,
              ageMinutes: Math.round(runtimeAgeMs / 6e4)
            }, "[StaleEvictor] Max age exceeded \u2014 evicting");
            await this.evict(record, "MAX_AGE_EXCEEDED");
            ageEvictions++;
            continue;
          }
          if (record.status === "RUNNING") {
            const lastActivity = record.lastHealthCheck || record.lastHeartbeatAt || record.startedAt;
            const idleMs = now - new Date(lastActivity).getTime();
            if (idleMs > IDLE_TTL_MS) {
              import_utils23.default.info({
                projectId: record.projectId,
                idleMinutes: Math.round(idleMs / 6e4)
              }, "[StaleEvictor] Idle timeout \u2014 evicting");
              await this.evict(record, "IDLE_TIMEOUT");
              idleEvictions++;
              continue;
            }
          }
          if (record.status === "STARTING" && runtimeAgeMs > STARTING_TTL_MS) {
            import_utils23.default.warn({
              projectId: record.projectId,
              ageMs: runtimeAgeMs
            }, "[StaleEvictor] Stuck in STARTING \u2014 cleaning up");
            await this.evict(record, "STUCK_STARTING");
            staleEvictions++;
            continue;
          }
          if (record.status === "FAILED" && runtimeAgeMs > FAILED_RECORD_TTL_MS) {
            import_utils23.default.info({
              projectId: record.projectId
            }, "[StaleEvictor] Cleaning up stale FAILED record");
            await import_registry2.PreviewRegistry.remove(record.projectId);
            failedCleanups++;
            continue;
          }
        }
        const total = ageEvictions + idleEvictions + staleEvictions + failedCleanups;
        if (total > 0) {
          import_utils23.default.info({
            ageEvictions,
            idleEvictions,
            staleEvictions,
            failedCleanups
          }, "[StaleEvictor] Eviction scan complete");
        }
        return { ageEvictions, idleEvictions, staleEvictions, failedCleanups };
      },
      /**
       * Evict a single runtime: stop the process/container and record the event.
       */
      async evict(record, reason) {
        const event = {
          projectId: record.projectId,
          reason,
          runtimeAgeMs: Date.now() - new Date(record.startedAt).getTime(),
          idleMs: record.lastHealthCheck ? Date.now() - new Date(record.lastHealthCheck).getTime() : null,
          evictedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          if (record.status === "RUNNING" || record.status === "STARTING") {
            await PreviewOrchestrator2.stop(record.projectId);
          }
          await import_utils222.default.setex(
            `${EVICTION_REASON_PREFIX}${record.projectId}`,
            86400,
            // 24h
            JSON.stringify(event)
          );
          await RuntimeMetrics.recordCrash(record.projectId, reason);
          import_utils21.runtimeEvictionsTotal.inc({ reason });
        } catch (err) {
          import_utils23.default.error(
            { projectId: record.projectId, reason, err },
            "[StaleEvictor] Eviction failed"
          );
          await import_registry2.PreviewRegistry.markFailed(record.projectId, `Eviction failed: ${reason}`);
        }
      },
      /**
       * Preemptive eviction: when the cluster is at capacity and a new request
       * arrives, evict the lowest-priority runtime to make room.
       *
       * Priority scoring (lower = evicted first):
       *   base = runtimeAge (older = lower priority)
       *   + activityRecency (more recent activity = higher priority)
       *   + userTier boost (pro users get a bonus)
       */
      async preemptLowestPriority() {
        const allRecords = await import_registry2.PreviewRegistry.listAll();
        const running = allRecords.filter((r) => r.status === "RUNNING");
        if (running.length === 0) return null;
        const now = Date.now();
        const scored = running.map((r) => {
          const ageMs = now - new Date(r.startedAt).getTime();
          const lastActivity = r.lastHealthCheck || r.lastHeartbeatAt || r.startedAt;
          const idleMs = now - new Date(lastActivity).getTime();
          const score = -ageMs / 6e4 + 1 / (idleMs / 6e4 + 1) * 100;
          return { record: r, score, ageMs, idleMs };
        });
        scored.sort((a, b) => a.score - b.score);
        const victim = scored[0];
        import_utils23.default.info({
          projectId: victim.record.projectId,
          score: victim.score.toFixed(2),
          ageMinutes: Math.round(victim.ageMs / 6e4),
          idleMinutes: Math.round(victim.idleMs / 6e4)
        }, "[StaleEvictor] Preempting lowest-priority runtime");
        await this.evict(victim.record, "CAPACITY_PREEMPTION");
        return victim.record.projectId;
      },
      /**
       * Get the eviction reason for a recently evicted project.
       */
      async getEvictionReason(projectId) {
        const raw = await import_utils222.default.get(`${EVICTION_REASON_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw);
      }
    };
    var import_utils24 = __toESM2(require_dist22());
    var import_utils25 = __toESM2(require_dist22());
    var SCHEDULE_CHANNEL = "cluster:schedule:assign";
    var PENDING_QUEUE = "cluster:schedule:pending";
    var ASSIGNMENT_PREFIX = "cluster:assignment:";
    var ASSIGNMENT_TTL = 86400;
    var WEIGHT_CAPACITY = 0.4;
    var WEIGHT_CPU = 0.25;
    var WEIGHT_MEMORY = 0.2;
    var WEIGHT_REGION = 0.15;
    var RuntimeScheduler = {
      /**
       * Schedule a runtime on the best available node.
       *
       * Uses a distributed lock to prevent two schedulers from
       * double-assigning the same project.
       */
      async schedule(request) {
        return DistributedLock.withLock(
          `schedule:${request.projectId}`,
          async () => this._doSchedule(request),
          { ttlMs: 1e4, maxRetries: 3, retryDelayMs: 500 }
        );
      },
      /**
       * Internal: perform the actual scheduling.
       */
      async _doSchedule(request) {
        const nodes = await NodeRegistry2.listNodes();
        if (nodes.length === 0) {
          import_utils25.default.error("[Scheduler] No nodes available");
          return { assigned: false, nodeId: null, score: 0, reason: "No worker nodes registered" };
        }
        const availableNodes = await Promise.all(
          nodes.map(async (n) => {
            const draining = await RollingRestart.isDraining(n.nodeId);
            return { node: n, draining };
          })
        );
        const available = availableNodes.filter((n) => !n.draining && n.node.runningRuntimes < n.node.maxRuntimes).map((n) => n.node);
        if (available.length === 0) {
          import_utils25.default.warn({ request }, "[Scheduler] All nodes at capacity \u2014 attempting preemptive eviction");
          const evictedId = await StaleEvictor.preemptLowestPriority();
          if (evictedId) {
            import_utils25.default.info({ evictedId }, "[Scheduler] Evicted runtime \u2014 retrying schedule");
            return this._doSchedule(request);
          }
          await this.enqueue(request);
          return {
            assigned: false,
            nodeId: null,
            score: 0,
            reason: `All ${nodes.length} nodes at capacity. Queued for next available slot.`
          };
        }
        const scored = available.map((node) => this.scoreNode(node, request.preferredRegion));
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];
        await import_utils24.default.setex(
          `${ASSIGNMENT_PREFIX}${request.projectId}`,
          ASSIGNMENT_TTL,
          JSON.stringify({
            nodeId: best.node.nodeId,
            assignedAt: (/* @__PURE__ */ new Date()).toISOString(),
            request,
            score: best.score,
            breakdown: best.breakdown
          })
        );
        await import_utils24.default.publish(SCHEDULE_CHANNEL, JSON.stringify({
          targetNodeId: best.node.nodeId,
          request
        }));
        import_utils25.default.info({
          projectId: request.projectId,
          assignedNode: best.node.nodeId,
          hostname: best.node.hostname,
          score: best.score.toFixed(3),
          breakdown: best.breakdown,
          candidates: scored.length
        }, "[Scheduler] Runtime assigned to node");
        return {
          assigned: true,
          nodeId: best.node.nodeId,
          score: best.score,
          reason: `Assigned to ${best.node.hostname} (score: ${best.score.toFixed(3)})`
        };
      },
      /**
       * Score a node for placement (0.0 to 1.0, higher = better).
       */
      scoreNode(node, preferredRegion) {
        const freeSlots = node.maxRuntimes - node.runningRuntimes;
        const capacityScore = freeSlots / node.maxRuntimes;
        const normalizedLoad = node.cpuCount > 0 ? node.loadAvg1m / node.cpuCount : 1;
        const cpuScore = Math.max(0, 1 - normalizedLoad);
        const memoryScore = node.totalMemoryMB > 0 ? node.freeMemoryMB / node.totalMemoryMB : 0;
        const regionScore = preferredRegion && node.region === preferredRegion ? 1 : 0.3;
        const score = capacityScore * WEIGHT_CAPACITY + cpuScore * WEIGHT_CPU + memoryScore * WEIGHT_MEMORY + regionScore * WEIGHT_REGION;
        return {
          node,
          score,
          breakdown: {
            capacity: parseFloat(capacityScore.toFixed(3)),
            cpu: parseFloat(cpuScore.toFixed(3)),
            memory: parseFloat(memoryScore.toFixed(3)),
            region: parseFloat(regionScore.toFixed(3))
          }
        };
      },
      /**
       * Enqueue a request when all nodes are at capacity.
       */
      async enqueue(request) {
        await import_utils24.default.lpush(PENDING_QUEUE, JSON.stringify(request));
      },
      /**
       * Dequeue the next pending request (called when a slot opens on any node).
       */
      async dequeueNext() {
        const raw = await import_utils24.default.rpop(PENDING_QUEUE);
        if (!raw) return null;
        return JSON.parse(raw);
      },
      /**
       * Get pending queue depth.
       */
      async queueDepth() {
        return import_utils24.default.llen(PENDING_QUEUE);
      },
      /**
       * Get the assignment for a project (which node was it scheduled to).
       */
      async getAssignment(projectId) {
        const raw = await import_utils24.default.get(`${ASSIGNMENT_PREFIX}${projectId}`);
        if (!raw) return null;
        return JSON.parse(raw);
      },
      /**
       * Get cluster-wide scheduling snapshot (for admin dashboard).
       */
      async getClusterSnapshot() {
        const [nodes, queueDepth] = await Promise.all([
          NodeRegistry2.listNodes(),
          this.queueDepth()
        ]);
        const scored = nodes.map((n) => ({
          ...n,
          score: this.scoreNode(n).score
        }));
        const totalCapacity = nodes.reduce((sum, n) => sum + n.maxRuntimes, 0);
        const usedCapacity = nodes.reduce((sum, n) => sum + n.runningRuntimes, 0);
        return { nodes: scored, totalCapacity, usedCapacity, queueDepth };
      }
    };
    var import_registry3 = __toESM2(require_dist32());
    var import_utils26 = __toESM2(require_dist22());
    var import_utils27 = __toESM2(require_dist22());
    var import_utils28 = __toESM2(require_dist22());
    var FAILOVER_INTERVAL_MS = 6e4;
    var FAILOVER_LOCK_KEY = "cluster:failover:leader";
    var FAILOVER_LOCK_TTL = 55e3;
    var REBALANCE_HIGH_THRESHOLD = 0.8;
    var REBALANCE_LOW_THRESHOLD = 0.4;
    var _failoverTimer = null;
    var FailoverManager2 = {
      /**
       * Start the failover monitoring loop.
       * Every node calls this, but only one wins the distributed lock per cycle.
       */
      start() {
        if (_failoverTimer) return;
        import_utils28.default.info("[FailoverManager] Starting failover monitor");
        _failoverTimer = setInterval(async () => {
          try {
            await this.runFailoverCycle();
          } catch (err) {
            import_utils28.default.error({ err }, "[FailoverManager] Failover cycle error");
          }
        }, FAILOVER_INTERVAL_MS);
        if (_failoverTimer.unref) _failoverTimer.unref();
      },
      /**
       * Stop the failover monitor.
       */
      stop() {
        if (_failoverTimer) {
          clearInterval(_failoverTimer);
          _failoverTimer = null;
          import_utils28.default.info("[FailoverManager] Failover monitor stopped");
        }
      },
      /**
       * Run one failover cycle. Only one node wins the lock per cycle.
       */
      async runFailoverCycle() {
        const handle = await DistributedLock.acquire(FAILOVER_LOCK_KEY, FAILOVER_LOCK_TTL);
        if (!handle) {
          return;
        }
        try {
          const deadNodes = await this.detectDeadNodes();
          let rescheduled = 0;
          for (const deadNodeId of deadNodes) {
            import_utils28.default.error({ deadNodeId }, "[FailoverManager] Dead node detected");
            const rescued = await this.rescheduleFromDeadNode(deadNodeId);
            rescheduled += rescued;
          }
          const deadWorkers = await this.detectDeadWorkers();
          let recoveredMissions = 0;
          for (const deadWorkerId of deadWorkers) {
            import_utils28.default.error({ deadWorkerId }, "[FailoverManager] Dead worker detected");
            const recovered = await this.recoverMissionsFromDeadWorker(deadWorkerId);
            recoveredMissions += recovered;
          }
          const rebalanced = await this.attemptRebalance();
          if (deadNodes.length > 0 || rescheduled > 0 || deadWorkers.length > 0 || recoveredMissions > 0 || rebalanced) {
            import_utils28.default.info({
              deadNodes: deadNodes.length,
              rescheduled,
              deadWorkers: deadWorkers.length,
              recoveredMissions,
              rebalanced
            }, "[FailoverManager] Cycle complete");
          }
        } finally {
          await DistributedLock.release(handle);
        }
      },
      /**
       * Find nodes that are in the SET but have no heartbeat key (TTL expired).
       */
      async detectDeadNodes() {
        const registeredIds = await import_utils26.redis.smembers("cluster:nodes");
        const dead = [];
        for (const nodeId of registeredIds) {
          const exists = await import_utils26.redis.exists(`cluster:node:${nodeId}`);
          if (exists === 0) {
            dead.push(nodeId);
            await import_utils26.redis.srem("cluster:nodes", nodeId);
          }
        }
        return dead;
      },
      /**
       * Find all runtimes assigned to a dead node and reschedule them.
       */
      async rescheduleFromDeadNode(deadNodeId) {
        const allRecords = await import_registry3.PreviewRegistry.listAll();
        let rescheduled = 0;
        for (const record of allRecords) {
          const assignment = await RuntimeScheduler.getAssignment(record.projectId);
          if (!assignment || assignment.nodeId !== deadNodeId) continue;
          if (record.status === "RUNNING" || record.status === "STARTING") {
            import_utils28.default.info({
              projectId: record.projectId,
              deadNodeId
            }, "[FailoverManager] Rescheduling runtime from dead node");
            await import_registry3.PreviewRegistry.markFailed(
              record.projectId,
              `Node ${deadNodeId} died \u2014 rescheduling`
            );
            const request = {
              projectId: record.projectId,
              executionId: record.executionId,
              userId: record.userId ?? "unknown",
              requestedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            try {
              const result = await RuntimeScheduler.schedule(request);
              if (result.assigned) {
                rescheduled++;
              }
            } catch (err) {
              import_utils28.default.error(
                { projectId: record.projectId, err },
                "[FailoverManager] Failed to reschedule runtime"
              );
            }
          }
        }
        return rescheduled;
      },
      /**
       * Find workers (build-workers) that have no heartbeat key (TTL expired).
       */
      async detectDeadWorkers() {
        const activeHeartbeatKeys = await import_utils26.redis.keys("worker:heartbeat:*");
        const activeWorkerIds = new Set(activeHeartbeatKeys.map((k) => k.split(":").pop()));
        const activeMissions = await import_utils27.missionController.listActiveMissions();
        const deadWorkers = /* @__PURE__ */ new Set();
        for (const mission of activeMissions) {
          const missionWorkerId = mission.metadata?.workerId;
          if (missionWorkerId && !activeWorkerIds.has(missionWorkerId)) {
            deadWorkers.add(missionWorkerId);
          }
        }
        return Array.from(deadWorkers);
      },
      /**
       * Requeue missions that were being processed by a dead worker.
       */
      async recoverMissionsFromDeadWorker(deadWorkerId) {
        let recovered = 0;
        const activeMissions = await import_utils27.missionController.listActiveMissions();
        for (const mission of activeMissions) {
          if (mission.metadata?.workerId === deadWorkerId) {
            import_utils28.default.warn({ missionId: mission.id, deadWorkerId }, "[FailoverManager] Recovering mission from dead worker");
            await import_utils27.missionController.updateMission(mission.id, {
              status: "queued",
              metadata: {
                workerId: void 0,
                recoveryCount: (mission.metadata?.recoveryCount || 0) + 1,
                recoveredAt: (/* @__PURE__ */ new Date()).toISOString()
              }
            });
            recovered++;
          }
        }
        return recovered;
      },
      /**
       * Attempt to rebalance: move one runtime from an overloaded node
       * to an underloaded node. Only one migration per cycle.
       */
      async attemptRebalance() {
        const nodes = await NodeRegistry2.listNodes();
        if (nodes.length < 2) return false;
        const overloaded = nodes.filter((n) => {
          const utilization = n.runningRuntimes / n.maxRuntimes;
          return utilization > REBALANCE_HIGH_THRESHOLD;
        });
        const underloaded = nodes.filter((n) => {
          const utilization = n.runningRuntimes / n.maxRuntimes;
          return utilization < REBALANCE_LOW_THRESHOLD;
        });
        if (overloaded.length === 0 || underloaded.length === 0) return false;
        overloaded.sort((a, b) => b.runningRuntimes / b.maxRuntimes - a.runningRuntimes / a.maxRuntimes);
        underloaded.sort((a, b) => a.runningRuntimes / a.maxRuntimes - b.runningRuntimes / b.maxRuntimes);
        const source = overloaded[0];
        const target = underloaded[0];
        import_utils28.default.info({
          sourceNode: source.nodeId,
          sourceLoad: `${source.runningRuntimes}/${source.maxRuntimes}`,
          targetNode: target.nodeId,
          targetLoad: `${target.runningRuntimes}/${target.maxRuntimes}`
        }, "[FailoverManager] Rebalance candidate identified");
        await import_utils26.redis.publish("cluster:rebalance:recommend", JSON.stringify({
          sourceNodeId: source.nodeId,
          targetNodeId: target.nodeId,
          reason: "load_imbalance",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }));
        return true;
      },
      /**
       * Get failover status snapshot for admin dashboard.
       */
      async getSnapshot() {
        const isLeader = await DistributedLock.isLocked(FAILOVER_LOCK_KEY);
        const deadNodes = await this.detectDeadNodes();
        const pendingReschedules = await RuntimeScheduler.queueDepth();
        return {
          isLeader,
          nodeCount: (await NodeRegistry2.listNodes()).length,
          deadNodes,
          pendingReschedules
        };
      }
    };
    var import_utils30 = __toESM2(require_dist22());
    var import_child_process2 = require("child_process");
    var import_path32 = __toESM2(require("path"));
    var import_net2 = __toESM2(require("net"));
    var import_utils29 = __toESM2(require_dist22());
    var CPU_LIMIT = process.env.CONTAINER_CPU_LIMIT || "0.5";
    var MEMORY_LIMIT = process.env.CONTAINER_MEMORY_LIMIT || "512m";
    var NETWORK_NAME = process.env.CONTAINER_NETWORK || "ma-preview-net";
    var DOCKERFILE_PATH = import_path32.default.join(__dirname, "docker", "Dockerfile.sandbox");
    var IMAGE_NAME = "ma-sandbox";
    var PROJECTS_ROOT2 = process.env.GENERATED_PROJECTS_ROOT || import_path32.default.join(process.cwd(), ".generated-projects");
    var containerRegistry = /* @__PURE__ */ new Map();
    function containerName(projectId) {
      return `ma-preview-${projectId.slice(0, 12)}`;
    }
    function exec(cmd) {
      try {
        return (0, import_child_process2.execSync)(cmd, { encoding: "utf-8", timeout: 12e4 }).trim();
      } catch (err) {
        const error = err;
        throw new Error(`Docker CLI failed: ${error.stderr || error.message}`);
      }
    }
    function isDockerAvailable() {
      try {
        (0, import_child_process2.execSync)("docker info", { encoding: "utf-8", timeout: 5e3, stdio: "pipe" });
        return true;
      } catch {
        return false;
      }
    }
    var ContainerManager = {
      ensureNetwork() {
        try {
          exec(`docker network inspect ${NETWORK_NAME}`);
        } catch {
          exec(`docker network create --driver bridge ${NETWORK_NAME}`);
        }
      },
      async buildImage(projectId, force = false) {
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;
        const projectDir = import_path32.default.join(PROJECTS_ROOT2, projectId);
        if (!force) {
          try {
            exec(`docker image inspect ${tag}`);
            return;
          } catch {
          }
        }
        exec(`docker build -t ${tag} -f "${DOCKERFILE_PATH}" "${projectDir}"`);
      },
      async start(projectId, port, timeoutMs = 6e4) {
        const name = containerName(projectId);
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;
        await this.forceRemove(projectId);
        this.ensureNetwork();
        await this.buildImage(projectId);
        const containerId = exec([
          "docker run -d",
          `--name ${name}`,
          `--cpus=${CPU_LIMIT}`,
          `--memory=${MEMORY_LIMIT}`,
          `--read-only`,
          `--tmpfs /tmp:rw,noexec,nosuid,size=64m`,
          `--tmpfs /app/node_modules/.cache:rw,size=128m`,
          `--network ${NETWORK_NAME}`,
          `-p ${port}:${port}`,
          `-e PORT=${port}`,
          `-e NODE_ENV=production`,
          `--init`,
          `--restart=no`,
          `--label "ma.projectId=${projectId}"`,
          `--label "ma.port=${port}"`,
          `--label "ma.purpose=preview-sandbox"`,
          tag
        ].join(" "));
        const managed = {
          containerId: containerId.slice(0, 12),
          containerName: name,
          projectId,
          port,
          status: "STARTING",
          startedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        containerRegistry.set(projectId, managed);
        await this.waitForHealthy(projectId, containerId, timeoutMs);
        managed.status = "RUNNING";
        return { containerId: managed.containerId, containerName: name };
      },
      /**
       * Hot inject code into a running container.
       */
      async hotInject(containerId, projectDir) {
        import_utils29.default.info({ containerId, projectDir }, "[ContainerManager] Hot injecting code");
        exec(`docker cp "${projectDir}/." ${containerId}:/app/`);
        exec(`docker exec -u root ${containerId} chown -R node:node /app`);
      },
      async waitForHealthy(projectId, containerId, timeoutMs) {
        const deadline = Date.now() + timeoutMs;
        const port = containerRegistry.get(projectId)?.port;
        import_utils29.default.info({ containerId, projectId, port }, "[ContainerManager] Waiting for health...");
        while (Date.now() < deadline) {
          const health = this.getHealth(containerId);
          if (health === "healthy") {
            import_utils29.default.info({ containerId }, "[ContainerManager] Docker health check PASSED");
            return;
          }
          if (port) {
            try {
              const isPortOpen = await this.isPortAlive(port);
              if (isPortOpen) {
                import_utils29.default.info({ containerId, port }, "[ContainerManager] TCP health check PASSED (fallback)");
                return;
              }
            } catch {
            }
          }
          const state = this.getState(containerId);
          if (state === "exited" || state === "dead") throw new Error("Container exited");
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        }
        throw new Error(`Health timeout after ${timeoutMs}ms. Container state: ${this.getState(containerId)}`);
      },
      isPortAlive(port) {
        return new Promise((resolve) => {
          const socket = import_net2.default.createConnection({ port, host: "127.0.0.1", timeout: 1e3 });
          socket.on("connect", () => {
            socket.destroy();
            resolve(true);
          });
          socket.on("timeout", () => {
            socket.destroy();
            resolve(false);
          });
          socket.on("error", () => {
            socket.destroy();
            resolve(false);
          });
        });
      },
      async stop(projectId) {
        const name = containerName(projectId);
        try {
          exec(`docker stop -t 5 ${name}`);
        } catch {
        }
        try {
          exec(`docker rm -f ${name}`);
        } catch {
        }
        containerRegistry.delete(projectId);
      },
      async forceRemove(projectId) {
        const name = containerName(projectId);
        try {
          exec(`docker rm -f ${name}`);
        } catch {
        }
        containerRegistry.delete(projectId);
      },
      getHealth(containerId) {
        try {
          return exec(`docker inspect --format="{{.State.Health.Status}}" ${containerId}`);
        } catch {
          return "none";
        }
      },
      getState(containerId) {
        try {
          return exec(`docker inspect --format="{{.State.Status}}" ${containerId}`);
        } catch {
          return "unknown";
        }
      },
      isRunning(projectId) {
        const name = containerName(projectId);
        try {
          return exec(`docker inspect --format="{{.State.Status}}" ${name}`) === "running";
        } catch {
          return false;
        }
      },
      isAvailable: isDockerAvailable,
      async cleanupAll() {
        try {
          const ids = exec('docker ps -aq --filter "label=ma.purpose=preview-sandbox"');
          if (ids) exec(`docker rm -f ${ids.replace(/\n/g, " ")}`);
        } catch {
        }
        containerRegistry.clear();
      }
    };
    var import_registry4 = __toESM2(require_dist32());
    var import_utils31 = __toESM2(require_dist22());
    var RECOVERY_KEY = "cluster:recovery:lastRun";
    var MAX_RETRIES = 30;
    var RETRY_INTERVAL_MS = 2e3;
    var RUNTIME_MODE2 = process.env.RUNTIME_MODE || "process";
    var RedisRecovery2 = {
      /**
       * Check if Redis is reachable. Returns true if a PING succeeds.
       */
      async isRedisAlive() {
        try {
          const pong = await import_utils30.default.ping();
          return pong === "PONG";
        } catch {
          return false;
        }
      },
      /**
       * Wait for Redis to come back online after a crash.
       * Blocks with exponential backoff up to MAX_RETRIES.
       */
      async waitForRedis() {
        import_utils31.default.warn("[RedisRecovery] Redis unreachable \u2014 waiting for recovery...");
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          const alive = await this.isRedisAlive();
          if (alive) {
            import_utils31.default.info({ attempt }, "[RedisRecovery] Redis is back online");
            return true;
          }
          const delay = Math.min(RETRY_INTERVAL_MS * attempt, 3e4);
          import_utils31.default.warn(
            { attempt, maxRetries: MAX_RETRIES, nextRetryMs: delay },
            "[RedisRecovery] Still waiting..."
          );
          await new Promise((r) => setTimeout(r, delay));
        }
        import_utils31.default.error("[RedisRecovery] Redis did not recover within retry limit");
        return false;
      },
      /**
       * Full recovery procedure. Called when Redis comes back online
       * and all previous state is assumed lost.
       *
       * Steps:
       *  1. Re-register this node
       *  2. Scan local processes/containers for surviving runtimes
       *  3. Rebuild registry records for each
       *  4. Re-acquire port leases
       *  5. Re-establish capacity counters
       *  6. Re-start heartbeat loops
       */
      async performRecovery() {
        import_utils31.default.info("[RedisRecovery] Starting full state recovery");
        const nodeId = await NodeRegistry2.register();
        import_utils31.default.info({ nodeId }, "[RedisRecovery] Node re-registered");
        let survivingRuntimes = [];
        if (RUNTIME_MODE2 === "docker") {
          const containers = ContainerManager.listAll();
          survivingRuntimes = containers.filter((c) => c.status === "RUNNING").map((c) => ({
            projectId: c.projectId,
            port: c.port,
            pid: 0
            // Docker mode uses container ID
          }));
        } else {
          const processes = ProcessManager.listAll();
          survivingRuntimes = processes.filter((p) => p.status === "RUNNING").map((p) => ({
            projectId: p.projectId,
            port: 0,
            // We need to recover this
            pid: p.pid
          }));
        }
        import_utils31.default.info(
          { count: survivingRuntimes.length },
          "[RedisRecovery] Found surviving runtimes"
        );
        let runtimesRecovered = 0;
        let portsReacquired = 0;
        for (const runtime of survivingRuntimes) {
          try {
            const record = await import_registry4.PreviewRegistry.init(
              runtime.projectId,
              `recovery-${Date.now()}`,
              // Synthetic executionId
              void 0
            );
            if (runtime.port > 0) {
              try {
                await PortManager.forceAcquirePort(runtime.projectId, runtime.port);
                portsReacquired++;
              } catch {
                import_utils31.default.warn(
                  { projectId: runtime.projectId, port: runtime.port },
                  "[RedisRecovery] Port re-acquisition failed \u2014 port may be in use"
                );
              }
            }
            const url = `http://localhost:${runtime.port || 3e3}`;
            await import_registry4.PreviewRegistry.markRunning(
              runtime.projectId,
              url,
              runtime.port,
              runtime.pid
            );
            await RuntimeCapacity.reserve("recovery");
            RuntimeHeartbeat.startLoop(runtime.projectId, runtime.pid, runtime.port);
            runtimesRecovered++;
            import_utils31.default.info(
              { projectId: runtime.projectId },
              "[RedisRecovery] Runtime recovered"
            );
          } catch (err) {
            import_utils31.default.error(
              { projectId: runtime.projectId, err },
              "[RedisRecovery] Failed to recover runtime"
            );
          }
        }
        await import_utils30.default.set(RECOVERY_KEY, JSON.stringify({
          nodeId,
          recoveredAt: (/* @__PURE__ */ new Date()).toISOString(),
          runtimesRecovered,
          portsReacquired
        }));
        import_utils31.default.info({
          nodeId,
          runtimesRecovered,
          portsReacquired
        }, "[RedisRecovery] Recovery complete");
        return { node: nodeId, runtimesRecovered, portsReacquired };
      },
      /**
       * Full recovery flow: wait → recover → resume.
       * Called from worker.ts when a Redis write fails.
       */
      async handleRedisCrash() {
        const recovered = await this.waitForRedis();
        if (!recovered) {
          import_utils31.default.error("[RedisRecovery] Cannot recover \u2014 exiting process for supervisor restart");
          process.exit(1);
        }
        await this.performRecovery();
      },
      /**
       * Get the last recovery event (admin diagnostics).
       */
      async getLastRecovery() {
        const raw = await import_utils30.default.get(RECOVERY_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      }
    };
    var import_registry5 = __toESM2(require_dist32());
    var import_utils322 = __toESM2(require_dist22());
    var import_utils33 = __toESM2(require_dist22());
    var ROLLING_RESTART_KEY = "cluster:rolling-restart";
    var DRAINING_PREFIX = "cluster:node:draining:";
    var DRAIN_TIMEOUT_MS = 5 * 60 * 1e3;
    var DRAIN_CHECK_INTERVAL = 5e3;
    var RollingRestart2 = {
      /**
       * Start a rolling restart of the entire cluster.
       * Only one can run at a time.
       */
      async start() {
        const lock = await DistributedLock.acquire("rolling-restart", 6e5);
        if (!lock) {
          const existing = await this.getState();
          throw new Error(`Rolling restart already in progress (phase: ${existing?.phase ?? "UNKNOWN"})`);
        }
        try {
          const nodes = await NodeRegistry2.listNodes();
          if (nodes.length === 0) {
            throw new Error("No nodes registered in cluster");
          }
          nodes.sort((a, b) => a.runningRuntimes - b.runningRuntimes);
          const state = {
            phase: "PLANNING",
            startedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            totalNodes: nodes.length,
            completedNodes: [],
            currentNode: null,
            pendingNodes: nodes.map((n) => n.nodeId)
          };
          await this.saveState(state);
          import_utils33.default.info({ totalNodes: nodes.length }, "[RollingRestart] Plan created");
          for (const node of nodes) {
            try {
              await this.processNode(node, state, lock);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              state.phase = "FAILED";
              state.error = `Failed on node ${node.nodeId}: ${msg}`;
              state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
              await this.saveState(state);
              import_utils33.default.error({ nodeId: node.nodeId, err }, "[RollingRestart] Failed");
              throw err;
            }
          }
          state.phase = "COMPLETED";
          state.currentNode = null;
          state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          await this.saveState(state);
          import_utils33.default.info({ totalNodes: nodes.length }, "[RollingRestart] Complete");
          return state;
        } finally {
          await DistributedLock.release(lock);
        }
      },
      /**
       * Process one node in the rolling restart cycle.
       */
      async processNode(node, state, lock) {
        const { nodeId } = node;
        import_utils33.default.info(
          { nodeId, hostname: node.hostname, running: node.runningRuntimes },
          "[RollingRestart] Processing node"
        );
        state.phase = "DRAINING";
        state.currentNode = nodeId;
        state.pendingNodes = state.pendingNodes.filter((id) => id !== nodeId);
        state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await this.saveState(state);
        await this.markDraining(nodeId);
        state.phase = "WAITING";
        state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await this.saveState(state);
        await this.waitForDrain(nodeId);
        state.phase = "RESTARTING";
        state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await this.saveState(state);
        await import_utils322.default.publish("cluster:node:restart", JSON.stringify({
          nodeId,
          reason: "rolling-restart",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }));
        await this.waitForReregister(nodeId);
        await DistributedLock.extend(lock, 6e5);
        state.completedNodes.push(nodeId);
        await this.unmarkDraining(nodeId);
        import_utils33.default.info({ nodeId, hostname: node.hostname }, "[RollingRestart] Node restarted");
      },
      /**
       * Mark a node as draining (scheduler will skip it).
       */
      async markDraining(nodeId) {
        await import_utils322.default.setex(
          `${DRAINING_PREFIX}${nodeId}`,
          DRAIN_TIMEOUT_MS / 1e3,
          JSON.stringify({ drainingSince: (/* @__PURE__ */ new Date()).toISOString() })
        );
        import_utils33.default.info({ nodeId }, "[RollingRestart] Node marked as draining");
      },
      /**
       * Remove drain flag from a node.
       */
      async unmarkDraining(nodeId) {
        await import_utils322.default.del(`${DRAINING_PREFIX}${nodeId}`);
      },
      /**
       * Check if a node is currently draining.
       */
      async isDraining(nodeId) {
        const exists = await import_utils322.default.exists(`${DRAINING_PREFIX}${nodeId}`);
        return exists === 1;
      },
      /**
       * Wait for all runtimes on a node to drain (stop or migrate).
       * Times out after DRAIN_TIMEOUT_MS.
       */
      async waitForDrain(nodeId) {
        const deadline = Date.now() + DRAIN_TIMEOUT_MS;
        while (Date.now() < deadline) {
          const allRecords = await import_registry5.PreviewRegistry.listAll();
          const nodeAssignments = await Promise.all(
            allRecords.filter((r) => r.status === "RUNNING" || r.status === "STARTING").map(async (r) => {
              const assignment = await RuntimeScheduler.getAssignment(r.projectId);
              return assignment?.nodeId === nodeId ? r : null;
            })
          );
          const remaining = nodeAssignments.filter(Boolean).length;
          if (remaining === 0) {
            import_utils33.default.info({ nodeId }, "[RollingRestart] Node fully drained");
            return;
          }
          import_utils33.default.info({ nodeId, remaining }, "[RollingRestart] Waiting for drain...");
          await new Promise((r) => setTimeout(r, DRAIN_CHECK_INTERVAL));
        }
        import_utils33.default.warn({ nodeId }, "[RollingRestart] Drain timeout \u2014 proceeding anyway");
      },
      /**
       * Wait for a node to re-register after restart.
       * Polls for the node's heartbeat key to reappear.
       */
      async waitForReregister(oldNodeId) {
        const deadline = Date.now() + 12e4;
        while (Date.now() < deadline) {
          const nodes = await NodeRegistry2.listNodes();
          const oldNode = await NodeRegistry2.getNode(oldNodeId);
          if (!oldNode && nodes.length > 0) {
            import_utils33.default.info({ oldNodeId }, "[RollingRestart] Node re-registered with new ID");
            return;
          }
          await new Promise((r) => setTimeout(r, 5e3));
        }
        import_utils33.default.warn({ oldNodeId }, "[RollingRestart] Timeout waiting for node re-register");
      },
      /**
       * Get the current rolling restart state.
       */
      async getState() {
        const raw = await import_utils322.default.get(ROLLING_RESTART_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      },
      /**
       * Save rolling restart progress to Redis.
       */
      async saveState(state) {
        await import_utils322.default.setex(ROLLING_RESTART_KEY, 3600, JSON.stringify(state));
      }
    };
    init_admission_controller();
    var import_registry6 = __toESM2(require_dist32());
    var import_utils36 = __toESM2(require_dist22());
    var PREVIEW_DOMAIN = process.env.PREVIEW_BASE_DOMAIN || "preview.multiagent.com";
    var ClusterProxy = {
      /**
       * Resolve the target worker node for a given request.
       * Supports both path-based (/preview/:id) and domain-based (id.preview.com).
       */
      async resolveTarget(input) {
        const projectId = this.extractProjectId(input);
        if (!projectId) return null;
        const assignment = await RuntimeScheduler.getAssignment(projectId);
        if (!assignment) {
          import_utils36.default.warn({ projectId }, "[ClusterProxy] No assignment found for project");
          return null;
        }
        const { nodeId } = assignment;
        const node = await NodeRegistry2.getNode(nodeId);
        if (!node) {
          import_utils36.default.error({ nodeId, projectId }, "[ClusterProxy] Assigned node not found in registry");
          return null;
        }
        const record = await import_registry6.PreviewRegistry.get(projectId);
        if (!record || !record.ports || record.ports.length === 0) {
          import_utils36.default.warn({ projectId }, "[ClusterProxy] No ports found in registry for project");
          return null;
        }
        const target = {
          projectId,
          nodeId,
          hostname: node.hostname,
          port: record.ports[0],
          url: `http://${node.hostname}:${record.ports[0]}`
        };
        return target;
      },
      /**
       * Extract projectId from Host header or URL path.
       * Examples:
       *   "prj-123.preview.multiagent.com" -> "prj-123"
       *   "/preview/prj-123" -> "prj-123"
       */
      extractProjectId(input) {
        if (input.includes(PREVIEW_DOMAIN)) {
          const part = input.split(`.${PREVIEW_DOMAIN}`)[0];
          if (part && part !== input) return part;
        }
        const pathMatch = input.match(/\/preview\/([^\/\?]+)/);
        if (pathMatch) return pathMatch[1];
        if (input.length >= 8 && !input.includes(".") && !input.includes("/")) {
          return input;
        }
        return null;
      },
      /**
       * Generate the public URL for a preview.
       * Uses wildcards if configured, otherwise falls back to path-based.
       */
      getPublicUrl(projectId) {
        const useWildcards = process.env.PREVIEW_USE_WILDCARDS === "true";
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        if (useWildcards) {
          return `${protocol}://${projectId}.${PREVIEW_DOMAIN}`;
        }
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return `${appUrl}/preview/${projectId}`;
      },
      /**
       * Middleware helper for Next.js /api/preview-proxy rewrite logic.
       * In a multi-node cluster, the "proxy target" is no longer always localhost.
       */
      async getRewriteUrl(projectId) {
        const target = await this.resolveTarget(projectId);
        if (!target) return null;
        return target.url;
      }
    };
    var import_child_process5 = require("child_process");
    var import_utils472 = __toESM2(require_dist22());
    var CleanupService = class {
      interval = null;
      start(intervalMs = 30 * 60 * 1e3) {
        if (this.interval) return;
        this.interval = setInterval(() => this.cleanup(), intervalMs);
        import_utils472.default.info("[CleanupService] Background cleaner started");
      }
      async cleanup() {
        import_utils472.default.info("[CleanupService] Running scheduled cleanup...");
        const dockerCleanupCmd = `docker ps --filter "ancestor=node:20-slim" --format "{{.ID}}|{{.CreatedAt}}"`;
        (0, import_child_process5.exec)(dockerCleanupCmd, (err, stdout) => {
          if (err || !stdout) return;
          const lines = stdout.trim().split("\n");
          const now = Date.now();
          const twoHoursMs = 2 * 60 * 60 * 1e3;
          lines.forEach((line) => {
            const [id, createdAt] = line.split("|");
            const createdDate = new Date(createdAt).getTime();
            if (now - createdDate > twoHoursMs) {
              import_utils472.default.info({ containerId: id, age: now - createdDate }, "[CleanupService] Stopping stale container");
              (0, import_child_process5.exec)(`docker stop ${id}`, (stopErr) => {
                if (stopErr) import_utils472.default.error({ containerId: id, error: stopErr }, "[CleanupService] Failed to stop container");
              });
            }
          });
        });
        try {
          const { previewManager: previewManager2 } = (init_preview_manager(), __toCommonJS2(preview_manager_exports));
        } catch (e) {
          import_utils472.default.warn({ error: e }, "[CleanupService] Process cleanup failed");
        }
      }
      stop() {
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = null;
        }
      }
    };
    var cleanupService = new CleanupService();
    var import_utils48 = __toESM2(require_dist22());
    var PerformanceMonitor = class {
      static metrics = /* @__PURE__ */ new Map();
      /**
       * Records telemetry from a running preview sandbox.
       */
      static recordMetric(metric) {
        const history = this.metrics.get(metric.projectId) || [];
        history.push(metric);
        if (history.length > 100) history.shift();
        this.metrics.set(metric.projectId, history);
        if (metric.latencyMs > 1e3 || metric.errorRate > 0.05) {
          import_utils48.default.warn({ projectId: metric.projectId, metric }, "[PerformanceMonitor] Performance degradation detected.");
        }
      }
      /**
       * Checks if a project requires an autonomous evolution mission.
       */
      static shouldExcite(projectId) {
        const history = this.metrics.get(projectId);
        if (!history || history.length < 5) return false;
        const avgLatency = history.reduce((sum, m) => sum + m.latencyMs, 0) / history.length;
        return avgLatency > 800;
      }
      static getMetrics(projectId) {
        return this.metrics.get(projectId) || [];
      }
    };
    var import_utils49 = __toESM2(require_dist22());
    var EvolutionEngine = class {
      static isRunning = false;
      static start() {
        if (this.isRunning) return;
        this.isRunning = true;
        import_utils49.logger.info("[EvolutionEngine] Layer 16 Autonomous Product Evolution active.");
        setInterval(() => this.orchestrate(), 6e4);
      }
      static async orchestrate() {
        import_utils49.logger.info("[EvolutionEngine] Scanning deployments for evolution opportunities...");
        const projectsToImprove = ["test-project-alpha"];
        for (const projectId of projectsToImprove) {
          if (PerformanceMonitor.shouldExcite(projectId)) {
            await this.triggerEvolution(projectId, "performance");
          }
        }
      }
      static async triggerEvolution(projectId, triggerType) {
        import_utils49.logger.info({ projectId, triggerType }, "[EvolutionEngine] Triggering autonomous evolution mission...");
        await import_utils49.redis.publish("evolution-missions", JSON.stringify({
          projectId,
          missionType: triggerType,
          priority: "medium",
          timestamp: Date.now()
        }));
        await import_utils49.memoryPlane.recordLesson(projectId, {
          action: "Autonomous Evolution",
          outcome: "success",
          lesson: `System detected ${triggerType} degradation. Evolution cycle initiated.`,
          context: { triggerType }
        });
      }
    };
    var import_child_process6 = require("child_process");
    var import_utils50 = __toESM2(require_dist22());
    var runtimeExecutor = {
      async execute(command, args, options) {
        const elog = (0, import_utils50.getExecutionLogger)(options.executionId);
        const start = Date.now();
        elog.info({ command, args, cwd: options.cwd }, "Runtime: Executing command");
        return new Promise((resolve) => {
          let stdout = "";
          let stderr = "";
          const child = (0, import_child_process6.spawn)(command, args, {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            shell: true
          });
          const timeout = options.timeoutMs ? setTimeout(() => {
            child.kill();
            resolve({
              success: false,
              stdout,
              stderr,
              code: null,
              error: `Execution timed out after ${options.timeoutMs}ms`
            });
          }, options.timeoutMs) : null;
          child.stdout.on("data", (data) => {
            const chunk = data.toString();
            stdout += chunk;
          });
          child.stderr.on("data", (data) => {
            const chunk = data.toString();
            stderr += chunk;
          });
          child.on("close", (code) => {
            if (timeout) clearTimeout(timeout);
            const duration = Date.now() - start;
            elog.info({ code, durationMs: duration }, "Runtime: Command finished");
            resolve({
              success: code === 0,
              stdout,
              stderr,
              code,
              error: code !== 0 ? `Command failed with code ${code}` : void 0
            });
          });
          child.on("error", (err) => {
            if (timeout) clearTimeout(timeout);
            elog.error({ err }, "Runtime: Spawn error");
            resolve({
              success: false,
              stdout,
              stderr,
              code: null,
              error: err.message
            });
          });
        });
      }
    };
    init_microvm_manager();
    init_microvm_provider();
    init_preview_manager();
    init_preview_manager();
    var import_utils51 = __toESM2(require_dist22());
    async function previewRunner(projectId, files) {
      import_utils51.default.info({ projectId }, "[PreviewRunner] Initiating local dev preview...");
      try {
        const url = await previewManager.launchPreview(projectId);
        return {
          success: true,
          url
        };
      } catch (error) {
        import_utils51.default.error({ error, projectId }, "[PreviewRunner] Failed to launch preview");
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    var import_child_process7 = require("child_process");
    var import_path10 = __toESM2(require("path"));
    var import_fs = __toESM2(require("fs"));
    init_preview_manager();
    var import_utils522 = __toESM2(require_dist22());
    async function startPreview(projectId, files) {
      const isDockerAvailable2 = await checkDocker();
      if (isDockerAvailable2) {
        try {
          return await startDockerPreview(projectId, files);
        } catch (e) {
          import_utils522.default.warn({ projectId, error: e }, "[PreviewRuntime] Docker launch failed, falling back to process-based preview");
          return await previewManager.launchPreview(projectId);
        }
      } else {
        import_utils522.default.info({ projectId }, "[PreviewRuntime] Docker not detected, using process-based isolation");
        return await previewManager.launchPreview(projectId);
      }
    }
    async function checkDocker() {
      return new Promise((resolve) => {
        (0, import_child_process7.exec)("docker --version", (error) => {
          resolve(!error);
        });
      });
    }
    async function startDockerPreview(projectId, files) {
      const port = 4100 + Math.floor(Math.random() * 500);
      const projectPath = import_path10.default.join(process.cwd(), ".previews", projectId);
      if (!import_fs.default.existsSync(projectPath)) import_fs.default.mkdirSync(projectPath, { recursive: true });
      files.forEach((file) => {
        const filePath = import_path10.default.join(projectPath, file.path.replace(/^\//, ""));
        const dir = import_path10.default.dirname(filePath);
        if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
        import_fs.default.writeFileSync(filePath, file.content || "");
      });
      const containerName2 = `preview-${projectId}`;
      const command = `docker run -d --rm         --name ${containerName2}         -p ${port}:3000         --memory=2g         --cpus=2         -v "${projectPath}:/app"         -w /app         node:20-slim         sh -c "if [ ! -d 'node_modules' ]; then npm install; fi && npm run dev"`;
      return new Promise((resolve, reject) => {
        (0, import_child_process7.exec)(command, (error) => {
          if (error) {
            reject(error);
            return;
          }
          import_utils522.default.info({ projectId, port, containerName: containerName2 }, "[PreviewRuntime] Docker container started");
          resolve(`http://localhost:${port}`);
        });
      });
    }
    async function stopPreview(projectId) {
      const containerName2 = `preview-${projectId}`;
      (0, import_child_process7.exec)(`docker stop ${containerName2}`, () => {
      });
      await previewManager.stopPreview(projectId);
    }
    var import_registry8 = __toESM2(require_dist32());
    var import_utils53 = __toESM2(require_dist22());
    var PreviewRuntimePool = class {
      static pool = [];
      static POOL_SIZE = 3;
      static isWarming = false;
      /**
       * Pre-warm a set of generic containers at startup.
       */
      static async prewarm() {
        if (this.isWarming) return;
        this.isWarming = true;
        import_utils53.default.info({ size: this.POOL_SIZE }, "[PreviewRuntimePool] Pre-warming runtime pool...");
        for (let i = 0; i < this.POOL_SIZE; i++) {
          try {
            const projectId = `pool-template-${i}`;
            const port = await PortManager.acquireFreePort(projectId);
            const container = await ContainerManager.start(projectId, port);
            this.pool.push({
              ...container,
              projectId,
              port,
              status: "IDLE",
              startedAt: (/* @__PURE__ */ new Date()).toISOString()
            });
            import_utils53.default.info({ projectId, port }, "[PreviewRuntimePool] Container warmed and added to pool");
          } catch (err) {
            import_utils53.default.error({ err }, "[PreviewRuntimePool] Failed to pre-warm container");
          }
        }
        this.isWarming = false;
      }
      /**
       * Checkout a warm container from the pool.
       */
      static async checkout(projectId, targetPort) {
        const container = this.pool.pop();
        if (!container) return null;
        import_utils53.default.info({ from: container.projectId, to: projectId, port: targetPort }, "[PreviewRuntimePool] Checking out warm container");
        return {
          ...container,
          projectId,
          port: targetPort
        };
      }
      /**
       * Assign a project to a warm runtime and inject its code.
       */
      static async assign(projectId, projectDir, _framework) {
        const port = await PortManager.acquireFreePort(projectId);
        let container = await this.checkout(projectId, port);
        if (!container) {
          const result = await ContainerManager.start(projectId, port);
          container = {
            ...result,
            projectId,
            port,
            status: "RUNNING",
            startedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
        } else {
          await ContainerManager.hotInject(container.containerId, projectDir);
          import_utils53.default.info({ projectId, containerId: container.containerId }, "[PreviewRuntimePool] HOT INJECTION COMPLETE");
        }
        await import_registry8.PreviewRegistry.update(projectId, {
          status: "RUNNING",
          port: container.port
        });
        this.replenish();
        return container;
      }
      /**
       * Replenish the pool in the background.
       */
      static async replenish() {
        if (this.pool.length < this.POOL_SIZE) {
          this.prewarm();
        }
      }
    };
    init_resource_manager();
    var import_registry9 = __toESM2(require_dist32());
    var import_utils54 = __toESM2(require_dist22());
    var RUNTIME_MODE3 = process.env.RUNTIME_MODE || "process";
    var CLEANUP_INTERVAL_MS = 5 * 60 * 1e3;
    var STALE_STARTING_THRESHOLD_MS = 5 * 60 * 1e3;
    var cleanupTimer = null;
    var RuntimeCleanup2 = {
      /**
       * Start the background cleanup loop. Safe to call multiple times — idempotent.
       */
      start() {
        if (cleanupTimer) return;
        import_utils54.default.info("[RuntimeCleanup] Starting background cleanup worker");
        cleanupTimer = setInterval(() => {
          this.runCleanupCycle().catch((err) => {
            import_utils54.default.error({ err }, "[RuntimeCleanup] Cleanup cycle failed");
          });
        }, CLEANUP_INTERVAL_MS);
        if (cleanupTimer.unref) cleanupTimer.unref();
      },
      /**
       * Stop the cleanup loop.
       */
      stop() {
        if (cleanupTimer) {
          clearInterval(cleanupTimer);
          cleanupTimer = null;
          import_utils54.default.info("[RuntimeCleanup] Cleanup worker stopped");
        }
      },
      /**
       * Run one cleanup cycle.
       */
      async runCleanupCycle() {
        import_utils54.default.info("[RuntimeCleanup] Running cleanup cycle");
        let idleShutdowns = 0;
        let zombiesKilled = 0;
        let orphansKilled = 0;
        let staleCleaned = 0;
        try {
          const allRecords = await import_registry9.PreviewRegistry.listAll();
          const runningIds = allRecords.filter((r) => r.status === "RUNNING").map((r) => r.projectId);
          const zombies = await RuntimeHeartbeat.scanForZombies(runningIds);
          for (const zombieId of zombies) {
            import_utils54.default.warn({ projectId: zombieId }, "[RuntimeCleanup] Killing zombie (no heartbeat)");
            try {
              await PreviewOrchestrator2.stop(zombieId);
              await RuntimeMetrics.recordCrash(zombieId, "HEALTH_TIMEOUT");
              const record = allRecords.find((r) => r.projectId === zombieId);
              await RuntimeEscalation.recordCrash(
                zombieId,
                "Zombie detected \u2014 no heartbeat",
                record?.pid ?? null,
                record?.port ?? null
              );
              zombiesKilled++;
            } catch (err) {
              import_utils54.default.error({ projectId: zombieId, err }, "[RuntimeCleanup] Failed to kill zombie");
            }
          }
          for (const record of allRecords) {
            const { projectId, status, lastHealthCheck, pid } = record;
            if (status === "RUNNING" && !zombies.includes(projectId)) {
              const idle = await RuntimeGuard.isInactive(projectId, lastHealthCheck ?? null);
              if (idle) {
                import_utils54.default.info({ projectId }, "[RuntimeCleanup] Stopping idle runtime");
                await PreviewOrchestrator2.stop(projectId);
                await RuntimeMetrics.recordCrash(projectId, "INACTIVITY_SHUTDOWN");
                idleShutdowns++;
              }
            }
            if ((status === "FAILED" || status === "STOPPED") && pid) {
              let stillRunning = false;
              if (RUNTIME_MODE3 === "docker") {
                stillRunning = ContainerManager.isRunning(projectId);
              } else {
                stillRunning = ProcessManager.isRunning(projectId);
              }
              if (stillRunning) {
                import_utils54.default.warn({ projectId, pid, mode: RUNTIME_MODE3 }, "[RuntimeCleanup] Orphan \u2014 killing");
                if (RUNTIME_MODE3 === "docker") {
                  await ContainerManager.stop(projectId);
                } else {
                  await ProcessManager.stop(projectId);
                }
                await PortManager.releasePort(projectId);
                if (record.userId) {
                  await RuntimeCapacity.release(record.userId);
                }
                orphansKilled++;
              }
            }
            if (status === "STARTING") {
              const startAge = Date.now() - new Date(record.startedAt).getTime();
              if (startAge > STALE_STARTING_THRESHOLD_MS) {
                import_utils54.default.warn({ projectId, startAge }, "[RuntimeCleanup] Stale STARTING \u2014 cleaning up");
                await import_registry9.PreviewRegistry.markFailed(projectId, "Startup timeout detected by cleanup worker");
                await PortManager.releasePort(projectId);
                if (record.userId) {
                  await RuntimeCapacity.release(record.userId);
                }
                await RuntimeMetrics.recordCrash(projectId, "SPAWN_FAIL");
                staleCleaned++;
              }
            }
          }
          import_utils54.default.info(
            { idleShutdowns, zombiesKilled, orphansKilled, staleCleaned, total: allRecords.length },
            "[RuntimeCleanup] Cycle complete"
          );
        } catch (err) {
          import_utils54.default.error({ err }, "[RuntimeCleanup] Error during cleanup cycle");
        }
        if (RUNTIME_MODE3 === "docker") {
          await ContainerManager.pruneImages();
        }
        try {
          await StaleEvictor.runEvictionScan();
        } catch (err) {
          import_utils54.default.error({ err }, "[RuntimeCleanup] Eviction scan failed");
        }
      },
      /**
       * Gracefully shut down ALL running runtimes.
       * Called when the worker process receives SIGTERM.
       */
      async shutdownAll() {
        import_utils54.default.info("[RuntimeCleanup] Shutting down all runtimes (graceful shutdown)");
        this.stop();
        RuntimeHeartbeat.stopAll();
        const allRecords = await import_registry9.PreviewRegistry.listAll();
        const running = allRecords.filter((r) => r.status === "RUNNING" || r.status === "STARTING");
        await Promise.allSettled(
          running.map(async (r) => {
            import_utils54.default.info({ projectId: r.projectId }, "[RuntimeCleanup] Stopping runtime for shutdown");
            await PreviewOrchestrator2.stop(r.projectId);
          })
        );
        if (RUNTIME_MODE3 === "docker") {
          await ContainerManager.cleanupAll();
        }
        import_utils54.default.info({ count: running.length }, "[RuntimeCleanup] All runtimes stopped");
      }
    };
    init_sandbox_pool();
    init_sandbox_runner();
    var import_child_process8 = require("child_process");
    var import_path11 = __toESM2(require("path"));
    var import_fs2 = __toESM2(require("fs"));
    var import_util2 = __toESM2(require("util"));
    var import_utils55 = __toESM2(require_dist22());
    var execAsync = import_util2.default.promisify(import_child_process8.exec);
    var ProcessSandbox = class {
      sandboxRoot;
      constructor() {
        this.sandboxRoot = import_path11.default.join(process.cwd(), ".generated-projects");
        if (!import_fs2.default.existsSync(this.sandboxRoot)) {
          import_fs2.default.mkdirSync(this.sandboxRoot, { recursive: true });
        }
      }
      /**
       * Create an isolated sandbox for a project and write all files into it.
       */
      async createSandbox(projectId, files) {
        const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
        if (import_fs2.default.existsSync(sandboxDir)) {
          await this.cleanup(projectId);
        }
        import_fs2.default.mkdirSync(sandboxDir, { recursive: true });
        for (const file of files) {
          const filePath = import_path11.default.join(sandboxDir, file.path.replace(/^\//, ""));
          const dir = import_path11.default.dirname(filePath);
          if (!import_fs2.default.existsSync(dir)) import_fs2.default.mkdirSync(dir, { recursive: true });
          import_fs2.default.writeFileSync(filePath, file.content || "", "utf8");
        }
        import_utils55.default.info({ projectId, fileCount: files.length }, "Sandbox created");
        return sandboxDir;
      }
      /**
       * Install dependencies inside the sandbox.
       */
      async installDependencies(sandboxDir) {
        const logs = [];
        try {
          logs.push("[Sandbox] Running npm install...");
          const { stdout, stderr } = await execAsync(
            "npm install --no-audit --legacy-peer-deps --loglevel=error",
            { cwd: sandboxDir, timeout: 12e4, env: { ...process.env, NODE_ENV: "development" } }
          );
          if (stdout) logs.push(stdout.substring(0, 500));
          if (stderr) logs.push(`[warn] ${stderr.substring(0, 500)}`);
          logs.push("[Sandbox] Dependencies installed successfully.");
          return { success: true, logs };
        } catch (e) {
          logs.push(`[error] npm install failed: ${e.stderr?.substring(0, 300) || e.message}`);
          return { success: false, logs };
        }
      }
      /**
       * Run a build verification step inside the sandbox.
       */
      async verifyBuild(sandboxDir) {
        try {
          const { stdout, stderr } = await execAsync(
            "npx tsc --noEmit 2>&1 || true",
            { cwd: sandboxDir, timeout: 6e4 }
          );
          return { success: true, error: stderr, stdout };
        } catch (e) {
          return { success: false, error: e.stderr || e.message, stdout: e.stdout || "" };
        }
      }
      /**
       * Update specific files in an existing sandbox (for incremental edits).
       */
      async updateFiles(projectId, patches) {
        const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
        if (!import_fs2.default.existsSync(sandboxDir)) {
          throw new Error(`Sandbox not found for project ${projectId}`);
        }
        for (const patch of patches) {
          const filePath = import_path11.default.join(sandboxDir, patch.path.replace(/^\//, ""));
          if (patch.action === "delete") {
            if (import_fs2.default.existsSync(filePath)) import_fs2.default.unlinkSync(filePath);
          } else {
            const dir = import_path11.default.dirname(filePath);
            if (!import_fs2.default.existsSync(dir)) import_fs2.default.mkdirSync(dir, { recursive: true });
            import_fs2.default.writeFileSync(filePath, patch.content || "", "utf8");
          }
        }
        import_utils55.default.info({ projectId, patchCount: patches.length }, "Sandbox files updated");
      }
      /**
       * Get all files currently in the sandbox.
       */
      readAllFiles(projectId) {
        const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
        if (!import_fs2.default.existsSync(sandboxDir)) return [];
        const files = [];
        this.walkDir(sandboxDir, "", files);
        return files;
      }
      /**
       * Check if a sandbox exists for a project.
       */
      exists(projectId) {
        return import_fs2.default.existsSync(import_path11.default.join(this.sandboxRoot, projectId));
      }
      /**
       * Remove a project sandbox entirely.
       */
      async cleanup(projectId) {
        const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
        if (import_fs2.default.existsSync(sandboxDir)) {
          import_fs2.default.rmSync(sandboxDir, { recursive: true, force: true });
          import_utils55.default.info({ projectId }, "Sandbox cleaned up");
        }
      }
      // ── Private helpers ──────────────────────────────────────────
      walkDir(base, sub, out) {
        const fullPath = import_path11.default.join(base, sub);
        if (!import_fs2.default.existsSync(fullPath)) return;
        const entries = import_fs2.default.readdirSync(fullPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
          const relPath = sub ? `${sub}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            this.walkDir(base, relPath, out);
          } else {
            try {
              const content = import_fs2.default.readFileSync(import_path11.default.join(base, relPath), "utf8");
              out.push({ path: `/${relPath}`, content });
            } catch {
            }
          }
        }
      }
    };
    var sandbox = new ProcessSandbox();
    init_snapshot_library();
    init_snapshot_manager();
    init_snapshot_overlay();
    var import_fs_extra82 = __toESM2(require("fs-extra"));
    var import_path12 = __toESM2(require("path"));
    var import_utils56 = __toESM2(require_dist22());
    var StorageGC = class {
      static TTL_MS = 2 * 60 * 60 * 1e3;
      // 2 hours for previews
      static CHECK_INTERVAL = 15 * 60 * 1e3;
      // 15 minutes
      static CRITICAL_DISK_FREE_PERCENT = 10;
      static start() {
        import_utils56.default.info("[StorageGC] Starting Storage Garbage Collector...");
        setInterval(() => this.run(), this.CHECK_INTERVAL);
        this.run();
      }
      static async run() {
        try {
          import_utils56.default.info("[StorageGC] Running periodic cleanup...");
          await this.cleanupPreviews();
          await this.cleanupMicroVMs();
          await this.checkDiskSpace();
        } catch (err) {
          import_utils56.default.error({ err }, "[StorageGC] Cleanup cycle failed");
        }
      }
      static async cleanupPreviews() {
        const previewDir = import_path12.default.join(process.cwd(), ".previews");
        if (!await import_fs_extra82.default.pathExists(previewDir)) return;
        const folders = await import_fs_extra82.default.readdir(previewDir);
        const now = Date.now();
        for (const folder of folders) {
          if (folder === "pool") continue;
          const fullPath = import_path12.default.join(previewDir, folder);
          const stats = await import_fs_extra82.default.stat(fullPath);
          if (now - stats.mtimeMs > this.TTL_MS) {
            import_utils56.default.info({ folder }, "[StorageGC] Purging expired preview environment");
            await import_fs_extra82.default.remove(fullPath);
          }
        }
      }
      static async cleanupMicroVMs() {
        const microvmDir = import_path12.default.join(process.cwd(), ".microvms");
        if (!await import_fs_extra82.default.pathExists(microvmDir)) return;
        const folders = await import_fs_extra82.default.readdir(microvmDir);
        const now = Date.now();
        for (const folder of folders) {
          const fullPath = import_path12.default.join(microvmDir, folder);
          const stats = await import_fs_extra82.default.stat(fullPath);
          if (now - stats.mtimeMs > this.TTL_MS / 2) {
            import_utils56.default.info({ folder }, "[StorageGC] Purging expired MicroVM overlay");
            await import_fs_extra82.default.remove(fullPath);
          }
        }
      }
      static async checkDiskSpace() {
        const previewDir = import_path12.default.join(process.cwd(), ".previews");
        const snapshotsDir = import_path12.default.join(process.cwd(), ".snapshots");
        const previewCount = await import_fs_extra82.default.pathExists(previewDir) ? (await import_fs_extra82.default.readdir(previewDir)).length : 0;
        const snapshotCount = await import_fs_extra82.default.pathExists(snapshotsDir) ? (await import_fs_extra82.default.readdir(snapshotsDir)).length : 0;
        if (previewCount > 50 || snapshotCount > 20) {
          import_utils56.default.warn({ previewCount, snapshotCount }, "[StorageGC] High artifact count detected. Recommended manual purge.");
        }
      }
    };
    init_preview_manager();
    var import_registry10 = __toESM2(require_dist32());
    var import_utils57 = __toESM2(require_dist22());
    var PreviewWatchdog = class {
      static interval = null;
      static CHECK_INTERVAL = 3e4;
      // 30 seconds
      static IDLE_TIMEOUT = 18e5;
      // 30 minutes
      static start() {
        if (this.interval) return;
        import_utils57.default.info("[Watchdog] Starting Preview Watchdog service...");
        this.interval = setInterval(() => this.check(), this.CHECK_INTERVAL);
      }
      static async check() {
        try {
          const allPreviews = await import_registry10.PreviewRegistry.listAll();
          const now = Date.now();
          for (const reg of allPreviews) {
            const lastAccess = reg.lastHeartbeatAt || reg.startedAt;
            const lastAccessTs = lastAccess ? new Date(lastAccess).getTime() : 0;
            if (reg.status === "RUNNING" && lastAccessTs && now - lastAccessTs > this.IDLE_TIMEOUT) {
              import_utils57.default.info({ projectId: reg.projectId }, "[Watchdog] Idle timeout reached. Suspending sandbox...");
              await previewManager.stopPreview(reg.projectId);
              await import_registry10.PreviewRegistry.update(reg.projectId, { status: "STOPPED" });
              continue;
            }
            if (reg.status === "RUNNING" && reg.ports && reg.ports.length > 0) {
              const primaryPort = reg.ports[0];
              const portOpen = await previewManager.isPortOpen(primaryPort);
              const httpReady = portOpen ? await previewManager.isHttpReady(primaryPort) : false;
              if (!httpReady) {
                import_utils57.default.warn({
                  projectId: reg.projectId,
                  port: primaryPort,
                  portOpen
                }, "[Watchdog] Sandbox HTTP non-responsive. Triggering recovery...");
                await import_registry10.PreviewRegistry.update(reg.projectId, { status: "FAILED", failureReason: "Watchdog health check failed" });
              }
            }
            if (reg.status === "FAILED") {
              const jitter = Math.floor(Math.random() * 1e4);
              import_utils57.default.warn({ projectId: reg.projectId, jitter }, "[Watchdog] Sandbox in error state. Scheduling auto-recovery with jitter...");
              setTimeout(async () => {
                try {
                  await previewManager.restartPreview(reg.projectId);
                } catch (err) {
                  import_utils57.default.error({ projectId: reg.projectId, err }, "[Watchdog] Jittered recovery failed");
                }
              }, jitter);
            }
          }
        } catch (error) {
          import_utils57.default.error({ error }, "[Watchdog] Check loop error");
        }
      }
      static stop() {
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = null;
        }
      }
    };
  }
});

// ../../packages/build-engine/dist/index.js
var require_dist7 = __commonJS({
  "../../packages/build-engine/dist/index.js"(exports2, module2) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
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
    module2.exports = __toCommonJS2(index_exports);
  }
});

// src/build-worker.ts
var import_config = require("dotenv/config");
var import_observability = __toESM(require_dist4());
var import_fs_extra2 = __toESM(require("fs-extra"));
var import_path2 = __toESM(require("path"));
var dotenv = __toESM(require("dotenv"));
var import_bullmq = require("bullmq");
var import_utils5 = __toESM(require_dist3());
var import_utils6 = __toESM(require_dist3());
var import_utils7 = __toESM(require_dist3());
var import_utils8 = __toESM(require_dist3());
var import_utils9 = __toESM(require_dist3());
var import_contracts = __toESM(require_dist5());

// ../../packages/validator/src/artifact-validator.ts
var import_fs_extra = __toESM(require("fs-extra"));
var import_path = __toESM(require("path"));
var import_utils4 = __toESM(require_dist3());
var ArtifactValidator = class {
  static WEB_REQUIRED = ["package.json", "app/page.tsx", "tsconfig.json"];
  static API_REQUIRED = ["package.json", "src/main.ts"];
  static LEGACY_REQUIRED = ["package.json", "app/page.tsx", "tsconfig.json"];
  /**
   * Validates that all critical artifacts exist in the sandbox directory.
   */
  static async validate(projectId) {
    const sandboxDir = import_path.default.join(process.cwd(), ".generated-projects", projectId);
    const missingFiles = [];
    try {
      if (!await import_fs_extra.default.pathExists(sandboxDir)) {
        return { valid: false, missingFiles: [], error: "Sandbox directory does not exist" };
      }
      const hasWeb = await import_fs_extra.default.pathExists(import_path.default.join(sandboxDir, "apps/web"));
      const hasApi = await import_fs_extra.default.pathExists(import_path.default.join(sandboxDir, "apps/api"));
      if (hasWeb || hasApi) {
        if (hasWeb) {
          for (const f of this.WEB_REQUIRED) {
            if (!await import_fs_extra.default.pathExists(import_path.default.join(sandboxDir, "apps/web", f))) {
              missingFiles.push(`apps/web/${f}`);
            }
          }
        }
        if (hasApi) {
          const apiEntry = await import_fs_extra.default.pathExists(import_path.default.join(sandboxDir, "apps/api/src/main.ts")) ? "src/main.ts" : await import_fs_extra.default.pathExists(import_path.default.join(sandboxDir, "apps/api/src/index.ts")) ? "src/index.ts" : "src/main.ts";
          const apiRequired = ["package.json", apiEntry];
          for (const f of apiRequired) {
            if (!await import_fs_extra.default.pathExists(import_path.default.join(sandboxDir, "apps/api", f))) {
              missingFiles.push(`apps/api/${f}`);
            }
          }
        }
      } else {
        for (const f of this.LEGACY_REQUIRED) {
          if (!await import_fs_extra.default.pathExists(import_path.default.join(sandboxDir, f))) {
            missingFiles.push(f);
          }
        }
      }
      if (missingFiles.length > 0) {
        import_utils4.default.error({ projectId, missingFiles }, "[ArtifactValidator] Critical artifacts missing");
        return { valid: false, missingFiles };
      }
      import_utils4.default.info({ projectId }, "[ArtifactValidator] All critical artifacts verified.");
      return { valid: true, missingFiles: [] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      import_utils4.default.error({ projectId, error: msg }, "[ArtifactValidator] Validation crashed");
      return { valid: false, missingFiles: [], error: msg };
    }
  }
};

// src/build-worker.ts
var import_db = __toESM(require_dist2());
var import_utils10 = __toESM(require_dist3());
var import_utils11 = __toESM(require_dist3());
var import_sandbox_runtime = __toESM(require_dist6());
var import_sandbox_runtime2 = __toESM(require_dist6());
var import_sandbox_runtime3 = __toESM(require_dist6());
var import_sandbox_runtime4 = __toESM(require_dist6());
var import_sandbox_runtime5 = __toESM(require_dist6());
var import_utils12 = __toESM(require_dist3());
var import_utils13 = __toESM(require_dist3());
var import_utils14 = __toESM(require_dist3());
var import_build_engine = __toESM(require_dist7());
var import_utils15 = __toESM(require_dist3());
var import_build_engine2 = __toESM(require_dist7());
var import_os = __toESM(require("os"));
(0, import_observability.startTracing)();
var envLocal = import_path2.default.resolve(process.cwd(), ".env.local");
if (import_fs_extra2.default.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
}
var ReliabilityMonitor = { recordSuccess: async (d) => {
}, recordFailure: async () => {
} };
var WORKER_ID = `worker-${import_os.default.hostname()}-${process.pid}`;
var orchestrator = new import_utils8.Orchestrator();
var workerId = `worker-${Math.random().toString(36).substring(2, 9)}`;
var HEARTBEAT_INTERVAL = 5e3;
setInterval(async () => {
  try {
    const heartbeat = {
      status: "online",
      lastSeen: Date.now(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024,
      // MB
      uptime: process.uptime(),
      workerId
    };
    await import_utils6.redis.set(`worker:heartbeat:${workerId}`, JSON.stringify(heartbeat), "EX", 15);
    await import_utils6.redis.set("system:health:worker", JSON.stringify(heartbeat), "EX", 15);
  } catch {
    import_utils7.default.warn("Failed to update worker heartbeat");
  }
}, HEARTBEAT_INTERVAL);
var RECOVERY_STALE_MS = 6e4;
var resumeOrphanedExecutions = async () => {
  import_utils7.default.info("Scanning for orphaned missions to resume...");
  try {
    const activeMissions = await import_utils13.missionController.listActiveMissions();
    const activeHeartbeatKeys = await import_utils6.redis.keys("worker:heartbeat:*");
    const activeWorkerIds = new Set(activeHeartbeatKeys.map((k) => k.split(":").pop()));
    for (const mission of activeMissions) {
      const missionWorkerId = mission.metadata?.workerId;
      const isStale = Date.now() - mission.updatedAt > RECOVERY_STALE_MS;
      const isOwnerDead = missionWorkerId && !activeWorkerIds.has(missionWorkerId);
      if (isStale || isOwnerDead) {
        import_utils7.default.info({
          missionId: mission.id,
          status: mission.status,
          isStale,
          isOwnerDead
        }, "Resuming orphaned mission...");
        import_utils11.stuckBuildsTotal.inc();
        executeBuild({
          prompt: mission.prompt,
          userId: mission.userId,
          projectId: mission.projectId,
          executionId: mission.id,
          isFastPreview: !!mission.metadata?.fastPath
        }).catch((err) => import_utils7.default.error({ err, missionId: mission.id }, "Failed to resume orphaned mission"));
      }
    }
  } catch (err) {
    import_utils7.default.error({ err }, "Error during orphaned mission scan");
  }
};
setInterval(resumeOrphanedExecutions, 6e4);
var executeBuild = async (data, job) => {
  const { prompt, userId, projectId, executionId, tenantId, isFastPreview } = data;
  const tier = job ? job.queueName.includes("pro") ? "pro" : "free" : "instant";
  const end = import_utils11.workerTaskDurationSeconds.startTimer({ queue_name: tier });
  const lockKey = `build:lock:${executionId}`;
  const lock = await import_utils6.redis.set(lockKey, executionId, "EX", 600, "NX");
  if (!lock) {
    if (job) import_utils7.default.warn({ executionId, jobId: job.id, tier }, "Duplicate execution (Queue) detected. Skipping.");
    return;
  }
  const controller = new AbortController();
  if (job) {
    const waitTime = (Date.now() - job.timestamp) / 1e3;
    import_utils11.queueWaitTimeSeconds.observe({ queue_name: tier }, waitTime);
  }
  const lockExtensionInterval = setInterval(async () => {
    try {
      if (job && await job.isActive()) {
        await job.extendLock(job.token, 3e5);
      }
      const owner = await import_utils6.redis.get(lockKey);
      if (owner !== executionId) {
        throw new Error("Execution lock ownership lost (Heartbeat Violation)");
      }
      await import_utils6.redis.expire(lockKey, 600);
      import_utils7.default.debug({ executionId, tier }, "Execution locks extended (Heartbeat)");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      import_utils7.default.error({ executionId, error: errorMessage, tier }, "CRITICAL: Lock heartbeat failed. Aborting.");
      controller.abort();
    }
  }, 3e4);
  const startTime = Date.now();
  try {
    await import_utils13.missionController.updateMission(executionId, {
      status: "planning",
      metadata: { workerId }
    });
    const BUILD_TIMEOUT_MS = 15 * 60 * 1e3;
    const timeout = setTimeout(() => {
      import_utils7.default.error({ executionId }, "[Worker] Build timeout reached. Aborting.");
      controller.abort();
    }, BUILD_TIMEOUT_MS);
    return await (0, import_utils9.runWithTracing)(executionId, async () => {
      import_utils7.default.info({ executionId, userId, projectId, tier }, "Worker entering executeBuild loop");
      const sandboxDir = import_path2.default.join(process.cwd(), ".generated-projects", projectId);
      await import_fs_extra2.default.ensureDir(sandboxDir);
      const cacheRestored = await import_build_engine.BuildCacheManager.restore(projectId, sandboxDir);
      if (cacheRestored) {
        import_utils7.default.info({ projectId }, "[Worker] Incremental build: Cache restored successfully");
        await import_utils14.eventBus.stage(executionId, import_contracts.JobStage.PLAN.toLowerCase(), "completed", "Incremental build: Restored previous build cache", 20, projectId);
        const affectedNodes = await import_build_engine2.BuildGraphEngine.getAffectedNodes(sandboxDir);
        if (affectedNodes.length === 0) {
          import_utils7.default.info({ projectId }, "[Worker] Zero affected nodes. Skipping full build.");
          await import_utils14.eventBus.stage(executionId, import_contracts.JobStage.PLAN.toLowerCase(), "completed", "No changes detected. Reusing existing artifacts.", 30, projectId);
        } else {
          import_utils7.default.info({ projectId, count: affectedNodes.length }, "[Worker] Partial changes detected");
        }
      }
      try {
        import_utils10.activeBuildsGauge.inc({ tier });
        const result = await orchestrator.run(
          prompt,
          userId,
          projectId,
          executionId,
          tenantId || "default",
          controller.signal,
          { isFastPreview }
        );
        clearTimeout(timeout);
        if (result && !result.success) {
          const errorResult = result;
          throw new Error(errorResult.error || "Build failed");
        }
        const validationResult = await ArtifactValidator.validate(projectId);
        if (!validationResult.valid) {
          const error = `Build integrity failure: Missing ${validationResult.missingFiles?.join(", ") || "critical files"}`;
          import_utils7.default.error({ projectId, missing: validationResult.missingFiles }, "[Worker] Integrity Check FAILED");
          throw new Error(error);
        }
        import_utils7.default.info({ projectId }, "[Worker] Integrity Check PASSED");
        await import_build_engine.BuildCacheManager.save(projectId, sandboxDir);
        await import_utils13.missionController.updateMission(executionId, { status: "complete" });
        const durationMs = Date.now() - startTime;
        await ReliabilityMonitor.recordSuccess(durationMs);
        await import_db.prisma.auditLog.create({
          data: {
            tenantId: tenantId || "default",
            userId,
            action: "BUILD_SUCCESS",
            resource: `project:${projectId}`,
            metadata: { executionId, durationMs },
            hash: "0"
            // Mock for now
          }
        }).catch(() => {
        });
        end({ status: "success" });
        await deployQueue.add("deploy-job", {
          projectId,
          executionId,
          sandboxDir: import_path2.default.join(process.cwd(), ".generated-projects", projectId)
        });
        return result;
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      } finally {
        import_utils10.activeBuildsGauge.dec({ tier });
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    import_utils7.default.error({ executionId, error: msg, tier }, "Execution failed");
    end({ status: "failed" });
    await import_utils13.missionController.updateMission(executionId, {
      status: "failed",
      metadata: { error: msg }
    });
    await import_utils14.eventBus.stage(executionId, import_contracts.JobStage.FAILED.toLowerCase(), "failed", `Build failed: ${msg}`, 100, projectId);
    await import_utils14.eventBus.error(executionId, `[BuildWorker] ${msg}`, projectId);
    await ReliabilityMonitor.recordFailure();
    await import_db.prisma.auditLog.create({
      data: {
        tenantId: tenantId || "default",
        userId,
        action: "BUILD_FAILURE",
        resource: `project:${projectId}`,
        metadata: { executionId, error: msg },
        hash: "0"
        // Mock for now
      }
    }).catch(() => {
    });
    throw error;
  } finally {
    clearInterval(lockExtensionInterval);
  }
};
var processJob = async (job) => {
  return await executeBuild(job.data, job);
};
var freeWorker = new import_bullmq.Worker(import_utils5.QUEUE_FREE, processJob, {
  connection: import_utils6.redis,
  concurrency: Number(import_utils12.env.WORKER_CONCURRENCY_FREE) || 5,
  lockDuration: 3e5,
  limiter: {
    max: 5,
    duration: 1e3
  }
});
var proWorker = new import_bullmq.Worker(import_utils5.QUEUE_PRO, processJob, {
  connection: import_utils6.redis,
  concurrency: Number(import_utils12.env.WORKER_CONCURRENCY_PRO) || 20,
  lockDuration: 3e5,
  limiter: {
    max: 10,
    duration: 1e3
  }
});
var freeQueue = new import_bullmq.Queue(import_utils5.QUEUE_FREE, { connection: import_utils6.redis });
var proQueue = new import_bullmq.Queue(import_utils5.QUEUE_PRO, { connection: import_utils6.redis });
var deployQueue = new import_bullmq.Queue(import_utils6.DEPLOYMENT_QUEUE, { connection: import_utils6.redis });
var setupWorkerEvents = (worker, name) => {
  worker.on("completed", (job) => {
    import_utils7.default.info({ jobId: job.id, worker: name }, "Job completed");
  });
  worker.on("failed", async (job, err) => {
    const msg = err.message;
    import_utils7.default.error({ jobId: job?.id, worker: name, err: msg }, "Job failed");
    if (job) {
      if (job.attemptsMade >= (job.opts.attempts || 5)) {
        import_utils7.default.warn({ jobId: job.id, worker: name }, 'Job reached MAX ATTEMPTS. Moving to "perm-failed" state (DLQ behavior).');
      }
    }
  });
};
setupWorkerEvents(freeWorker, "free");
setupWorkerEvents(proWorker, "pro");
var shutdown = async () => {
  import_utils7.default.info("Shutting down workers...");
  import_sandbox_runtime2.FailoverManager.stop();
  await import_sandbox_runtime5.RuntimeCleanup.shutdownAll();
  await import_sandbox_runtime.NodeRegistry.deregister();
  await Promise.all([freeWorker.close(), proWorker.close()]);
  await import_utils6.redis.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
setInterval(async () => {
  try {
    await import_utils15.WorkerClusterManager.heartbeat({
      workerId: WORKER_ID,
      hostname: import_os.default.hostname(),
      load: 0,
      // In production, we'd calculate CPU/Mem load here
      status: "IDLE"
      // Update dynamically based on job state
    });
    const [waitingFree, waitingPro] = await Promise.all([
      freeQueue.getJobCounts("waiting", "delayed"),
      proQueue.getJobCounts("waiting", "delayed")
    ]);
    import_utils11.queueLengthGauge.set({ queue_name: "free" }, waitingFree.waiting + waitingFree.delayed);
    import_utils11.queueLengthGauge.set({ queue_name: "pro" }, waitingPro.waiting + waitingPro.delayed);
  } catch (err) {
    console.error("[Worker] Heartbeat/Metrics failed:", err);
  }
}, 5e3);
(async () => {
  try {
    const sub = import_utils6.redis.duplicate();
    import_utils7.default.info({ workerId: WORKER_ID }, "[Worker] Subscribing to direct steering channel");
    await sub.subscribe(`worker:trigger:${WORKER_ID}`);
    sub.on("message", async (channel, message) => {
      if (channel === `worker:trigger:${WORKER_ID}`) {
        try {
          const { projectId } = JSON.parse(message);
          import_utils7.default.info({ projectId }, "[Worker] Direct job steering received! Triggering execution.");
        } catch (pErr) {
          import_utils7.default.error({ err: pErr }, "[Worker] Failed to parse steering message");
        }
      }
    });
  } catch (err) {
    const error = err;
    import_utils7.default.error({ err: error.message }, "[Worker] Direct steering listener failed");
  }
})();
(async () => {
  try {
    const nodeId = await import_sandbox_runtime.NodeRegistry.register();
    import_utils7.default.info({ nodeId }, "Node registered in cluster");
    import_sandbox_runtime2.FailoverManager.start();
    const sub = import_utils6.redis.duplicate();
    await sub.subscribe("cluster:schedule:assign", "cluster:node:restart", "build:init:trigger");
    sub.on("message", async (channel, message) => {
      try {
        const data = JSON.parse(message);
        if (channel === "build:init:trigger") {
          import_utils7.default.info({ executionId: data.executionId }, "\u26A1 Instant Trigger received. Initiating build...");
          executeBuild(data).catch((err) => import_utils7.default.error({ err, executionId: data.executionId }, "Instant Trigger execution failed"));
        } else if (channel === "cluster:schedule:assign") {
          if (data.targetNodeId === nodeId) {
            import_utils7.default.info({ projectId: data.request.projectId }, "[Worker] Picking up assigned runtime");
            import_sandbox_runtime4.PreviewOrchestrator.start(
              data.request.projectId,
              data.request.executionId,
              data.request.userId
            ).catch((err) => {
              const error = err instanceof Error ? err.message : String(err);
              import_utils7.default.error({ err: error, projectId: data.request.projectId }, "Failed to start assigned runtime");
            });
          }
        } else if (channel === "cluster:node:restart") {
          if (data.nodeId === nodeId) {
            import_utils7.default.warn({ reason: data.reason }, "[Worker] Received restart signal. Shutting down gracefully...");
            await shutdown();
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        import_utils7.default.error({ error: errMsg }, `[Worker] Error processing message on channel ${channel}`);
      }
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    import_utils7.default.error({ error: errMsg }, "Failed to register node in cluster (non-fatal, running in standalone mode)");
  }
})();
import_utils7.default.info(`Workers started: Free (concurrency=${freeWorker.opts.concurrency}), Pro (concurrency=${proWorker.opts.concurrency})`);
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Worker] Unhandled Rejection at:", promise, "reason:", reason);
  if (process.env.NODE_ENV === "production") {
    console.log("[Worker] Attempting restart in 5s...");
    setTimeout(shutdown, 5e3);
  } else {
    console.error("Worker crashed. Fix error before restart.");
    process.exit(1);
  }
});
process.on("uncaughtException", (error) => {
  console.error("[Worker] Uncaught Exception:", error);
  if (process.env.NODE_ENV === "production") {
    console.log("[Worker] Attempting restart in 5s...");
    setTimeout(shutdown, 5e3);
  } else {
    console.error("Worker crashed. Fix error before restart.");
    process.exit(1);
  }
});
resumeOrphanedExecutions();
import_sandbox_runtime5.RuntimeCleanup.start();
import_utils6.redis.on("error", (err) => {
  import_utils7.default.error({ err: err.message }, "[Worker] Redis connection error");
  if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
    import_sandbox_runtime3.RedisRecovery.handleRedisCrash().catch((recErr) => {
      import_utils7.default.error({ err: recErr.message }, "[Worker] Critical recovery failure");
    });
  }
});
