import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function getAllTsConfigs(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            results = results.concat(getAllTsConfigs(fullPath));
        } else if (file === 'tsconfig.json') {
            results.push(fullPath);
        }
    });
    return results;
}

function stripComments(text) {
    return text.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
}

const allConfigs = getAllTsConfigs(rootDir);

for (const configPath of allConfigs) {
    let changed = false;
    let text = fs.readFileSync(configPath, 'utf8');
    let content;
    try {
        content = JSON.parse(stripComments(text));
    } catch (e) {
        console.error(`Failed to parse ${configPath}: ${e.message}`);
        continue;
    }
    
    if (content.references) {
        const originalCount = content.references.length;
        content.references = content.references.filter(ref => {
            const targetPath = path.resolve(path.dirname(configPath), ref.path);
            const exists = fs.existsSync(targetPath);
            if (!exists) {
                console.log(`Pruning reference ${ref.path} from ${configPath}`);
            }
            return exists;
        });
        if (content.references.length !== originalCount) changed = true;
    }

    if (changed) {
        fs.writeFileSync(configPath, JSON.stringify(content, null, 2));
    }
}
