// Test file for URL parameter feature flag functionality
// Run this in browser console to test URL parameter parsing

// Mock window.location for testing
const testUrlParams = (searchString) => {
  // Save original location
  const originalLocation = window.location;
  
  // Mock window.location.search
  delete window.location;
  window.location = { search: searchString };
  
  // Import and test (in real usage, you'd import from the module)
  const getUrlParams = () => new URLSearchParams(window.location.search);
  
  const getFeatureFlags = () => {
    const urlParams = getUrlParams();
    
    return {
      showStartDateSelection: 
        urlParams.get('startDate') === 'true' || false,
      
      useSimpleFormLayout: 
        urlParams.get('simpleForm') === 'true' || 
        urlParams.get('layout') === 'simple' || false,
    };
  };
  
  const result = {
    searchString,
    urlParams: Object.fromEntries(getUrlParams().entries()),
    flags: getFeatureFlags(),
  };
  
  // Restore original location
  window.location = originalLocation;
  
  return result;
};

// Test cases
console.log('=== URL Parameter Feature Flag Tests ===');

console.log('1. No parameters:', testUrlParams(''));
console.log('2. Simple form via layout=simple:', testUrlParams('?layout=simple'));
console.log('3. Simple form via simpleForm=true:', testUrlParams('?simpleForm=true'));
console.log('4. Start date enabled:', testUrlParams('?startDate=true'));
console.log('5. Both features enabled:', testUrlParams('?layout=simple&startDate=true'));
console.log('6. Mixed parameters:', testUrlParams('?layout=simple&other=value&startDate=true'));
console.log('7. Invalid values:', testUrlParams('?layout=invalid&startDate=false'));

// A/B Testing URLs
console.log('\n=== A/B Testing URLs ===');
const baseUrl = 'https://yoursite.com/onboarding';

const generateTestUrl = (baseUrl, options) => {
  const url = new URL(baseUrl);
  
  if (options.layout === 'simple') {
    url.searchParams.set('layout', 'simple');
  }
  
  if (options.startDate === true) {
    url.searchParams.set('startDate', 'true');
  }
  
  return url.toString();
};

console.log('Control (A):', baseUrl);
console.log('Variant B (Simple Form):', generateTestUrl(baseUrl, { layout: 'simple' }));
console.log('Variant C (With Start Date):', generateTestUrl(baseUrl, { startDate: true }));
console.log('Variant D (Both Features):', generateTestUrl(baseUrl, { layout: 'simple', startDate: true }));

console.log('\n=== Ready for A/B Testing! ===');
console.log('Use these URLs to test different variants:');
console.log('- Inline Form: ' + baseUrl);
console.log('- Simple Form: ' + generateTestUrl(baseUrl, { layout: 'simple' }));
