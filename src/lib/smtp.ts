export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from?: string;
}

const STORAGE_KEY = 'safechat_smtp_config';

/**
 * Retrieve user-configured SMTP credentials from localStorage
 */
export function getStoredSmtpConfig(): SmtpConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.host === 'string' && typeof parsed.user === 'string') {
      return parsed as SmtpConfig;
    }
  } catch (err) {
    console.warn('Failed to parse stored SMTP config:', err);
  }
  return null;
}

/**
 * Persist user-configured SMTP credentials to localStorage
 */
export function saveStoredSmtpConfig(config: SmtpConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to save SMTP config to localStorage:', err);
  }
}

/**
 * Clear stored SMTP credentials
 */
export function clearStoredSmtpConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear SMTP config:', err);
  }
}

/**
 * Generate responsive HTML email that exactly reproduces the visual design
 * from user reference image (Image 4): SafeChat shield, 6-digit code box, 15-minute expiry, and spam tip.
 */
export function generateOtpEmailHtml(otpCode: string): string {
  const formattedDigits = otpCode.split('').join('&nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeChat Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f8; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background: #ffffff; border-radius: 28px; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); overflow: hidden; border: 1px solid #eef0f6;" cellspacing="0" cellpadding="0">
          
          <!-- Subtle Top Decorative Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 50%, #ede9fe 100%); height: 8px;"></td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 44px 36px 36px 36px; text-align: center;">
              
              <!-- SafeChat Brand Header with Shield Icon -->
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <div style="display: inline-block; width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); line-height: 44px; text-align: center; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                      <!-- Shield SVG Graphic -->
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
                        <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="white" fill-opacity="0.9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 11.5L11 13.5L15 9.5" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle; text-align: left;">
                    <span style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #1e1b4b; display: block; line-height: 1.1;">SAFECHAT</span>
                  </td>
                </tr>
              </table>

              <!-- Main Heading -->
              <h1 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                Verify Your Email Address
              </h1>

              <!-- Intro Subtext -->
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 24px; color: #64748b; max-width: 440px; display: inline-block;">
                Welcome to SafeChat. Use the one-time verification code below to verify your email and secure your account.
              </p>

              <!-- Purple 6-Digit OTP Box (Image 4 Match) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 100%; max-width: 420px; background-color: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 18px; padding: 22px 20px; text-align: center; box-sizing: border-box;">
                      <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #4f46e5; user-select: all; text-shadow: 0 1px 2px rgba(79, 70, 229, 0.1);">
                        ${formattedDigits}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Code Expiry Notice -->
              <p style="margin: 0 0 8px 0; font-size: 13.5px; line-height: 20px; color: #475569;">
                This code expires in <strong style="color: #0f172a;">15 minutes</strong>.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12.5px; line-height: 18px; color: #94a3b8;">
                If you did not request this, you can safely ignore this email.
              </p>

              <!-- Spam / Promotions Folder Tip Alert (Image 4 Match) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 100%; max-width: 440px; background-color: #fef9c3; border: 1px solid #fef08a; border-radius: 14px; padding: 12px 18px; text-align: left; box-sizing: border-box;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width: 24px; vertical-align: top; padding-right: 10px;">
                            <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background-color: #eab308; color: #ffffff; font-weight: bold; font-size: 13px; text-align: center; line-height: 20px;">!</span>
                          </td>
                          <td style="font-size: 12.5px; line-height: 18px; color: #854d0e; font-weight: 500;">
                            <strong>Tip:</strong> Check your Spam or Promotions folder if you can't find future emails.
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Footer Divider -->
              <div style="border-top: 1px solid #f1f5f9; margin-bottom: 20px;"></div>

              <!-- Footer Brand & Security Disclaimer -->
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                <span style="color: #4f46e5;">SafeChat</span> &bull; Private. Secure. Intelligent.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Never share this code with anyone. SafeChat engineers will never ask for your verification code.
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatch 6-digit OTP code to recipient's email via backend SMTP endpoint
 */
export async function sendOtpViaSmtp(
  to: string,
  otpCode: string,
  customConfig?: SmtpConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const config = customConfig || getStoredSmtpConfig();

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        otpCode,
        smtpConfig: config || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `SMTP dispatch failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to connect to SMTP mail service: ${msg}`,
    };
  }
}

/**
 * Test SMTP connection and credentials
 */
export async function testSmtpConnection(
  config: SmtpConfig
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch('/api/test-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtpConfig: config }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `SMTP test failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      message: data.message || 'SMTP credentials verified successfully!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `SMTP test connection failed: ${msg}`,
    };
  }
}
