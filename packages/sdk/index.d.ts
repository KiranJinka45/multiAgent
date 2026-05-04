export declare class InternalSDK {
    private gatewayUrl;
    constructor(gatewayUrl?: string);
    login(email: string, password: string): Promise<any>;
    startBuild(token: string, prompt: string, projectId: string, executionId: string): Promise<any>;
    createCheckout(token: string, plan: string): Promise<any>;
}
export declare const sdk: InternalSDK;
