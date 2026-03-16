// src/pages/forgot-password.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import { ArrowLeft, User, Shield, Key, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { apiRequest } from "@/lib/queryClient";

import logo from "../assets/logo.png";
import vaiLogo from "../assets/vailogo.png";

type ForgotPasswordStep = "username" | "otp" | "password";

export default function ForgotPassword() {
  const [step, setStep] = useState<ForgotPasswordStep>("username");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Start countdown timer
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Mask email for display (e.g., a***@example.com)
  const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return '***@***.***';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}${localPart[1]}***@${domain}`;
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("/auth/forgot-password", "POST", { userName: username });

      if (response.status === "SUCCESS") {
        // Set masked email for display
        if (response.maskedEmail) {
          setMaskedEmail(response.maskedEmail);
        }

        toast({
          title: "OTP Sent",
          description: "Please check your email for the verification code",
        });
        setStep("otp");
        startCountdown();
      } else {
        throw new Error(response.statusMessage || "Failed to send OTP");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.statusMessage || error.message || "Failed to send OTP. Please check your username.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("/auth/verify-otp", "POST", { userName: username, otp });

      if (response.status === "SUCCESS") {
        toast({
          title: "OTP Verified",
          description: "Please enter your new password",
        });
        setStep("password");
      } else {
        throw new Error(response.statusMessage || "Invalid OTP");
      }
    } catch (error: any) {
      toast({
        title: "Invalid OTP",
        description: error.statusMessage || error.message || "Please check your OTP and try again",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      toast({
        title: "Weak Password",
        description: "Password must contain uppercase, lowercase, numbers, and special characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("/auth/reset-password", "POST", {
        userName: username,
        otp,
        newPassword
      });

      if (response.status === "SUCCESS") {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated. Please login with your new password.",
        });
        setLocation("/login");
      } else {
        throw new Error(response.statusMessage || "Failed to update password");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.statusMessage || error.message || "Failed to update password",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    setResendLoading(true);

    try {
      const response = await apiRequest("/auth/forgot-password", "POST", { userName: username });

      if (response.status === "SUCCESS") {
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your email",
        });
        startCountdown();
        setOtp(""); // Clear the OTP input
      } else {
        throw new Error(response.statusMessage || "Failed to resend OTP");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.statusMessage || error.message || "Failed to resend OTP",
        variant: "destructive",
      });
    }

    setResendLoading(false);
  };

  const renderStepContent = () => {
    switch (step) {
      case "username":
        return (
          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-[#238fb7]" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
              <p className="text-gray-600 mt-2">
                Enter your username and we'll send a verification code to your registered email
              </p>
            </div>

            <div>
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#238fb7] hover:bg-[#181c4c]"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </span>
              ) : "Send Verification Code"}
            </Button>
          </form>
        );

      case "otp":
        return (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Verify Code</h2>
              <p className="text-gray-600 mt-2">
                Enter the 6-digit code sent to {maskedEmail || 'your registered email'}
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#238fb7] hover:bg-[#181c4c]"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                </span>
              ) : "Verify Code"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || resendLoading}
                  className="text-[#238fb7] hover:underline disabled:text-gray-400 font-medium"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : resendLoading ? "Resending..." : "Resend Code"}
                </button>
              </p>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("username");
                  setOtp("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Change username
              </button>
            </div>
          </form>
        );

      case "password":
        return (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">New Password</h2>
              <p className="text-gray-600 mt-2">
                Choose a strong password for your account
              </p>
            </div>

            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2"
                required
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must contain uppercase, lowercase, numbers, and special characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2"
                required
                autoComplete="new-password"
              />
            </div>

            {/* Password match indicator */}
            {confirmPassword && (
              <div className={`text-sm ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#238fb7] hover:bg-[#181c4c]"
              disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                </span>
              ) : "Update Password"}
            </Button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
          backgroundSize: '30px 30px'
        }}></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="grid md:grid-cols-2 min-h-[600px]">
            {/* Left Side - Branding */}
            <div className="bg-gradient-to-br from-[#181c4c] via-[#238fb7] to-[#1e40af] p-12 flex flex-col justify-center items-center text-white relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-20 left-10 w-24 h-24 bg-[#e67c1a]/20 rounded-full blur-lg"></div>

              <div className="text-center space-y-8 relative z-10">
                {/* Logos Section */}
                <div className="space-y-6">
                  {/* AZAM TV Logo */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
                        <img
                          src={logo}
                          alt="AZAM TV Logo"
                          className="w-32 h-auto object-contain"
                        />
                      </div>
                    </div>
                  </div>
                  {/* VAI Logo */}
                  <div className="flex justify-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <img
                        src={vaiLogo}
                        alt="VAI Logo"
                        className="w-40 h-auto object-contain"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Forgot Password
                  </h1>
                  <p className="text-blue-100 text-lg leading-relaxed max-w-md">
                    Reset your AZAM TV agent portal password and regain access to your account securely.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-200">
                  <div className="w-2 h-2 bg-[#e67c1a] rounded-full animate-pulse"></div>
                  <span>Secure • Reliable • Professional</span>
                  <div className="w-2 h-2 bg-[#e67c1a] rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Right Side - Forgot Password Form */}
            <div className="p-12 flex flex-col justify-center">
              <div className="w-full max-w-sm mx-auto space-y-8">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${step === 'username' ? 'bg-[#238fb7]' : 'bg-gray-300'}`}></div>
                  <div className={`w-8 h-0.5 ${step !== 'username' ? 'bg-[#238fb7]' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${step === 'otp' ? 'bg-[#238fb7]' : step === 'password' ? 'bg-gray-300' : 'bg-gray-300'}`}></div>
                  <div className={`w-8 h-0.5 ${step === 'password' ? 'bg-[#238fb7]' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${step === 'password' ? 'bg-[#238fb7]' : 'bg-gray-300'}`}></div>
                </div>

                {renderStepContent()}

                <div className="mt-6 text-center">
                  <Button
                    variant="link"
                    onClick={() => setLocation("/login")}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}