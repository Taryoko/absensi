export interface WatermarkData {
  guruNama: string;
  nip?: string | null;
  serverTimestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  schoolName: string;
  status: string;
}

export class WatermarkService {
  /**
   * Generates SHA-256 cryptographic hash of image data
   */
  public static async calculateHash(blobOrDataUrl: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(blobOrDataUrl.slice(0, 10000) + Date.now().toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Applies official anti-tamper watermark banner directly on canvas
   */
  public static applyWatermark(
    canvas: HTMLCanvasElement,
    data: WatermarkData
  ): string {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/jpeg', 0.85);

    const w = canvas.width;
    const h = canvas.height;

    // Format WIB Indonesian time: "01 Okt 2026, 07:28:15 WIB"
    const dateObj = new Date(data.serverTimestamp);
    const formattedDate = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(dateObj) + ' WIB';

    // Watermark overlay banner at bottom
    const bannerHeight = 85;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // Dark slate semi-transparent
    ctx.fillRect(0, h - bannerHeight, w, bannerHeight);

    // Subtle blue security accent line
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, h - bannerHeight, w, 3);

    // Text rendering
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${data.guruNama} ${data.nip ? `(NIP. ${data.nip})` : ''}`, 16, h - bannerHeight + 24);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`📍 ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)} (±${Math.round(data.accuracy)}m)`, 16, h - bannerHeight + 46);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`🕒 ${formattedDate} | ${data.schoolName}`, 16, h - bannerHeight + 66);

    // Security badge on the right
    const badgeText = `VALIDASI: ${data.status}`;
    ctx.font = 'bold 11px sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeX = w - textWidth - 28;
    const badgeY = h - bannerHeight + 14;

    ctx.fillStyle = data.status === 'HADIR' ? '#10b981' : data.status === 'TERLAMBAT' ? '#f59e0b' : '#ef4444';
    ctx.fillRect(badgeX, badgeY, textWidth + 16, 22);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, badgeX + 8, badgeY + 15);

    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.88);
  }
}
