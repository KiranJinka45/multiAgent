// src/SidebarContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { githubService } from "@packages/utils";
var SidebarContext = createContext(void 0);
function SidebarProvider({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(260);
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebar-width");
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedWidth) setWidth(parseInt(savedWidth));
    if (savedCollapsed) setIsCollapsed(savedCollapsed === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("sidebar-width", width.toString());
    localStorage.setItem("sidebar-collapsed", isCollapsed.toString());
    const root = document.documentElement;
    if (isCollapsed) {
      root.style.setProperty("--sidebar-width", "64px");
    } else {
      root.style.setProperty("--sidebar-width", `${width}px`);
    }
  }, [width, isCollapsed]);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await githubService.isConnected();
        setIsGithubConnected(connected);
      } catch (err) {
        console.error("Error checking github connection:", err);
      }
    };
    checkConnection();
  }, []);
  return /* @__PURE__ */ React.createElement(SidebarContext.Provider, { value: {
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
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
export {
  SidebarProvider,
  useSidebar
};
//# sourceMappingURL=index.mjs.map