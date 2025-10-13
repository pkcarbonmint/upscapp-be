import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Add type declarations for jest-dom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): T;
    toHaveClass(className: string): T;
    toHaveTextContent(text: string | RegExp): T;
    toHaveAttribute(attr: string, value?: string): T;
    toBeVisible(): T;
    toBeDisabled(): T;
    toBeEnabled(): T;
    toHaveValue(value: string | string[] | number): T;
    toBeChecked(): T;
    toBePartiallyChecked(): T;
    toHaveFocus(): T;
    toHaveFormValues(expectedValues: Record<string, any>): T;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): T;
    toHaveStyle(css: string | Record<string, any>): T;
    toHaveAccessibleDescription(description?: string | RegExp): T;
    toHaveAccessibleName(name?: string | RegExp): T;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): any;
    toHaveClass(className: string): any;
    toHaveTextContent(text: string | RegExp): any;
    toHaveAttribute(attr: string, value?: string): any;
    toBeVisible(): any;
    toBeDisabled(): any;
    toBeEnabled(): any;
    toHaveValue(value: string | string[] | number): any;
    toBeChecked(): any;
    toBePartiallyChecked(): any;
    toHaveFocus(): any;
    toHaveFormValues(expectedValues: Record<string, any>): any;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): any;
    toHaveStyle(css: string | Record<string, any>): any;
    toHaveAccessibleDescription(description?: string | RegExp): any;
    toHaveAccessibleName(name?: string | RegExp): any;
  }
}

// Cleanup after each test case
afterEach(() => {
  cleanup();
});
