import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const conf = body.smtpConfig;

    const host = conf?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(conf?.port || process.env.SMTP_PORT || 465);
    const user = (conf?.user || process.env.SMTP_USER || '').trim();
    let pass = (conf?.pass || process.env.SMTP_PASS || '').trim();
    const secure = conf?.secure !== undefined ? conf.secure : port === 465;

    if (pass) {
      pass = pass.replace(/\s+/g, '');
    }

    if (!user || !pass) {
      return res.status(400).json({
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

    return res.status(200).json({
      success: true,
      message: `Successfully connected to ${host}:${port} as ${user}!`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[SMTP Test Error]:', msg);
    return res.status(400).json({
      success: false,
      error: msg,
    });
  }
}
