// server/controllers/auth.controller.ts

import { Request, Response } from 'express';
import { encryptPassword, decryptPassword } from '../encryption';
import { sendOtpEmail, sendPasswordChangeSuccessEmail } from '../../client/src/lib/email';

const getJavaApiServiceUrl = (): string => {
  const apiUrl = process.env.SERVER_API_TARGET_URL;
  if (!apiUrl) {
    throw new Error("SERVER_API_TARGET_URL is not defined in the environment variables.");
  }
  return apiUrl.replace(/\/$/, "");
};

const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

// Store for temporary session data (encryptedUsername, encryptedOtp)
// In production, consider using Redis or a database
const sessionStore = new Map<string, {
  encryptedUsername: string;
  encryptedOtp: string;
  encryptedEmail: string;
  name: string;
  expires: number;
}>();

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  // FIX: Use forEach instead of for...of to avoid downlevelIteration issue
  sessionStore.forEach((value, key) => {
    if (now > value.expires) {
      keysToDelete.push(key);
    }
  });

  // Delete expired keys
  keysToDelete.forEach(key => {
    sessionStore.delete(key);
  });
}, 60000); // Run every minute

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { username, password, rememberMe } = req.body;

      if (!username || !password) {
        return res.status(400).json({ status: "ERROR", statusMessage: "Username and password are required" });
      }

      const encryptedPassword = encryptPassword(password);
      const API_SERVICE_URL = getJavaApiServiceUrl();
      const loginEndpoint = `${API_SERVICE_URL}/auth/v1/login`;

      const payloadForJava = {
        username,
        password: encryptedPassword
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const javaApiResponse = await fetch(loginEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadForJava),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await javaApiResponse.json();

      if (!javaApiResponse.ok) {
        if (javaApiResponse.status === 401) {
          return res.status(200).json(responseBody);
        }
        return res.status(javaApiResponse.status).json(responseBody);
      }

      const { accessToken, ...restOfUserData } = responseBody.data;
      const isSecure = process.env.NODE_ENV === "production" && req.protocol === 'https';

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: rememberMe ? THIRTY_DAYS_IN_MS : TWO_HOURS_IN_MS,
      });

      res.status(200).json({
        traceId: responseBody.traceId,
        spanId: responseBody.spanId,
        status: "SUCCESS",
        statusCode: 200,
        statusMessage: "Login Successful",
        data: restOfUserData
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({ status: "ERROR", statusMessage: "The authentication service is not responding. Please try again later." });
      }
      res.status(500).json({ status: "ERROR", statusMessage: "Internal authentication service error." });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie("access_token", { path: "/" });
    res.status(200).json({ status: "SUCCESS", message: "Logged out" });
  }

  static async validateToken(req: Request, res: Response) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ statusMessage: 'Unauthorized' });

    try {
      const API_URL = `${getJavaApiServiceUrl()}/crm/v1/validateToken`;
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        return res.status(401).json({ status: "FAILURE", statusCode: 401, statusMessage: "Invalid Token", data: null });
      }

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ statusMessage: "Internal Server Error" });
    }
  }

  // Step 1: Generate OTP and send to user's email
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { userName } = req.body;

      if (!userName || !userName.trim()) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Username is required"
        });
      }

      const API_SERVICE_URL = getJavaApiServiceUrl();

      // Step 1: Get user details by username to retrieve encrypted email
      const userDetailsResponse = await fetch(`${API_SERVICE_URL}/auth/user/v1/userDetailsByEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: userName.trim() })
      });

      const userDetailsData = await userDetailsResponse.json();

      if (userDetailsData.status !== "SUCCESS" || !userDetailsData.data) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "User not found. Please check your username."
        });
      }

      const encryptedUsername = userDetailsData.data.value2; // Encrypted username
      const encryptedEmail = userDetailsData.data.value3; // Encrypted email

      if (!encryptedUsername || !encryptedEmail) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Unable to retrieve user information. Please contact support."
        });
      }

      // Step 2: Generate OTP using Java API
      const generateOtpResponse = await fetch(`${API_SERVICE_URL}/auth/user/v1/generateOtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: encryptedUsername })
      });

      const generateOtpData = await generateOtpResponse.json();

      if (generateOtpData.status !== "SUCCESS" || !generateOtpData.data) {
        return res.status(500).json({
          status: "ERROR",
          statusMessage: "Failed to generate OTP. Please try again."
        });
      }

      const encryptedOtp = generateOtpData.data.value5; // Encrypted OTP

      if (!encryptedOtp) {
        return res.status(500).json({
          status: "ERROR",
          statusMessage: "Failed to generate OTP. Please try again."
        });
      }

      // Step 3: Decrypt email and OTP for sending email
      let decryptedEmail: string;
      let decryptedOtp: string;

      try {
        decryptedEmail = decryptPassword(encryptedEmail);
        decryptedOtp = decryptPassword(encryptedOtp);
      } catch (decryptError) {
        console.error("Decryption error:", decryptError);
        return res.status(500).json({
          status: "ERROR",
          statusMessage: "An error occurred. Please try again."
        });
      }

      // Step 4: Send OTP email
      const emailSent = await sendOtpEmail(decryptedEmail, decryptedOtp);

      if (!emailSent) {
        return res.status(500).json({
          status: "ERROR",
          statusMessage: "Failed to send OTP email. Please try again later."
        });
      }

      let name = userDetailsData.data.value1 || userName;
      if (userDetailsData.data.value1) {
        try {
          name = decryptPassword(userDetailsData.data.value1);
        } catch (decryptError) {
          console.error("Failed to decrypt name in forgotPassword:", decryptError);
        }
      }

      // Step 5: Store session data for verification (expires in 10 minutes)
      const sessionKey = userName.toLowerCase().trim();
      sessionStore.set(sessionKey, {
        encryptedUsername,
        encryptedOtp,
        encryptedEmail,
        name,
        expires: Date.now() + 10 * 60 * 1000 // 10 minutes
      });

      // Mask email for frontend display
      const maskedEmail = AuthController.maskEmail(decryptedEmail);

      return res.status(200).json({
        status: "SUCCESS",
        statusMessage: "OTP sent successfully",
        maskedEmail
      });

    } catch (error: any) {
      console.error("Forgot password error:", error);
      return res.status(500).json({
        status: "ERROR",
        statusMessage: "An unexpected error occurred. Please try again."
      });
    }
  }

  // Step 2: Verify OTP
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { userName, otp } = req.body;

      if (!userName || !otp) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Username and OTP are required"
        });
      }

      if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Invalid OTP format. Please enter a 6-digit code."
        });
      }

      // Get stored session data
      const sessionKey = userName.toLowerCase().trim();
      const sessionData = sessionStore.get(sessionKey);

      if (!sessionData) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Session expired. Please request a new OTP."
        });
      }

      if (Date.now() > sessionData.expires) {
        sessionStore.delete(sessionKey);
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "OTP has expired. Please request a new one."
        });
      }

      // Encrypt the user-entered OTP
      const encryptedInputOtp = encryptPassword(otp);

      const API_SERVICE_URL = getJavaApiServiceUrl();

      // Validate OTP with Java API
      const validateOtpResponse = await fetch(`${API_SERVICE_URL}/auth/user/v1/validateOtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: sessionData.encryptedUsername,
          otp: encryptedInputOtp
        })
      });

      const validateOtpData = await validateOtpResponse.json();

      if (validateOtpData.status !== "SUCCESS") {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Invalid OTP. Please check and try again."
        });
      }

      // Update session with validated encrypted OTP (for password reset)
      sessionStore.set(sessionKey, {
        ...sessionData,
        encryptedOtp: encryptedInputOtp, // Store the encrypted version of user-entered OTP
        expires: Date.now() + 10 * 60 * 1000 // Extend expiry by 10 more minutes
      });

      return res.status(200).json({
        status: "SUCCESS",
        statusMessage: "OTP verified successfully"
      });

    } catch (error: any) {
      console.error("Verify OTP error:", error);
      return res.status(500).json({
        status: "ERROR",
        statusMessage: "An unexpected error occurred. Please try again."
      });
    }
  }

  // Step 3: Reset Password
  static async resetPassword(req: Request, res: Response) {
    try {
      const { userName, otp, newPassword } = req.body;

      if (!userName || !otp || !newPassword) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Username, OTP, and new password are required"
        });
      }

      // Password validation
      if (newPassword.length < 6) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Password must be at least 6 characters long"
        });
      }

      // Get stored session data
      const sessionKey = userName.toLowerCase().trim();
      const sessionData = sessionStore.get(sessionKey);

      if (!sessionData) {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Session expired. Please start the password reset process again."
        });
      }

      if (Date.now() > sessionData.expires) {
        sessionStore.delete(sessionKey);
        return res.status(400).json({
          status: "ERROR",
          statusMessage: "Session has expired. Please start the password reset process again."
        });
      }

      // Encrypt the new password and OTP
      const encryptedNewPassword = encryptPassword(newPassword);
      const encryptedOtp = encryptPassword(otp);

      const API_SERVICE_URL = getJavaApiServiceUrl();

      // Call Java API to reset password
      const resetPasswordResponse = await fetch(`${API_SERVICE_URL}/auth/user/v1/forgotPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: sessionData.encryptedUsername,
          newPassword: encryptedNewPassword,
          otp: encryptedOtp
        })
      });

      const resetPasswordData = await resetPasswordResponse.json();

      if (resetPasswordData.status !== "SUCCESS") {
        return res.status(400).json({
          status: "ERROR",
          statusMessage: resetPasswordData.statusMessage || "Failed to reset password. Please try again."
        });
      }

      // Clear session data after successful password reset
      sessionStore.delete(sessionKey);

      // Send success email notification
      try {
        const decryptedEmail = decryptPassword(sessionData.encryptedEmail);
        await sendPasswordChangeSuccessEmail(decryptedEmail, sessionData.name);
      } catch (emailError) {
        console.error("Failed to send password reset success email:", emailError);
        // Don't fail the request if email fails
      }

      return res.status(200).json({
        status: "SUCCESS",
        statusMessage: "Password updated successfully. Please login with your new password."
      });

    } catch (error: any) {
      console.error("Reset password error:", error);
      return res.status(500).json({
        status: "ERROR",
        statusMessage: "An unexpected error occurred. Please try again."
      });
    }
  }

  // Helper method to mask email
  private static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.***';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const { userName, oldPassword, newPassword } = req.body;

      if (!userName || !oldPassword || !newPassword) {
        return res.status(400).json({ status: "ERROR", statusMessage: "All fields are required" });
      }

      const encryptedOldPassword = encryptPassword(oldPassword);
      const encryptedNewPassword = encryptPassword(newPassword);
      const API_SERVICE_URL = getJavaApiServiceUrl();
      const changePasswordEndpoint = `${API_SERVICE_URL}/crm/v1/changePassword`;

      const payloadForJava = {
        userName,
        oldPassword: encryptedOldPassword,
        newPassword: encryptedNewPassword
      };

      const token = req.cookies.access_token;

      const javaApiResponse = await fetch(changePasswordEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payloadForJava),
      });

      const responseBody = await javaApiResponse.json();

      if (!javaApiResponse.ok) {
        return res.status(javaApiResponse.status).json(responseBody);
      }

      // Send success email notification
      try {
        const userDetailsResponse = await fetch(`${API_SERVICE_URL}/auth/user/v1/userDetailsByEmail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userName: userName.trim() })
        });
        const userDetailsData = await userDetailsResponse.json();
        if (userDetailsData.status === "SUCCESS" && userDetailsData.data) {
          const encryptedEmail = userDetailsData.data.value3;
          if (encryptedEmail) {
            const decryptedEmail = decryptPassword(encryptedEmail);
            let name = userDetailsData.data.value1 || userName;
            if (userDetailsData.data.value1) {
              try {
                name = decryptPassword(userDetailsData.data.value1);
              } catch (decryptError) {
                console.error("Failed to decrypt name in changePassword:", decryptError);
              }
            }
            await sendPasswordChangeSuccessEmail(decryptedEmail, name);
          }
        }
      } catch (emailError) {
        console.error("Failed to send password change success email:", emailError);
      }

      res.status(200).json(responseBody);

    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ status: "ERROR", statusMessage: "Internal server error." });
    }
  }
}