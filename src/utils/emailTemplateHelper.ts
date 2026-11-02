/**
 * Email Notification Template & Recipient Preference Helper
 * Dars with Osama - Automated Student Notification System
 */

import { NotificationCategory, StudentNotificationPreferences, UserProfile } from '../types';

export interface EmailTemplateParams {
  type: NotificationCategory;
  title: string;
  subtitle?: string;
  summary: string;
  contentHtml?: string;
  targetUrl: string;
  targetButtonText?: string;
  publishedAt?: string;
  recipientEmail?: string;
  recipientName?: string;
  siteUrl?: string;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, { badge: string; icon: string; defaultAction: string }> = {
  course: {
    badge: 'PEMBELAJARAN BARU',
    icon: '📚',
    defaultAction: 'Buka Materi Pembelajaran'
  },
  session: {
    badge: 'SESI PEMBELAJARAN BARU',
    icon: '📖',
    defaultAction: 'Ikuti Sesi Pembelajaran'
  },
  article: {
    badge: 'ARTIKEL ILMIAH BARU',
    icon: '📝',
    defaultAction: 'Baca Artikel Lengkap'
  },
  qa: {
    badge: 'TANYA JAWAB & KONSULTASI',
    icon: '❓',
    defaultAction: 'Buka Pembahasan Tanya Jawab'
  },
  announcement: {
    badge: 'PENGUMUMAN PENTING',
    icon: '📢',
    defaultAction: 'Buka Informasi Website'
  }
};

/**
 * Builds standard email subject line following Dars with Osama conventions
 */
export function generateEmailSubject(type: NotificationCategory, title: string): string {
  const cleanTitle = (title || '').trim();
  switch (type) {
    case 'course':
      return `Pembelajaran Baru Telah Tersedia: ${cleanTitle} | Dars with Osama`;
    case 'session':
      return `Sesi Pembelajaran Baru: ${cleanTitle} | Dars with Osama`;
    case 'article':
      return `Artikel Ilmiah Baru Telah Terbit: ${cleanTitle} | Dars with Osama`;
    case 'qa':
      return `Tanya Jawab Syar'i: ${cleanTitle} | Dars with Osama`;
    case 'announcement':
    default:
      return `Pengumuman Penting: ${cleanTitle} | Dars with Osama`;
  }
}

/**
 * Checks if a student is eligible to receive notifications for a given category
 */
export function isStudentEligibleForCategory(
  preferences: StudentNotificationPreferences | undefined,
  category: NotificationCategory
): boolean {
  if (!preferences) {
    // Default: all categories enabled for registered students
    return true;
  }

  if (preferences.unsubscribedAll) {
    return false;
  }

  switch (category) {
    case 'course':
    case 'session':
      return preferences.courses !== false;
    case 'article':
      return preferences.articles !== false;
    case 'qa':
      return preferences.qa !== false;
    case 'announcement':
      return preferences.announcements !== false;
    default:
      return true;
  }
}

/**
 * Filters a list of user profiles to only those who should receive the email
 */
export function filterRecipientsByPreferences(
  users: UserProfile[],
  category: NotificationCategory
): UserProfile[] {
  if (!Array.isArray(users)) return [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenEmails = new Set<string>();
  const eligible: UserProfile[] = [];

  for (const u of users) {
    if (!u || !u.email) continue;
    const cleanEmail = u.email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) continue;
    if (seenEmails.has(cleanEmail)) continue;

    // Check preferences
    if (isStudentEligibleForCategory(u.notificationPreferences, category)) {
      seenEmails.add(cleanEmail);
      eligible.push({ ...u, email: cleanEmail });
    }
  }

  return eligible;
}

/**
 * Builds deterministic idempotency key for deduplicating publication events
 */
export function buildIdempotencyKey(
  type: NotificationCategory,
  entityId: string,
  timestampOrVersion?: string | number
): string {
  const cleanId = String(entityId || 'general').trim();
  const v = timestampOrVersion ? String(timestampOrVersion).trim() : 'v1';
  return `${type}-${cleanId}-${v}`;
}

/**
 * Generates responsive, Neo-Brutalist inspired HTML email matching Dars with Osama branding
 */
export function generateEmailHtml(params: EmailTemplateParams): string {
  const {
    type,
    title,
    subtitle,
    summary,
    contentHtml,
    targetUrl,
    targetButtonText,
    publishedAt,
    recipientEmail,
    recipientName,
    siteUrl = 'https://darswithosama.com'
  } = params;

  const config = NOTIFICATION_CATEGORY_LABELS[type] || NOTIFICATION_CATEGORY_LABELS.announcement;
  const buttonText = targetButtonText || config.defaultAction;
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

  const encodedEmail = encodeURIComponent(recipientEmail || '');
  const preferencesUrl = recipientEmail ? `${siteUrl}/preferences?email=${encodedEmail}` : `${siteUrl}`;
  const unsubscribeUrl = recipientEmail ? `${siteUrl}/unsubscribe?email=${encodedEmail}` : `${siteUrl}`;

  const greetingName = recipientName ? `Akhi/Ukhti ${recipientName}` : 'Sahabat Penuntut Ilmu';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlString(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #171717; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 2px solid #171717; box-shadow: 6px 6px 0px #171717; border-radius: 8px; overflow: hidden;">
          
          <!-- Brand Header Banner -->
          <tr>
            <td style="background-color: #123D32; padding: 24px 28px; border-bottom: 2px solid #171717; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #D6AD52; text-transform: uppercase; margin-bottom: 4px;">
                      DARS WITH OSAMA • ILMU • KAJIAN • KITAB
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: #FFFFFF; font-family: Georgia, 'Times New Roman', serif; margin: 0;">
                      Dars with Osama
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: #16263D; border: 1.5px solid #D6AD52; color: #D6AD52; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">
                      ${config.icon} ${config.badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 28px 24px 28px; background-color: #FFFFFF;">
              
              <!-- Salutation -->
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #171717; font-weight: 600;">
                Assalamu'alaikum warahmatullahi wabarakatuh, ${greetingName}.
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #404643;">
                Kami informasikan bahwa terdapat konten dan pembaruan materi terbaru yang telah diterbitkan di website resmi <strong>Dars with Osama</strong>:
              </p>

              <!-- Highlighted Content Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F0; border: 2px solid #171717; border-left: 6px solid #123D32; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 18px 20px;">
                    ${
                      subtitle
                        ? `<div style="font-size: 11px; font-weight: 800; color: #123D32; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                            ${escapeHtmlString(subtitle)}
                          </div>`
                        : ''
                    }
                    <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 800; color: #171717; font-family: Georgia, 'Times New Roman', serif; line-height: 1.4;">
                      ${escapeHtmlString(title)}
                    </h2>
                    <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.6; color: #525856;">
                      ${escapeHtmlString(summary)}
                    </p>
                    <div style="font-size: 11px; font-weight: 700; color: #626A66;">
                      🗓️ Diterbitkan: ${formattedDate}
                    </div>
                  </td>
                </tr>
              </table>

              ${
                contentHtml
                  ? `<div style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #292D2B; padding: 14px 16px; background-color: #FFFFFF; border: 1px solid #171717; border-radius: 4px;">
                      ${contentHtml}
                    </div>`
                  : ''
              }

              <p style="margin: 0 0 24px 0; font-size: 13.5px; line-height: 1.6; color: #404643;">
                Silakan kunjungi website Dars with Osama untuk membaca pembahasan lengkap, menyimak audio, atau mengikuti sesi pembelajarannya secara mendalam.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #123D32; border: 2px solid #171717; box-shadow: 4px 4px 0px #171717; border-radius: 6px;">
                    <a href="${escapeHtmlString(targetUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 26px; font-size: 13.5px; font-weight: 800; color: #D6AD52; text-decoration: none; text-transform: uppercase; letter-spacing: 0.04em;">
                      ${escapeHtmlString(buttonText)} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Closing Do'a -->
              <p style="margin: 0 0 8px 0; font-size: 13.5px; line-height: 1.6; color: #404643;">
                Semoga materi ini bermanfaat, menambah wawasan keilmuan syar'i, dan membawa keberkahan bagi kita semua.
              </p>
              <p style="margin: 0; font-size: 14px; font-weight: 700; color: #171717;">
                Wassalamu'alaikum warahmatullahi wabarakatuh.
              </p>

              <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #D1C7B7;">
                <p style="margin: 0; font-size: 12px; font-weight: 800; color: #123D32;">
                  Pengasuh Dars with Osama: Osama
                </p>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #626A66;">
                  Pusat Kajian, Materi Pembelajaran Kitab, dan Tanya Jawab Syar'i
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer & Unsubscribe Section -->
          <tr>
            <td style="padding: 20px 28px; background-color: #FAF7F0; border-top: 2px solid #171717; font-size: 11px; color: #626A66; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                Anda menerima email ini karena terdaftar sebagai siswa akun aktif di website <strong>Dars with Osama</strong> (${recipientEmail ? escapeHtmlString(recipientEmail) : 'akun siswa'}).
              </p>
              <p style="margin: 0;">
                <a href="${escapeHtmlString(preferencesUrl)}" target="_blank" rel="noopener noreferrer" style="color: #123D32; font-weight: 700; text-decoration: underline;">
                  Atur Preferensi Notifikasi
                </a>
                &nbsp;•&nbsp;
                <a href="${escapeHtmlString(unsubscribeUrl)}" target="_blank" rel="noopener noreferrer" style="color: #C94A4A; font-weight: 700; text-decoration: underline;">
                  Berhenti Menerima Email (Unsubscribe)
                </a>
                &nbsp;•&nbsp;
                <a href="${escapeHtmlString(siteUrl)}" target="_blank" rel="noopener noreferrer" style="color: #123D32; font-weight: 700; text-decoration: underline;">
                  Kunjungi Website
                </a>
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
 * Generates plain text version of the email matching the user's specification
 */
export function generateEmailPlainText(params: EmailTemplateParams): string {
  const {
    type,
    title,
    summary,
    targetUrl,
    targetButtonText,
    recipientName,
    siteUrl = 'https://darswithosama.com',
    recipientEmail
  } = params;

  const config = NOTIFICATION_CATEGORY_LABELS[type] || NOTIFICATION_CATEGORY_LABELS.announcement;
  const buttonText = targetButtonText || config.defaultAction;
  const greetingName = recipientName ? `Akhi/Ukhti ${recipientName}` : 'Sahabat Penuntut Ilmu';

  const preferencesUrl = recipientEmail ? `${siteUrl}/preferences?email=${encodeURIComponent(recipientEmail)}` : siteUrl;
  const unsubscribeUrl = recipientEmail ? `${siteUrl}/unsubscribe?email=${encodeURIComponent(recipientEmail)}` : siteUrl;

  return `Assalamu'alaikum warahmatullahi wabarakatuh, ${greetingName}.

Kami informasikan bahwa materi atau pembaruan baru telah tersedia di Dars with Osama.

[${config.badge}]
Judul: ${title}

${summary}

Silakan kunjungi website Dars with Osama untuk membaca atau mengikuti pembelajaran tersebut:
${targetUrl}

[${buttonText}]

Semoga materi ini bermanfaat dan menambah wawasan keilmuan kita.

Wassalamu'alaikum warahmatullahi wabarakatuh.

Dars with Osama
Pengasuh: Osama

--------------------------------------------------
Atur preferensi notifikasi: ${preferencesUrl}
Berhenti menerima email (Unsubscribe): ${unsubscribeUrl}`;
}

function escapeHtmlString(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
