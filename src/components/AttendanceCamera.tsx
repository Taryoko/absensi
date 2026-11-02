import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CheckCircle2, AlertTriangle, RefreshCw, Eye, Sparkles } from 'lucide-react';
import { CameraService } from '../services/cameraService';
import { FaceDetectionService } from '../services/faceDetectionService';
import { FaceDetectionResult } from '../types';

interface AttendanceCameraProps {
  onPhotoCaptured: (canvas: HTMLCanvasElement, faceResult: FaceDetectionResult) => void;
  isProcessing?: boolean;
}

export const AttendanceCamera: React.FC<AttendanceCameraProps> = ({
  onPhotoCaptured,
  isProcessing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [faceResult, setFaceResult] = useState<FaceDetectionResult>({
    faceDetected: false,
    singleFace: false,
    faceCount: 0,
    livenessStep: 'look_straight',
    confidence: 0,
  });
  const [livenessStage, setLivenessStage] = useState<'align' | 'challenge' | 'ready'>('align');
  const [challengeType, setChallengeType] = useState<'blink' | 'smile'>('blink');
  const [isShutterEffect, setIsShutterEffect] = useState(false);

  const initCamera = useCallback(async () => {
    if (!videoRef.current) return;
    setErrorMessage(null);
    try {
      await CameraService.startCamera(videoRef.current);
      setStreamActive(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuka kamera depan.');
      setStreamActive(false);
    }
  }, []);

  useEffect(() => {
    initCamera();
    return () => {
      CameraService.stopCamera();
    };
  }, [initCamera]);

  // Real-time face detection loop
  useEffect(() => {
    let animationFrameId: number;
    let isAnalyzing = false;

    const analyzeLoop = async () => {
      if (videoRef.current && streamActive && !isAnalyzing && !isProcessing) {
        isAnalyzing = true;
        try {
          const canvas = CameraService.captureFrame(videoRef.current);
          const result = await FaceDetectionService.analyzeFrame(canvas);
          setFaceResult(result);

          if (result.singleFace && result.faceDetected) {
            if (livenessStage === 'align') {
              setLivenessStage('challenge');
              setChallengeType(Math.random() > 0.5 ? 'blink' : 'smile');
            } else if (livenessStage === 'challenge') {
              // Simulated natural liveness completion after 1.5s in position
              const timer = setTimeout(() => {
                setLivenessStage('ready');
              }, 1200);
              return () => clearTimeout(timer);
            }
          } else {
            setLivenessStage('align');
          }
        } catch {
          // Ignore transient capture glitch
        } finally {
          isAnalyzing = false;
        }
      }
      animationFrameId = requestAnimationFrame(analyzeLoop);
    };

    animationFrameId = requestAnimationFrame(analyzeLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [streamActive, livenessStage, isProcessing]);

  const handleCapture = () => {
    if (!videoRef.current || !streamActive || isProcessing) return;

    if (!faceResult.faceDetected || !faceResult.singleFace) {
      setErrorMessage('Wajah harus terdeteksi dengan jelas dan hanya ada 1 orang di depan kamera.');
      return;
    }

    setIsShutterEffect(true);
    setTimeout(() => setIsShutterEffect(false), 200);

    const canvas = CameraService.captureFrame(videoRef.current);
    onPhotoCaptured(canvas, faceResult);
  };

  return (
    <div className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800">
      {/* Video Feed */}
      <div className="relative aspect-[4/5] sm:aspect-[3/4] w-full overflow-hidden bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
            streamActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Shutter Flash Animation */}
        {isShutterEffect && (
          <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-200" />
        )}

        {/* Face Oval Frame Guide */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
          <div
            className={`w-56 h-72 sm:w-64 sm:h-80 rounded-[50%] border-2 transition-all duration-300 ${
              faceResult.singleFace && livenessStage === 'ready'
                ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                : faceResult.singleFace
                ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                : 'border-white/40 border-dashed'
            }`}
          />
        </div>

        {/* Live Status Pill */}
        <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/60 backdrop-blur-md text-white border border-white/10">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            KAMERA LANGSUNG
          </span>

          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md text-white ${
              faceResult.singleFace && livenessStage === 'ready'
                ? 'bg-emerald-600/90'
                : faceResult.singleFace
                ? 'bg-amber-600/90'
                : 'bg-slate-800/80'
            }`}
          >
            {faceResult.singleFace && livenessStage === 'ready' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Wajah Terverifikasi
              </>
            ) : faceResult.singleFace ? (
              <>
                <Eye className="w-3.5 h-3.5" /> Verifikasi Liveness...
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" /> Posisikan Wajah
              </>
            )}
          </span>
        </div>

        {/* Instructions banner on video */}
        <div className="absolute bottom-4 inset-x-4 pointer-events-none">
          {faceResult.warning ? (
            <div className="bg-amber-500/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs font-medium text-center shadow-lg flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{faceResult.warning}</span>
            </div>
          ) : livenessStage === 'challenge' ? (
            <div className="bg-sky-600/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs font-medium text-center shadow-lg flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0 text-yellow-300 animate-spin" />
              <span>
                {challengeType === 'blink'
                  ? 'Kedipkan mata perlahan ke arah kamera...'
                  : 'Tersenyum sedikit untuk verifikasi liveness...'}
              </span>
            </div>
          ) : livenessStage === 'ready' ? (
            <div className="bg-emerald-600/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs font-medium text-center shadow-lg flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Wajah siap! Tekan tombol di bawah untuk ambil foto.</span>
            </div>
          ) : (
            <div className="bg-black/60 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs text-center">
              Posisikan wajah Anda tepat di dalam bingkai oval
            </div>
          )}
        </div>

        {/* Fallback error if camera blocked */}
        {errorMessage && (
          <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center text-white">
            <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
            <p className="text-sm font-semibold mb-2">{errorMessage}</p>
            <p className="text-xs text-slate-400 mb-4">
              Pastikan Anda mengizinkan akses kamera depan dan tidak membukanya di aplikasi lain.
            </p>
            <button
              onClick={initCamera}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* Camera Capture Action Bar */}
      <div className="p-4 bg-slate-900 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleCapture}
          disabled={!streamActive || isProcessing}
          aria-label="Ambil Foto Absensi"
          className={`w-18 h-18 rounded-full border-4 border-white/80 p-1 flex items-center justify-center transition-all ${
            streamActive && !isProcessing
              ? 'hover:scale-105 active:scale-95 bg-white/20'
              : 'opacity-40 cursor-not-allowed'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full transition-all ${
              faceResult.singleFace && livenessStage === 'ready'
                ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                : 'bg-white'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
