import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Camera,
  Upload,
  Key,
  Shield,
  Check,
  AlertCircle,
  Save,
  Copy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadFileToStorage } from '../../firebase/services';

const PRESET_AVATARS = [
  { id: 'peci', label: 'Penuntut Ilmu', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80' },
  { id: 'kitab', label: 'Pecinta Kitab', url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=200&auto=format&fit=crop&q=80' },
  { id: 'masjid', label: 'Kubah Mesjid', url: 'https://images.unsplash.com/photo-1590076175571-4b5459efb08c?w=200&auto=format&fit=crop&q=80' },
  { id: 'kaligrafi', label: 'Kaligrafi Islami', url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=200&auto=format&fit=crop&q=80' },
];

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, updateUserProfile, resetPassword, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'security'>('profile');
  const [displayName, setDisplayName] = useState('');
  const [kunyah, setKunyah] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
      setKunyah(userProfile.kunyah || '');
      setBio(userProfile.bio || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setLocation(userProfile.location || '');
      setPhotoURL(userProfile.photoURL || user?.photoURL || '');
    }
  }, [userProfile, user, isOpen]);

  if (!isOpen || !user) return null;

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      await updateUserProfile({
        displayName,
        kunyah,
        bio,
        phoneNumber,
        location,
        photoURL
      });
      showStatus('success', 'Profil Anda berhasil diperbarui di Cloud Firestore.');
    } catch (err: any) {
      showStatus('error', 'Gagal memperbarui profil: ' + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const compressImageFile = (file: File, maxWidth = 400, maxHeight = 400, quality = 0.82): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressed);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
      showStatus('error', 'Format berkas tidak didukung. Harap pilih gambar berformat JPG, JPEG, PNG, atau WebP.');
      if (e.target) e.target.value = '';
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showStatus('error', 'Ukuran berkas terlalu besar. Maksimal ukuran gambar adalah 10MB.');
      if (e.target) e.target.value = '';
      return;
    }

    const tempPreview = URL.createObjectURL(file);
    const oldPhotoURL = photoURL;
    setPhotoURL(tempPreview);

    setUploading(true);
    setUploadProgress(0);
    setStatusMessage(null);

    try {
      const compressedFile = await compressImageFile(file, 400, 400, 0.82);
      const url = await uploadFileToStorage(compressedFile, 'avatars', (pct) => {
        setUploadProgress(pct);
      });

      setPhotoURL(url);
      await updateUserProfile({ photoURL: url });
      showStatus('success', 'Foto profil dari komputer Anda berhasil diunggah dan disimpan!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setPhotoURL(oldPhotoURL);
      showStatus('error', 'Gagal mengunggah foto profil: ' + (err.message || String(err)));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleSendResetEmail = async () => {
    if (!user.email) return;
    try {
      await resetPassword(user.email);
      showStatus('success', `Tautan pemulihan kata sandi telah dikirim ke ${user.email}.`);
    } catch (err: any) {
      showStatus('error', 'Gagal mengirim email riset kata sandi: ' + err.message);
    }
  };

  const copyUidToClipboard = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#F8F3E8] dark:bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] rounded-lg shadow-[6px_6px_0px_#171717] dark:shadow-[6px_6px_0px_#000000] my-auto text-[#171717] dark:text-[#F8F3E8] overflow-hidden animate-modal-in flex flex-col max-h-[92vh]">
        {/* Header Banner */}
        <div className="relative p-5 sm:p-6 bg-[#06251D] text-white border-b-2 border-[#171717] dark:border-[#D9AC45]/60">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-[#0B3026] text-[#F8F3E8] hover:bg-[#D9AC45] hover:text-[#171717] border-2 border-[#D9AC45]/60 rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-md bg-[#0B3026] border-2 border-[#D9AC45] flex items-center justify-center font-bold text-2xl text-[#D9AC45] uppercase overflow-hidden shadow-[3px_3px_0px_#000000]">
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                (displayName || user.email || 'P')[0]
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-serif text-white">{displayName || 'Penuntut Ilmu'}</h2>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  isAdmin
                    ? 'bg-[#D9AC45] text-[#171717] border-[#171717]'
                    : 'bg-[#0B3026] text-[#D9AC45] border-[#D9AC45]'
                }`}>
                  {isAdmin ? 'Administrator' : 'Peserta Tholabul Ilmi'}
                </span>
              </div>
              <p className="text-xs text-[#F8F3E8]/80 mt-0.5">{user.email}</p>
              {kunyah && <p className="text-xs text-[#D9AC45] font-amiri mt-0.5">{kunyah}</p>}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b-2 border-[#171717] dark:border-[#D9AC45]/50 bg-white dark:bg-[#06251D] px-4 sm:px-6 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-4 -mb-[2px] flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-[#06251D] dark:border-[#D9AC45] text-[#06251D] dark:text-[#D9AC45]'
                : 'border-transparent text-[#171717]/60 dark:text-[#F8F3E8]/60 hover:text-[#171717] dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Informasi Diri</span>
          </button>

          <button
            onClick={() => setActiveTab('avatar')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-4 -mb-[2px] flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'avatar'
                ? 'border-[#06251D] dark:border-[#D9AC45] text-[#06251D] dark:text-[#D9AC45]'
                : 'border-transparent text-[#171717]/60 dark:text-[#F8F3E8]/60 hover:text-[#171717] dark:hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Foto & Avatar</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border-b-4 -mb-[2px] flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-[#06251D] dark:border-[#D9AC45] text-[#06251D] dark:text-[#D9AC45]'
                : 'border-transparent text-[#171717]/60 dark:text-[#F8F3E8]/60 hover:text-[#171717] dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Akun & Keamanan</span>
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`mx-6 mt-4 p-3.5 rounded-md border-2 text-xs font-bold flex items-center gap-2.5 shadow-[3px_3px_0px_#171717] ${
            statusMessage.type === 'success'
              ? 'bg-[#06251D] text-[#F8F3E8] border-[#D9AC45]'
              : 'bg-[#F04438]/15 text-[#171717] dark:text-white border-[#F04438]'
          }`}>
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-[#D9AC45] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#F04438] shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">Nama Lengkap *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-[#171717]/60 dark:text-[#D9AC45]" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Contoh: Abdullah bin Ahmad"
                      className="nb-input pl-9 pr-4 py-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">Kunyah / Nama Gelaran Arab</label>
                  <input
                    type="text"
                    value={kunyah}
                    onChange={(e) => setKunyah(e.target.value)}
                    placeholder="Contoh: أبو عبد الله (Abu Abdillah)"
                    className="nb-input px-3.5 py-2.5 font-amiri"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">Nomor WhatsApp / Telepon</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-[#171717]/60 dark:text-[#D9AC45]" />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="081234567890"
                      className="nb-input pl-9 pr-4 py-2.5 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">Kota / Domisili</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#171717]/60 dark:text-[#D9AC45]" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Jakarta / Madinah"
                      className="nb-input pl-9 pr-4 py-2.5"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-1.5">Catatan Pembelajaran / Bio Singkat</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tuliskan motivasi belajar atau fokus kajian ilmu syar'i Anda..."
                  className="nb-input p-3"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="nb-btn nb-btn-gold px-6 py-2.5 text-xs sm:text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: AVATAR & FOTO */}
          {activeTab === 'avatar' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-3">Unggah Foto Profil Khusus</h4>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#06251D] p-4 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 shadow-[3px_3px_0px_#171717]">
                  <div className="w-20 h-20 rounded-md bg-[#0B3026] border-2 border-[#171717] dark:border-[#D9AC45] overflow-hidden shrink-0 flex items-center justify-center font-bold text-2xl text-[#D9AC45]">
                    {photoURL ? (
                      <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      (displayName || 'P')[0]
                    )}
                  </div>
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <p className="text-xs text-[#171717]/80 dark:text-[#F8F3E8]/80">Pilih berkas foto (JPG, JPEG, PNG, WebP, maks 10MB) dari perangkat Anda.</p>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className={`nb-btn nb-btn-secondary px-4 py-2 text-xs cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload className="w-4 h-4 text-[#06251D] dark:text-[#D9AC45]" />
                        <span>{uploading ? `Mengunggah... ${uploadProgress}%` : 'Pilih Berkas Foto'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          disabled={uploading}
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                      {uploading && (
                        <div className="w-full sm:w-36 bg-[#F8F3E8] dark:bg-[#0B3026] rounded h-2.5 overflow-hidden border border-[#171717]">
                          <div
                            className="bg-[#D9AC45] h-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717] dark:text-[#D9AC45] mb-3">Atau Pilih Avatar Pembelajaran Islami</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={async () => {
                        setPhotoURL(item.url);
                        try {
                          await updateUserProfile({ photoURL: item.url });
                          showStatus('success', `Avatar ${item.label} dipilih dan disimpan.`);
                        } catch (err: any) {
                          showStatus('error', 'Gagal menyimpan avatar: ' + (err.message || String(err)));
                        }
                      }}
                      className={`p-3 rounded-md border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        photoURL === item.url
                          ? 'bg-[#D9AC45]/20 border-[#171717] dark:border-[#D9AC45] shadow-[3px_3px_0px_#171717]'
                          : 'bg-white dark:bg-[#06251D] border-[#171717]/40 dark:border-[#D9AC45]/40 hover:border-[#171717]'
                      }`}
                    >
                      <img src={item.url} alt={item.label} className="w-14 h-14 rounded-md object-cover border border-[#171717]" />
                      <span className="text-[11px] font-bold text-[#171717] dark:text-[#F8F3E8]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="nb-btn nb-btn-gold px-6 py-2.5 text-xs sm:text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Foto Profil'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AKUN & KEAMANAN */}
          {activeTab === 'security' && (
            <div className="space-y-6 text-xs sm:text-sm">
              <div className="bg-white dark:bg-[#06251D] p-4 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 shadow-[3px_3px_0px_#171717] space-y-3">
                <h4 className="text-xs font-bold text-[#06251D] dark:text-[#D9AC45] uppercase tracking-wider">Detail Akun Firebase</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#171717]/15 dark:border-[#D9AC45]/20">
                    <span className="text-[#171717]/70 dark:text-[#F8F3E8]/70">Email Terdaftar</span>
                    <span className="font-bold text-[#171717] dark:text-white">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#171717]/15 dark:border-[#D9AC45]/20">
                    <span className="text-[#171717]/70 dark:text-[#F8F3E8]/70">User ID (UID)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#171717] dark:text-[#D9AC45] max-w-[140px] truncate">{user.uid}</span>
                      <button
                        onClick={copyUidToClipboard}
                        className="p-1 bg-[#F8F3E8] dark:bg-[#0B3026] border border-[#171717] dark:border-[#D9AC45] rounded text-[#171717] dark:text-[#D9AC45] cursor-pointer"
                        title="Salin UID"
                      >
                        {copiedUid ? <Check className="w-3.5 h-3.5 text-[#06251D] dark:text-[#D9AC45]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#171717]/15 dark:border-[#D9AC45]/20">
                    <span className="text-[#171717]/70 dark:text-[#F8F3E8]/70">Peran Sistem</span>
                    <span className="font-bold text-[#06251D] dark:text-[#D9AC45]">{isAdmin ? 'Administrator' : 'Peserta'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#171717]/70 dark:text-[#F8F3E8]/70">Terdaftar Sejak</span>
                    <span className="font-medium text-[#171717] dark:text-[#F8F3E8]">
                      {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('id-ID') : 'Baru saja'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#06251D] p-4 rounded-md border-2 border-[#171717] dark:border-[#D9AC45]/60 shadow-[3px_3px_0px_#171717] space-y-3">
                <h4 className="text-xs font-bold text-[#06251D] dark:text-[#D9AC45] uppercase tracking-wider">Kata Sandi & Keamanan</h4>
                <p className="text-[#171717]/80 dark:text-[#F8F3E8]/80 text-xs leading-relaxed">
                  Aplikasi menggunakan autentikasi terenkripsi Firebase Auth. Klik tombol di bawah ini untuk menerima tautan pemulihan kata sandi ke alamat email Anda.
                </p>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  className="nb-btn nb-btn-secondary px-4 py-2.5 text-xs"
                >
                  <Key className="w-4 h-4 text-[#D9AC45]" />
                  <span>Kirim Tautan Riset Kata Sandi ke Email</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
