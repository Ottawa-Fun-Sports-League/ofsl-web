import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { logger } from "../../lib/logger";
import { analyticsEvents } from "../../hooks/useGoogleAnalytics";
import { Turnstile } from "../../components/ui/turnstile";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { signIn, signInWithGoogle, user } = useAuth();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation(); 

  // Check for success message from signup
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  // Get redirect path from location state or localStorage
  useEffect(() => {
    const fromPath = location.state?.from;
    const savedPath = localStorage.getItem('redirectAfterLogin');
    
    if (fromPath) {
      setRedirectPath(fromPath);
    } else if (savedPath) {
      setRedirectPath(savedPath);
    }
    
  }, [location.state]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = redirectPath || '/my-account/teams';
      navigate(redirectTo);
    }
  }, [user, navigate, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    // Check for Turnstile token
    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    
    try {
      const { error } = await signIn(email.trim(), password, turnstileToken);
      
      if (error) {
        logger.error('Sign in error', error);
        setError(error.message);
        setLoading(false);
      } else {
        // Track successful login
        analyticsEvents.login();
        // The redirect will be handled by the auth context
        // Keep loading state true to show the user something is happening
        // It will be reset by the auth context after redirect or after 5 seconds as fallback
        setTimeout(() => {
          setLoading(false);
          window.location.reload();
        }, 5000);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      logger.error('Unexpected error during sign in', err);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true); 
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        logger.error('Google sign in error', error);
        setError(error.message);
        setGoogleLoading(false);
      } else {
        // Track successful Google login
        analyticsEvents.login();
        // Google OAuth will handle the redirect automatically
        // Keep loading state true to show the user something is happening
      }
    } catch (err) {
      setError("An unexpected error occurred");
      logger.error('Unexpected error during Google sign in', err);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[460px] bg-white rounded-lg shadow-lg">
        <CardContent className="p-8">
          <h1 className="text-[32px] font-bold text-center mb-8 text-[#6F6F6F]">
            Login
          </h1>
          
          {/* Migration Notice */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
              </svg>
              <div className="text-sm">
                <p className="font-semibold mb-1">Important: Account Migration Notice</p>
                <p>If you had an account with <span className="font-medium">ottawafunsports.ca</span>, your old login will not work here. Please create a new account with <span className="font-medium">ofsl.ca</span> to continue.</p>
              </div>
            </div>
          </div>
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-[#6F6F6F] border border-[#D4D4D4] rounded-[10px] font-medium text-base mb-6 flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              "Signing in with Google..."
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D4D4D4]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#6F6F6F]">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#6F6F6F]"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#6F6F6F] mb-1"
                > 
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#B20000] hover:underline font-bold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Turnstile widget */}
            <div className="flex justify-center">
              <Turnstile 
                onVerify={(token) => setTurnstileToken(token)}
                onError={() => {
                  setError("Security verification failed. Please try again.");
                  setTurnstileToken(null);
                }}
                onExpire={() => {
                  setTurnstileToken(null);
                }}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
              disabled={loading || googleLoading || !turnstileToken}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          
          {loading && (
            <div className="mt-4 text-center text-sm text-[#6F6F6F]">
              <div className="animate-pulse">Logging in, please wait...</div>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <span className="text-[#6F6F6F]">Don&apos;t have an account? </span>
            <Link to="/signup" className="text-[#B20000] hover:underline font-bold">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}