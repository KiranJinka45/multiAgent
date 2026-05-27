import vm from 'node:vm';
import { GovernedPromise } from './promise-factory.js';

export interface SandboxOptions {
    allowedGlobals?: string[];
    memoryLimitMb?: number;
}

export class VMSandbox {
    private context: vm.Context;

    constructor(options: SandboxOptions = {}) {
        // Create an isolated context with pruned globals
        const sandboxObject: Record<string, any> = {
            console: {
                log: (...args: any[]) => console.log('[SANDBOX-LOG]', ...args),
                error: (...args: any[]) => console.error('[SANDBOX-ERR]', ...args),
                info: (...args: any[]) => console.info('[SANDBOX-INFO]', ...args)
            },
            // Replace the standard Promise with our governed scheduler-aware Promise
            Promise: GovernedPromise,
            // Intercept timers
            setTimeout: globalThis.setTimeout,
            clearTimeout: globalThis.clearTimeout,
            // Math and Date are monitored by runtime stubs
            Math: globalThis.Math,
            Date: globalThis.Date
        };

        // Expose requested safe globals
        if (options.allowedGlobals) {
            for (const name of options.allowedGlobals) {
                if ((globalThis as any)[name] !== undefined) {
                    sandboxObject[name] = (globalThis as any)[name];
                }
            }
        }

        this.context = vm.createContext(sandboxObject);
    }

    /**
     * Executes a script inside the isolated context.
     */
    public run<T>(code: string): T {
        const script = new vm.Script(code);
        return script.runInContext(this.context);
    }

    /**
     * Executes a function inside the isolated context by stringifying and wrapping it.
     */
    public runFunction<T>(fn: Function, ...args: any[]): T {
        const fnStr = fn.toString();
        const argStrings = args.map(arg => JSON.stringify(arg)).join(', ');
        const wrappedCode = `(${fnStr})(${argStrings});`;
        return this.run<T>(wrappedCode);
    }
}
