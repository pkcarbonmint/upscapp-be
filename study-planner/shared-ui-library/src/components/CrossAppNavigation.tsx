import React from 'react';
import { useSharedAuth } from '../auth/useSharedAuth';
import { ExternalLink, Users, UserCheck, ArrowRight } from 'lucide-react';

interface CrossAppNavigationProps {
  currentApp: 'onboarding' | 'faculty';
  className?: string;
}

const CrossAppNavigation: React.FC<CrossAppNavigationProps> = ({ 
  currentApp, 
  className = '' 
}) => {
  const { user, isAuthenticated, navigateToApp, getCurrentApp } = useSharedAuth();
  
  // Don't show if not authenticated or if we're not sure about current app
  if (!isAuthenticated || getCurrentApp() === 'unknown') {
    return null;
  }

  const handleNavigateToApp = (targetApp: 'onboarding' | 'faculty') => {
    if (targetApp !== currentApp) {
      navigateToApp(targetApp);
    }
  };

  return (
    <div className={`border-l-4 border-blue-500 bg-blue-50 p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExternalLink className="h-5 w-5 text-blue-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Quick Access
          </h3>
          <div className="mt-2 space-y-2">
            {currentApp === 'onboarding' && user?.user_type === 'faculty' && (
              <button
                onClick={() => handleNavigateToApp('faculty')}
                className="flex items-center text-sm text-blue-700 hover:text-blue-900 transition-colors group"
              >
                <UserCheck className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                Switch to Faculty Dashboard
                <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            
            {currentApp === 'faculty' && (
              <button
                onClick={() => handleNavigateToApp('onboarding')}
                className="flex items-center text-sm text-blue-700 hover:text-blue-900 transition-colors group"
              >
                <Users className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                View Student Onboarding
                <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
          
          {user && (
            <div className="mt-3 pt-2 border-t border-blue-200">
              <p className="text-xs text-blue-600">
                Logged in as <span className="font-medium">{user.name}</span>
                {user.user_type && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {user.user_type}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrossAppNavigation;