import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string;
  }>({ score: 0, feedback: "" });
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if we have a valid token in the URL
  useEffect(() => {
    const validateResetToken = async () => {
      try {
        setValidatingToken(true);
        
        // Get token from URL hash or query params
        const hash = window.location.hash;
        const type = searchParams.get('type');
        
        
        // Check if this is a password reset flow
        if (type === 'recovery' || hash.includes('type=recovery')) {
          setTokenValid(true);
        } else {
          // Check if user is already authenticated
          const { data } = await supabase.auth.getSession();
          
          if (data.session) {
            setTokenValid(true);
          } else {
            console.error("No active session and not a recovery flow");
            setError("Invalid or expired password reset link. Please request a new password reset link.");
            setTokenValid(false);
          }
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setError("Failed to validate reset token. Please request a new password reset link.");
        setTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };
    
    validateResetToken();
  }, [searchParams]);

  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: "" });
      return;
    }

    // Simple password strength check
    let score = 0;
    let feedback = "";

    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score < 3) {
      feedback = "Weak password. Add uppercase, numbers, or special characters.";
    } else if (score < 5) {
      feedback = "Good password, but could be stronger.";
    } else {
      feedback = "Strong password!";
    }

    setPasswordStrength({ score, feedback });
  }, [password]);

  // If token is invalid, show error message
  if (!validatingToken && !tokenValid) {
    return (
      <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-[460px] bg-white rounded-lg shadow-lg">
          <CardContent className="p-8">
            <h1 className="text-[32px] font-bold text-center mb-8 text-[#6F6F6F]">
              Reset Password
            </h1>
            
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Invalid Reset Link</p>
                <p>{error || "This password reset link is invalid or has expired."}</p>
              </div>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-[#6F6F6F] mb-4">
                Please request a new password reset link from the login page.
              </p>
              <Link to="/forgot-password">
                <Button className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2">
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while validating token
  if (validatingToken) {
    return (
      <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000] mb-4"></div>
        <p className="text-[#6F6F6F]">Validating reset link...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError("Please enter a new password");
      return;
    }
    
    if (password.length < 12) {
      setError("Password must be at least 12 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (passwordStrength.score < 3) {
      setError("Please use a stronger password with a mix of uppercase, lowercase, numbers, and special characters");
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error('Error updating password:', error);
        throw error;
      }
      
      setSuccess(true);
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate("/login", { 
          state: { 
            message: "Your password has been reset successfully. You can now log in with your new password." 
          } 
        });
      }, 3000);
      
    } catch (err: any) {
      console.error("Error resetting password:", err);
      setError(err.message || "Failed to reset password. Please try again or request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score < 3) return "text-red-500";
    if (passwordStrength.score < 5) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[460px] bg-white rounded-lg shadow-lg">
        <CardContent className="p-8">
          <h1 className="text-[32px] font-bold text-center mb-8 text-[#6F6F6F]">
            Reset Password
          </h1>
          
          <div className="mb-6 text-center text-[#6F6F6F]">
            <p>Enter your new password below to reset your account password.</p>
          </div>
          
          {success ? (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#6F6F6F] mb-2">Password Reset Successful!</h2>
              <p className="text-[#6F6F6F] mb-6">
                Your password has been reset successfully. You will be redirected to the login page shortly.
              </p>
              <Link to="/login" className="inline-block">
                <Button className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Error Resetting Password</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[#6F6F6F]"
                    id="password-label"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        // Clear error when user starts typing
                        if (error) setError(null);
                      }}
                      aria-labelledby="password-label"
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
                  {password && (
                    <div className={`text-sm mt-1 ${getPasswordStrengthColor()}`}>
                      {passwordStrength.feedback}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 12 characters long and include uppercase, lowercase, numbers, and special characters.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-[#6F6F6F]"
                    id="confirm-password-label"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      className="w-full h-12 px-4 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        // Clear error when user starts typing
                        if (error) setError(null);
                      }}
                      aria-labelledby="confirm-password-label"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <Eye className="h-5 w-5" />
                      ) : (
                        <EyeOff className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <div className="text-sm text-red-500 mt-1">
                      Passwords do not match
                    </div>
                  )}
                </div>
                
                <Button
                  aria-label="Reset Password"
                  type="submit"
                  className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
                  disabled={loading}
                >
                  {loading ? "Resetting Password..." : "Reset Password"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Link to="/login" className="text-[#B20000] hover:underline font-medium flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}