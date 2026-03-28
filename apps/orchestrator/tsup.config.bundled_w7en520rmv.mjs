// tsup.config.ts
import { defineConfig } from "tsup";
var tsup_config_default = defineConfig({
  format: ["cjs", "esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "node20",
  entry: ["src/index.ts"],
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
    "jsonwebtoken"
  ]
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiQzpcXFxcbXVsdGlhZ2VudGljX3Byb2plY3RcXFxcbXVsdGlBZ2VudC1tYWluXFxcXGFwcHNcXFxcb3JjaGVzdHJhdG9yXFxcXHRzdXAuY29uZmlnLnRzXCI7Y29uc3QgX19pbmplY3RlZF9kaXJuYW1lX18gPSBcIkM6XFxcXG11bHRpYWdlbnRpY19wcm9qZWN0XFxcXG11bHRpQWdlbnQtbWFpblxcXFxhcHBzXFxcXG9yY2hlc3RyYXRvclwiO2NvbnN0IF9faW5qZWN0ZWRfaW1wb3J0X21ldGFfdXJsX18gPSBcImZpbGU6Ly8vQzovbXVsdGlhZ2VudGljX3Byb2plY3QvbXVsdGlBZ2VudC1tYWluL2FwcHMvb3JjaGVzdHJhdG9yL3RzdXAuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndHN1cCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGZvcm1hdDogWydjanMnLCAnZXNtJ10sXHJcbiAgZHRzOiBmYWxzZSxcclxuICBzcGxpdHRpbmc6IGZhbHNlLFxyXG4gIHNvdXJjZW1hcDogdHJ1ZSxcclxuICBjbGVhbjogdHJ1ZSxcclxuICB0YXJnZXQ6ICdub2RlMjAnLFxyXG4gIGVudHJ5OiBbJ3NyYy9pbmRleC50cyddLFxyXG4gIGV4dGVybmFsOiBbXHJcbiAgICAnYnVsbG1xJyxcclxuICAgICdpb3JlZGlzJyxcclxuICAgICdwaW5vJyxcclxuICAgICd1dWlkJyxcclxuICAgICdmcy1leHRyYScsXHJcbiAgICAnYXJjaGl2ZXInLFxyXG4gICAgJ2RvdGVudicsXHJcbiAgICAnem9kJyxcclxuICAgICdyZWFjdCcsXHJcbiAgICAnc3RyaXBlJyxcclxuICAgICdwcm9tLWNsaWVudCcsXHJcbiAgICAncmVkbG9jaycsXHJcbiAgICAnbmV4dCcsXHJcbiAgICAnc29ja2V0LmlvLWNsaWVudCcsXHJcbiAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcclxuICAgICdAdGVtcG9yYWxpby9jbGllbnQnLFxyXG4gICAgJ0B0ZW1wb3JhbGlvL3dvcmtlcicsXHJcbiAgICAnYXhpb3MnLFxyXG4gICAgJ2V4cHJlc3MnLFxyXG4gICAgJ3NvY2tldC5pbycsXHJcbiAgICAnY29ycycsXHJcbiAgICAnanNvbndlYnRva2VuJ1xyXG4gIF0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1VLFNBQVMsb0JBQW9CO0FBRWhXLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFFBQVEsQ0FBQyxPQUFPLEtBQUs7QUFBQSxFQUNyQixLQUFLO0FBQUEsRUFDTCxXQUFXO0FBQUEsRUFDWCxXQUFXO0FBQUEsRUFDWCxPQUFPO0FBQUEsRUFDUCxRQUFRO0FBQUEsRUFDUixPQUFPLENBQUMsY0FBYztBQUFBLEVBQ3RCLFVBQVU7QUFBQSxJQUNSO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
