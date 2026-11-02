import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Attendance, SchoolSettings } from '../types';

export class ReportService {
  /**
   * Generates formatted row records for reports
   */
  public static formatAttendanceRows(attendances: Attendance[]) {
    return attendances.map((item, index) => {
      const dateObj = new Date(item.server_timestamp);
      const tanggal = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(dateObj);

      const waktu =
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(dateObj) + ' WIB';

      const isPermit =
        item.type === 'izin' ||
        item.type === 'sakit' ||
        item.status === 'IZIN' ||
        item.status === 'SAKIT';
      const tipe =
        item.type === 'check_in'
          ? 'Masuk'
          : item.type === 'check_out'
          ? 'Pulang'
          : item.type === 'sakit'
          ? 'Sakit'
          : 'Izin';
      const jarak = isPermit
        ? `${item.distance_from_school} m (Dispensasi)`
        : `${item.distance_from_school} m`;

      return {
        no: index + 1,
        nama: item.profile?.nama || 'Guru',
        nip: item.profile?.nip || '-',
        tanggal,
        tipe,
        jam: waktu,
        status: item.status,
        jarak,
        akurasi: `±${item.gps_accuracy} m`,
        koordinat: `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`,
        keterangan: item.keterangan || (isPermit ? 'Pengajuan Izin/Sakit Resmi' : '-'),
      };
    });
  }

