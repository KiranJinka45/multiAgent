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

// src/services/socket.ts
var import_express = __toESM(require("express"));
var import_http = require("http");
var import_socket = require("socket.io");
var import_server = require("@packages/utils/src/server");
var import_dotenv = __toESM(require("dotenv"));
var import_cors = __toESM(require("cors"));
var import_observability = require("@packages/observability");

// src/services/yjs-server.ts
var import_ws = require("ws");
var import_utils2 = require("y-websocket/bin/utils");

// src/services/collaboration-persistence.ts
var Y = __toESM(require("yjs"));
var import_db = require("@packages/db");
var import_utils = __toESM(require("@packages/utils"));
var CollaborationPersistence = class {
  /**
   * Binds a Yjs document to Postgres persistence.
   * Loads the initial state from DB if it exists.
   */
  async bindState(docName, ydoc) {
    try {
      const doc = await import_db.prisma.collaborativeDoc.findUnique({
        where: { name: docName }
      });
      if (doc && doc.updates) {
        Y.applyUpdate(ydoc, doc.updates);
        import_utils.default.debug({ docName }, "[YJS:Persistence] Initial state loaded from Postgres");
      } else {
        import_utils.default.debug({ docName }, "[YJS:Persistence] No existing state found, starting fresh");
      }
      ydoc.on("update", async (_update) => {
        await this.storeUpdate(docName, ydoc);
      });
    } catch (err) {
      import_utils.default.error({ docName, err }, "[YJS:Persistence] Failed to bind document state");
    }
  }
  /**
   * Merges current document state and persists to Postgres.
   * Uses a debounce/throttle mechanism in a real-world scenario, 
   * but here we use direct updates for simplicity in the demo.
   */
  async storeUpdate(docName, ydoc) {
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      await import_db.prisma.collaborativeDoc.upsert({
        where: { name: docName },
        update: { updates: Buffer.from(state) },
        create: {
          name: docName,
          updates: Buffer.from(state)
        }
      });
    } catch (err) {
      import_utils.default.error({ docName, err }, "[YJS:Persistence] Failed to store document update");
    }
  }
};
var collaborationPersistence = new CollaborationPersistence();

// src/services/yjs-server.ts
var import_utils3 = __toESM(require("@packages/utils"));
var import_url = __toESM(require("url"));
function startCollaborationServer(port = 3011) {
  const wss = new import_ws.WebSocketServer({ port, host: "0.0.0.0" });
  wss.on("connection", (conn, req) => {
    const parsedUrl = import_url.default.parse(req.url || "/", true);
    const docName = parsedUrl.pathname?.slice(1) || "default";
    import_utils3.default.info({ docName, remoteAddress: req.socket.remoteAddress }, "[YJS] Connection established");
    (0, import_utils2.setupWSConnection)(conn, req, {
      docName,
      gc: true,
      persistence: collaborationPersistence
    });
  });
  import_utils3.default.info({ port }, "[YJS] Collaboration Server running with Postgres persistence");
  return wss;
}

// src/services/socket.ts
(0, import_observability.initTelemetry)("multiagent-api-orchestrator");
import_dotenv.default.config({ path: ".env.local" });
var app = (0, import_express.default)();
app.use((0, import_cors.default)());
app.use((req, res, next) => {
  const end = import_server.apiRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.path,
      // req.route?.path often not available in global middleware
      status_code: res.statusCode.toString()
    });
  });
  next();
});
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), service: "multiagent-api-orchestrator" });
});
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", import_server.registry.contentType);
    res.end(await import_server.registry.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});
app.use("/preview/:projectId", async (req, res) => {
  const { projectId } = req.params;
  try {
    const targetPortStr = await import_server.redis.get(`preview:port:${projectId}`);
    if (!targetPortStr) {
      return res.status(404).send("Preview not found or expired");
    }
    const targetPort = parseInt(targetPortStr, 10);
    console.log(`[PreviewProxy] Steering ${projectId} to internal port ${targetPort}`);
    res.status(200).send(`[Preview Proxy Ready] Project: ${projectId} -> Port: ${targetPort}`);
  } catch (err) {
    console.error("[PreviewProxy] Error:", err);
    res.status(500).send("Proxy Gateway Error");
  }
});
var server = (0, import_http.createServer)(app);
var io = new import_socket.Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  socket.on("subscribe", (executionId) => {
    console.log(`[Socket] Subscribing ${socket.id} to build:${executionId}`);
    socket.join(`build:${executionId}`);
  });
  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});
var PORT = parseInt(process.env.PORT || "3001", 10);
var YJS_PORT = 3011;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[API-Orchestrator] Socket Server running on port ${PORT}`);
});
startCollaborationServer(YJS_PORT);
//# sourceMappingURL=index.js.map