import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import net from 'net';
import cp from 'child_process';

// 1. Load Capabilities from Env
const rawManifest = process.env.CAPABILITY_MANIFEST_JSON || '{}';
let manifest: {
  executionId?: string;
  capabilities?: string[];
} = {};

try {
  manifest = JSON.parse(rawManifest);
} catch (_e) {
  console.error('[Preload] Failed to parse CAPABILITY_MANIFEST_JSON');
}

const capabilities = manifest.capabilities || [];
const executionId = manifest.executionId || 'unknown';

// Resolve capability lists
const allowedReads: string[] = [];
const allowedWrites: string[] = [];
const allowedDomains: string[] = [];
let canSpawnSubprocess = false;

for (const cap of capabilities) {
  if (cap.startsWith('filesystem.read:')) {
    allowedReads.push(cap.slice('filesystem.read:'.length));
  } else if (cap.startsWith('filesystem.write:')) {
    allowedWrites.push(cap.slice('filesystem.write:'.length));
  } else if (cap.startsWith('network.http:') || cap.startsWith('network.tcp:')) {
    const domain = cap.split(':')[1];
    if (domain) allowedDomains.push(domain);
  } else if (cap === 'subprocess') {
    canSpawnSubprocess = true;
  }
}

// 2. Simple Glob Matcher (supports * and **)
function matchGlob(pattern: string, filePath: string): boolean {
  // Normalize path separators to forward slashes for cross-platform matching
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Simple glob to regex conversion
  const regexStr = '^' + normalizedPattern
    .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // escape regex symbols
    .replace(/\*\*/g, '.*')                  // match any character including slashes for **
    .replace(/\*(?!\*)/g, '[^/]*')           // match any character except slash for *
    + '$';

  try {
    const regex = new RegExp(regexStr);
    return regex.test(normalizedPath);
  } catch (_e) {
    return false;
  }
}

// 3. Capability Enforcement Helpers
function checkFsAccess(action: 'read' | 'write', filePath: string) {
  // Always resolve path to absolute
  const absPath = path.resolve(filePath);
  const allowedList = action === 'read' ? allowedReads : allowedWrites;

  // Let local node_modules or system files pass if they are required by the process runtime
  const normalizedAbs = absPath.replace(/\\/g, '/');
  if (normalizedAbs.includes('/node_modules/') || normalizedAbs.includes('/dist/')) {
    return;
  }

  // Allow implicit access if the file lies inside the spawned process's own sandbox directory (process.cwd)
  const sandboxDir = process.cwd();
  const relative = path.relative(sandboxDir, absPath);
  const isInsideSandbox = !relative.startsWith('..') && !path.isAbsolute(relative);
  if (isInsideSandbox) {
    return;
  }

  const isAllowed = allowedList.some(pattern => {
    const resolvedPattern = path.isAbsolute(pattern) ? pattern : path.resolve(pattern);
    return matchGlob(resolvedPattern, absPath);
  });

  if (!isAllowed) {
    const errMessage = `[CAPABILITY_VIOLATION] Unauthorized filesystem ${action} access to: ${filePath} (Execution ID: ${executionId})`;
    console.error(errMessage);
    throw new Error(errMessage);
  }
}

function checkNetworkAccess(host: string, port: number) {
  // Allow localhost loopbacks
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return;
  }

  const isAllowed = allowedDomains.some(pattern => {
    const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
    try {
      const regex = new RegExp(regexStr);
      return regex.test(host);
    } catch (_e) {
      return false;
    }
  });

  if (!isAllowed) {
    const errMessage = `[CAPABILITY_VIOLATION] Unauthorized outbound network connection to ${host}:${port} (Execution ID: ${executionId})`;
    console.error(errMessage);
    throw new Error(errMessage);
  }
}

function checkSubprocess() {
  if (!canSpawnSubprocess) {
    const errMessage = `[CAPABILITY_VIOLATION] Unauthorized subprocess invocation attempt (Execution ID: ${executionId})`;
    console.error(errMessage);
    throw new Error(errMessage);
  }
}

// 4. Hook Filesystem (fs)
const originalReadFile = fs.readFile;
fs.readFile = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('read', p);
  return originalReadFile.apply(this, [p, ...args] as any);
};

const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('read', p);
  return originalReadFileSync.apply(this, [p, ...args] as any);
};

const originalWriteFile = fs.writeFile;
fs.writeFile = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('write', p);
  return originalWriteFile.apply(this, [p, ...args] as any);
};

