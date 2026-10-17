/**
 * Configuration for Dars with Osama Admin WhatsApp Consultation Service
 */
export const ADMIN_WHATSAPP_NUMBER = '6285343973889';

export interface WhatsAppConsultationInfo {
  id?: string;
  title: string;
  category: 'learning' | 'private';
  studentName?: string;
}

/**
 * Generates an official WhatsApp link pre-populated with consultation details
 */
export function getWhatsAppConsultationUrl(info: WhatsAppConsultationInfo): string {
  const categoryLabel = info.category === 'private' ? 'Konsultasi Pribadi' : 'Materi & Pembelajaran';
  const nameLabel = info.studentName ? ` (a.n. ${info.studentName})` : '';
  
  const text = `Assalamu'alaikum Admin Dars with Osama,\n\nSaya ingin melanjutkan pembahasan konsultasi${nameLabel}:\n- *Kategori:* ${categoryLabel}\n- *Judul:* ${info.title}${info.id ? `\n- *ID Konsultasi:* ${info.id}` : ''}\n\nMohon Bimbingan & Arahan Ustaz/Admin. Jazakumullahu khairan.`;

  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
