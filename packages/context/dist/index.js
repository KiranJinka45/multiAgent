"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SidebarProvider: () => SidebarProvider,
  useSidebar: () => useSidebar
});
module.exports = __toCommonJS(index_exports);

// src/SidebarContext.tsx
var import_react = __toESM(require("react"));
var import_utils = require("@packages/utils");
var SidebarContext = (0, import_react.createContext)(void 0);
function SidebarProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = (0, import_react.useState)(false);
  const [width, setWidth] = (0, import_react.useState)(260);
  (0, import_react.useEffect)(() => {
    const savedWidth = localStorage.getItem("sidebar-width");
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedWidth) setWidth(parseInt(savedWidth));
    if (savedCollapsed) setIsCollapsed(savedCollapsed === "true");
  }, []);
  (0, import_react.useEffect)(() => {
    localStorage.setItem("sidebar-width", width.toString());
    localStorage.setItem("sidebar-collapsed", isCollapsed.toString());
    const root = document.documentElement;
    if (isCollapsed) {
      root.style.setProperty("--sidebar-width", "64px");
    } else {
      root.style.setProperty("--sidebar-width", `${width}px`);
    }
  }, [width, isCollapsed]);
  const [isGithubModalOpen, setIsGithubModalOpen] = (0, import_react.useState)(false);
  const [isGithubConnected, setIsGithubConnected] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    const checkConnection = async () => {
      try {
        const connected = await import_utils.githubService.isConnected();
        setIsGithubConnected(connected);
      } catch (err) {
        console.error("Error checking github connection:", err);
      }
    };
    checkConnection();
  }, []);
  return /* @__PURE__ */ import_react.default.createElement(SidebarContext.Provider, { value: {
    isCollapsed,
    setIsCollapsed,
    width,
    setWidth,
    isGithubModalOpen,
    setIsGithubModalOpen,
    isGithubConnected,
    setIsGithubConnected
  } }, children);
}
function useSidebar() {
  const context = (0, import_react.useContext)(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SidebarProvider,
  useSidebar
});
//# sourceMappingURL=index.js.map