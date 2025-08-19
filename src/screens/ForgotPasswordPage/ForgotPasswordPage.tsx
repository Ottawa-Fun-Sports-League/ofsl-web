import { useState, useRef, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import { TurnstileWidget, TurnstileHandle } from "../../components/ui/turnstile";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Check if Turnstile is enabled and token is required
    if (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    
    try {
      const options: any = {
        redirectTo: `${window.location.origin}/#/reset-password?type=recovery`
      };
      
      // Add captcha token if Turnstile is enabled
      if (import.meta.env.VITE_TURNSTILE_SITE_KEY && turnstileToken) {
        options.captchaToken = turnstileToken;
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, options);
      
      if (error) {
        throw error;
      }
      
      setSuccessMessage("Password reset instructions have been sent to your email");
      setEmail("");
      // Reset Turnstile after successful submission
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } catch (err) {
      logger.error("Error in password reset", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to send password reset email";
      setError(errorMessage);
      // Reset Turnstile on error
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Stable callbacks for Turnstile
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setError("Security verification failed. Please try again.");
    setTurnstileToken(null);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  return (
    <div className="min-h-[calc(100vh-135px)] bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-[460px] bg-white rounded-lg shadow-lg">
        <CardContent className="p-8">
          <h1 className="text-[32px] font-bold text-center mb-8 text-[#6F6F6F]">
            Forgot Password
          </h1>
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              <p>{successMessage}</p>
              <p className="text-sm mt-2">
                Please check your email inbox and follow the instructions to reset your password.
                <strong> If you don&apos;t see the email, please check your spam folder.</strong>
              </p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#6F6F6F]"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  className="w-full h-12 pl-10 rounded-lg border border-[#D4D4D4] focus:border-[#B20000] focus:ring-[#B20000]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                We&apos;ll send you an email with instructions to reset your password.
              </p>
            </div>
            
            {/* Turnstile Widget */}
            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center my-4">
                <TurnstileWidget 
                  ref={turnstileRef}
                  onVerify={handleTurnstileVerify}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileExpire}
                />
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full h-12 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] font-medium text-base"
              disabled={loading || (import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken)}
            >
              {loading ? "Sending..." : "Send Reset Instructions"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-[#B20000] hover:underline font-medium flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}