  /**
   * Generates a high-resolution standard official KOP Surat banner as a PNG base64 DataURL
   */
  public static async generateDefaultKopSurat(school: SchoolSettings): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Left logo helper
    let logoDrawn = false;
    if (school.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = school.logo_url!;
        });
        ctx.drawImage(img, 70, 25, 140, 140);
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }

    if (!logoDrawn) {
      // Draw an emblem badge
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(70, 25, 140, 140, 20);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SMK', 140, 105);
    }

    const textX = 850;

    // Yayasan / Header line
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('YAYASAN PENDIDIKAN KOMPUTAMA NUSANTARA', textX, 48);

    // School Name (Main Title)
    ctx.fillStyle = '#1d4ed8';
    ctx.font = '900 42px Arial, sans-serif';
    ctx.fillText(school.nama_sekolah.toUpperCase(), textX, 96);

    // Competencies / Accreditation
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('KOMPETENSI KEAHLIAN: TEKNIK KOMPUTER & JARINGAN • MULTIMEDIA • AKUNTANSI', textX, 130);

    // Subtitle Address, NPSN, Contact
    ctx.fillStyle = '#475569';
    ctx.font = 'normal 18px Arial, sans-serif';
    const subheader = [
      school.npsn ? `NPSN: ${school.npsn}` : 'NPSN: 69786432',
      school.alamat,
      school.telepon ? `Telp: ${school.telepon}` : '',
      school.email_sekolah ? `Email: ${school.email_sekolah}` : '',
    ]
      .filter(Boolean)
      .join(' • ');
    ctx.fillText(subheader, textX, 160);

    // Official Double Line rule
    // Line 1: Thick dark rule
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(60, 195);
    ctx.lineTo(1540, 195);
    ctx.stroke();

    // Line 2: Thin secondary rule
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 205);
    ctx.lineTo(1540, 205);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }

  /**
   * Exports data to Excel (.xlsx) file
   */
  public static exportToExcel(
    attendances: Attendance[],
    school: SchoolSettings,
    filename = 'Laporan_Absensi_Guru.xlsx'
  ) {
    const formatted = this.formatAttendanceRows(attendances);

    const worksheetData = [
      [`LAPORAN ABSENSI GURU - ${school.nama_sekolah.toUpperCase()}`],
      [`Alamat: ${school.alamat}`],
      [`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')} WIB`],
      [], // blank line
      [
        'No',
        'Nama Guru',
        'NIP',
        'Tanggal',
        'Tipe Absensi',
        'Jam Server',
        'Status',
        'Jarak Sekolah',
        'Akurasi GPS',
        'Koordinat',
        'Keterangan / Alasan',
      ],
      ...formatted.map((r) => [
        r.no,
        r.nama,
        r.nip,
        r.tanggal,
        r.tipe,
        r.jam,
        r.status,
        r.jarak,
        r.akurasi,
        r.koordinat,
        r.keterangan,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Absensi');

    // Auto column widths
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 22 },
      { wch: 15 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 22 },
      { wch: 30 },
    ];

    XLSX.writeFile(workbook, filename);
  }

  /**
   * Exports data to PDF file with official KOP Surat header and styling
   */
  public static exportToPDF(
    attendances: Attendance[],
    school: SchoolSettings,
    filename = 'Laporan_Absensi_Guru.pdf'
  ) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 841.89 pt
    const marginX = 40;
    let tableStartY = 100;

    // 1. Render Official KOP Surat
    if (school.kop_surat_url) {
      try {
        const kopWidth = pageWidth - marginX * 2; // 761.89 pt
        const kopHeight = 78;
        doc.addImage(
          school.kop_surat_url,
          'PNG',
          marginX,
          16,
          kopWidth,
          kopHeight,
          undefined,
          'FAST'
        );

        // Document Sub-header Title below KOP Surat
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(
          'REKAPITULASI LAPORAN ABSENSI GURU & TENAGA PENDIDIK',
          pageWidth / 2,
          108,
          { align: 'center' }
        );

        tableStartY = 118;
      } catch (err) {
        console.warn('Could not render KOP image, rendering text header:', err);
        tableStartY = this.renderFallbackHeader(doc, school, pageWidth);
      }
    } else {
      tableStartY = this.renderFallbackHeader(doc, school, pageWidth);
    }

    // 2. Attendance Table
    const formatted = this.formatAttendanceRows(attendances);

    const tableRows = formatted.map((r) => [
      r.no,
      r.nama,
      r.nip,
      r.tanggal,
      r.tipe,
      r.jam,
      r.status,
      r.jarak,
      r.keterangan,
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [
        [
          'No',
          'Nama Guru',
          'NIP',
          'Tanggal',
          'Tipe',
          'Jam Server',
          'Status',
          'Jarak',
          'Keterangan',
        ],
      ],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138], // Indigo-900 / Navy
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: marginX, right: marginX },
    });

    // 3. Signature Block for Kepala Sekolah
    const finalY = (doc as any).lastAutoTable?.finalY || 400;
    if (finalY < 480 && school.kepala_sekolah_nama) {
      const sigX = doc.internal.pageSize.getWidth() - 220;
      const todayStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`Cimanggu, ${todayStr}`, sigX, finalY + 28);
      doc.text(`Mengetahui,`, sigX, finalY + 40);
      doc.text(`Kepala Sekolah`, sigX, finalY + 52);

      doc.setFont('helvetica', 'bold');
      doc.text(school.kepala_sekolah_nama, sigX, finalY + 102);
      if (school.kepala_sekolah_nip) {
        doc.setFont('helvetica', 'normal');
        doc.text(`NIP. ${school.kepala_sekolah_nip}`, sigX, finalY + 114);
      }
    }

    doc.save(filename);
  }

  private static renderFallbackHeader(doc: jsPDF, school: SchoolSettings, pageWidth: number): number {
    const marginX = 40;

    // School Logo if exists
    if (school.logo_url && school.logo_url.startsWith('data:image')) {
      try {
        doc.addImage(school.logo_url, 'PNG', 45, 18, 52, 52);
      } catch {}
    }

    // Header Kop Surat Text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('YAYASAN PENDIDIKAN KOMPUTAMA NUSANTARA', pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(school.nama_sekolah.toUpperCase(), pageWidth / 2, 45, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const subheader = [
      school.npsn ? `NPSN: ${school.npsn}` : '',
      school.alamat,
      school.telepon ? `Telp: ${school.telepon}` : '',
      school.email_sekolah ? `Email: ${school.email_sekolah}` : '',
    ]
      .filter(Boolean)
      .join(' • ');
    doc.text(subheader, pageWidth / 2, 59, { align: 'center' });

    // Official Double Line
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(1.8);
    doc.line(marginX, 70, pageWidth - marginX, 70);
    doc.setLineWidth(0.6);
    doc.line(marginX, 72.5, pageWidth - marginX, 72.5);

    // Document Title
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('REKAPITULASI LAPORAN ABSENSI GURU & TENAGA PENDIDIK', pageWidth / 2, 88, { align: 'center' });

    return 98;
  }
}
