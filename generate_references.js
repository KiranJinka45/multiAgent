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

const projectMap = {}; // name in package.json -> relative path
allProjects.forEach(p => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(root, p.dir, p.name, 'package.json'), 'utf8'));
  projectMap[pkgJson.name] = `./${p.dir}/${p.name}`;
});

allProjects.forEach(p => {
  const projectPath = path.join(root, p.dir, p.name);
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  const pkgJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(tsconfigPath)) return;

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  
  const references = [];
  Object.keys(deps).forEach(dep => {
    if (projectMap[dep]) {
      // It's a workspace project
      const relPath = path.relative(projectPath, path.join(root, projectMap[dep].replace('./', ''))).replace(/\\/g, '/');
      references.push({ path: relPath });
    }
  });

  if (references.length > 0) {
    console.log(`Updating references for ${pkgJson.name}...`);
    let tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    // Sort references for consistency
    tsconfig.references = references.sort((a, b) => a.path.localeCompare(b.path));
    
    // Ensure composite is true
    if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {};
    tsconfig.compilerOptions.composite = true;
    tsconfig.compilerOptions.declaration = true;
    tsconfig.compilerOptions.noEmit = false;

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  }
});

console.log('Done updating project references.');
