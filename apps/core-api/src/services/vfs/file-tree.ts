import type { VirtualFile } from './virtual-fs.js';

export interface FileTreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileTreeNode[];
    isDirty?: boolean;
}

export class FileTreeGenerator {
    static generate(files: VirtualFile[]): FileTreeNode[] {
        const root: FileTreeNode[] = [];
        
        for (const file of files) {
            const parts = file.path.split('/');
            let currentLevel = root;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const path = parts.slice(0, i + 1).join('/');
                const isLast = i === parts.length - 1;
                
                let node = currentLevel.find(n => n.name === part);
                
                if (!node) {
                    node = {
                        name: part,
                        path: path,
                        type: isLast ? 'file' : 'directory',
                        isDirty: isLast ? file.isDirty : false
                    };
                    
                    if (!isLast) {
                        node.children = [];
                    }
                    
                    currentLevel.push(node);
                    currentLevel.sort((a, b) => {
                        if (a.type !== b.type) {
                            return a.type === 'directory' ? -1 : 1;
                        }
                        return a.name.localeCompare(b.name);
                    });
                } else if (isLast) {
                    node.isDirty = file.isDirty;
                }
                
                if (node.children) {
                    currentLevel = node.children;
                }
            }
        }
        
        return root;
    }
}
