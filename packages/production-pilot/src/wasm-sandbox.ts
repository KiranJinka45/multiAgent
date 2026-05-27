import { DeterministicScheduler } from './scheduler.js';
import { SideEffectJournal } from './journal.js';

export interface WasmSandboxOptions {
    memoryLimitPages?: number; // 1 page = 64KB
    allowedSideEffects?: string[];
}

export class WasmSandbox {
    private scheduler?: DeterministicScheduler;
    private journal?: SideEffectJournal;
    private clockCallback?: () => void;
    private ingressCallback?: (id: string) => any;
    private allowedSideEffects?: string[];

    constructor() {}

    /**
     * Binds execution context dependencies so imported functions can delegate to host journals.
     */
    public bindContext(options: {
        scheduler: DeterministicScheduler;
        journal: SideEffectJournal;
        clockCallback?: () => void;
        ingressCallback?: (id: string) => any;
    }): void {
        this.scheduler = options.scheduler;
        this.journal = options.journal;
        this.clockCallback = options.clockCallback;
        this.ingressCallback = options.ingressCallback;
    }

    public unbindContext(): void {
        this.scheduler = undefined;
        this.journal = undefined;
        this.clockCallback = undefined;
        this.ingressCallback = options => {};
    }

    /**
     * Instantiates a WASM module with a whitelisted capability bridge and memory page restrictions.
     */
    public async instantiate(
        wasmBytes: Uint8Array,
        options: WasmSandboxOptions = {}
    ): Promise<WebAssembly.Instance> {
        this.allowedSideEffects = options.allowedSideEffects;
        const maxPages = options.memoryLimitPages || 16; // Default to 1MB memory boundary
        const memory = new WebAssembly.Memory({
            initial: 1,
            maximum: maxPages
        });

        // Whitelisted host imports
        const imports = {
            env: {
                memory,
                log: (offset: number, len: number) => {
                    const msg = this.readString(memory, offset, len);
                    console.log(`[WASM-LOG] ${msg}`);
                },
                tick_clock: () => {
                    if (this.clockCallback) {
                        this.clockCallback();
                    }
                },
                // Deterministic side-effect helper: returns the index/result from the host journal
                execute_side_effect: (
                    nameOffset: number,
                    nameLen: number,
                    outOffset: number,
                    maxOutLen: number
                ): number => {
                    const name = this.readString(memory, nameOffset, nameLen);
                    if (this.allowedSideEffects && !this.allowedSideEffects.includes(name)) {
                        throw new Error(`[SECURITY] Forbidden side-effect execution: ${name}`);
                    }
                    if (!this.journal) {
                        throw new Error('[WASM-SANDBOX] Host SideEffectJournal is not bound');
                    }

                    // Run the side-effect on the host asynchronously (simulated or returned)
                    // Since WASM execution is synchronous by default, we utilize the journal
                    // to resolve outcomes synchronously if replaying, or run the operation
                    const outcome = this.journal.generateRetryId(name);
                    const logged = this.journal.getLoggedEffects().find(e => e.effectId === outcome);

                    if (logged) {
                        const serialized = JSON.stringify(logged.result);
                        return this.writeString(memory, outOffset, maxOutLen, serialized);
                    } else {
                        // In live mode, we mock-resolve a value or throw if it isn't registered
                        throw new Error(`[WASM-SANDBOX] Unregistered dynamic side effect: ${name}`);
                    }
                },
                get_ingress_payload: (
                    ingressIdOffset: number,
                    ingressIdLen: number,
                    outOffset: number,
                    maxOutLen: number
                ): number => {
                    const ingressId = this.readString(memory, ingressIdOffset, ingressIdLen);
                    if (!this.ingressCallback) {
                        throw new Error('[WASM-SANDBOX] Host IngressCallback is not bound');
                    }
                    const payload = this.ingressCallback(ingressId);
                    const serialized = JSON.stringify(payload);
                    return this.writeString(memory, outOffset, maxOutLen, serialized);
                }
            }
        };

        const module = await WebAssembly.compile(wasmBytes);
        const instance = await WebAssembly.instantiate(module, imports);
        (instance as any).memory = memory;
        return instance;
    }

    private readString(memory: WebAssembly.Memory, offset: number, len: number): string {
        if (memory.buffer.byteLength === 0) {
            throw new Error('[WASM-SANDBOX::DETACHED_BUFFER] Host memory read failed: WebAssembly linear memory buffer is detached.');
        }
        if (offset + len > memory.buffer.byteLength) {
            throw new Error('[WASM-SANDBOX::OUT_OF_BOUNDS] Memory read exceeded linear memory allocation bounds.');
        }
        const bytes = new Uint8Array(memory.buffer, offset, len);
        return new TextDecoder('utf8').decode(bytes);
    }

    private writeString(memory: WebAssembly.Memory, offset: number, maxLen: number, str: string): number {
        const bytes = new TextEncoder().encode(str);
        if (memory.buffer.byteLength === 0) {
            throw new Error('[WASM-SANDBOX::DETACHED_BUFFER] Host memory write failed: WebAssembly linear memory buffer is detached.');
        }
        if (bytes.length > maxLen) {
            throw new Error(`[WASM-SANDBOX::BUFFER_OVERFLOW] Serialized payload size ${bytes.length} bytes exceeds allocated guest buffer limit of ${maxLen} bytes.`);
        }
        if (offset + maxLen > memory.buffer.byteLength) {
            throw new Error('[WASM-SANDBOX::OUT_OF_BOUNDS] Memory write exceeded linear memory allocation bounds.');
        }
        const target = new Uint8Array(memory.buffer, offset, maxLen);
        target.set(bytes);
        return bytes.length;
    }
}
