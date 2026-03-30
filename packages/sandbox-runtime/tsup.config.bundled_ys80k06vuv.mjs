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
    "@packages/shared-services",
    "@packages/memory",
    "@packages/supabase",
    "@packages/validator",
    "@packages/core-engine",
    "@packages/sandbox",
    "@packages/agents",
    "@packages/ai",
    "@packages/brain",
    "@packages/build-engine",
    "@packages/context",
    "@packages/queue",
    "@packages/utils"
  ]
};

// tsup.config.ts
import fs from "fs";
var entries = fs.readdirSync("src").filter((file) => file.endsWith(".ts")).map((file) => `src/${file}`);
var tsup_config_default = defineConfig({
  ...baseConfig,
  entry: entries
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiLCAiLi4vLi4vdHN1cC5jb25maWcuYmFzZS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX19pbmplY3RlZF9maWxlbmFtZV9fID0gXCJDOlxcXFxtdWx0aWFnZW50aWNfcHJvamVjdFxcXFxtdWx0aUFnZW50LW1haW5cXFxcYXBwc1xcXFxzYW5kYm94LXJ1bnRpbWVcXFxcdHN1cC5jb25maWcudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiQzpcXFxcbXVsdGlhZ2VudGljX3Byb2plY3RcXFxcbXVsdGlBZ2VudC1tYWluXFxcXGFwcHNcXFxcc2FuZGJveC1ydW50aW1lXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9DOi9tdWx0aWFnZW50aWNfcHJvamVjdC9tdWx0aUFnZW50LW1haW4vYXBwcy9zYW5kYm94LXJ1bnRpbWUvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcclxuaW1wb3J0IHsgYmFzZUNvbmZpZyB9IGZyb20gJy4uLy4uL3RzdXAuY29uZmlnLmJhc2UnO1xyXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbmNvbnN0IGVudHJpZXMgPSBmcy5yZWFkZGlyU3luYygnc3JjJylcclxuICAuZmlsdGVyKGZpbGUgPT4gZmlsZS5lbmRzV2l0aCgnLnRzJykpXHJcbiAgLm1hcChmaWxlID0+IGBzcmMvJHtmaWxlfWApO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAuLi5iYXNlQ29uZmlnLFxyXG4gIGVudHJ5OiBlbnRyaWVzLFxyXG59KTtcclxuIiwgImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiQzpcXFxcbXVsdGlhZ2VudGljX3Byb2plY3RcXFxcbXVsdGlBZ2VudC1tYWluXFxcXHRzdXAuY29uZmlnLmJhc2UudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiQzpcXFxcbXVsdGlhZ2VudGljX3Byb2plY3RcXFxcbXVsdGlBZ2VudC1tYWluXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9DOi9tdWx0aWFnZW50aWNfcHJvamVjdC9tdWx0aUFnZW50LW1haW4vdHN1cC5jb25maWcuYmFzZS50c1wiO2ltcG9ydCB7IE9wdGlvbnMgfSBmcm9tICd0c3VwJztcblxuZXhwb3J0IGNvbnN0IGJhc2VDb25maWc6IE9wdGlvbnMgPSB7XG4gIGZvcm1hdDogWydjanMnLCAnZXNtJ10sXG4gIGR0czogZmFsc2UsXG4gIGNsZWFuOiB0cnVlLFxuICBzb3VyY2VtYXA6IHRydWUsXG4gIG1pbmlmeTogZmFsc2UsXG4gIHNwbGl0dGluZzogZmFsc2UsXG4gIHRhcmdldDogJ25vZGUyMCcsXG4gIGV4dGVybmFsOiBbXG4gICAgJ2J1bGxtcScsXG4gICAgJ2lvcmVkaXMnLFxuICAgICdwaW5vJyxcbiAgICAndXVpZCcsXG4gICAgJ2ZzLWV4dHJhJyxcbiAgICAnYXJjaGl2ZXInLFxuICAgICdkb3RlbnYnLFxuICAgICd6b2QnLFxuICAgICdyZWFjdCcsXG4gICAgJ3N0cmlwZScsXG4gICAgJ3Byb20tY2xpZW50JyxcbiAgICAncmVkbG9jaycsXG4gICAgJ25leHQnLFxuICAgICdzb2NrZXQuaW8tY2xpZW50JyxcbiAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAnQHRlbXBvcmFsaW8vY2xpZW50JyxcbiAgICAnQHRlbXBvcmFsaW8vd29ya2VyJyxcbiAgICAnYXhpb3MnLFxuICAgICdleHByZXNzJyxcbiAgICAnc29ja2V0LmlvJyxcbiAgICAnY29ycycsXG4gICAgJ2pzb253ZWJ0b2tlbicsXG4gICAgJ0BwYWNrYWdlcy9jb250cmFjdHMnLFxuICAgICdAcGFja2FnZXMvZGInLFxuICAgICdAcGFja2FnZXMvb2JzZXJ2YWJpbGl0eScsXG4gICAgJ0BwYWNrYWdlcy9zaGFyZWQtc2VydmljZXMnLFxuICAgICdAcGFja2FnZXMvbWVtb3J5JyxcbiAgICAnQHBhY2thZ2VzL3N1cGFiYXNlJyxcbiAgICAnQHBhY2thZ2VzL3ZhbGlkYXRvcicsXG4gICAgJ0BwYWNrYWdlcy9jb3JlLWVuZ2luZScsXG4gICAgJ0BwYWNrYWdlcy9zYW5kYm94JyxcbiAgICAnQHBhY2thZ2VzL2FnZW50cycsXG4gICAgJ0BwYWNrYWdlcy9haScsXG4gICAgJ0BwYWNrYWdlcy9icmFpbicsXG4gICAgJ0BwYWNrYWdlcy9idWlsZC1lbmdpbmUnLFxuICAgICdAcGFja2FnZXMvY29udGV4dCcsXG4gICAgJ0BwYWNrYWdlcy9xdWV1ZScsXG4gICAgJ0BwYWNrYWdlcy91dGlscydcbiAgXSxcbn07XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRVLFNBQVMsb0JBQW9COzs7QUNFbFcsSUFBTSxhQUFzQjtBQUFBLEVBQ2pDLFFBQVEsQ0FBQyxPQUFPLEtBQUs7QUFBQSxFQUNyQixLQUFLO0FBQUEsRUFDTCxPQUFPO0FBQUEsRUFDUCxXQUFXO0FBQUEsRUFDWCxRQUFRO0FBQUEsRUFDUixXQUFXO0FBQUEsRUFDWCxRQUFRO0FBQUEsRUFDUixVQUFVO0FBQUEsSUFDUjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQ0Y7OztBRGhEQSxPQUFPLFFBQVE7QUFHZixJQUFNLFVBQVUsR0FBRyxZQUFZLEtBQUssRUFDakMsT0FBTyxVQUFRLEtBQUssU0FBUyxLQUFLLENBQUMsRUFDbkMsSUFBSSxVQUFRLE9BQU8sSUFBSSxFQUFFO0FBRTVCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLEdBQUc7QUFBQSxFQUNILE9BQU87QUFDVCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
