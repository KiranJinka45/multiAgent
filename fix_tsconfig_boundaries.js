const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packagesDir = path.join(root, 'packages');
const appsDir = path.join(root, 'apps');

const getAllProjects = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(pkg => fs.existsSync(path.join(dir, pkg, 'package.json')));
};

const allPackages = getAllProjects(packagesDir).map(p => ({ name: p, dir: 'packages' }));
const allApps = getAllProjects(appsDir).map(p => ({ name: p, dir: 'apps' }));
const allProjects = [...allPackages, ...allApps];

const projectMap = {}; 
const nameMap = {};
allProjects.forEach(p => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(root, p.dir, p.name, 'package.json'), 'utf8'));
  projectMap[pkgJson.name] = `./${p.dir}/${p.name}`;
  nameMap[pkgJson.name] = p.name;
});

allProjects.forEach(p => {
  const projectPath = path.join(root, p.dir, p.name);
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  const pkgJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(tsconfigPath)) return;

  console.log(`Processing ${p.dir}/${p.name}...`);
  
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  
  const references = [];
  const paths = {};
  Object.keys(deps).forEach(dep => {
    if (projectMap[dep]) {
      const targetDir = projectMap[dep].replace('./', '');
      const relPath = path.relative(projectPath, path.join(root, targetDir)).replace(/\\/g, '/');
      references.push({ path: relPath });
      // Point to src for better IDE support and initial builds
      paths[dep] = [`${relPath}/src`];
    }
  });

  let tsconfig;
  try {
    let content = fs.readFileSync(tsconfigPath, 'utf8');
    content = content.replace(/\"\.\.\/\//g, '"../');
    let clean = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    clean = clean.replace(/,\s*([\}\]])/g, '$1');
    tsconfig = JSON.parse(clean); 
  } catch (err) {
    console.error(`  Failed to parse ${tsconfigPath}:`, err.message);
    return;
  }

  if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {};

  delete tsconfig.compilerOptions.rootDir;
  tsconfig.compilerOptions.composite = true;
  tsconfig.compilerOptions.declaration = true;
  tsconfig.compilerOptions.noEmit = false;
  tsconfig.compilerOptions.baseUrl = ".";

  if (Object.keys(paths).length > 0) {
    tsconfig.compilerOptions.paths = paths;
  } else {
    delete tsconfig.compilerOptions.paths;
  }

  if (references.length > 0) {
    tsconfig.references = references.sort((a, b) => a.path.localeCompare(b.path));
  } else {
    delete tsconfig.references;
  }

  const relToBase = path.relative(projectPath, root).replace(/\\/g, '/');
  tsconfig.extends = `${relToBase}/tsconfig.base.json`;

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
});

const rootTsconfigPath = path.join(root, 'tsconfig.json');
if (fs.existsSync(rootTsconfigPath)) {
  console.log('Updating root tsconfig.json...');
  let content = fs.readFileSync(rootTsconfigPath, 'utf8');
  let clean = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
  clean = clean.replace(/,\s*([\}\]])/g, '$1');
  const rootTsconfig = JSON.parse(clean);
  
  rootTsconfig.references = allProjects
    .filter(p => fs.existsSync(path.join(root, p.dir, p.name, 'tsconfig.json')))
    .map(p => ({ path: `./${p.dir}/${p.name}` }))
    .sort((a, b) => a.path.localeCompare(b.path));

  fs.writeFileSync(rootTsconfigPath, JSON.stringify(rootTsconfig, null, 2));
}

console.log('Done fixing TS boundaries.');
