export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const envUser = process.env.SMTP_USER?.trim();
  const envPass = process.env.SMTP_PASS?.trim();
  const hasEnv = Boolean(envUser && envPass);

  return res.status(200).json({
    hasEnvConfig: hasEnv,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    user: envUser ? `${envUser.slice(0, 3)}***@***` : null,
    from: process.env.SMTP_FROM || 'SafeChat <no-reply@safechat.app>',
  });
}
