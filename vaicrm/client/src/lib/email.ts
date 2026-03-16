// server/lib/email.ts
import nodemailer from "nodemailer";

// SMTP Configuration
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false, // Port 587 uses STARTTLS
  auth: {
    user: "sapnotifications@azam-media.com",
    pass: "3JgubJzCpnFY",
  },
});

/**
 * Send OTP email for password reset
 * @param toEmail User's email address
 * @param otp The 6-digit OTP code
 */
export const sendOtpEmail = async (toEmail: string, otp: string): Promise<boolean> => {
  const mailOptions = {
    from: '"Azam Media Support" <sapnotifications@azam-media.com>',
    to: toEmail,
    subject: "Your Password Reset Verification Code - Azam TV",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #181c4c 0%, #238fb7 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                      🔐 Password Reset
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                      Azam TV Agent Portal
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hello,
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                      We received a request to reset your password. Please use the following One-Time Password (OTP) to complete the verification:
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; border: 2px dashed #238fb7;">
                      <p style="color: #666666; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">
                        Your Verification Code
                      </p>
                      <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #181c4c; font-family: 'Courier New', monospace;">
                        ${otp}
                      </div>
                    </div>
                    
                    <!-- Timer Warning -->
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                      <p style="color: #856404; font-size: 14px; margin: 0;">
                        ⏱️ <strong>This code expires in 10 minutes.</strong> Please use it promptly.
                      </p>
                    </div>
                    
                    <!-- Security Note -->
                    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                        🔒 <strong>Security Tip:</strong> If you did not request this password reset, please ignore this email. Your account remains secure.
                      </p>
                    </div>
                    
                    <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                      Need help? Contact our support team at <a href="mailto:support@azam-media.com" style="color: #238fb7; text-decoration: none;">support@azam-media.com</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="color: #888888; font-size: 12px; margin: 0 0 10px;">
                            This is an automated message from Azam TV Agent Portal.
                          </p>
                          <p style="color: #888888; font-size: 12px; margin: 0;">
                            © ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Password Reset - Azam TV Agent Portal

Hello,

We received a request to reset your password. Please use the following One-Time Password (OTP) to complete the verification:

Your Verification Code: ${otp}

This code expires in 10 minutes. Please use it promptly.

SECURITY TIP: If you did not request this password reset, please ignore this email. Your account remains secure.

Need help? Contact our support team at support@azam-media.com

---
This is an automated message from Azam TV Agent Portal.
© ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
};

/**
 * Send password reset confirmation email with new credentials
 * @param toEmail User's email address
 * @param name User's display name
 * @param userName User's username for login
 * @param password Decrypted plain text password
 */
export const sendPasswordResetEmail = async (
  toEmail: string,
  name: string,
  userName: string,
  password: string
): Promise<boolean> => {
  const mailOptions = {
    from: '"Azam Media Support" <sapnotifications@azam-media.com>',
    to: toEmail,
    subject: "Your New Login Credentials - Azam TV Agent Portal",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Login Credentials</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #181c4c 0%, #238fb7 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                      ✅ Password Reset Successful
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                      Azam TV Agent Portal
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hello <strong>${name}</strong>,
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                      Your password has been successfully reset. Please find your new login credentials below:
                    </p>
                    
                    <!-- Credentials Box -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; border-left: 4px solid #238fb7; margin: 25px 0;">
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666666; font-size: 14px;">Username:</span>
                          </td>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
                            <code style="background: #e9ecef; padding: 4px 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; color: #181c4c;">${userName}</code>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <span style="color: #666666; font-size: 14px;">Password:</span>
                          </td>
                          <td style="padding: 10px 0; text-align: right;">
                            <code style="background: #e9ecef; padding: 4px 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; color: #181c4c;">${password}</code>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Warning Box -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 25px 0;">
                      <p style="color: #856404; font-size: 14px; font-weight: 600; margin: 0 0 10px;">
                        ⚠️ Important Security Notice:
                      </p>
                      <ul style="color: #856404; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>Please change your password immediately after logging in</li>
                        <li>Do not share your password with anyone</li>
                        <li>Keep this email secure and delete it after changing your password</li>
                      </ul>
                    </div>
                    
                    <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                      If you did not request a password reset, please contact our support team immediately.
                    </p>
                    
                    <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                      Best regards,<br/>
                      <strong>Azam TV Support Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="color: #888888; font-size: 12px; margin: 0 0 10px;">
                            This is an automated message. Please do not reply to this email.
                          </p>
                          <p style="color: #888888; font-size: 12px; margin: 0;">
                            © ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Password Reset Successful - Azam TV Agent Portal

Hello ${name},

Your password has been successfully reset. Please find your new login credentials below:

Username: ${userName}
Password: ${password}

IMPORTANT SECURITY NOTICE:
- Please change your password immediately after logging in
- Do not share your password with anyone
- Keep this email secure and delete it after changing your password

If you did not request a password reset, please contact our support team immediately.

Best regards,
Azam TV Support Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
};
export const sendWelcomeEmail = async (
  toEmail: string,
  agentName: string,
  userName: string,
  password: string,
  agentId?: string
): Promise<boolean> => {
  const loginUrl = process.env.APP_URL || "http://myportal.azammedia.com/dev";

  const mailOptions = {
    from: '"Azam Media" <sapnotifications@azam-media.com>',
    to: toEmail,
    subject: "🎉 Welcome to Azam TV Agent Portal - Your Account is Ready!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Azam TV Agent Portal</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FF8200 0%, #FF6B00 100%); padding: 50px 30px; text-align: center;">
                    <div style="font-size: 60px; margin-bottom: 15px;">🎉</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">
                      Welcome to Azam TV!
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.95); margin: 15px 0 0; font-size: 18px;">
                      Your Agent Account Has Been Approved
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 18px; line-height: 1.6; margin: 0 0 25px;">
                      Dear <strong>${agentName}</strong>,
                    </p>
                    
                    <p style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 30px;">
                      Congratulations! 🎊 Your application has been reviewed and approved. You are now officially registered as an Azam TV Agent. Welcome to our growing network of partners!
                    </p>
                    
                    ${agentId ? `
                    <!-- Agent ID Badge -->
                    <div style="background: linear-gradient(135deg, #181c4c 0%, #238fb7 100%); border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                      <p style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 2px;">
                        Your Agent ID
                      </p>
                      <p style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 1px;">
                        ${agentId}
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- Credentials Box -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; border: 2px solid #e9ecef; margin: 30px 0;">
                      <h3 style="color: #181c4c; font-size: 18px; margin: 0 0 20px; text-align: center;">
                        🔐 Your Login Credentials
                      </h3>
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="padding: 15px; background: #ffffff; border-radius: 8px; margin-bottom: 10px;">
                            <table role="presentation" style="width: 100%;">
                              <tr>
                                <td style="width: 100px;">
                                  <span style="color: #666666; font-size: 14px; font-weight: 500;">Username:</span>
                                </td>
                                <td style="text-align: right;">
                                  <code style="background: linear-gradient(135deg, #181c4c 0%, #238fb7 100%); color: #ffffff; padding: 8px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 600;">${userName}</code>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr><td style="height: 10px;"></td></tr>
                        <tr>
                          <td style="padding: 15px; background: #ffffff; border-radius: 8px;">
                            <table role="presentation" style="width: 100%;">
                              <tr>
                                <td style="width: 100px;">
                                  <span style="color: #666666; font-size: 14px; font-weight: 500;">Password:</span>
                                </td>
                                <td style="text-align: right;">
                                  <code style="background: linear-gradient(135deg, #FF8200 0%, #FF6B00 100%); color: #ffffff; padding: 8px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 600;">${password}</code>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Login Button -->
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${loginUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #FF8200 0%, #FF6B00 100%); color: #ffffff; text-decoration: none; padding: 16px 50px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(255, 130, 0, 0.4);">
                        Login to Your Account →
                      </a>
                    </div>
                    
                    <!-- Security Warning -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 10px; margin: 30px 0;">
                      <p style="color: #856404; font-size: 14px; font-weight: 600; margin: 0 0 12px;">
                        🔒 Important Security Notice:
                      </p>
                      <ul style="color: #856404; font-size: 14px; margin: 0; padding-left: 20px; line-height: 2;">
                        <li><strong>Change your password</strong> immediately after your first login</li>
                        <li><strong>Never share</strong> your login credentials with anyone</li>
                        <li><strong>Delete this email</strong> after saving your credentials securely</li>
                        <li>Enable <strong>two-factor authentication</strong> if available</li>
                      </ul>
                    </div>
                    
                    <!-- Getting Started Section -->
                    <div style="background: linear-gradient(135deg, #e8f4f8 0%, #f0f7fa 100%); border-radius: 10px; padding: 25px; margin: 30px 0;">
                      <h4 style="color: #181c4c; font-size: 16px; margin: 0 0 15px;">
                        🚀 Getting Started:
                      </h4>
                      <ol style="color: #555555; font-size: 14px; margin: 0; padding-left: 20px; line-height: 2;">
                        <li>Log in using the credentials above</li>
                        <li>Complete your profile setup</li>
                        <li>Explore the dashboard and available features</li>
                        <li>Start managing your agent activities</li>
                      </ol>
                    </div>
                    
                    <!-- Support Section -->
                    <div style="border-top: 1px solid #e9ecef; padding-top: 25px; margin-top: 30px;">
                      <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0 0 15px;">
                        Need assistance? Our support team is here to help:
                      </p>
                      <table role="presentation" style="width: 100%;">
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #666666;">📧 Email:</span>
                            <a href="mailto:support@azam-media.com" style="color: #238fb7; text-decoration: none; margin-left: 10px;">support@azam-media.com</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <span style="color: #666666;">📞 Phone:</span>
                            <span style="color: #333333; margin-left: 10px;">+255 123 456 789</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 30px 0 0;">
                      We're excited to have you on board!<br/><br/>
                      Best regards,<br/>
                      <strong style="color: #FF8200;">The Azam TV Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: linear-gradient(135deg, #181c4c 0%, #1a2050 100%); padding: 30px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="color: rgba(255, 255, 255, 0.7); font-size: 12px; margin: 0 0 10px;">
                            This is an automated message from Azam TV Agent Portal.
                          </p>
                          <p style="color: rgba(255, 255, 255, 0.7); font-size: 12px; margin: 0 0 15px;">
                            Please do not reply directly to this email.
                          </p>
                          <p style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin: 0;">
                            © ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
🎉 Welcome to Azam TV Agent Portal!

Dear ${agentName},

Congratulations! Your application has been reviewed and approved. You are now officially registered as an Azam TV Agent. Welcome to our growing network of partners!

${agentId ? `Your Agent ID: ${agentId}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Username: ${userName}
Password: ${password}

Login URL: ${loginUrl}/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 IMPORTANT SECURITY NOTICE:
• Change your password immediately after your first login
• Never share your login credentials with anyone
• Delete this email after saving your credentials securely
• Enable two-factor authentication if available

🚀 GETTING STARTED:
1. Log in using the credentials above
2. Complete your profile setup
3. Explore the dashboard and available features
4. Start managing your agent activities

NEED HELP?
📧 Email: support@azam-media.com
📞 Phone: +255 123 456 789

We're excited to have you on board!

Best regards,
The Azam TV Team

---
This is an automated message from Azam TV Agent Portal.
Please do not reply directly to this email.
© ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
};

/**
 * Send password change success notification email
 * @param toEmail User's email address
 * @param name User's display name
 */
export const sendPasswordChangeSuccessEmail = async (
  toEmail: string,
  name: string
): Promise<boolean> => {
  const mailOptions = {
    from: '"Azam Media Support" <sapnotifications@azam-media.com>',
    to: toEmail,
    subject: "Security Notification: Password Changed - Azam TV",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed Successfully</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #181c4c 0%, #238fb7 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                      ✅ Password Changed
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                      Azam TV Agent Portal
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hello <strong>${name}</strong>,
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                      This is a confirmation that the password for your Azam TV Agent Portal account has been successfully changed.
                    </p>
                    
                    <!-- Info Box -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; border-left: 4px solid #28a745; margin: 25px 0;">
                      <p style="color: #333333; font-size: 15px; margin: 0;">
                        If you made this change, you can safely ignore this email. You can now use your new password to log in.
                      </p>
                    </div>
                    
                    <!-- Warning Box -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 25px 0;">
                      <p style="color: #856404; font-size: 14px; font-weight: 600; margin: 0 0 10px;">
                        ⚠️ Did you not make this change?
                      </p>
                      <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
                        If you did not change your password, please contact our support team immediately at <a href="mailto:support@azam-media.com" style="color: #238fb7; text-decoration: none;">support@azam-media.com</a> to secure your account.
                      </p>
                    </div>
                    
                    <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                      Best regards,<br/>
                      <strong>Azam TV Support Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e9ecef;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="color: #888888; font-size: 12px; margin: 0 0 10px;">
                            This is an automated security notification. Please do not reply to this email.
                          </p>
                          <p style="color: #888888; font-size: 12px; margin: 0;">
                            © ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Password Changed Successfully - Azam TV Agent Portal

Hello ${name},

This is a confirmation that the password for your Azam TV Agent Portal account has been successfully changed.

If you made this change, you can safely ignore this email. You can now use your new password to log in.

IMPORTANT: If you did not change your password, please contact our support team immediately at support@azam-media.com to secure your account.

Best regards,
Azam TV Support Team

---
This is an automated security notification. Please do not reply to this email.
© ${new Date().getFullYear()} Azam Media Limited. All rights reserved.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Password change notification email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send password change notification email:", error);
    return false;
  }
};