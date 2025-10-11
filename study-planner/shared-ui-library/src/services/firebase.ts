// Firebase configuration - only used when Firebase is available
let auth: any = null;

// Simple function to get environment variables safely
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as any)[key] || defaultValue;
  }
  return defaultValue;
};

// Check if we're in a browser environment and Firebase is available
if (typeof window !== 'undefined') {
  try {
    // Dynamic import to avoid errors when Firebase is not installed
    import('firebase/app').then(({ initializeApp }) => {
      import('firebase/auth').then(({ getAuth }) => {
        const firebaseConfig = {
          apiKey: getEnvVar('VITE_FIREBASE_API_KEY', "dummy-key"),
          authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', "dummy-domain"),
          projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', "dummy-project"),
          storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', "dummy-bucket"),
          messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', "dummy-sender"),
          appId: getEnvVar('VITE_FIREBASE_APP_ID', "dummy-app")
        };

        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
      }).catch(() => {
        console.warn('Firebase auth not available');
        auth = null;
      });
    }).catch(() => {
      console.warn('Firebase app not available');
      auth = null;
    });
  } catch (error) {
    console.warn('Firebase not available:', error);
    auth = null;
  }
}

export { auth };
