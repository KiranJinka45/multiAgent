export enum SideEffectClass {
    REVERSIBLE = 'REVERSIBLE',
    IRREVERSIBLE = 'IRREVERSIBLE',
    APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
    PARTIALLY_SIMULATABLE = 'PARTIALLY_SIMULATABLE',
    DANGEROUS = 'DANGEROUS',
    EXTERNALLY_OBSERVABLE = 'EXTERNALLY_OBSERVABLE',
}

export interface OperationDescriptor {
    name: string;
    sideEffectClass: SideEffectClass;
    description: string;
}

export class SideEffectOntology {
    private static registry: Map<string, OperationDescriptor> = new Map([
        ['read-file', { name: 'read-file', sideEffectClass: SideEffectClass.REVERSIBLE, description: 'Read file contents from the sandbox filesystem' }],
        ['file-read', { name: 'file-read', sideEffectClass: SideEffectClass.REVERSIBLE, description: 'Read file contents (alias used by OPA policy)' }],
        ['write-file', { name: 'write-file', sideEffectClass: SideEffectClass.REVERSIBLE, description: 'Write or modify file contents in the sandbox filesystem' }],
        ['file-write', { name: 'file-write', sideEffectClass: SideEffectClass.REVERSIBLE, description: 'Write file contents (alias used by OPA policy)' }],
        ['delete-file', { name: 'delete-file', sideEffectClass: SideEffectClass.REVERSIBLE, description: 'Delete files inside the sandbox filesystem' }],
        ['socket-connect', { name: 'socket-connect', sideEffectClass: SideEffectClass.EXTERNALLY_OBSERVABLE, description: 'Establish outbound network connections' }],
        ['socket-listen', { name: 'socket-listen', sideEffectClass: SideEffectClass.EXTERNALLY_OBSERVABLE, description: 'Listen on local ports inside sandbox' }],
        ['dns-resolve', { name: 'dns-resolve', sideEffectClass: SideEffectClass.EXTERNALLY_OBSERVABLE, description: 'Resolve domain names' }],
        ['network-fetch', { name: 'network-fetch', sideEffectClass: SideEffectClass.EXTERNALLY_OBSERVABLE, description: 'Fetch data over network (HTTP/HTTPS)' }],
        ['spawn-process', { name: 'spawn-process', sideEffectClass: SideEffectClass.APPROVAL_REQUIRED, description: 'Spawn new child processes or binaries' }],
        ['exec-command', { name: 'exec-command', sideEffectClass: SideEffectClass.APPROVAL_REQUIRED, description: 'Execute shell commands' }],
        ['vm-execute', { name: 'vm-execute', sideEffectClass: SideEffectClass.APPROVAL_REQUIRED, description: 'Execute commands inside an isolated Firecracker microVM sandbox' }],
        ['llm-inference', { name: 'llm-inference', sideEffectClass: SideEffectClass.EXTERNALLY_OBSERVABLE, description: 'Invoke LLM model inference (AI-generated output)' }],
        ['build-trigger', { name: 'build-trigger', sideEffectClass: SideEffectClass.APPROVAL_REQUIRED, description: 'Trigger a build pipeline execution' }],
        ['log-append', { name: 'log-append', sideEffectClass: SideEffectClass.REVERSIBLE, description: 'Append entries to audit or application logs' }],
        ['reboot-system', { name: 'reboot-system', sideEffectClass: SideEffectClass.IRREVERSIBLE, description: 'System reboot request' }],
        ['mount-filesystem', { name: 'mount-filesystem', sideEffectClass: SideEffectClass.DANGEROUS, description: 'Mount host or virtual filesystems' }]
    ]);

    static registerOperation(descriptor: OperationDescriptor): void {
        const existing = this.registry.get(descriptor.name);
        if (existing) {
            if (existing.sideEffectClass === descriptor.sideEffectClass) {
                return;
            }
            throw new Error(`Operation ${descriptor.name} is already registered in the ontology with a different side effect class.`);
        }
        this.registry.set(descriptor.name, descriptor);
    }

    static getOperation(name: string): OperationDescriptor {
        const op = this.registry.get(name);
        if (!op) {
            throw new Error(`Unknown operation: ${name}. Execution denied by default.`);
        }
        return op;
    }

    static isIrreversible(name: string): boolean {
        const op = this.getOperation(name);
        return op.sideEffectClass === SideEffectClass.IRREVERSIBLE || op.sideEffectClass === SideEffectClass.DANGEROUS;
    }
}
