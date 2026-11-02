export class CameraService {
  private static stream: MediaStream | null = null;

  /**
   * Requests front-facing camera using navigator.mediaDevices.getUserMedia
   */
  public static async startCamera(videoElement: HTMLVideoElement): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Kamera tidak didukung oleh browser Anda.');
    }

    // Stop existing stream if running
    this.stopCamera();

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: 'user', // Enforce front camera
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      videoElement.srcObject = stream;
      await videoElement.play();
      return stream;
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Izin akses kamera ditolak. Berikan izin kamera pada browser.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('Perangkat kamera depan tidak ditemukan.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Kamera sedang digunakan oleh aplikasi lain.');
      }
      throw new Error(`Gagal membuka kamera: ${error.message || 'Kesalahan sistem'}`);
    }
  }

  /**
   * Stops the active camera stream.
   */
  public static stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /**
   * Captures the current video frame as an HTMLCanvasElement
   */
  public static captureFrame(videoElement: HTMLVideoElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Gagal menginisialisasi canvas.');
    }

    // Mirror image for front camera feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
}
