import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "@packages/utils";

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  io = new Server(server, {
    adapter: createAdapter(pubClient, subClient),
    cors: {
      origin: "*", // Controlled by Next.js Proxy in Production
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["polling", "websocket"],
    allowUpgrades: true,
    pingTimeout: 30000,
    pingInterval: 25000
  });

  io.on("connection", (socket) => {
    console.log("✅ [Gateway-Socket] Client connected:", socket.id);

    socket.emit("status", { msg: "Neural Connectivity Established", timestamp: new Date().toISOString() });

    socket.on("telemetry", (data) => {
      console.log("📊 [Gateway-Telemetry] Ingress:", data);
      io?.emit("telemetry:broadcast", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ [Gateway-Socket] Client disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocket(server) first.");
  }
  return io;
}
