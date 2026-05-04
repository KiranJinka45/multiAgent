import axios from 'axios';

export class InternalSDK {
    private gatewayUrl: string;

    constructor(gatewayUrl: string = '/api') {
        this.gatewayUrl = gatewayUrl;
    }

    async login(email: string, password: string) {
        const res = await axios.post(`${this.gatewayUrl}/auth/login`, { email, password });
        return res.data;
    }

    async startBuild(token: string, prompt: string, projectId: string, executionId: string) {
        const res = await axios.post(`${this.gatewayUrl}/build`, 
            { prompt, projectId, executionId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    }

    async createCheckout(token: string, plan: string) {
        const res = await axios.post(`${this.gatewayUrl}/billing/checkout`,
            { plan },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    }
}

export const sdk = new InternalSDK();

