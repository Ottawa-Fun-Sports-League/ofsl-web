import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';

export function ComingSoonPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <svg
                className="w-10 h-10 text-[#B20000]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Coming Soon</h1>
            <p className="text-lg text-gray-600 mb-6">
              We&apos;re working hard to bring you something amazing!
            </p>
            <p className="text-sm text-gray-500 mb-8">
              The Ottawa Fun Sports League website is currently under construction. 
              Please check back soon for updates.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => signOut()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white"
            >
              Sign Out
            </Button>
            
            <p className="text-xs text-gray-400">
              If you&apos;re an administrator, please contact support for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}