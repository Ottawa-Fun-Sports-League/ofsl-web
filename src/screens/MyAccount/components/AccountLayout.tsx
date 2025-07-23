import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

export function AccountLayout() {
  const location = useLocation();
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
      </div>
    );
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="bg-white w-full min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#6F6F6F] mb-2">
            Welcome back, {userProfile?.name || 'User'}!
          </h1>
          <p className="text-lg text-[#6F6F6F]">
            Manage your teams, schedules, and account settings
          </p>
        </div>

        {/* Navigation Tabs - Compact with Separation */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex flex-nowrap overflow-x-auto scrollbar-thin">
            {/* User Section - Larger */}
            <Link
              to="/my-account/teams"
              className={`flex items-center gap-2.5 px-5 py-3 text-base cursor-pointer relative transition-all whitespace-nowrap ${
                isActive('/my-account/teams') 
                  ? 'text-[#B20000] font-semibold border-b-2 border-[#B20000]' 
                  : 'text-[#6F6F6F] hover:text-[#B20000] border-b-2 border-transparent hover:border-[#B20000]/30'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z" />
              </svg>
              My Teams
            </Link>

            <Link
              to="/my-account/profile"
              className={`flex items-center gap-2.5 px-5 py-3 text-base cursor-pointer relative transition-all whitespace-nowrap ${
                isActive('/my-account/profile') 
                  ? 'text-[#B20000] font-semibold border-b-2 border-[#B20000]' 
                  : 'text-[#6F6F6F] hover:text-[#B20000] border-b-2 border-transparent hover:border-[#B20000]/30'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
              </svg>
              Account
            </Link>

            {/* Visual Separator */}
            {userProfile?.is_admin && (
              <>
                <div className="flex items-center px-4">
                  <div className="h-6 w-px bg-gray-300"></div>
                </div>

                {/* Admin Label */}
                <div className="flex items-center px-2 py-2.5">
                  <span className="text-[10px] font-semibold text-white uppercase tracking-widest bg-[#B20000] px-2 py-1 rounded-md">Admin Manage:</span>
                </div>

                {/* Admin Section - More Spaced Out */}
                <Link
                  to="/my-account/leagues"
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer relative transition-all whitespace-nowrap ${
                    isActive('/my-account/leagues') 
                      ? 'text-[#B20000] font-semibold border-b-2 border-[#B20000]' 
                      : 'text-[#6F6F6F] hover:text-[#B20000] border-b-2 border-transparent hover:border-[#B20000]/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19,4H5C3.89,4 3,4.9 3,6V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V6A2,2 0 0,0 19,4M19,18H5V8H19V18Z"/>
                    <path d="M12,9H7V11H12V9M17,9H14V11H17V9M7,12V14H10V12H7M11,12V14H14V12H11M15,12V14H17V12H15Z"/>
                  </svg>
                  Leagues
                </Link>

                <Link
                  to="/my-account/schools"
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer relative transition-all whitespace-nowrap ${
                    isActive('/my-account/schools') 
                      ? 'text-[#B20000] font-semibold border-b-2 border-[#B20000]' 
                      : 'text-[#6F6F6F] hover:text-[#B20000] border-b-2 border-transparent hover:border-[#B20000]/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
                  </svg>
                  Schools
                </Link>

                <Link
                  to="/my-account/users"
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer relative transition-all whitespace-nowrap ${
                    isActive('/my-account/users') 
                      ? 'text-[#B20000] font-semibold border-b-2 border-[#B20000]' 
                      : 'text-[#6F6F6F] hover:text-[#B20000] border-b-2 border-transparent hover:border-[#B20000]/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                  </svg>
                  Users
                </Link>

                <Link
                  to="/my-account/waivers"
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer relative transition-all whitespace-nowrap ${
                    isActive('/my-account/waivers') 
                      ? 'text-[#B20000] font-semibold border-b-2 border-[#B20000]' 
                      : 'text-[#6F6F6F] hover:text-[#B20000] border-b-2 border-transparent hover:border-[#B20000]/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  Waivers
                </Link>

                <Link
                  to="/my-account/manage-teams"
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer relative transition-all whitespace-nowrap ${
                    isActive('/my-account/manage-teams') 
                      ? 'text-[#B20000] font-semibold border-b-2 border-[#B20000]' 
                      : 'text-[#6F6F6F] hover:text-[#B20000] border-b-2 border-transparent hover:border-[#B20000]/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,5A3.5,3.5 0 0,0 8.5,8.5A3.5,3.5 0 0,0 12,12A3.5,3.5 0 0,0 15.5,8.5A3.5,3.5 0 0,0 12,5M12,7A1.5,1.5 0 0,1 13.5,8.5A1.5,1.5 0 0,1 12,10A1.5,1.5 0 0,1 10.5,8.5A1.5,1.5 0 0,1 12,7M5.5,8A2.5,2.5 0 0,0 3,10.5C3,11.44 3.53,12.25 4.29,12.68C4.65,12.88 5.06,13 5.5,13C5.94,13 6.35,12.88 6.71,12.68C7.08,12.47 7.39,12.17 7.62,11.81C6.89,10.86 6.5,9.7 6.5,8.5C6.5,8.41 6.5,8.31 6.5,8.22C6.2,8.08 5.86,8 5.5,8M18.5,8C18.14,8 17.8,8.08 17.5,8.22C17.5,8.31 17.5,8.41 17.5,8.5C17.5,9.7 17.11,10.86 16.38,11.81C16.5,12 16.63,12.15 16.78,12.3C16.94,12.45 17.1,12.58 17.29,12.68C17.65,12.88 18.06,13 18.5,13C18.94,13 19.35,12.88 19.71,12.68C20.47,12.25 21,11.44 21,10.5A2.5,2.5 0 0,0 18.5,8M12,14C9.66,14 5,15.17 5,17.5V19H19V17.5C19,15.17 14.34,14 12,14M4.71,14.55C2.78,14.78 0,15.76 0,17.5V19H3V17.07C3,16.06 3.69,15.22 4.71,14.55M19.29,14.55C20.31,15.22 21,16.06 21,17.07V19H24V17.5C24,15.76 21.22,14.78 19.29,14.55M12,16C13.53,16 15.24,16.5 16.23,17H7.77C8.76,16.5 10.47,16 12,16Z" />
                  </svg>
                  Teams
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <Outlet />
      </div>
    </div>
  );
}