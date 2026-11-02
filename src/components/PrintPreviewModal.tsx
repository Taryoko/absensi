import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Building2,
  FileText,
  Calendar,
  Users,
} from 'lucide-react';
import { Attendance, SchoolSettings } from '../types';
import { ReportService } from '../services/reportService';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendances: Attendance[];
  school: SchoolSettings;
  filterSummary?: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  attendances,
  school,
  filterSummary,
}) => {
  if (!isOpen) return null;

  const formattedRows = ReportService.formatAttendanceRows(attendances);
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    ReportService.exportToPDF(
      attendances,
      school,
      `Laporan_Absensi_Guru_${school.nama_sekolah.replace(/\s+/g, '_')}.pdf`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full my-auto shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Modal Top Bar (hidden on print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Pratinjau Cetak Laporan &amp; KOP Surat</h3>
              <p className="text-xs text-slate-400">
                {school.nama_sekolah} • {attendances.length} Rekam Data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print)</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Content View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-10 max-w-4xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0">
            {/* 1. KOP SURAT HEADER */}
            {school.kop_surat_url ? (
              <div className="w-full border-b-2 border-slate-900 pb-3">
                <img
                  src={school.kop_surat_url}
                  alt="KOP Surat Resmi"
                  className="w-full max-h-28 sm:max-h-32 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="border-b-4 border-double border-slate-900 pb-4 text-center relative">
                {school.logo_url && (
                  <img
                    src={school.logo_url}
                    alt="Logo"
                    className="w-16 h-16 object-contain absolute left-2 top-0 hidden sm:block"
                  />
                )}
                <p className="text-xs font-bold text-slate-600 tracking-wider uppercase">
                  YAYASAN PENDIDIKAN KOMPUTAMA NUSANTARA
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
                  {school.nama_sekolah}
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  {school.npsn ? `NPSN: ${school.npsn} • ` : ''}
                  {school.alamat}
                  {school.telepon ? ` • Telp: ${school.telepon}` : ''}
                </p>
              </div>
            )}

            {/* 2. DOCUMENT TITLE & SUMMARY */}
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                REKAPITULASI LAPORAN ABSENSI GURU &amp; TENAGA PENDIDIK
              </h3>
              <p className="text-xs text-slate-600">
                {filterSummary || `Tanggal Cetak: ${todayFormatted} WIB`}
              </p>
            </div>

            {/* 3. TABLE OF RECORDS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2 border border-slate-700 text-center w-8">No</th>
                    <th className="p-2 border border-slate-700">Nama Guru</th>
                    <th className="p-2 border border-slate-700">NIP</th>
                    <th className="p-2 border border-slate-700">Tanggal</th>
                    <th className="p-2 border border-slate-700">Tipe</th>
                    <th className="p-2 border border-slate-700">Waktu</th>
                    <th className="p-2 border border-slate-700">Status</th>
                    <th className="p-2 border border-slate-700">Jarak</th>
                    <th className="p-2 border border-slate-700">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {formattedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                        Tidak ada data absensi untuk filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    formattedRows.map((r) => (
                      <tr key={r.no} className="odd:bg-white even:bg-slate-50 text-[11px]">
                        <td className="p-2 border border-slate-200 text-center font-medium">{r.no}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-800">{r.nama}</td>
                        <td className="p-2 border border-slate-200 font-mono text-slate-600">{r.nip}</td>
                        <td className="p-2 border border-slate-200 whitespace-nowrap">{r.tanggal}</td>
                        <td className="p-2 border border-slate-200">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.tipe === 'Masuk' ? 'bg-blue-100 text-blue-800' :
                            r.tipe === 'Pulang' ? 'bg-indigo-100 text-indigo-800' :
                            r.tipe === 'Sakit' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.tipe}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 font-mono whitespace-nowrap">{r.jam}</td>
                        <td className="p-2 border border-slate-200 font-semibold">{r.status}</td>
                        <td className="p-2 border border-slate-200 font-mono whitespace-nowrap">{r.jarak}</td>
                        <td className="p-2 border border-slate-200 text-slate-600 truncate max-w-[140px]">{r.keterangan}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. SIGNATURE SECTION */}
            <div className="pt-6 flex justify-end">
              <div className="text-right text-xs space-y-1">
                <p className="text-slate-600">Cimanggu, {todayFormatted}</p>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900 pb-12">Kepala Sekolah</p>
                <p className="font-black text-slate-900 underline text-sm">
                  {school.kepala_sekolah_nama || 'Drs. Bambang Sudarsono, M.Pd.'}
                </p>
                {school.kepala_sekolah_nip && (
                  <p className="font-mono text-slate-600 text-[11px]">
                    NIP. {school.kepala_sekolah_nip}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden">
          <span>KOP Surat resmi otomatis terpasang pada cetakan.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
};