const originalWriteFileSync = fs.writeFileSync;
fs.writeFileSync = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('write', p);
  return originalWriteFileSync.apply(this, [p, ...args] as any);
};

const originalAppendFile = fs.appendFile;
fs.appendFile = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('write', p);
  return originalAppendFile.apply(this, [p, ...args] as any);
};

const originalAppendFileSync = fs.appendFileSync;
fs.appendFileSync = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('write', p);
  return originalAppendFileSync.apply(this, [p, ...args] as any);
};

const originalCreateReadStream = fs.createReadStream;
fs.createReadStream = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('read', p);
  return originalCreateReadStream.apply(this, [p, ...args] as any);
};

const originalCreateWriteStream = fs.createWriteStream;
fs.createWriteStream = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('write', p);
  return originalCreateWriteStream.apply(this, [p, ...args] as any);
};

const originalReaddir = fs.readdir;
fs.readdir = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('read', p);
  return originalReaddir.apply(this, [p, ...args] as any);
};

const originalReaddirSync = fs.readdirSync;
fs.readdirSync = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('read', p);
  return originalReaddirSync.apply(this, [p, ...args] as any);
};

// Hook promises filesystem
const originalFspReadFile = fsp.readFile;
fsp.readFile = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('read', p);
  return originalFspReadFile.apply(this, [p, ...args] as any);
};

const originalFspWriteFile = fsp.writeFile;
fsp.writeFile = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('write', p);
  return originalFspWriteFile.apply(this, [p, ...args] as any);
};

const originalFspAppendFile = fsp.appendFile;
fsp.appendFile = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('write', p);
  return originalFspAppendFile.apply(this, [p, ...args] as any);
};

const originalFspReaddir = fsp.readdir;
fsp.readdir = function(p: any, ...args: any[]) {
  if (typeof p === 'string') checkFsAccess('read', p);
  return originalFspReaddir.apply(this, [p, ...args] as any);
};

// Also attach promises hooks to fs.promises object
if ((fs as any).promises) {
  (fs as any).promises.readFile = fsp.readFile;
  (fs as any).promises.writeFile = fsp.writeFile;
  (fs as any).promises.appendFile = fsp.appendFile;
  (fs as any).promises.readdir = fsp.readdir;
}

// 5. Hook Network Sockets (net)
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(options: any, cb?: any) {
  let host = 'localhost';
  let port = 0;

  let opt = options;
  if (Array.isArray(options)) {
    opt = options[0] || {};
  }

  if (opt && typeof opt === 'object') {
    host = opt.host || 'localhost';
    port = opt.port || 0;
  } else if (typeof opt === 'number' || (typeof opt === 'string' && !isNaN(parseInt(opt, 10)))) {
    port = parseInt(opt, 10);
    // If options was an array, cb might not be host, but in standard connect(port, host) cb is host
    if (typeof cb === 'string') {
      host = cb;
    }
  }

  checkNetworkAccess(host, port);
  return originalConnect.apply(this, arguments as any);
};

// Hook global Fetch API
if (globalThis.fetch) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function(input: any, init?: any) {
    let urlString = '';
    if (typeof input === 'string') {
      urlString = input;
    } else if (input && typeof input === 'object' && 'url' in input) {
      urlString = input.url;
    } else if (input && typeof input.toString === 'function') {
      urlString = input.toString();
    }

    try {
      const url = new URL(urlString);
      checkNetworkAccess(url.hostname, url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80));
    } catch (_e) {
      // Fall through, let the socket connect intercept it if it parses dynamically
    }

    return originalFetch.apply(this, [input, init]);
  };
}

// 6. Hook Child Processes (child_process)
const originalSpawn = cp.spawn;
(cp as any).spawn = function(...args: any[]) {
  checkSubprocess();
  return originalSpawn.apply(this, args as any);
};

const originalExec = cp.exec;
(cp as any).exec = function(...args: any[]) {
  checkSubprocess();
  return originalExec.apply(this, args as any);
};

const originalExecSync = cp.execSync;
(cp as any).execSync = function(...args: any[]) {
  checkSubprocess();
  return originalExecSync.apply(this, args as any);
};

const originalFork = cp.fork;
(cp as any).fork = function(...args: any[]) {
  checkSubprocess();
  return originalFork.apply(this, args as any);
};

console.log(`[Sandbox Preload] Bounded Runtime containment successfully initialized for execution: ${executionId}`);
