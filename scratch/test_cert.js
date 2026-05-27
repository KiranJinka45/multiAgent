import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

function generateCertAndKey(commonName, tempDir) {
    const keyFile = path.join(tempDir, `${commonName}.key`);
    const certFile = path.join(tempDir, `${commonName}.crt`);

    const cmd = `"C:\\Program Files\\Git\\usr\\bin\\openssl.exe" req -x509 -newkey rsa:2048 -nodes -keyout "${keyFile}" -out "${certFile}" -days 365 -subj "/CN=${commonName}"`;
    execSync(cmd);

    const key = fs.readFileSync(keyFile, 'utf8');
    const cert = fs.readFileSync(certFile, 'utf8');

    // Cleanup files
    fs.unlinkSync(keyFile);
    fs.unlinkSync(certFile);

    return { cert, key };
}

try {
    const tempDir = path.join(process.cwd(), 'scratch');
    const creds = generateCertAndKey('127.0.0.1', tempDir);
    console.log("Success! Cert length:", creds.cert.length, "Key length:", creds.key.length);
    console.log(creds.cert.substring(0, 80) + "...");
} catch (err) {
    console.error("Error:", err);
}
