export interface Disposable {
    dispose(): Promise<void>;
}

export class ResourceScope implements Disposable {
    private children = new Set<Disposable | (() => Promise<void>)>();
    private parent: ResourceScope | null = null;
    private isDisposed = false;

    constructor(parent?: ResourceScope) {
        if (parent) {
            this.parent = parent;
            parent.register(this);
        }
    }

    public register(resource: Disposable | (() => Promise<void>)): void {
        if (this.isDisposed) {
            if (typeof resource === 'function') {
                resource();
            } else {
                resource.dispose();
            }
            return;
        }
        this.children.add(resource);
    }

    public createChildScope(): ResourceScope {
        return new ResourceScope(this);
    }

    public async dispose(): Promise<void> {
        if (this.isDisposed) return;
        this.isDisposed = true;

        if (this.parent) {
            this.parent.children.delete(this);
        }

        const promises = Array.from(this.children).map(async (child) => {
            try {
                if (typeof child === 'function') {
                    await child();
                } else {
                    await child.dispose();
                }
            } catch (err) {
                console.error('[RESOURCE_SCOPE] Error during child disposal:', err);
            }
        });

        await Promise.all(promises);
        this.children.clear();
    }
}
