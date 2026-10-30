import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Save,
  Eye,
  Edit,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  ExternalLink
} from 'lucide-react';
import {
  InstructorProfile,
  InstructorProfileSection,
  InstructorProfileImage
} from '../../types';
import {
  getInstructorProfile,
  saveInstructorProfile,
  uploadFileToStorage
} from '../../firebase/services';
import {
  getDefaultInstructorProfile,
  moveProfileSection,
  normalizeProfileSections,
  normalizeSupportingImages
} from '../../utils/instructorProfileHelper';
import { RichTextEditor } from './RichTextEditor';
import { InstructorProfileView } from '../profile/InstructorProfileView';
import { ConfirmModal } from '../common/ConfirmModal';
import { ResilientGoogleDriveImage } from '../common/ResilientGoogleDriveImage';
import { isGoogleDriveUrl, getGoogleDriveViewerUrl, resolveDisplayImageUrl } from '../../utils/googleDriveHelper';

interface AdminInstructorProfileManagerProps {
  onOpenPublicProfile?: () => void;
}

export const AdminInstructorProfileManager: React.FC<AdminInstructorProfileManagerProps> = ({
  onOpenPublicProfile
}) => {
  const [formData, setFormData] = useState<InstructorProfile>(() => getDefaultInstructorProfile());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [photoProgress, setPhotoProgress] = useState<number>(0);
  const [uploadingSupporting, setUploadingSupporting] = useState<boolean>(false);
  const [supportingProgress, setSupportingProgress] = useState<number>(0);
  const [newSupportingUrl, setNewSupportingUrl] = useState<string>('');
  const [newSupportingCaption, setNewSupportingCaption] = useState<string>('');

  const [editingSection, setEditingSection] = useState<InstructorProfileSection | null>(null);
  const [uploadingSectionImg, setUploadingSectionImg] = useState<boolean>(false);
  const [sectionImgProgress, setSectionImgProgress] = useState<number>(0);

  const [sectionToDelete, setSectionToDelete] = useState<InstructorProfileSection | null>(null);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const loaded = await getInstructorProfile();
      setFormData({
        ...loaded,
        sections: normalizeProfileSections(loaded.sections),
        supportingImages: normalizeSupportingImages(loaded.supportingImages)
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: 'Gagal memuat data profil pengajar: ' + (err.message || String(err))
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showFeedback('error', 'Harap pilih berkas gambar untuk foto profil (JPG, PNG, WebP).');
      if (e.target) e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFeedback('error', 'Ukuran berkas foto profil maksimal 5 MB.');
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    setPhotoProgress(10);
    try {
      const url = await uploadFileToStorage(file, 'instructor_profile', (pct) => {
        setPhotoProgress(pct);
      });
      setFormData(prev => ({ ...prev, photoUrl: url }));
      showFeedback('success', 'Foto profil berhasil diunggah. Klik "Simpan Perubahan Profil" untuk menyimpan permanen.');
    } catch (err: any) {
      showFeedback('error', 'Gagal mengunggah foto profil: ' + (err.message || String(err)));
    } finally {
      setUploadingPhoto(false);
      setPhotoProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveProfilePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
    showFeedback('success', 'Foto profil dihapus dari formulir. Klik "Simpan Perubahan Profil" untuk memperbarui.');
  };

  const handleAddSupportingImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showFeedback('error', 'Harap pilih berkas gambar pendukung yang valid.');
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingSupporting(true);
    setSupportingProgress(10);
    try {
      const url = await uploadFileToStorage(file, 'instructor_profile', (pct) => {
        setSupportingProgress(pct);
      });
      const newImg: InstructorProfileImage = {
        id: `img-${Date.now()}`,
        url,
        caption: newSupportingCaption.trim() || file.name.replace(/\.[^/.]+$/, ''),
        order: formData.supportingImages.length + 1
      };
      setFormData(prev => ({
        ...prev,
        supportingImages: [...prev.supportingImages, newImg]
      }));
      setNewSupportingCaption('');
      showFeedback('success', 'Gambar pendukung ditambahkan.');
    } catch (err: any) {
      showFeedback('error', 'Gagal mengunggah gambar pendukung: ' + (err.message || String(err)));
    } finally {
      setUploadingSupporting(false);
      setSupportingProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddSupportingImageByUrl = () => {
    const cleanUrl = newSupportingUrl.trim();
    if (!cleanUrl) return;
    const newImg: InstructorProfileImage = {
      id: `img-${Date.now()}`,
      url: cleanUrl,
      caption: newSupportingCaption.trim(),
      order: formData.supportingImages.length + 1
    };
    setFormData(prev => ({
      ...prev,
      supportingImages: [...prev.supportingImages, newImg]
    }));
    setNewSupportingUrl('');
    setNewSupportingCaption('');
    showFeedback('success', 'Gambar pendukung ditambahkan melalui URL.');
  };

  const handleReplaceSupportingImageFile = async (
    imgId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showFeedback('error', 'Harap pilih berkas gambar yang valid.');
      return;
    }
    setUploadingSupporting(true);
    try {
      const url = await uploadFileToStorage(file, 'instructor_profile');
      setFormData(prev => ({
        ...prev,
        supportingImages: prev.supportingImages.map(item =>
          item.id === imgId ? { ...item, url } : item
        )
      }));
      showFeedback('success', 'Gambar pendukung berhasil diganti.');
    } catch (err: any) {
      showFeedback('error', 'Gagal mengganti gambar: ' + (err.message || String(err)));
    } finally {
      setUploadingSupporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteSupportingImage = (imgId: string) => {
    setFormData(prev => ({
      ...prev,
      supportingImages: prev.supportingImages
        .filter(item => item.id !== imgId)
        .map((item, idx) => ({ ...item, order: idx + 1 }))
    }));
  };

  const handleOpenAddSection = () => {
    setEditingSection({
      id: `sec-${Date.now()}`,
      title: '',
      content: '',
      imageUrl: '',
      imageCaption: '',
      order: formData.sections.length + 1
    });
  };

  const handleOpenEditSection = (section: InstructorProfileSection) => {
    setEditingSection({ ...section });
  };

  const handleSaveSectionModal = () => {
    if (!editingSection) return;
    if (!editingSection.title.trim() && !editingSection.content.replace(/<[^>]*>/g, '').trim()) {
      showFeedback('error', 'Judul atau isi bagian konten tidak boleh kosong.');
      return;
    }

    setFormData(prev => {
      const exists = prev.sections.some(s => s.id === editingSection.id);
      const updated = exists
        ? prev.sections.map(s => (s.id === editingSection.id ? editingSection : s))
        : [...prev.sections, editingSection];
      return {
        ...prev,
        sections: normalizeProfileSections(updated)
      };
    });
    setEditingSection(null);
  };

  const handleSectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSection) return;

    if (!file.type.startsWith('image/')) {
      showFeedback('error', 'Harap pilih berkas gambar yang valid.');
      return;
    }

    setUploadingSectionImg(true);
    setSectionImgProgress(10);
    try {
      const url = await uploadFileToStorage(file, 'instructor_profile', (pct) => {
        setSectionImgProgress(pct);
      });
      setEditingSection(prev => (prev ? { ...prev, imageUrl: url } : null));
    } catch (err: any) {
      showFeedback('error', 'Gagal mengunggah gambar bagian: ' + (err.message || String(err)));
    } finally {
      setUploadingSectionImg(false);
      setSectionImgProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    setFormData(prev => ({
      ...prev,
      sections: moveProfileSection(prev.sections, sectionId, direction)
    }));
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    const targetId = sectionToDelete.id;
    setFormData(prev => ({
      ...prev,
      sections: prev.sections
        .filter(s => s.id !== targetId)
        .map((s, idx) => ({ ...s, order: idx + 1 }))
    }));
    setSectionToDelete(null);
    showFeedback('success', 'Bagian konten dihapus. Klik "Simpan Perubahan Profil" untuk memperbarui database.');
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving) return;

    if (!formData.name.trim()) {
      showFeedback('error', 'Nama pengajar wajib diisi.');
      return;
    }
    if (!formData.role.trim()) {
      showFeedback('error', 'Peran / jabatan pengajar wajib diisi.');
      return;
    }
    if (!formData.title.trim()) {
      showFeedback('error', 'Judul halaman profil wajib diisi.');
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const verifiedSaved = await saveInstructorProfile(formData);
      setFormData({
        ...verifiedSaved,
        sections: normalizeProfileSections(verifiedSaved.sections),
        supportingImages: normalizeSupportingImages(verifiedSaved.supportingImages)
      });
      showFeedback(
        'success',
        `Profil Pengajar "${verifiedSaved.name}" berhasil disimpan secara permanen ke Cloud Firestore.`
      );
    } catch (err: any) {
      let msg = err?.message || String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch {
        // use raw message
      }
      showFeedback('error', 'Gagal menyimpan profil pengajar: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="admin-instructor-profile-manager" className="space-y-6 animate-fade-in font-sans">
      {/* STATUS FEEDBACK BANNER */}
      {feedback && (
        <div
          data-testid="profile-admin-feedback"
          className={`p-4 rounded-md border-2 border-[#171717] shadow-[4px_4px_0px_#171717] text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[#D9AC45] text-[#171717]'
              : 'bg-[#F04438] text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 nb-card bg-white dark:bg-[#16263D] p-6">
        <div>
          <h2 className="text-lg font-extrabold font-serif-brand text-[#292D2B] dark:text-[#F1F4F8] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#123D32] dark:text-[#D6AD52]" />
            <span>Pengelolaan Halaman Profil Pengajar</span>
          </h2>
          <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] mt-1">
            Kelola identitas, foto profil, biografi, bagian konten dinamis, serta gambar pendukung untuk {formData.name || 'Osama Nur Samsil, S.H.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenPublicProfile && (
            <button
              type="button"
              onClick={onOpenPublicProfile}
              className="nb-btn nb-btn-secondary px-3.5 py-2.5 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#123D32] dark:text-[#D6AD52]" />
              <span>Buka Halaman Publik</span>
            </button>
          )}

          <button
            type="button"
            data-testid="profile-preview-toggle"
            onClick={() => setIsPreviewMode(prev => !prev)}
            className={`nb-btn px-4 py-2.5 text-xs ${
              isPreviewMode
                ? 'nb-btn-gold'
                : 'nb-btn-secondary'
            }`}
          >
            {isPreviewMode ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />}
            <span>{isPreviewMode ? 'Kembali ke Editor' : 'Pratinjau Sebelum Menyimpan'}</span>
          </button>

          <button
            type="button"
            data-testid="profile-save-btn"
            onClick={() => handleSaveProfile()}
            disabled={saving || loading}
            className="nb-btn nb-btn-primary px-5 py-2.5 text-xs disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#D6AD52]" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
          </button>
        </div>
      </div>

      {/* PREVIEW MODE */}
      {isPreviewMode ? (
        <div className="space-y-4">
          <div className="p-4 rounded-md bg-[#D6AD52] border-2 border-[#292D2B] shadow-[4px_4px_0px_#292D2B] flex flex-wrap items-center justify-between gap-3 text-xs text-[#292D2B] font-bold">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" />
              <span>
                Mode Pratinjau Sebelum Menyimpan — Menampilkan hasil akhir halaman Profil Pengajar sebagaimana dilihat pengunjung publik.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className="nb-btn nb-btn-secondary px-3 py-1.5 text-xs"
              >
                Lanjut Mengedit
              </button>
              <button
                type="button"
                onClick={() => handleSaveProfile()}
                disabled={saving}
                className="nb-btn nb-btn-primary px-3.5 py-1.5 text-xs"
              >
                {saving ? 'Menyimpan...' : 'Simpan Permanen Sekarang'}
              </button>
            </div>
          </div>

          <InstructorProfileView profileData={formData} isPreviewMode={true} />
        </div>
      ) : (
        /* EDIT FORM MODE */
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* 1. IDENTITAS UTAMA & FOTO PROFIL */}
          <div className="nb-card bg-white dark:bg-[#16263D] p-6 space-y-6">
            <h3 className="text-base font-extrabold font-serif-brand text-[#292D2B] dark:text-[#F1F4F8] border-b-2 border-[#292D2B]/20 dark:border-[#34465D] pb-3">
              1. Identitas Pengajar & Foto Profil
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Photo Upload & Preview Column */}
              <div className="p-4 bg-[#FAF7F0] dark:bg-[#243A56] rounded-lg border-2 border-[#292D2B] dark:border-[#34465D] flex flex-col items-center space-y-3">
                <div className="w-36 h-36 rounded-lg overflow-hidden bg-[#123D32] dark:bg-[#101B2D] text-[#D6AD52] border-2 border-[#292D2B] shadow-[4px_4px_0px_#292D2B] flex items-center justify-center relative">
                  {formData.photoUrl ? (
                    <img
                      data-testid="profile-photo-preview"
                      src={resolveDisplayImageUrl(formData.photoUrl)}
                      alt={formData.name || 'Foto Profil Pengasuh'}
                      className="w-full h-full object-cover object-top sm:object-center"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center select-none text-center">
                      <span className="font-serif-brand text-3xl font-extrabold">ON</span>
                      <span className="text-[9px] uppercase tracking-wider text-[#D6AD52]/80 mt-1 font-bold">Inisial Nama</span>
                    </div>
                  )}
                </div>

                <div className="w-full space-y-2 text-center">
                  <label className="nb-btn nb-btn-primary w-full px-3 py-2 text-xs justify-center cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#D6AD52]" />
                    <span>{formData.photoUrl ? 'Ganti Foto Profil' : 'Unggah Foto Profil'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      data-testid="profile-photo-file-input"
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {uploadingPhoto && (
                    <p className="text-[11px] text-[#123D32] dark:text-[#D6AD52] font-extrabold">
                      Mengunggah foto... {photoProgress}%
                    </p>
                  )}

                  {formData.photoUrl && (
                    <button
                      type="button"
                      data-testid="profile-photo-delete-btn"
                      onClick={handleRemoveProfilePhoto}
                      className="nb-btn nb-btn-danger w-full px-3 py-1.5 text-xs justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Foto (Gunakan Inisial)</span>
                    </button>
                  )}
                </div>

                <div className="w-full pt-2 border-t-2 border-[#292D2B]/20 dark:border-[#34465D] space-y-2 text-left">
                  <label className="text-[11px] font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block">
                    URL Foto Profil (Opsional):
                  </label>
                  <input
                    type="url"
                    data-testid="profile-photo-url-input"
                    value={formData.photoUrl || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, photoUrl: e.target.value }))}
                    placeholder="https://..."
                    className="nb-input w-full px-3 py-1.5 text-xs"
                  />

                  <label className="text-[11px] font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block">
                    Keterangan Foto (Caption):
                  </label>
                  <input
                    type="text"
                    value={formData.photoCaption || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, photoCaption: e.target.value }))}
                    placeholder="Osama Nur Samsil, S.H."
                    className="nb-input w-full px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Main Identity Fields Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                      Nama Lengkap & Gelar Pengajar *
                    </label>
                    <input
                      type="text"
                      data-testid="profile-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Osama Nur Samsil, S.H."
                      className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                      Peran / Amanah Pengajar *
                    </label>
                    <input
                      type="text"
                      data-testid="profile-role-input"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="Pembuat & Pengajar Dars with Osama"
                      className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                    Judul Halaman Profil *
                  </label>
                  <input
                    type="text"
                    data-testid="profile-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Profil Pengajar Dars with Osama"
                    className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                    Biografi Singkat (Tampil di Kartu Utama Atas)
                  </label>
                  <RichTextEditor
                    value={formData.biography}
                    onChange={(html) => setFormData(prev => ({ ...prev, biography: html }))}
                    placeholder="Tuliskan biografi singkat pengajar..."
                    minHeight="160px"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. ISI TULISAN UTAMA */}
          <div className="nb-card bg-white dark:bg-[#16263D] p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold font-serif-brand text-[#292D2B] dark:text-[#F1F4F8]">
                2. Isi Tulisan Utama Profil
              </h3>
              <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] mt-0.5">
                Mendukung Heading 1–3, Paragraf Normal, Rata Kiri/Tengah/Kanan/Justify, Daftar Poin/Angka, Hyperlink Otomatis, dan Gambar.
              </p>
            </div>

            <RichTextEditor
              value={formData.mainContent}
              onChange={(html) => setFormData(prev => ({ ...prev, mainContent: html }))}
              placeholder="Tuliskan isi tulisan profil pengajar secara lengkap di sini..."
              minHeight="280px"
            />
          </div>

          {/* 3. BAGIAN KONTEN DINAMIS */}
          <div className="nb-card bg-white dark:bg-[#16263D] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#292D2B]/20 dark:border-[#34465D] pb-3">
              <div>
                <h3 className="text-base font-extrabold font-serif-brand text-[#292D2B] dark:text-[#F1F4F8] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
                  <span>3. Bagian Konten Dinamis ({formData.sections.length})</span>
                </h3>
                <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] mt-0.5">
                  Tambah, edit, hapus, dan atur urutan bagian konten khusus (misal: Latar Belakang Keilmuan, Metode Pengajaran, Karya/Kajian, dsb.).
                </p>
              </div>

              <button
                type="button"
                data-testid="profile-add-section-btn"
                onClick={handleOpenAddSection}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs shrink-0"
              >
                <Plus className="w-4 h-4 text-[#D6AD52]" />
                <span>+ Tambah Bagian Konten</span>
              </button>
            </div>

            {formData.sections.length === 0 ? (
              <div className="p-8 text-center rounded-md border-2 border-dashed border-[#292D2B]/40 text-xs text-[#626A66] dark:text-[#B4C0D0]">
                Belum ada bagian konten tambahan. Klik <strong>"+ Tambah Bagian Konten"</strong> untuk menambahkan bagian baru sesuai kebutuhan admin.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    data-testid={`admin-profile-section-item-${idx}`}
                    className="p-4 rounded-md bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#34465D] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-md bg-[#123D32] text-[#D6AD52] border-2 border-[#292D2B] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <h4 className="font-extrabold text-[#292D2B] dark:text-[#F1F4F8] text-xs sm:text-sm truncate">
                          {sec.title || `Bagian #${idx + 1}`}
                        </h4>
                        <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] line-clamp-2">
                          {sec.content.replace(/<[^>]*>/g, ' ').trim() || '(Tanpa teks)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        data-testid={`section-move-up-${idx}`}
                        disabled={idx === 0}
                        onClick={() => handleMoveSection(sec.id, 'up')}
                        className="nb-btn nb-btn-secondary p-1.5 disabled:opacity-40"
                        title="Geser Naik"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`section-move-down-${idx}`}
                        disabled={idx === formData.sections.length - 1}
                        onClick={() => handleMoveSection(sec.id, 'down')}
                        className="nb-btn nb-btn-secondary p-1.5 disabled:opacity-40"
                        title="Geser Turun"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`section-edit-${idx}`}
                        onClick={() => handleOpenEditSection(sec)}
                        className="nb-btn nb-btn-gold px-2.5 py-1.5 text-xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`section-delete-${idx}`}
                        onClick={() => setSectionToDelete(sec)}
                        className="nb-btn nb-btn-danger p-1.5"
                        title="Hapus Bagian"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. GAMBAR PENDUKUNG */}
          <div className="nb-card bg-white dark:bg-[#16263D] p-6 space-y-5">
            <div className="border-b-2 border-[#292D2B]/20 dark:border-[#34465D] pb-3">
              <h3 className="text-base font-extrabold font-serif-brand text-[#292D2B] dark:text-[#F1F4F8] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#123D32] dark:text-[#D6AD52]" />
                <span>4. Gambar Pendukung Profil ({formData.supportingImages.length})</span>
              </h3>
              <p className="text-xs text-[#626A66] dark:text-[#B4C0D0] mt-0.5">
                Unggah, ganti, atau hapus gambar pendukung/dokumentasi untuk ditampilkan pada halaman profil.
              </p>
            </div>

            {/* Add New Supporting Image Controls */}
            <div className="p-4 rounded-lg bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#34465D] grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                  Keterangan Gambar Baru (Caption)
                </label>
                <input
                  type="text"
                  data-testid="supporting-img-caption-input"
                  value={newSupportingCaption}
                  onChange={(e) => setNewSupportingCaption(e.target.value)}
                  placeholder="Contoh: Kegiatan Majelis Ilmu"
                  className="nb-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                  Masukkan URL Gambar Pendukung
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    data-testid="supporting-img-url-input"
                    value={newSupportingUrl}
                    onChange={(e) => setNewSupportingUrl(e.target.value)}
                    placeholder="https://..."
                    className="nb-input flex-1 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    data-testid="supporting-img-add-url-btn"
                    onClick={handleAddSupportingImageByUrl}
                    disabled={!newSupportingUrl.trim()}
                    className="nb-btn nb-btn-gold px-3 py-2 text-xs disabled:opacity-40 shrink-0"
                  >
                    + URL
                  </button>
                </div>
                {isGoogleDriveUrl(newSupportingUrl) && (
                  <p className="text-[10px] text-[#123D32] dark:text-[#D6AD52] font-bold mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-[#123D32] dark:text-[#D6AD52]" />
                    <span>Tautan Google Drive terdeteksi. Sistem akan mengonversi ke format gambar langsung.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="nb-btn nb-btn-primary w-full px-4 py-2 text-xs justify-center">
                  <Upload className="w-3.5 h-3.5 text-[#D6AD52]" />
                  <span>{uploadingSupporting ? `Mengunggah ${supportingProgress}%...` : 'Unggah Berkas Gambar'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    data-testid="supporting-img-file-input"
                    onChange={handleAddSupportingImageFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Existing Supporting Images List */}
            {formData.supportingImages.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {formData.supportingImages.map((img, idx) => (
                  <div
                    key={img.id}
                    data-testid={`supporting-img-card-${idx}`}
                    className="rounded-lg border-2 border-[#292D2B] dark:border-[#34465D] bg-[#FAF7F0] dark:bg-[#243A56] overflow-hidden flex flex-col justify-between shadow-[3px_3px_0px_#292D2B] dark:shadow-[3px_3px_0px_#34465D]"
                  >
                    <div className="aspect-video w-full bg-white dark:bg-[#16263D] overflow-hidden border-b-2 border-[#292D2B] dark:border-[#34465D]">
                      <ResilientGoogleDriveImage
                        src={img.url}
                        alt={img.caption || 'Pendukung'}
                        isAdmin={true}
                        showAdminDiagnostic={true}
                        aspectRatioClass="aspect-video"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            supportingImages: prev.supportingImages.map(item =>
                              item.id === img.id ? { ...item, caption: val } : item
                            )
                          }));
                        }}
                        placeholder="Keterangan gambar..."
                        className="nb-input w-full px-2.5 py-1.5 text-xs"
                      />

                      {isGoogleDriveUrl(img.url) && (
                        <div className="flex items-center justify-between text-[10px] text-[#626A66] dark:text-[#B4C0D0] pt-0.5">
                          <span className="font-extrabold text-[#123D32] dark:text-[#D6AD52]">Google Drive</span>
                          <a
                            href={getGoogleDriveViewerUrl(img.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline text-[#243A56] dark:text-[#D6AD52] font-bold"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Buka Link Asli</span>
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <label className="nb-btn nb-btn-secondary flex-1 text-center py-1.5 px-2 text-[11px] justify-center">
                          Ganti Gambar
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReplaceSupportingImageFile(img.id, e)}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          data-testid={`supporting-img-delete-${idx}`}
                          onClick={() => handleDeleteSupportingImage(img.id)}
                          className="nb-btn nb-btn-danger py-1.5 px-2.5 text-[11px]"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      )}

      {/* SECTION ADD / EDIT MODAL */}
      {editingSection && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="nb-card bg-white dark:bg-[#16263D] w-full max-w-3xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b-2 border-[#292D2B] dark:border-[#34465D] bg-[#123D32] dark:bg-[#243A56] text-[#F1F4F8] flex items-center justify-between">
              <h3 className="font-extrabold font-serif-brand text-[#F1F4F8] text-base">
                {formData.sections.some(s => s.id === editingSection.id)
                  ? 'Edit Bagian Konten Profil'
                  : 'Tambah Bagian Konten Profil Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="nb-btn nb-btn-secondary p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                  Judul Bagian Konten *
                </label>
                <input
                  type="text"
                  data-testid="section-modal-title-input"
                  value={editingSection.title}
                  onChange={(e) => setEditingSection(prev => (prev ? { ...prev, title: e.target.value } : null))}
                  placeholder="Contoh: Fokus Kajian & Metode Pembelajaran"
                  className="nb-input w-full px-3.5 py-2.5 text-xs font-semibold"
                />
              </div>

              <div className="p-4 rounded-lg bg-[#FAF7F0] dark:bg-[#243A56] border-2 border-[#292D2B] dark:border-[#34465D] space-y-3">
                <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block">
                  Gambar Bagian Konten (Opsional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSectionImageUpload}
                      className="w-full text-xs text-[#292D2B] dark:text-[#F1F4F8] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-2 file:border-[#292D2B] file:text-xs file:font-extrabold file:bg-[#D6AD52] file:text-[#292D2B] cursor-pointer"
                    />
                    {uploadingSectionImg && (
                      <p className="text-[11px] font-bold text-[#123D32] dark:text-[#D6AD52]">Mengunggah... {sectionImgProgress}%</p>
                    )}
                    <input
                      type="url"
                      value={editingSection.imageUrl || ''}
                      onChange={(e) => setEditingSection(prev => (prev ? { ...prev, imageUrl: e.target.value } : null))}
                      placeholder="Atau tempel URL gambar..."
                      className="nb-input w-full px-3 py-1.5 text-xs"
                    />
                    {isGoogleDriveUrl(editingSection.imageUrl) && (
                      <p className="text-[10px] text-[#123D32] dark:text-[#D6AD52] font-bold">
                        ✓ Tautan Google Drive terdeteksi.
                      </p>
                    )}
                    <input
                      type="text"
                      value={editingSection.imageCaption || ''}
                      onChange={(e) => setEditingSection(prev => (prev ? { ...prev, imageCaption: e.target.value } : null))}
                      placeholder="Keterangan gambar..."
                      className="nb-input w-full px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div className="aspect-video rounded-md bg-white dark:bg-[#16263D] overflow-hidden flex items-center justify-center relative border-2 border-[#292D2B] dark:border-[#34465D]">
                    {editingSection.imageUrl ? (
                      <>
                        <ResilientGoogleDriveImage
                          src={editingSection.imageUrl}
                          alt="Bagian"
                          aspectRatioClass="w-full h-full"
                          isAdmin={true}
                          showAdminDiagnostic={true}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingSection(prev => (prev ? { ...prev, imageUrl: '' } : null))}
                          className="absolute top-2 right-2 nb-btn nb-btn-danger px-2 py-1 text-[10px]"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <span className="text-[#626A66] dark:text-[#B4C0D0] text-xs font-bold">Tanpa Gambar</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#292D2B] dark:text-[#F1F4F8] block mb-1">
                  Isi Konten Bagian *
                </label>
                <RichTextEditor
                  value={editingSection.content}
                  onChange={(html) => setEditingSection(prev => (prev ? { ...prev, content: html } : null))}
                  placeholder="Tuliskan isi bagian ini..."
                  minHeight="240px"
                />
              </div>
            </div>

            <div className="p-4 border-t-2 border-[#292D2B] dark:border-[#34465D] bg-[#FAF7F0] dark:bg-[#243A56] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="nb-btn nb-btn-secondary px-4 py-2 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="section-modal-save-btn"
                onClick={handleSaveSectionModal}
                className="nb-btn nb-btn-primary px-5 py-2 text-xs"
              >
                Terapkan Bagian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SECTION MODAL */}
      <ConfirmModal
        isOpen={!!sectionToDelete}
        onClose={() => setSectionToDelete(null)}
        onConfirm={handleConfirmDeleteSection}
        title="Hapus Bagian Konten Profil"
        itemName={sectionToDelete?.title || 'Bagian Konten'}
        message="Apakah Anda yakin ingin menghapus bagian konten ini dari halaman Profil Pengajar?"
        confirmText="Hapus Bagian"
        cancelText="Batal"
        isDangerous={true}
      />
    </div>
  );
};
