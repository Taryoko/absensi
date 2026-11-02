import React, { useState } from 'react';
import {
  Smartphone,
  Camera,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  Lock,
  UserCheck,
  Clock,
} from 'lucide-react';
import { DeviceService } from '../services/deviceService';
import { FaceBiometricService } from '../services/faceBiometricService';
import { AttendanceCamera } from './AttendanceCamera';
import { localDB } from '../services/store';
import { AuditService } from '../services/auditService';
import { Profile, FaceDetectionResult } from '../types';

interface BiometricEnrollmentModalProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProfile: Profile) => void;
}

export const BiometricEnrollmentModal: React.FC<BiometricEnrollmentModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'device' | 'face'>('device');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentDeviceInfo = DeviceService.getCurrentDeviceInfo();
  const deviceCheck = DeviceService.verifyDevice(user);
  const isApproved = deviceCheck.status === 'APPROVED';
  const isPending = deviceCheck.status === 'PENDING';
  const isRejected = deviceCheck.status === 'REJECTED';

  if (!isOpen) return null;

  // Handle Device Registration Request
  const handleRegisterDevice = async () => {
    setIsProcessing(true);
    await DeviceService.requestDeviceRegistration(user, currentDeviceInfo);

    setSuccessMessage('Pengajuan pendaftaran perangkat berhasil dikirim! Menunggu persetujuan (approval) dari Administrator.');
    setIsProcessing(false);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Handle Master Face Capture
  const handleFaceCaptured = async (
    canvas: HTMLCanvasElement,
    faceResult: FaceDetectionResult
  ) => {
    if (!faceResult.singleFace) return;
    setIsProcessing(true);

    try {
      const enrollment = await FaceBiometricService.enrollMasterFace(canvas, user);
      const updated: Profile = {
        ...user,
        registered_face_url: enrollment.masterFaceUrl,
        registered_face_hash: enrollment.faceHash,
        face_registered_at: enrollment.enrolledAt,
        biometric_enrolled: true,
        foto_profil: enrollment.masterFaceUrl, // Update avatar with master photo
        updated_at: new Date().toISOString(),
      };

      localDB.saveProfile(updated);
      await AuditService.logActivity(
        user,
        'REGISTRASI_WAJAH_MASTER',
        `Pendaftaran biometrik foto wajah master berhasil (Hash: ${enrollment.faceHash.slice(0, 10)}...)`
      );

      setSuccessMessage('Foto wajah master biometrik berhasil disimpan!');
      onSuccess(updated);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Gagal meregistrasi foto wajah master.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                Pusat Registrasi Biometrik & Perangkat
              </h3>
              <p className="text-[11px] text-slate-500">
                Keamanan Anti-Joki: Kunci Perangkat Fisik & Rekam Wajah Master
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
          <button
            onClick={() => setActiveTab('device')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'device'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Pendaftaran Perangkat</span>
            {isApproved && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
            )}
            {isPending && (
              <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('face')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'face'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>2. Foto Wajah Master</span>
            {user.biometric_enrolled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
            )}
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: DEVICE BINDING */}
          {activeTab === 'device' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Informasi HP / Perangkat Ini
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Sistem Deteksi Otomatis
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nama Perangkat:</span>
                    <span className="font-semibold text-slate-800">{currentDeviceInfo.deviceName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Sistem Operasi:</span>
                    <span className="font-semibold text-slate-800">{currentDeviceInfo.platform}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Resolusi Layar:</span>
                    <span className="font-mono text-slate-800">{currentDeviceInfo.screenResolution}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Hardware Fingerprint ID:</span>
                    <span className="font-mono font-bold text-blue-600">{currentDeviceInfo.deviceId}</span>
                  </div>
                </div>
              </div>

              {/* Status Comparison */}
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                  isApproved
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : isPending
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : isRejected
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {isApproved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : isPending ? (
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : isRejected ? (
                  <X className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {isApproved
                      ? 'Perangkat Terverifikasi & Disetujui Admin!'
                      : isPending
                      ? 'Menunggu Persetujuan (Pending Approval)'
                      : isRejected
                      ? 'Pengajuan Pendaftaran Ditolak'
                      : 'Perangkat Belum Didaftarkan'}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {isApproved
                      ? `Smartphone ini resmi disetujui untuk akun ${user.nama}. Anda dapat melakukan absensi kapan pun.`
                      : isPending
                      ? 'Permohonan pendaftaran HP ini telah terkirim ke panel Admin. Admin sekolah harus menyetujuinya sebelum Anda dapat melakukan absensi.'
                      : isRejected
                      ? `Alasan: ${deviceCheck.message}`
                      : 'Untuk mencegah joki absensi, sekolah mewajibkan setiap guru mendaftarkan smartphone pribadi yang harus disetujui Admin.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRegisterDevice}
                  disabled={isProcessing || isPending}
                  className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                    isApproved
                      ? 'bg-slate-800 hover:bg-slate-900 text-white'
                      : isPending
                      ? 'bg-amber-100 text-amber-800 cursor-not-allowed border border-amber-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isApproved
                      ? 'Ajukan Pindah / Perbarui Pendaftaran HP Ini'
                      : isPending
                      ? '⏳ Menunggu Persetujuan Admin (Pending)'
                      : 'Ajukan Pendaftaran HP Ini ke Admin'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MASTER FACE BIOMETRIC */}
          {activeTab === 'face' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Rekam Wajah Master Biometrik
                </h4>
                <p className="text-xs text-slate-500">
                  Posisikan wajah Anda tegak lurus di depan kamera depan dengan pencahayaan terang.
                </p>
              </div>

              {/* Current Enrolled Face Preview */}
              {user.registered_face_url && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={user.registered_face_url}
                      alt="Master Face"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Foto Master Terdaftar</p>
                      <p className="text-[10px] text-slate-500">
                        Direkam: {user.face_registered_at ? new Date(user.face_registered_at).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi
                  </span>
                </div>
              )}

              {/* Live Enrollment Camera */}
              <div className="space-y-2">
                <AttendanceCamera
                  onPhotoCaptured={handleFaceCaptured}
                  isProcessing={isProcessing}
                />
                <p className="text-[11px] text-slate-400 text-center">
                  💡 Foto wajah master ini akan digunakan sebagai acuan pencocokan biometrik setiap kali absensi.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
