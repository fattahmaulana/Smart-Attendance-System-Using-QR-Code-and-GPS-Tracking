import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import {
  RefreshCw, CheckCircle2, XCircle, Users, ShieldCheck, ShieldAlert,
  Activity, Maximize2, X, Download, Printer, Trash2, AlertTriangle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GeolocationVisualizer } from '@/src/components/ui/geolocation-visualizer';
import { MAX_DISTANCE_M, SCHOOL_COORDS } from '@/src/lib/haversine';

// ─────────────────────────────────────────────
// Custom Confirmation Dialog Component
// ─────────────────────────────────────────────
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

function ConfirmDialog({
  isOpen, onClose, onConfirm, title, description,
  confirmLabel = 'Hapus', variant = 'danger', isLoading = false
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const iconBg = variant === 'danger' ? 'bg-red-50' : 'bg-amber-50';
  const iconColor = variant === 'danger' ? 'text-red-600' : 'text-amber-600';
  const btnColor = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(9,9,11,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-labelledby="dialog-title"
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="bg-white rounded-xl shadow-2xl border border-[#E4E4E7] w-full max-w-sm p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-md text-[#A1A1AA] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className={`mx-auto w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
              {variant === 'danger'
                ? <AlertCircle className={`w-6 h-6 ${iconColor}`} />
                : <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
              }
            </div>

            {/* Content */}
            <div className="text-center space-y-2 mb-6">
              <h2 id="dialog-title" className="text-base font-semibold text-[#09090B]">{title}</h2>
              <p className="text-sm text-[#71717A] leading-relaxed">{description}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 border-[#E4E4E7] text-[#09090B] hover:bg-[#F9FAFB] rounded-lg h-9 text-sm font-medium"
              >
                Batal
              </Button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 ${btnColor} text-white rounded-lg h-9 text-sm font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Menghapus...
                  </>
                ) : (
                  <>{confirmLabel}</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// Toast Notification Component
// ─────────────────────────────────────────────
interface ToastProps { message: string; type: 'success' | 'error'; }

function Toast({ message, type }: ToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', damping: 30, stiffness: 380 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-medium
        ${type === 'success'
          ? 'bg-white border-[#E4E4E7] text-[#09090B]'
          : 'bg-red-600 border-red-700 text-white'
        }`}
    >
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        : <XCircle className="w-4 h-4 shrink-0" />
      }
      {message}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isQrFullscreen, setIsQrFullscreen] = useState(false);

  const [stats, setStats] = useState({ totalToday: 0, validToday: 0, invalidToday: 0, totalStudents: 0 });
  const [attendance, setAttendance] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [latestScan, setLatestScan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  }, []);

  // ── API Calls ──────────────────────────────
  const checkAuth = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) navigate('/login');
  };

  const fetchStats = async () => {
    const res = await fetch('/api/admin/stats');
    if (res.ok) setStats(await res.json());
  };

  const fetchAttendance = async () => {
    const res = await fetch(`/api/admin/attendance?page=${page}&limit=10`);
    if (res.ok) {
      const data = await res.json();
      setAttendance(data.data);
      setTotalPages(data.meta.totalPages);
      if (data.data.length > 0) setLatestScan(data.data[0]);
    }
    setIsLoading(false);
  };

  const generateQR = async () => {
    const res = await fetch('/api/admin/qr');
    if (res.ok) {
      const data = await res.json();
      setQrToken(data.token);
      setQrExpiresAt(new Date(data.expired_at));
    } else if (res.status === 401) {
      navigate('/login');
    }
  };

  // ── Delete Single ──────────────────────────
  const confirmDelete = (id: string) => setDeleteDialog({ open: true, id });

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/attendance/${deleteDialog.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Data presensi berhasil dihapus.', 'success');
        fetchAttendance();
        fetchStats();
      } else {
        showToast('Gagal menghapus data. Coba lagi.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ open: false, id: null });
    }
  };

  // ── Delete All ─────────────────────────────
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/attendance', { method: 'DELETE' });
      if (res.ok) {
        showToast('Semua riwayat presensi berhasil dihapus.', 'success');
        setPage(1);
        fetchAttendance();
        fetchStats();
      } else {
        showToast('Gagal menghapus semua data. Coba lagi.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteAllDialog(false);
    }
  };

  // ── Export CSV ─────────────────────────────
  const handleExportCSV = () => {
    if (attendance.length === 0) return showToast('Tidak ada data untuk diekspor.', 'error');
    const headers = ['Waktu', 'NIS', 'Nama Siswa', 'Kelas', 'Jarak (m)', 'Status'];
    const csvData = attendance.map(r => [
      format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      r.nis,
      r.student?.nama_siswa || '-',
      r.student?.kelas || '-',
      Math.round(r.distance),
      r.status
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Presensi_Sekolah_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Effects ────────────────────────────────
  useEffect(() => {
    checkAuth(); generateQR(); fetchStats(); fetchAttendance();
    const dataInterval = setInterval(() => { fetchStats(); fetchAttendance(); }, 10000);
    return () => clearInterval(dataInterval);
  }, [page]);

  useEffect(() => {
    if (!qrExpiresAt) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) generateQR();
    }, 1000);
    return () => clearInterval(timer);
  }, [qrExpiresAt]);

  const filteredAttendance = useMemo(() => {
    const map = new Map();
    attendance.forEach((r: any) => { if (!map.has(r.nis)) map.set(r.nis, r); });
    return Array.from(map.values());
  }, [attendance]);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <>
      {/* ── Custom Dialogs ── */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => !isDeleting && setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Hapus Data Presensi"
        description="Tindakan ini akan menghapus data presensi ini secara permanen dan tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={deleteAllDialog}
        onClose={() => !isDeleting && setDeleteAllDialog(false)}
        onConfirm={handleDeleteAll}
        title="Hapus Semua Riwayat Presensi"
        description="Semua riwayat presensi akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan dan tidak ada cara untuk memulihkan data."
        confirmLabel="Hapus Semua Data"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast.show && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 print:space-y-4"
      >
        {/* Header Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#09090B]">Dashboard Overview</h1>
            <p className="text-[#71717A] mt-1 text-sm">Monitoring presensi real-time hari ini.</p>
          </div>

          {/* Action Buttons — responsive */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="gap-2 border-[#E4E4E7] text-[#09090B] hover:bg-[#F9FAFB] text-sm h-9 px-3 sm:px-4"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Export CSV</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 border-[#E4E4E7] text-[#09090B] hover:bg-[#F9FAFB] text-sm h-9 px-3 sm:px-4"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Cetak</span>
            </Button>
            <div className="w-px h-6 bg-[#E4E4E7] hidden sm:block" />
            <Button
              onClick={() => setDeleteAllDialog(true)}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white text-sm h-9 px-3 sm:px-4 border-0"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Hapus Semua</span>
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">

          {/* QR Code Card */}
          <Card className="md:col-span-1 lg:row-span-2 border-[#E4E4E7] shadow-none rounded-xl flex flex-col bg-white print:hidden">
            <CardHeader className="text-center pb-3 border-b border-[#E4E4E7]">
              <CardTitle className="text-base font-semibold">QR Code Presensi</CardTitle>
              <CardDescription className="text-[#71717A] text-xs">Otomatis refresh setiap menit</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center space-y-5 pt-5">
              <div
                className="bg-white p-3 rounded-lg border border-[#E4E4E7] cursor-pointer hover:border-[#09090B] transition-colors relative group"
                onClick={() => setIsQrFullscreen(true)}
              >
                {qrToken ? (
                  <>
                    <QRCodeSVG value={qrToken} size={180} level="H" includeMargin={false} />
                    <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <Maximize2 className="w-7 h-7 text-[#09090B]" />
                    </div>
                  </>
                ) : (
                  <div className="w-[180px] h-[180px] bg-[#F9FAFB] animate-pulse rounded-md" />
                )}
              </div>

              <div className="w-full max-w-[196px] space-y-2">
                <div className="flex justify-between text-xs font-medium text-[#71717A]">
                  <span>Refresh dalam</span>
                  <span className={timeLeft <= 10 ? 'text-red-600 font-semibold' : 'text-[#09090B]'}>{timeLeft}s</span>
                </div>
                <div className="h-1.5 w-full bg-[#F4F4F5] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${timeLeft <= 10 ? 'bg-red-500' : 'bg-[#09090B]'}`}
                    style={{ width: `${(timeLeft / 60) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={generateQR}
                className="w-full max-w-[196px] gap-2 rounded-lg border-[#E4E4E7] text-[#09090B] hover:bg-[#F9FAFB] text-sm h-9"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Manual
              </Button>
            </CardContent>
          </Card>

          {/* Stat Cards */}
          {[
            { icon: <Users className="w-5 h-5" />, label: 'Total Hadir (Valid)', value: stats.validToday, sub: `/ ${stats.totalStudents}` },
            { icon: <ShieldCheck className="w-5 h-5" />, label: 'Valid (Dalam Radius)', value: stats.validToday, sub: null },
            { icon: <ShieldAlert className="w-5 h-5" />, label: 'Invalid (Luar Radius)', value: stats.invalidToday, sub: null },
          ].map((s, i) => (
            <Card key={i} className="border-[#E4E4E7] shadow-none rounded-xl bg-white">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-2.5 bg-[#F4F4F5] text-[#09090B] rounded-lg border border-[#E4E4E7] shrink-0">
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#71717A] truncate">{s.label}</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-2xl font-semibold text-[#09090B]">{s.value}</p>
                    {s.sub && <p className="text-xs text-[#A1A1AA]">{s.sub}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Live Activity */}
          <Card className="md:col-span-2 lg:col-span-3 border-[#E4E4E7] shadow-none rounded-xl bg-white print:hidden">
            <CardHeader className="pb-4 border-b border-[#E4E4E7]">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Activity className="w-4 h-4 text-[#09090B]" /> Live Scan Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {isLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-[#F4F4F5] rounded w-1/2" />
                  <div className="h-3 bg-[#F4F4F5] rounded w-1/3" />
                </div>
              ) : latestScan ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <p className="text-xs font-medium text-[#71717A] mb-1">Scan Terakhir</p>
                    <p className="text-xl font-semibold text-[#09090B]">{latestScan.student?.nama_siswa || latestScan.nis}</p>
                    <p className="text-sm text-[#71717A] mt-1">
                      {format(new Date(latestScan.timestamp), 'HH:mm:ss')} • {latestScan.student?.kelas}
                    </p>
                  </div>
                  <GeolocationVisualizer
                    studentLat={latestScan.latitude} studentLng={latestScan.longitude}
                    schoolLat={SCHOOL_COORDS.lat} schoolLng={SCHOOL_COORDS.lng}
                    distance={latestScan.distance} maxDistance={MAX_DISTANCE_M} status={latestScan.status}
                  />
                </div>
              ) : (
                <div className="py-10 text-center text-[#71717A] flex flex-col items-center">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">Belum ada data scan hari ini.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Table */}
          <Card className="md:col-span-3 lg:col-span-4 border-[#E4E4E7] shadow-none rounded-xl bg-white">
            <CardHeader className="border-b border-[#E4E4E7] pb-4">
              <CardTitle className="text-base font-semibold">Riwayat Presensi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader className="bg-[#F9FAFB]">
                    <TableRow className="border-[#E4E4E7] hover:bg-transparent">
                      <TableHead className="font-medium text-[#71717A] text-xs w-[90px]">Waktu</TableHead>
                      <TableHead className="font-medium text-[#71717A] text-xs">Nama Siswa</TableHead>
                      <TableHead className="font-medium text-[#71717A] text-xs w-[90px]">Kelas</TableHead>
                      <TableHead className="font-medium text-[#71717A] text-xs w-[80px]">Jarak</TableHead>
                      <TableHead className="font-medium text-[#71717A] text-xs w-[90px]">Status</TableHead>
                      <TableHead className="font-medium text-[#71717A] text-xs w-[56px] text-center print:hidden">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-[#E4E4E7]">
                          <TableCell colSpan={6}>
                            <div className="h-5 bg-[#F4F4F5] rounded animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-14 text-[#71717A]">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 opacity-20" />
                            <p className="text-sm">Belum ada data presensi.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAttendance.map((record) => (
                        <TableRow key={record.id} className="border-[#E4E4E7] hover:bg-[#FAFAFA] transition-colors">
                          <TableCell className="font-mono text-xs text-[#09090B] tabular-nums">
                            {format(new Date(record.timestamp), 'HH:mm:ss')}
                          </TableCell>
                          <TableCell className="text-sm text-[#09090B] font-medium max-w-[200px] truncate">
                            {record.student?.nama_siswa || record.nis}
                          </TableCell>
                          <TableCell className="text-xs text-[#71717A]">{record.student?.kelas || '—'}</TableCell>
                          <TableCell className="text-xs text-[#71717A] tabular-nums">{Math.round(record.distance)} m</TableCell>
                          <TableCell>
                            {record.status === 'VALID' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-100">
                                <XCircle className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center print:hidden">
                            <button
                              onClick={() => confirmDelete(record.id)}
                              title="Hapus"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#A1A1AA] hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4E4E7] print:hidden">
                  <p className="text-xs text-[#71717A]">Halaman {page} dari {totalPages}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border-[#E4E4E7] text-[#09090B] text-xs h-8 px-3"
                    >
                      ← Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-lg border-[#E4E4E7] text-[#09090B] text-xs h-8 px-3"
                    >
                      Berikutnya →
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Fullscreen QR Modal ── */}
      <AnimatePresence>
        {isQrFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/95 backdrop-blur-sm"
            onClick={() => setIsQrFullscreen(false)}
          >
            <button
              className="absolute top-6 right-6 p-2 rounded-full text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] transition-colors"
              onClick={() => setIsQrFullscreen(false)}
              aria-label="Tutup"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="bg-white p-10 rounded-2xl shadow-2xl border border-[#E4E4E7] flex flex-col items-center space-y-7 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-[#09090B]">Scan untuk Presensi</h2>
                <p className="text-sm text-[#71717A]">Arahkan kamera ke QR Code ini</p>
              </div>

              <div className="p-4 bg-white border-2 border-[#E4E4E7] rounded-xl">
                {qrToken
                  ? <QRCodeSVG value={qrToken} size={320} level="H" includeMargin={false} />
                  : <div className="w-[320px] h-[320px] bg-[#F4F4F5] animate-pulse rounded-xl" />
                }
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm font-medium text-[#71717A]">
                  <span>Refresh otomatis dalam</span>
                  <span className={timeLeft <= 10 ? 'text-red-600 font-semibold' : 'text-[#09090B]'}>{timeLeft} detik</span>
                </div>
                <div className="h-2 w-full bg-[#F4F4F5] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear rounded-full ${timeLeft <= 10 ? 'bg-red-500' : 'bg-[#09090B]'}`}
                    style={{ width: `${(timeLeft / 60) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}