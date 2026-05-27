// tsup.config.ts
import { defineConfig } from "tsup";
var tsup_config_default = defineConfig({
  entry: ["src/index.ts", "src/server.ts"],
  target: "node20",
  format: ["esm"],
  clean: true,
  sourcemap: true,
  outDir: "dist",
  bundle: true,
  // Bundle workspace @packages/* (except db which needs Prisma runtime)
  noExternal: [/^@packages\/(?!db).*/],
  // Externalize everything that isn't a workspace package.
  // This prevents CJS third-party libraries (agentkeepalive, whatwg-url,
  // mongodb, etc.) from being bundled into ESM where their require() calls
  // for Node built-ins would fail at runtime.
  external: [
    /^[^@.]/,
    // bare specifiers (express, cors, pino, …)
    /^@(?!packages\/).*/,
    // scoped packages that aren't workspace
    "@packages/db"
    // explicit: needs Prisma runtime
  ]
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiQzpcXFxcbXVsdGlhZ2VudGljX3Byb2plY3RcXFxcbXVsdGlBZ2VudC1tYWluXFxcXGFwcHNcXFxcZ2F0ZXdheVxcXFx0c3VwLmNvbmZpZy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCJDOlxcXFxtdWx0aWFnZW50aWNfcHJvamVjdFxcXFxtdWx0aUFnZW50LW1haW5cXFxcYXBwc1xcXFxnYXRld2F5XCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9DOi9tdWx0aWFnZW50aWNfcHJvamVjdC9tdWx0aUFnZW50LW1haW4vYXBwcy9nYXRld2F5L3RzdXAuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndHN1cCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGVudHJ5OiBbJ3NyYy9pbmRleC50cycsICdzcmMvc2VydmVyLnRzJ10sXG4gIHRhcmdldDogJ25vZGUyMCcsXG4gIGZvcm1hdDogWydlc20nXSxcbiAgY2xlYW46IHRydWUsXG4gIHNvdXJjZW1hcDogdHJ1ZSxcbiAgb3V0RGlyOiAnZGlzdCcsXG4gIGJ1bmRsZTogdHJ1ZSxcbiAgLy8gQnVuZGxlIHdvcmtzcGFjZSBAcGFja2FnZXMvKiAoZXhjZXB0IGRiIHdoaWNoIG5lZWRzIFByaXNtYSBydW50aW1lKVxuICBub0V4dGVybmFsOiBbL15AcGFja2FnZXNcXC8oPyFkYikuKi9dLFxuICAvLyBFeHRlcm5hbGl6ZSBldmVyeXRoaW5nIHRoYXQgaXNuJ3QgYSB3b3Jrc3BhY2UgcGFja2FnZS5cbiAgLy8gVGhpcyBwcmV2ZW50cyBDSlMgdGhpcmQtcGFydHkgbGlicmFyaWVzIChhZ2VudGtlZXBhbGl2ZSwgd2hhdHdnLXVybCxcbiAgLy8gbW9uZ29kYiwgZXRjLikgZnJvbSBiZWluZyBidW5kbGVkIGludG8gRVNNIHdoZXJlIHRoZWlyIHJlcXVpcmUoKSBjYWxsc1xuICAvLyBmb3IgTm9kZSBidWlsdC1pbnMgd291bGQgZmFpbCBhdCBydW50aW1lLlxuICBleHRlcm5hbDogW1xuICAgIC9eW15ALl0vLCAgICAgICAgICAgICAgICAgICAvLyBiYXJlIHNwZWNpZmllcnMgKGV4cHJlc3MsIGNvcnMsIHBpbm8sIFx1MjAyNilcbiAgICAvXkAoPyFwYWNrYWdlc1xcLykuKi8sICAgICAgIC8vIHNjb3BlZCBwYWNrYWdlcyB0aGF0IGFyZW4ndCB3b3Jrc3BhY2VcbiAgICAnQHBhY2thZ2VzL2RiJywgICAgICAgICAgICAgLy8gZXhwbGljaXQ6IG5lZWRzIFByaXNtYSBydW50aW1lXG4gIF0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1QsU0FBUyxvQkFBb0I7QUFFalYsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsT0FBTyxDQUFDLGdCQUFnQixlQUFlO0FBQUEsRUFDdkMsUUFBUTtBQUFBLEVBQ1IsUUFBUSxDQUFDLEtBQUs7QUFBQSxFQUNkLE9BQU87QUFBQSxFQUNQLFdBQVc7QUFBQSxFQUNYLFFBQVE7QUFBQSxFQUNSLFFBQVE7QUFBQTtBQUFBLEVBRVIsWUFBWSxDQUFDLHNCQUFzQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLbkMsVUFBVTtBQUFBLElBQ1I7QUFBQTtBQUFBLElBQ0E7QUFBQTtBQUFBLElBQ0E7QUFBQTtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
