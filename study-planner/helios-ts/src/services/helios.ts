import type { AppAPI, PlanReviewRequest, Status, PlanGenerationResponse } from '../types/API';
import { UIWizardData } from '../types/models';
import { BotRequest, BotResponse } from '../types/telegram';

/**
 * Client-side API implementation for calling the Helios server
 */
export class HeliosClient {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:8080') {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    async getRoot(): Promise<string> {
        const response = await fetch(`${this.baseUrl}/`);
        return response.text();
    }

    async getStatus(): Promise<Status> {
        return this.request<Status>('/status');
    }

    async getHealth(): Promise<Status> {
        return this.request<Status>('/health');
    }

    async generatePlan(data: UIWizardData): Promise<PlanGenerationResponse> {
        return this.request<PlanGenerationResponse>('/plan/generate', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async reviewPlan(data: PlanReviewRequest): Promise<any> {
        return this.request('/plan/review', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async conversation(data: BotRequest): Promise<BotResponse> {
        return this.request<BotResponse>('/bot/conversation', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async downloadDocument(plan: any, studentIntake: any, filename?: string): Promise<Blob> {
        const response = await fetch(`${this.baseUrl}/plan/download/docx`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plan, studentIntake, filename }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.blob();
    }
}

// Create default client instance
export const heliosClient = new HeliosClient();

// Export API interface implementation
export const api: AppAPI = {
    getRoot: () => heliosClient.getRoot(),
    getStatus: () => heliosClient.getStatus(),
    getHealth: () => heliosClient.getHealth(),
    generatePlan: (data: UIWizardData) => heliosClient.generatePlan(data),
    reviewPlan: (data: PlanReviewRequest) => heliosClient.reviewPlan(data),
    conversation: (data: BotRequest) => heliosClient.conversation(data),
};
