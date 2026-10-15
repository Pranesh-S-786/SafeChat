import type { Plugin, ViteDevServer } from 'vite';
import nodemailer from 'nodemailer';
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

interface SmtpRequestBody {
  to?: string;
  otpCode?: string;
  smtpConfig?: {
    host?: string;
    port?: number | string;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
  };
}

function getEffectiveSmtpEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            env[key] = val;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Failed to parse .env in smtp plugin:', err);
  }
  return env;
}

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // 1MB max payload protection
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJsonResponse(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function generateEmailTemplate(otpCode: string): string {
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
        <table role="presentation" width="100%" style="max-width: 580px; background: #ffffff; border-radius: 28px; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); overflow: hidden; border: 1px solid #eef0f6;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 50%, #ede9fe 100%); height: 8px;"></td>
          </tr>
          <tr>
            <td style="padding: 44px 36px 36px 36px; text-align: center;">
              
              <!-- Brand Header -->
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <div style="display: inline-block; width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); line-height: 44px; text-align: center; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
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

              <h1 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                Verify Your Email Address
              </h1>

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

              <!-- Expiry Note -->
              <p style="margin: 0 0 8px 0; font-size: 13.5px; line-height: 20px; color: #475569;">
                This code expires in <strong style="color: #0f172a;">15 minutes</strong>.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12.5px; line-height: 18px; color: #94a3b8;">
                If you did not request this, you can safely ignore this email.
              </p>

              <!-- Spam / Promotions Folder Tip Box -->
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

              <div style="border-top: 1px solid #f1f5f9; margin-bottom: 20px;"></div>

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

export function smtpServerPlugin(): Plugin {
  const attachMiddleware = (server: ViteDevServer) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0];
      const env = getEffectiveSmtpEnv();

      // Route: GET /api/smtp-config (Check if server environment has credentials configured)
      if (req.method === 'GET' && url === '/api/smtp-config') {
        const envUser = env.SMTP_USER?.trim();
        const envPass = env.SMTP_PASS?.trim();
        const hasEnv = Boolean(envUser && envPass);
        return sendJsonResponse(res, 200, {
          hasEnvConfig: hasEnv,
          host: env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(env.SMTP_PORT || 465),
          user: envUser ? `${envUser.slice(0, 3)}***@***` : null,
          from: env.SMTP_FROM || 'SafeChat <no-reply@safechat.app>',
        });
      }

      // Route: POST /api/test-smtp (Verify SMTP credentials connection)
      if (req.method === 'POST' && url === '/api/test-smtp') {
        try {
          const body = await parseJsonBody<SmtpRequestBody>(req);
          const conf = body.smtpConfig;

          const host = conf?.host || env.SMTP_HOST || 'smtp.gmail.com';
          const port = Number(conf?.port || env.SMTP_PORT || 465);
          const user = (conf?.user || env.SMTP_USER || '').trim();
          let pass = (conf?.pass || env.SMTP_PASS || '').trim();
          const secure = conf?.secure !== undefined ? conf.secure : port === 465;

          // Strip spaces if user pasted 16-char code with spaces
          if (pass) {
            pass = pass.replace(/\s+/g, '');
          }

          if (!user || !pass) {
            return sendJsonResponse(res, 400, {
              success: false,
              error: 'Please provide both SMTP username/email and password (or App Password).',
            });
          }

          const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            tls: {
              rejectUnauthorized: false,
            },
          });

          await transporter.verify();

          return sendJsonResponse(res, 200, {
            success: true,
            message: `Successfully connected to ${host}:${port} as ${user}!`,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[SMTP Test Error]:', msg);
          return sendJsonResponse(res, 400, {
            success: false,
            error: msg,
          });
        }
      }

      // Route: POST /api/send-otp (Send genuine 6-digit OTP code to recipient)
      if (req.method === 'POST' && url === '/api/send-otp') {
        try {
          const body = await parseJsonBody<SmtpRequestBody>(req);
          const { to, otpCode, smtpConfig } = body;

          if (!to || !otpCode) {
            return sendJsonResponse(res, 400, {
              success: false,
              error: 'Missing required fields: recipient "to" and "otpCode".',
            });
          }

          const host = smtpConfig?.host || env.SMTP_HOST || 'smtp.gmail.com';
          const port = Number(smtpConfig?.port || env.SMTP_PORT || 465);
          const user = (smtpConfig?.user || env.SMTP_USER || '').trim();
          let pass = (smtpConfig?.pass || env.SMTP_PASS || '').trim();
          const secure = smtpConfig?.secure !== undefined ? smtpConfig.secure : port === 465;
          const from =
            smtpConfig?.from ||
            env.SMTP_FROM ||
            (user ? `SafeChat <${user}>` : 'SafeChat <no-reply@safechat.app>');

          // Strip spaces if user pasted 16-char code with spaces
          if (pass) {
            pass = pass.replace(/\s+/g, '');
          }

          if (!user || !pass) {
            return sendJsonResponse(res, 400, {
              success: false,
              error:
                'SMTP credentials are not set. Please click the "SMTP Mail" button in SafeChat or configure your .env file with your email and App Password.',
            });
          }

          const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            tls: {
              rejectUnauthorized: false,
            },
          });

          const htmlContent = generateEmailTemplate(otpCode);
          const textContent = `SafeChat Verification Code: ${otpCode}\n\nWelcome to SafeChat. Use the one-time verification code below to verify your email and secure your account:\n\n${otpCode}\n\nThis code expires in 15 minutes.\n\nSafeChat • Private. Secure. Intelligent.`;

          const info = await transporter.sendMail({
            from,
            to,
            subject: `SafeChat Verification Code: ${otpCode}`,
            text: textContent,
            html: htmlContent,
          });

          console.log(`[SMTP Sent] Successfully dispatched 6-digit OTP to ${to} (MessageID: ${info.messageId})`);

          return sendJsonResponse(res, 200, {
            success: true,
            messageId: info.messageId,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[SMTP Send Error]:', msg);
          return sendJsonResponse(res, 500, {
            success: false,
            error: msg,
          });
        }
      }

      // Route: POST /api/auth/check-username (Validate username availability)
      if (req.method === 'POST' && url === '/api/auth/check-username') {
        try {
          const body = await parseJsonBody<{ username?: string }>(req);
          const rawUser = body.username?.trim().toLowerCase();
          if (!rawUser) {
            return sendJsonResponse(res, 200, { available: false, error: 'Username required' });
          }

          const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
          const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const anonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

          const targetKey = serviceRoleKey || anonKey;
          if (supabaseUrl && targetKey) {
            const client = createClient(supabaseUrl, targetKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            });

            // 1. Try check_username_exists RPC if defined
            const { data: rpcRes, error: rpcErr } = await client.rpc('check_username_exists', {
              target_username: rawUser,
            });
            if (!rpcErr && typeof rpcRes === 'boolean') {
              return sendJsonResponse(res, 200, { available: !rpcRes });
            }

            // 2. Query profiles
            const { data, error } = await client
              .from('profiles')
              .select('id, username')
              .ilike('username', rawUser)
              .limit(1);

            if (!error && Array.isArray(data) && data.length > 0) {
              return sendJsonResponse(res, 200, { available: false });
            }
          }

          return sendJsonResponse(res, 200, { available: true });
        } catch {
          return sendJsonResponse(res, 200, { available: true });
        }
      }

      // Route: POST /api/auth/provision-verified-user (Provision/Update Supabase Auth for verified OTP users)
      if (req.method === 'POST' && url === '/api/auth/provision-verified-user') {
        try {
          const body = await parseJsonBody<{
            email?: string;
            password?: string;
            displayName?: string;
            username?: string;
            facePattern?: number[];
          }>(req);

          const { email, password, displayName, username, facePattern } = body;
          const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
          const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;

          if (!serviceRoleKey || !supabaseUrl || !email || !password) {
            return sendJsonResponse(res, 200, {
              success: false,
              provisioned: false,
              reason: 'Service role key not configured in .env',
            });
          }

          const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });

          // List users to locate existing user
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existing = listData?.users?.find(
            (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
          );

          if (existing) {
            await adminClient.auth.admin.updateUserById(existing.id, {
              password,
              email_confirm: true,
              user_metadata: {
                display_name: displayName,
                username,
                face_template: facePattern || null,
                face_enrolled: Boolean(facePattern && facePattern.length > 0),
              },
            });
          } else {
            await adminClient.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: {
                display_name: displayName,
                username,
                face_template: facePattern || null,
                face_enrolled: Boolean(facePattern && facePattern.length > 0),
              },
            });
          }

          return sendJsonResponse(res, 200, {
            success: true,
            provisioned: true,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('[Provision User Notice]:', msg);
          return sendJsonResponse(res, 200, {
            success: false,
            provisioned: false,
            error: msg,
          });
        }
      }

      next();
    });
  };

  return {
    name: 'safechat-smtp-server',
    configureServer(server) {
      attachMiddleware(server);
    },
    configurePreviewServer(server) {
      attachMiddleware(server as unknown as ViteDevServer);
    },
  };
}
