import type { User } from '../../auth/types';

// Mock localStorage for testing
export class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

// Mock window.location for navigation testing
export class MockLocation {
  private _href: string = 'http://localhost:3000';
  private _pathname: string = '/';
  private _origin: string = 'http://localhost:3000';

  get href(): string {
    return this._href;
  }

  set href(value: string) {
    this._href = value;
    const url = new URL(value);
    this._pathname = url.pathname;
    this._origin = url.origin;
  }

  get pathname(): string {
    return this._pathname;
  }

  set pathname(value: string) {
    this._pathname = value;
    this._href = `${this._origin}${value}`;
  }

  get origin(): string {
    return this._origin;
  }

  reload(): void {
    // Mock reload - no-op in tests
  }
}

// Mock fetch for API calls
export class MockFetch {
  private responses: Record<string, any> = {};
  private requestHistory: Array<{ url: string; options?: RequestInit }> = [];

  // Set mock response for a specific endpoint
  setResponse(endpoint: string, response: any): void {
    this.responses[endpoint] = response;
  }

  // Get request history for testing
  getRequestHistory(): Array<{ url: string; options?: RequestInit }> {
    return this.requestHistory;
  }

  // Reset state
  reset(): void {
    this.responses = {};
    this.requestHistory = [];
  }

  // Mock fetch implementation
  async mockFetch(url: string, options?: RequestInit): Promise<Response> {
    this.requestHistory.push({ url, options });
    
    const endpoint = this.extractEndpoint(url);
    const mockResponse = this.responses[endpoint];
    
    if (mockResponse) {
      return new Response(JSON.stringify(mockResponse), {
        status: mockResponse._status || 200,
        statusText: mockResponse._statusText || 'OK',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Default 404 response
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      statusText: 'Not Found',
    });
  }

  private extractEndpoint(url: string): string {
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      return urlObj.pathname;
    }
    return url;
  }
}

// Test utilities
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  full_name: 'Test User Full',
  phone_number: '+911234567890',
  user_type: 'student',
  is_active: true,
  phone_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockStudent = (overrides: Partial<any> = {}) => ({
  id: 1,
  student_id: 'STU_001',
  name: 'Test Student',
  email: 'student@example.com',
  phone: '+911234567890',
  created_at: '2024-01-01T00:00:00Z',
  plan_count: 1,
  referral_count: 0,
  ...overrides,
});

// Export instances
export const mockLocalStorage = new MockLocalStorage();
export const mockLocation = new MockLocation();
export const mockFetch = new MockFetch();