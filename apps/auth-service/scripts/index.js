var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/index.ts
var import_express = __toESM(require("express"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var import_dotenv = __toESM(require("dotenv"));
var import_cors = __toESM(require("cors"));
var import_observability = require("@packages/observability");
var import_utils = require("@packages/utils");
import_dotenv.default.config();
(0, import_observability.initTelemetry)("multiagent-auth-service");
var app = (0, import_express.default)();
var PORT = process.env.PORT || 4002;
var JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
app.use((0, import_cors.default)());
app.use(import_express.default.json());
var users = [
  { id: "1", email: "user@example.com", password: "password", roles: ["FREE"] },
  { id: "2", email: "pro@example.com", password: "password", roles: ["PRO"] },
  { id: "3", email: "admin@example.com", password: "password", roles: ["ADMIN"] }
];
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = import_jsonwebtoken.default.sign(
    { id: user.id, email: user.email, roles: user.roles },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({ token, user: { id: user.id, email: user.email, roles: user.roles } });
});
var internalAuth = (req, res, next) => {
  const key = req.headers["x-internal-key"];
  if (key !== (process.env.INTERNAL_KEY || "default-internal-secret")) {
    return res.status(401).json({ error: "Unauthorized: Internal access only" });
  }
  next();
};
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", import_utils.registry.contentType);
  res.end(await import_utils.registry.metrics());
});
app.post("/internal/upgrade", internalAuth, (req, res) => {
  const { userId, role } = req.body;
  const user = users.find((u) => u.id === userId);
  if (user) {
    if (!user.roles.includes(role)) {
      user.roles.push(role);
    }
    console.log(`[AuthService] User ${userId} upgraded to ${role}`);
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: "User not found" });
});
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "auth-service" });
});
app.listen(PORT, () => {
  console.log(`[AuthService] Running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map