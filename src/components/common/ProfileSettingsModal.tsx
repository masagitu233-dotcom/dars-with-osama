import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Camera,
  Upload,
  Key,
  Shield,
  Award,
  Check,
  AlertCircle,
  Save,
  Copy,
  Sparkles
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

    // Validate format: JPG, JPEG, PNG, WebP
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
      showStatus('error', 'Format berkas tidak didukung. Harap pilih gambar berformat JPG, JPEG, PNG, atau WebP.');
      if (e.target) e.target.value = '';
      return;
    }

    // Validate size: max 10MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showStatus('error', 'Ukuran berkas terlalu besar. Maksimal ukuran gambar adalah 10MB.');
      if (e.target) e.target.value = '';
      return;
    }

    // Instant local preview before save
    const tempPreview = URL.createObjectURL(file);
    const oldPhotoURL = photoURL;
    setPhotoURL(tempPreview);

    setUploading(true);
    setUploadProgress(0);
    setStatusMessage(null);

    try {
      // Compress image first to ensure lightweight upload and stay well within Firestore 1MB doc limits
      const compressedFile = await compressImageFile(file, 400, 400, 0.82);
      const url = await uploadFileToStorage(compressedFile, 'avatars', (pct) => {
        setUploadProgress(pct);
      });

      setPhotoURL(url);

      // Auto save photoURL directly to profile so changes are saved immediately in Firestore & Firebase Auth
      await updateUserProfile({ photoURL: url });
      showStatus('success', 'Foto profil dari komputer Anda berhasil diunggah dan disimpan!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      // Revert preview to old photo on failure
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/70 dark:bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl my-auto text-stone-900 dark:text-stone-100 overflow-hidden animate-modal-in flex flex-col max-h-[92vh]">
        {/* Header Banner */}
        <div className="relative p-6 bg-gradient-to-r from-stone-50 via-stone-100 to-stone-50 dark:from-stone-900 dark:via-stone-850 dark:to-stone-900 border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-700 dark:bg-emerald-800 border-2 border-emerald-500/50 flex items-center justify-center font-bold text-2xl text-white uppercase overflow-hidden shadow-lg">
                {photoURL ? (
                  <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  (displayName || user.email || 'P')[0]
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">{displayName || 'Penuntut Ilmu'}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isAdmin ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                }`}>
                  {isAdmin ? 'Administrator' : 'Peserta Tholabul Ilmi'}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{user.email}</p>
              {kunyah && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-amiri mt-0.5">{kunyah}</p>}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/50 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Informasi Diri</span>
          </button>

          <button
            onClick={() => setActiveTab('avatar')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer ${
              activeTab === 'avatar'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Foto & Avatar</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Akun & Keamanan</span>
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-fade-in-up shadow">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className={statusMessage.type === 'success' ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}>
              {statusMessage.text}
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Nama Lengkap *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-stone-400 dark:text-stone-500" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Contoh: Abdullah bin Ahmad"
                      className="w-full pl-9 pr-4 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Kunyah / Nama Gelaran Arab</label>
                  <input
                    type="text"
                    value={kunyah}
                    onChange={(e) => setKunyah(e.target.value)}
                    placeholder="Contoh: أبو عبد الله (Abu Abdillah)"
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-amiri"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Nomor WhatsApp / Telepon</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-stone-400 dark:text-stone-500" />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="081234567890"
                      className="w-full pl-9 pr-4 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Kota / Domisili</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-stone-400 dark:text-stone-500" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Jakarta / Madinah"
                      className="w-full pl-9 pr-4 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Catatan Pembelajaran / Bio Singkat</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tuliskan motivasi belajar atau fokus kajian ilmu syar'i Anda..."
                  className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">Unggah Foto Profil Khusus</h4>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
                  <div className="w-20 h-20 rounded-2xl bg-stone-200 dark:bg-stone-800 border-2 border-emerald-500/40 overflow-hidden shrink-0 flex items-center justify-center font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                    {photoURL ? (
                      <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      (displayName || 'P')[0]
                    )}
                  </div>
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <p className="text-xs text-stone-600 dark:text-stone-300">Pilih berkas foto (JPG, JPEG, PNG, WebP, maks 10MB) dari perangkat Anda.</p>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className={`inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold cursor-pointer border border-stone-300 dark:border-stone-700 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                        <div className="w-full sm:w-36 bg-stone-200 dark:bg-stone-800 rounded-full h-2 overflow-hidden border border-stone-300 dark:border-stone-700">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">Atau Pilih Avatar Pembelajaran Islami</h4>
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
                      className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        photoURL === item.url
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      <img src={item.url} alt={item.label} className="w-14 h-14 rounded-xl object-cover" />
                      <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
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
              <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">Detail Akun Firebase</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-stone-200 dark:border-stone-900">
                    <span className="text-stone-500 dark:text-stone-400">Email Terdaftar</span>
                    <span className="font-semibold text-stone-900 dark:text-white">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-200 dark:border-stone-900">
                    <span className="text-stone-500 dark:text-stone-400">User ID (UID)</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-stone-700 dark:text-stone-300 max-w-[140px] truncate">{user.uid}</span>
                      <button
                        onClick={copyUidToClipboard}
                        className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition"
                        title="Salin UID"
                      >
                        {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-200 dark:border-stone-900">
                    <span className="text-stone-500 dark:text-stone-400">Peran Sistem</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{isAdmin ? 'Administrator' : 'Peserta'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-stone-500 dark:text-stone-400">Terdaftar Sejak</span>
                    <span className="text-stone-700 dark:text-stone-300">
                      {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('id-ID') : 'Baru saja'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">Kata Sandi & Keamanan</h4>
                <p className="text-stone-500 dark:text-stone-400 text-xs">
                  Aplikasi menggunakan autentikasi terenkripsi Firebase Auth. Klik tombol di bawah ini untuk menerima tautan pemulihan kata sandi ke alamat email Anda.
                </p>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  className="px-4 py-2 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-stone-300 dark:border-stone-700 transition"
                >
                  <Key className="w-4 h-4 text-amber-500 dark:text-amber-400" />
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
