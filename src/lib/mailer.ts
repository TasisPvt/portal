import nodemailer from "nodemailer"

// ─── Transport ────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
   host: "smtp.gmail.com",
   port: 587,
   secure: false,
   auth: {
      user: process.env.DEFAULT_REPLY_TO_EMAIL,
      pass: process.env.PASSWORD_SENDER,
   },
})

// ─── Password generator ───────────────────────────────────────────────────────

export function generatePassword(): string {
   const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
   const lower = "abcdefghjkmnpqrstuvwxyz"
   const digits = "23456789"
   const special = "@#$!"

   const rand = (s: string) => s[Math.floor(Math.random() * s.length)]

   const required = [rand(upper), rand(lower), rand(digits), rand(special)]
   const rest = Array.from({ length: 6 }, () => rand(upper + lower + digits))

   return [...required, ...rest].sort(() => Math.random() - 0.5).join("")
}

// ─── Email templates ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail({
   to,
   name,
   password,
}: {
   to: string
   name: string
   password: string
}) {
   const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
         <meta charset="UTF-8" />
         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
         <title>Welcome to Tasis Portal</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Arial,sans-serif;">
         <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr>
               <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                     <!-- Header -->
                     <tr>
                        <td style="background:#18181b;padding:32px 40px;text-align:center;">
                           <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                              Tasis Portal
                           </span>
                        </td>
                     </tr>

                     <!-- Body -->
                     <tr>
                        <td style="padding:40px 40px 24px;">
                           <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">
                              Welcome, ${name}!
                           </p>
                           <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
                              Your account has been created on the Tasis Portal.
                              Use the temporary password below to log in for the first time.
                           </p>

                           <!-- Password box -->
                           <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                              <tr>
                                 <td style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:20px;text-align:center;">
                                    <p style="margin:0 0 6px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">
                                       Temporary Password
                                    </p>
                                    <p style="margin:0;font-size:24px;font-weight:700;color:#18181b;letter-spacing:2px;font-family:monospace;">
                                       ${password}
                                    </p>
                                 </td>
                              </tr>
                           </table>

                           <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                              You will be asked to set a new password immediately after your first login.
                              Please keep this email secure and do not share your credentials with anyone.
                           </p>

                           <!-- CTA -->
                           <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                              <tr>
                                 <td style="background:#18181b;border-radius:8px;">
                                    <a href="${process.env.BETTER_AUTH_URL}/login"
                                       style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                                       Log in to your account →
                                    </a>
                                 </td>
                              </tr>
                           </table>
                        </td>
                     </tr>

                     <!-- Footer -->
                     <tr>
                        <td style="border-top:1px solid #f4f4f5;padding:20px 40px;text-align:center;">
                           <p style="margin:0;font-size:12px;color:#a1a1aa;">
                              © ${new Date().getFullYear()} Tasis Pvt Ltd. · If you didn't request this account, please ignore this email.
                           </p>
                        </td>
                     </tr>

                  </table>
               </td>
            </tr>
         </table>
      </body>
      </html>
   `

   await transporter.sendMail({
      from: `"Tasis Portal" <${process.env.DEFAULT_REPLY_TO_EMAIL}>`,
      replyTo: process.env.DEFAULT_REPLY_TO_EMAIL,
      to,
      subject: "Your Tasis Portal account is ready",
      html,
   })
}
