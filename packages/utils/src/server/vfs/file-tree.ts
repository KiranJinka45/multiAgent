import { VirtualFile } from './virtual-fs';

export interface FileTreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileTreeNode[];
    metadata?: {
        isDirty: boolean;
        agentId?: string;
        hash: string;
    };
}

export class FileTreeGenerator {
    /**
     * Converts a flat list of VirtualFiles into a hierarchical tree structure.
     */
    static generate(files: VirtualFile[]): FileTreeNode {
        const root: FileTreeNode = {
            name: 'root',
            path: '',
            type: 'directory',
            children: []
        };

        for (const file of files) {
            const parts = file.path.split('/');
            let currentNode = root;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLastPart = i === parts.length - 1;
                const currentPath = parts.slice(0, i + 1).join('/');

                let child = currentNode.children?.find(c => c.name === part);

                if (!child) {
                    child = {
                        name: part!,
                        path: currentPath,
                        type: isLastPart ? 'file' : 'directory',
                        children: isLastPart ? undefined : [] as FileTreeNode[]
                    } as FileTreeNode;
                    currentNode.children!.push(child);
                }

                if (isLastPart) {
                    child.metadata = {
                        isDirty: file.isDirty,
                        hash: file.hash,
                        ...(file.agentId ? { agentId: file.agentId } : {})
                    };
                }

                currentNode = child!;
            }
        }

        return root;
    }
}
