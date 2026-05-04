// tsup.config.ts
import { defineConfig } from "tsup";

// ../../tsup.config.base.ts
var baseConfig = {
  format: ["cjs", "esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  target: "node20",
  external: [
    "bullmq",
    "ioredis",
    "pino",
    "uuid",
    "fs-extra",
    "archiver",
    "dotenv",
    "zod",
    "react",
    "stripe",
    "prom-client",
    "redlock",
    "next",
    "socket.io-client",
    "@supabase/supabase-js",
    "@temporalio/client",
    "@temporalio/worker",
    "axios",
    "express",
    "socket.io",
    "cors",
    "jsonwebtoken",
    "@packages/contracts",
    "@packages/db",
    "@packages/observability",
    "@packages/registry",
    "@packages/supabase",
    "@packages/validator",
    "@packages/core-engine",
    "@packages/sandbox",
    "@packages/agents",
    "@apps/sandbox-runtime",
    "@apps/preview-runtime",
    "@packages/agents",
    "@packages/ai",
    "@packages/brain",
    "@packages/build-engine",
    "@packages/context",
    "@packages/queue"
  ]
};

// tsup.config.ts
var tsup_config_default = defineConfig({
  ...baseConfig,
  entry: ["src/index.ts"]
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiLCAiLi4vLi4vdHN1cC5jb25maWcuYmFzZS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX19pbmplY3RlZF9maWxlbmFtZV9fID0gXCJDOlxcXFxtdWx0aWFnZW50aWNfcHJvamVjdFxcXFxtdWx0aUFnZW50LW1haW5cXFxcYXBwc1xcXFxjb3JlLWFwaVxcXFx0c3VwLmNvbmZpZy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCJDOlxcXFxtdWx0aWFnZW50aWNfcHJvamVjdFxcXFxtdWx0aUFnZW50LW1haW5cXFxcYXBwc1xcXFxjb3JlLWFwaVwiO2NvbnN0IF9faW5qZWN0ZWRfaW1wb3J0X21ldGFfdXJsX18gPSBcImZpbGU6Ly8vQzovbXVsdGlhZ2VudGljX3Byb2plY3QvbXVsdGlBZ2VudC1tYWluL2FwcHMvY29yZS1hcGkvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcclxuaW1wb3J0IHsgYmFzZUNvbmZpZyB9IGZyb20gJy4uLy4uL3RzdXAuY29uZmlnLmJhc2UnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAuLi5iYXNlQ29uZmlnLFxyXG4gIGVudHJ5OiBbJ3NyYy9pbmRleC50cyddLFxyXG59KTtcclxuIiwgImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiQzpcXFxcbXVsdGlhZ2VudGljX3Byb2plY3RcXFxcbXVsdGlBZ2VudC1tYWluXFxcXHRzdXAuY29uZmlnLmJhc2UudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiQzpcXFxcbXVsdGlhZ2VudGljX3Byb2plY3RcXFxcbXVsdGlBZ2VudC1tYWluXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9DOi9tdWx0aWFnZW50aWNfcHJvamVjdC9tdWx0aUFnZW50LW1haW4vdHN1cC5jb25maWcuYmFzZS50c1wiO2ltcG9ydCB7IE9wdGlvbnMgfSBmcm9tICd0c3VwJztcblxuZXhwb3J0IGNvbnN0IGJhc2VDb25maWc6IE9wdGlvbnMgPSB7XG4gIGZvcm1hdDogWydjanMnLCAnZXNtJ10sXG4gIGR0czogZmFsc2UsXG4gIGNsZWFuOiB0cnVlLFxuICBzb3VyY2VtYXA6IHRydWUsXG4gIG1pbmlmeTogZmFsc2UsXG4gIHNwbGl0dGluZzogZmFsc2UsXG4gIHRhcmdldDogJ25vZGUyMCcsXG4gIGV4dGVybmFsOiBbXG4gICAgJ2J1bGxtcScsXG4gICAgJ2lvcmVkaXMnLFxuICAgICdwaW5vJyxcbiAgICAndXVpZCcsXG4gICAgJ2ZzLWV4dHJhJyxcbiAgICAnYXJjaGl2ZXInLFxuICAgICdkb3RlbnYnLFxuICAgICd6b2QnLFxuICAgICdyZWFjdCcsXG4gICAgJ3N0cmlwZScsXG4gICAgJ3Byb20tY2xpZW50JyxcbiAgICAncmVkbG9jaycsXG4gICAgJ25leHQnLFxuICAgICdzb2NrZXQuaW8tY2xpZW50JyxcbiAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAnQHRlbXBvcmFsaW8vY2xpZW50JyxcbiAgICAnQHRlbXBvcmFsaW8vd29ya2VyJyxcbiAgICAnYXhpb3MnLFxuICAgICdleHByZXNzJyxcbiAgICAnc29ja2V0LmlvJyxcbiAgICAnY29ycycsXG4gICAgJ2pzb253ZWJ0b2tlbicsXG4gICAgJ0BwYWNrYWdlcy9jb250cmFjdHMnLFxuICAgICdAcGFja2FnZXMvZGInLFxuICAgICdAcGFja2FnZXMvb2JzZXJ2YWJpbGl0eScsXG4gICAgJ0BwYWNrYWdlcy9yZWdpc3RyeScsXG4gICAgJ0BwYWNrYWdlcy9zdXBhYmFzZScsXG4gICAgJ0BwYWNrYWdlcy92YWxpZGF0b3InLFxuICAgICdAcGFja2FnZXMvY29yZS1lbmdpbmUnLFxuICAgICdAcGFja2FnZXMvc2FuZGJveCcsXG4gICAgJ0BwYWNrYWdlcy9hZ2VudHMnLFxuICAgICdAYXBwcy9zYW5kYm94LXJ1bnRpbWUnLFxuICAgICdAYXBwcy9wcmV2aWV3LXJ1bnRpbWUnLFxuICAgICdAcGFja2FnZXMvYWdlbnRzJyxcbiAgICAnQHBhY2thZ2VzL2FpJyxcbiAgICAnQHBhY2thZ2VzL2JyYWluJyxcbiAgICAnQHBhY2thZ2VzL2J1aWxkLWVuZ2luZScsXG4gICAgJ0BwYWNrYWdlcy9jb250ZXh0JyxcbiAgICAnQHBhY2thZ2VzL3F1ZXVlJ1xuICBdLFxufTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVQsU0FBUyxvQkFBb0I7OztBQ0U3VSxJQUFNLGFBQXNCO0FBQUEsRUFDakMsUUFBUSxDQUFDLE9BQU8sS0FBSztBQUFBLEVBQ3JCLEtBQUs7QUFBQSxFQUNMLE9BQU87QUFBQSxFQUNQLFdBQVc7QUFBQSxFQUNYLFFBQVE7QUFBQSxFQUNSLFdBQVc7QUFBQSxFQUNYLFFBQVE7QUFBQSxFQUNSLFVBQVU7QUFBQSxJQUNSO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQ0Y7OztBRGhEQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixHQUFHO0FBQUEsRUFDSCxPQUFPLENBQUMsY0FBYztBQUN4QixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
