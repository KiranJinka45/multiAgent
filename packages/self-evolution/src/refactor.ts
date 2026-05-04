import fs from "fs";
import path from "path";

export function applyRefactor(filePath: string, newCode: string) {
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.resolve(process.cwd(), filePath);

  // Backup original file before modification
  if (fs.existsSync(absolutePath)) {
    fs.copyFileSync(absolutePath, `${absolutePath}.bak`);
  }

  fs.writeFileSync(absolutePath, newCode, 'utf8');
}

export function rollback(filePath: string) {
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.resolve(process.cwd(), filePath);
  const backupPath = `${absolutePath}.bak`;

  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, absolutePath);
    fs.unlinkSync(backupPath);
    return true;
  }
  return false;
}

