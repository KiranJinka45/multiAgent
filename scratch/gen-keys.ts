import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const keysDir = path.join(process.cwd(), '.ztan-witness', 'keys');

function generateKey(dir: string) {
    const targetDir = path.join(keysDir, dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    fs.writeFileSync(path.join(targetDir, 'witness.key'), privateKey);
    fs.writeFileSync(path.join(targetDir, 'witness.pub'), publicKey);
    console.log(`Generated keys for ${dir}`);
}

generateKey('witness2');
generateKey('witness3');
