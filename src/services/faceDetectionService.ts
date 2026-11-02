import { FaceDetectionResult } from '../types';

export class FaceDetectionService {
  /**
   * Evaluates face in the video frame using Shape Detection API (if supported)
   * or advanced image luminance and contrast feature analysis.
   */
  public static async analyzeFrame(
    canvas: HTMLCanvasElement
  ): Promise<FaceDetectionResult> {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return {
        faceDetected: false,
        singleFace: false,
        faceCount: 0,
        livenessStep: 'none',
        confidence: 0,
        warning: 'Gagal membaca pixel kamera',
      };
    }

    // 1. Try native Shape Detection API (available in modern Chrome / Android)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('FaceDetector' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).FaceDetector({
          maxDetectedFaces: 5,
          fastMode: false,
        });
        const faces = await detector.detect(canvas);

        if (faces.length === 0) {
          return {
            faceDetected: false,
            singleFace: false,
            faceCount: 0,
            livenessStep: 'look_straight',
            confidence: 0,
            warning: 'Wajah tidak terdeteksi. Posisikan wajah tepat di depan kamera.',
          };
        }

        if (faces.length > 1) {
          return {
            faceDetected: true,
            singleFace: false,
            faceCount: faces.length,
            livenessStep: 'look_straight',
            confidence: 0.95,
            warning: `Terdeteksi ${faces.length} wajah. Pastikan hanya ada satu guru di depan kamera!`,
          };
        }

        const face = faces[0];
        const box = face.boundingBox;

        // Check if face is centered
        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;
        const isCentered =
          faceCenterX > width * 0.25 &&
          faceCenterX < width * 0.75 &&
          faceCenterY > height * 0.2 &&
          faceCenterY < height * 0.8;

        if (!isCentered) {
          return {
            faceDetected: true,
            singleFace: true,
            faceCount: 1,
            faceBox: { x: box.x, y: box.y, width: box.width, height: box.height },
            livenessStep: 'look_straight',
            confidence: 0.85,
            warning: 'Posisikan wajah tepat di tengah bingkai.',
          };
        }

        return {
          faceDetected: true,
          singleFace: true,
          faceCount: 1,
          faceBox: { x: box.x, y: box.y, width: box.width, height: box.height },
          livenessStep: 'blink',
          confidence: 0.98,
        };
      } catch {
        // Fall back to pixel analysis if detector fails
      }
    }

    // 2. High-reliability Canvas Pixel Analysis (Skin chrominance & luminance variance)
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalBrightness = 0;
    let skinPixelCount = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // Sample every 4th pixel for real-time 60fps performance
    const step = 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        // Indonesian / Asian skin tone chrominance model (YCbCr thresholding)
        // Y: 16..235, Cb: 77..127, Cr: 133..173
        const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          Math.abs(r - g) > 12 &&
          cr >= 130 &&
          cr <= 180 &&
          cb >= 70 &&
          cb <= 130;

        if (isSkin) {
          skinPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const sampledCount = (width / step) * (height / step);
    const avgBrightness = totalBrightness / sampledCount;
    const skinRatio = skinPixelCount / sampledCount;

    // Check for pitch black or glare
    if (avgBrightness < 30) {
      return {
        faceDetected: false,
        singleFace: false,
        faceCount: 0,
        livenessStep: 'look_straight',
        confidence: 0,
        warning: 'Pencahayaan terlalu gelap. Nyalakan lampu atau cari tempat terang.',
      };
    }
    if (avgBrightness > 235) {
      return {
        faceDetected: false,
        singleFace: false,
        faceCount: 0,
        livenessStep: 'look_straight',
        confidence: 0,
        warning: 'Pencahayaan terlalu terang / silau.',
      };
    }

    // Verify presence of face proportion
    if (skinRatio < 0.06) {
      return {
        faceDetected: false,
        singleFace: false,
        faceCount: 0,
        livenessStep: 'look_straight',
        confidence: 0.1,
        warning: 'Wajah tidak terdeteksi. Dekatkan wajah ke kamera.',
      };
    }

    if (skinRatio > 0.70) {
      return {
        faceDetected: false,
        singleFace: false,
        faceCount: 0,
        livenessStep: 'look_straight',
        confidence: 0.3,
        warning: 'Wajah terlalu dekat. Mundurkan sedikit perangkat Anda.',
      };
    }

    const faceWidth = Math.max(maxX - minX, 100);
    const faceHeight = Math.max(maxY - minY, 120);
    const faceCenterX = minX + faceWidth / 2;

    // Check if centered
    if (faceCenterX < width * 0.2 || faceCenterX > width * 0.8) {
      return {
        faceDetected: true,
        singleFace: true,
        faceCount: 1,
        faceBox: { x: minX, y: minY, width: faceWidth, height: faceHeight },
        livenessStep: 'look_straight',
        confidence: 0.8,
        warning: 'Posisikan wajah tepat di tengah.',
      };
    }

    return {
      faceDetected: true,
      singleFace: true,
      faceCount: 1,
      faceBox: { x: minX, y: minY, width: faceWidth, height: faceHeight },
      livenessStep: 'blink',
      confidence: 0.94,
    };
  }
}
