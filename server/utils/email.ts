import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

export async function sendInvitationEmail({
  toEmail,
  inviterName,
  workspaceName,
  folderName,
  role,
  inviteUrl,
}: {
  toEmail: string
  inviterName: string
  workspaceName: string
  folderName: string | null
  role: string
  inviteUrl: string
}) {
  const roleLabel = role === 'editor' ? 'Editor' : 'Visualizador'
  const scopeLabel = folderName
    ? `a pasta <strong style="color: #374151;">${folderName}</strong> em ${workspaceName}`
    : `o workspace <strong style="color: #374151;">${workspaceName}</strong>`

  const subject = folderName
    ? `${inviterName} convidou você para colaborar na pasta "${folderName}"`
    : `${inviterName} convidou você para colaborar em "${workspaceName}"`

  await resend.emails.send({
    from: `RouteForge <${FROM}>`,
    to: toEmail,
    subject,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite RouteForge</title>
</head>
<body style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #f3f4f6; margin: 0; padding: 40px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px;">
          <tr>
            <td style="padding-bottom: 24px;">
              <span style="font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">⚡ RouteForge</span>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 8px; line-height: 1.3;">
                Você foi convidado para colaborar
              </h1>
              <p style="font-size: 15px; color: #6b7280; margin: 0 0 28px; line-height: 1.6;">
                <strong style="color: #374151;">${inviterName}</strong> convidou você para colaborar em
                ${scopeLabel} como <strong style="color: #374151;">${roleLabel}</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius: 8px; background: #4f46e5;">
                    <a href="${inviteUrl}"
                       style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Aceitar convite →
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0 24px;">
              <p style="font-size: 13px; color: #9ca3af; margin: 0 0 6px;">Este link expira em 7 dias.</p>
              <p style="font-size: 13px; color: #9ca3af; margin: 0;">
                Ou cole no navegador:<br>
                <span style="color: #6b7280; word-break: break-all; font-size: 12px;">${inviteUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0 0; text-align: center;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                RouteForge · Documentação colaborativa de APIs
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}
