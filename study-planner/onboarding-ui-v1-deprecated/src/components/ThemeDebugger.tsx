// Debug component to showcase A/B/C theme testing
import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { generateStyleTestUrls } from '../config/featureFlags';

export const ThemeDebugger: React.FC = () => {
  const { variant, isA, isB, isC } = useTheme();
  const testUrls = generateStyleTestUrls(window.location.origin + window.location.pathname);

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">🎨 A/B/C Theme Testing</h3>
      
      <div className="mb-3">
        <div className="font-semibold">Current Theme:</div>
        <div className={`px-2 py-1 rounded mt-1 ${
          isA ? 'bg-gray-600' : 
          isB ? 'bg-blue-600' : 
          isC ? 'bg-purple-600' : 'bg-gray-600'
        }`}>
          {variant} {
            isA ? '(Classic)' : 
            isB ? '(Modern)' : 
            isC ? '(Premium)' : ''
          }
        </div>
      </div>

      <div className="mb-3">
        <div className="font-semibold mb-1">Test URLs:</div>
        <div className="space-y-1">
          <a 
            href={testUrls.A} 
            className="block text-gray-300 hover:text-white underline"
            title="Test Theme A"
          >
            🔗 A (Classic)
          </a>
          <a 
            href={testUrls.B} 
            className="block text-blue-300 hover:text-white underline"
            title="Test Theme B"
          >
            🔗 B (Modern)
          </a>
          <a 
            href={testUrls.C} 
            className="block text-purple-300 hover:text-white underline"
            title="Test Theme C"
          >
            🔗 C (Premium)
          </a>
        </div>
      </div>

      <div className="text-gray-400 text-xs">
        Add <code>?style=A|B|C</code> to URL
      </div>
    </div>
  );
};

export default ThemeDebugger;
