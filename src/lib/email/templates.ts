/**
 * Email Templates pour portal_gmbs
 *
 * TODO MVP: Implémenter l'envoi réel d'emails
 * Options recommandées:
 * - Resend (https://resend.com) - Simple, moderne
 * - SendGrid - Robuste, analytics
 * - AWS SES - Économique pour volumes élevés
 */

export interface WelcomeEmailData {
  tenantName: string
  tenantEmail: string
  apiKeyId: string
  apiSecret: string
  plan: string
  allowedArtisans: number
}

/**
 * Template pour email de bienvenue avec credentials API
 */
export function generateWelcomeEmail(data: WelcomeEmailData): {
  subject: string
  html: string
  text: string
} {
  const { tenantName, apiKeyId, apiSecret, plan, allowedArtisans } = data

  const subject = `Bienvenue sur Portal GMBS - Vos identifiants API`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .credentials { background: #fff; border: 2px solid #4F46E5; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .credential-item { margin: 10px 0; }
        .credential-label { font-weight: bold; color: #4F46E5; }
        .credential-value { font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px; display: block; margin-top: 5px; word-break: break-all; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Bienvenue sur Portal GMBS</h1>
        </div>

        <div class="content">
          <p>Bonjour <strong>${tenantName}</strong>,</p>

          <p>Votre abonnement au <strong>plan ${plan.toUpperCase()}</strong> est maintenant actif!</p>

          <p>Vous pouvez gérer jusqu'à <strong>${allowedArtisans} artisans</strong> avec votre portail.</p>

          <div class="credentials">
            <h3>🔑 Vos identifiants API</h3>

            <div class="credential-item">
              <span class="credential-label">API Key ID (public):</span>
              <code class="credential-value">${apiKeyId}</code>
            </div>

            <div class="credential-item">
              <span class="credential-label">API Secret (confidentiel):</span>
              <code class="credential-value">${apiSecret}</code>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important :</strong> Conservez ces identifiants en lieu sûr. Le secret ne sera plus jamais affiché après cet email.
          </div>

          <h3>Prochaines étapes</h3>
          <ol>
            <li>Intégrez l'API dans votre CRM GMBS</li>
            <li>Générez vos premiers tokens artisan</li>
            <li>Testez le portail avec un artisan pilote</li>
          </ol>

          <a href="${process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.gmbs.fr'}/docs/api" class="button">
            📖 Consulter la documentation API
          </a>

          <p>Besoin d'aide ? Contactez notre support : <a href="mailto:support@gmbs.fr">support@gmbs.fr</a></p>
        </div>

        <div class="footer">
          <p>Portal GMBS - Gestion Multi-Bâtiments Simplifiée</p>
          <p>Vous recevez cet email suite à votre abonnement sur portal.gmbs.fr</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Bienvenue sur Portal GMBS

Bonjour ${tenantName},

Votre abonnement au plan ${plan.toUpperCase()} est maintenant actif!
Vous pouvez gérer jusqu'à ${allowedArtisans} artisans avec votre portail.

VOS IDENTIFIANTS API
====================

API Key ID (public):
${apiKeyId}

API Secret (confidentiel):
${apiSecret}

⚠️ IMPORTANT : Conservez ces identifiants en lieu sûr. Le secret ne sera plus jamais affiché après cet email.

PROCHAINES ÉTAPES
==================

1. Intégrez l'API dans votre CRM GMBS
2. Générez vos premiers tokens artisan
3. Testez le portail avec un artisan pilote

Documentation API : ${process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.gmbs.fr'}/docs/api

Besoin d'aide ? Contactez notre support : support@gmbs.fr

---
Portal GMBS - Gestion Multi-Bâtiments Simplifiée
Vous recevez cet email suite à votre abonnement sur portal.gmbs.fr
  `

  return { subject, html, text }
}

/**
 * Envoie un email de bienvenue (MVP: stub)
 * TODO: Implémenter avec un service d'emailing réel
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  console.log('[Email] TODO: Send welcome email')
  console.log('[Email] Recipient:', data.tenantEmail)
  console.log('[Email] Subject:', generateWelcomeEmail(data).subject)
  console.log('[Email] ⚠️ CREDENTIALS WOULD BE SENT (hidden in production)')

  // TODO: Implémenter l'envoi réel
  // Exemple avec Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // const { subject, html, text } = generateWelcomeEmail(data)
  // await resend.emails.send({
  //   from: 'Portal GMBS <noreply@portal.gmbs.fr>',
  //   to: data.tenantEmail,
  //   subject,
  //   html,
  //   text
  // })

  return false // Retourner true quand implémenté
}

/**
 * Template pour alertes de paiement échoué
 */
export interface PaymentFailedEmailData {
  tenantName: string
  tenantEmail: string
  invoiceId: string
  amountDue: number
  attemptCount: number
  nextRetryDate?: string
}

export function generatePaymentFailedEmail(data: PaymentFailedEmailData): {
  subject: string
  html: string
  text: string
} {
  const { tenantName, invoiceId, amountDue, attemptCount } = data
  const amountFormatted = (amountDue / 100).toFixed(2) + ' €'

  const subject = `⚠️ Échec de paiement - Action requise`

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #DC2626;">⚠️ Problème de paiement détecté</h2>

        <p>Bonjour <strong>${tenantName}</strong>,</p>

        <p>Nous n'avons pas pu traiter votre paiement pour Portal GMBS.</p>

        <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
          <p><strong>Facture :</strong> ${invoiceId}</p>
          <p><strong>Montant :</strong> ${amountFormatted}</p>
          <p><strong>Tentative :</strong> ${attemptCount}</p>
        </div>

        <p>Pour éviter une interruption de service, veuillez mettre à jour votre moyen de paiement.</p>

        <a href="https://billing.stripe.com" style="display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
          Mettre à jour le paiement
        </a>

        <p>Besoin d'aide ? Contactez-nous : <a href="mailto:support@gmbs.fr">support@gmbs.fr</a></p>
      </div>
    </body>
    </html>
  `

  const text = `
⚠️ PROBLÈME DE PAIEMENT DÉTECTÉ

Bonjour ${tenantName},

Nous n'avons pas pu traiter votre paiement pour Portal GMBS.

Facture : ${invoiceId}
Montant : ${amountFormatted}
Tentative : ${attemptCount}

Pour éviter une interruption de service, veuillez mettre à jour votre moyen de paiement :
https://billing.stripe.com

Besoin d'aide ? Contactez-nous : support@gmbs.fr
  `

  return { subject, html, text }
}
