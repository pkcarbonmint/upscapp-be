import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { User } from 'lucide-react';

interface HeaderProps {
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ userName }) => {
  const { getClasses } = useTheme();
  
  // Generate time-based greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 17) return 'Good afternoon!';
    return 'Good evening!';
  };
  
  return (
    <header className={`${getClasses('headerBackground')} ${getClasses('headerBorder')} shadow-sm border-b`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {/* LaEx Logo - Theme-aware gradient */}
              <div className={`w-8 h-8 sm:w-10 sm:h-10 ${getClasses('sectionHeaderIcon')} bg-gradient-to-r from-current to-current rounded-lg flex items-center justify-center mr-2 sm:mr-3 text-white`}>
                <span className="font-bold text-sm sm:text-lg">L</span>
              </div>
              <div className="flex flex-col">
                <h1 className={`text-lg sm:text-xl font-bold ${getClasses('headerTitle')}`}>La Mentora</h1>
                <p className={`text-xs ${getClasses('headerSubtitle')} hidden sm:block`}>Study Planner</p>
              </div>
            </div>
          </div>

          {/* User Name Display */}
          <div className="flex items-center space-x-3">
            {userName ? (
              <div className="flex items-center space-x-2">
                {/* User Avatar/Icon */}
                <div className={`w-8 h-8 sm:w-9 sm:h-9 ${getClasses('sectionHeaderIcon')} bg-gradient-to-r from-current to-current rounded-full flex items-center justify-center`}>
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                
                {/* User Name - Responsive display */}
                <div className="flex flex-col">
                  <span className={`text-sm sm:text-base font-medium ${getClasses('headerTitle')} leading-tight truncate max-w-[120px] sm:max-w-none`}>
                    {userName}
                  </span>
                  <span className={`text-xs ${getClasses('headerSubtitle')} hidden sm:block`}>
                    {getGreeting()}
                  </span>
                </div>
              </div>
            ) : (
              <span className={`text-xs sm:text-sm ${getClasses('headerSubtitle')} hidden sm:inline`}>
                Powered by La Excellence
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
