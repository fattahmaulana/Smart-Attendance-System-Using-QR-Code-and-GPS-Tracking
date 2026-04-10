'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from 'sonner';
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, animate,
} from 'motion/react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import {
  User, QrCode, ArrowRight, CheckCircle2, ArrowLeft,
  MapPin, RotateCcw, AlertCircle, Loader2, Clock
} from 'lucide-react';
import { getDistanceFromLatLonInM, MAX_DISTANCE_M, SCHOOL_COORDS } from '@/src/lib/haversine';
import { GeolocationVisualizer } from '@/src/components/ui/geolocation-visualizer';
import { cn } from '@/src/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'INPUT_NIS' | 'SCANNING' | 'SUCCESS';
type ScanStatus = 'PENDING' | 'VALID' | 'INVALID';

interface StudentData { nis: string; nama_siswa: string; kelas: string; }
interface LocationCoords { lat: number; lng: number; }
interface ScanResult { status: ScanStatus; distance: number; }

// ─── Animation presets ────────────────────────────────────────────────────────

const PAGE_IN  = { opacity: 1, y: 0,  filter: 'blur(0px)' };
const PAGE_OUT = { opacity: 0, y: -14, filter: 'blur(3px)' };
const PAGE_INIT = { opacity: 0, y: 16, filter: 'blur(3px)' };

const pageTransition = { duration: 0.28, ease: [0.16, 1, 0.3, 1] };
const exitTransition  = { duration: 0.20, ease: [0.4, 0, 1, 1] };

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.30, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Utility Components ────────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const mv      = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  const [display, setDisplay] = useState(`0${suffix}`);

  useEffect(() => {
    const unsub = rounded.on('change', setDisplay);
    const ctrl  = animate(mv, value, { duration: 0.85, ease: [0.16, 1, 0.3, 1] });
    return () => { unsub(); ctrl.stop(); };
  }, [value]);

  return <span>{display}</span>;
}

// Komponen Jam Realtime
function RealtimeClock() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString('id-ID', { hour12: false }));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) return null;
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA] font-mono mt-1">
      <Clock className="w-3 h-3" />
      <span>{time}</span>
    </div>
  );
}

function SuccessRing({ children }: { children: React.ReactNode }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#E4E4E7" strokeWidth="2" />
        <motion.circle
          cx="48" cy="48" r={r}
          fill="none" stroke="#09090B" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {children}
    </div>
  );
}

function ScannerOverlay() {
  const c = 'absolute w-6 h-6 border-white border-[2.5px]';
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <motion.div
        className="relative w-56 h-56"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className={cn(c, 'top-0 left-0 border-r-0 border-b-0 rounded-tl-lg')} />
        <span className={cn(c, 'top-0 right-0 border-l-0 border-b-0 rounded-tr-lg')} />
        <span className={cn(c, 'bottom-0 left-0 border-r-0 border-t-0 rounded-bl-lg')} />
        <span className={cn(c, 'bottom-0 right-0 border-l-0 border-t-0 rounded-br-lg')} />
        <motion.div
          className="absolute left-1 right-1 h-[1.5px] bg-white/65"
          animate={{ top: ['8%', '88%', '8%'] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    </div>
  );
}

function GpsDot() {
  return (
    <motion.div
      className="w-2 h-2 rounded-full bg-green-500"
      animate={{ opacity: [1, 0.35, 1], scale: [1, 1.6, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function StudentInfoCard({ student }: { student: StudentData }) {
  return (
    <motion.div
      variants={staggerItem}
      className="bg-white rounded-2xl p-4 ring-1 ring-[#E4E4E7] flex items-center gap-3 shadow-sm"
    >
      <motion.div
        className="w-11 h-11 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.12, type: 'spring', bounce: 0.5 }}
      >
        <User className="w-5 h-5 text-blue-500" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] text-[#09090B] truncate">{student.nama_siswa}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-[#71717A]">NIS: <strong className="text-[#3F3F46] font-medium">{student.nis}</strong></span>
          <span className="text-[#D4D4D8]">·</span>
          <span className="text-[11px] text-[#71717A]">Kelas: <strong className="text-[#3F3F46] font-medium">{student.kelas}</strong></span>
        </div>
        <RealtimeClock />
      </div>
    </motion.div>
  );
}

function StatusPill({ isValid, fillPercent }: { isValid: boolean; fillPercent: number; }) {
  return (
    <div className={cn('relative w-full h-9 rounded-full overflow-hidden border',
      isValid ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
    )}>
      <motion.div
        className={cn('absolute inset-y-0 left-0 rounded-full', isValid ? 'bg-green-100' : 'bg-red-100')}
        initial={{ width: '0%' }}
        animate={{ width: `${fillPercent}%` }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="relative z-10 flex items-center justify-center gap-2 h-full px-4">
        {isValid
          ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          : <AlertCircle  className="w-4 h-4 text-red-500  flex-shrink-0" />}
        <span className={cn('text-xs font-semibold tracking-wide', isValid ? 'text-green-700' : 'text-red-600')}>
          {isValid ? 'LOKASI VALID' : 'DI LUAR JANGKAUAN'}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [nis, setNis]               = useState('');
  const [student, setStudent]       = useState<StudentData | null>(null);
  const [step, setStep]             = useState<Step>('INPUT_NIS');
  const [location, setLocation]     = useState<LocationCoords | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const resetAll = useCallback(() => {
    setStep('INPUT_NIS'); setNis(''); setStudent(null); setScanResult(null); setLocation(null);
  }, []);

  const handleVerifyNis = async () => {
    if (!nis || !/^\d+$/.test(nis)) {
      toast.error('NIS tidak valid', { description: 'Harap masukkan NIS yang hanya berisi angka.' });
      return;
    }
    const id = toast.loading('Memverifikasi NIS...');
    try {
      const res = await fetch(`/api/students/${nis}`);
      if (res.ok) {
        const data: StudentData = await res.json();
        setStudent(data);
        toast.dismiss(id);
        startLocationTracking();
      } else {
        toast.error('Siswa tidak ditemukan', { id, description: 'Pastikan NIS yang dimasukkan benar.' });
      }
    } catch { toast.error('Terjadi kesalahan', { id }); }
  };

  const startLocationTracking = () => {
    setStep('SCANNING');
    if (!navigator.geolocation) { toast.error('Geolokasi tidak didukung'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      ()  => toast.error('Error Lokasi', { description: 'Gagal mendapatkan lokasi presisi.' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleScan = async (result: any) => {
    if (!result?.[0] || !location) return;
    const token: string = result[0].rawValue;
    const id = toast.loading('Memvalidasi presensi...');
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nis, token, latitude: location.lat, longitude: location.lng }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Presensi Berhasil!', { id });
        setScanResult({ status: 'VALID', distance: data.distance });
        setStep('SUCCESS');
        setTimeout(resetAll, 5500);
      } else {
        toast.error('Presensi Gagal', { id, description: data.error });
        if (data.distance !== undefined) setScanResult({ status: 'INVALID', distance: data.distance });
      }
    } catch { toast.error('Terjadi Kesalahan', { id }); }
  };

  // Kalkulasi jarak real-time & logika persentase bar
  const liveDistance = location 
    ? getDistanceFromLatLonInM(location.lat, location.lng, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng)
    : 0;
  
  const displayDistance = scanResult?.distance ?? liveDistance;
  const isLocationValid = displayDistance <= MAX_DISTANCE_M;
  
  const fillPercent = isLocationValid
    ? Math.max(10, 100 - (displayDistance / MAX_DISTANCE_M) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E4E4E7]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E4E4E7]/40 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">

        {/* ── INPUT NIS ─────────────────────────────────────────────────────── */}
        {step === 'INPUT_NIS' && (
          <motion.div
            key="input"
            initial={PAGE_INIT} animate={PAGE_IN} exit={PAGE_OUT}
            transition={pageTransition}
            className="w-full max-w-md z-10"
          >
            <Card className="border-[#E4E4E7] shadow-xl bg-white text-[#09090B] rounded-2xl overflow-hidden">
              <CardContent className="pt-10 pb-8 px-6 flex flex-col items-center gap-6">
                <motion.div
                  className="w-16 h-16 bg-[#09090B] rounded-2xl flex items-center justify-center shadow-md"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.06 }}
                >
                  <QrCode className="w-8 h-8 text-white" />
                </motion.div>

                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.28 }}
                >
                  <h1 className="text-3xl font-bold tracking-tight">Presensi QR</h1>
                  <p className="text-[#71717A] text-sm mt-1">Masukkan NIS Anda untuk memulai</p>
                </motion.div>

                <motion.div
                  className="w-full space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.20, duration: 0.28 }}
                >
                  <Input
                    placeholder="Nomor Induk Siswa"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyNis()}
                    className="h-12 text-lg text-center bg-white border-[#E4E4E7] text-[#09090B] placeholder:text-[#A1A1AA] focus-visible:ring-[#09090B] rounded-xl"
                    type="number"
                    inputMode="numeric"
                  />
                  <motion.div whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    <Button
                      className="w-full h-12 text-base font-semibold bg-[#09090B] hover:bg-[#18181B] text-white border-0 rounded-xl transition-colors duration-150"
                      onClick={handleVerifyNis}
                      disabled={!nis}
                    >
                      Lanjutkan <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── SCANNING ──────────────────────────────────────────────────────── */}
        {step === 'SCANNING' && (
          <motion.div
            key="scan"
            initial={PAGE_INIT} animate={PAGE_IN} exit={PAGE_OUT}
            transition={pageTransition}
            className="w-full max-w-md z-10"
          >
            <motion.div className="space-y-3" variants={staggerContainer} initial="initial" animate="animate">

              {/* Header */}
              <motion.div variants={staggerItem} className="bg-white rounded-2xl px-4 py-3 ring-1 ring-[#E4E4E7] flex items-center gap-3 shadow-sm">
                <motion.button
                  onClick={resetAll}
                  aria-label="Kembali"
                  className="w-8 h-8 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center"
                  whileHover={{ scale: 1.1, backgroundColor: '#E4E4E7' }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <ArrowLeft className="w-4 h-4 text-[#09090B]" />
                </motion.button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#09090B] leading-tight">Scan Presensi</p>
                  <p className="text-xs text-[#71717A]">SMA Negeri 1 Ambarawa</p>
                </div>
                <GpsDot />
              </motion.div>

              {/* Student card (Jam realtime ada di dalam sini) */}
              {student && <StudentInfoCard student={student} />}

              {/* Camera viewport */}
              <motion.div variants={staggerItem} className="relative rounded-3xl overflow-hidden bg-zinc-900 aspect-[4/3] ring-1 ring-[#E4E4E7] shadow-lg">
                {location ? (
                  <>
                    <Scanner onScan={handleScan} formats={['qr_code']} components={{ finder: false }} />
                    <ScannerOverlay />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/55 to-transparent py-3 flex justify-center pointer-events-none">
                      <p className="text-white/60 text-xs tracking-wide">Arahkan kamera ke QR Code</p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                    <Loader2 className="w-8 h-8 animate-spin opacity-55" />
                    <p className="text-sm opacity-50">Mendapatkan lokasi GPS…</p>
                  </div>
                )}
              </motion.div>

              {/* Geolocation + Validasi (Clean UI) */}
              {location && (
                <motion.div variants={staggerItem} className="bg-white rounded-2xl ring-1 ring-[#E4E4E7] overflow-hidden shadow-sm">
                  <GeolocationVisualizer
                    studentLat={location.lat} studentLng={location.lng}
                    schoolLat={SCHOOL_COORDS.lat} schoolLng={SCHOOL_COORDS.lng}
                    distance={displayDistance}
                    maxDistance={MAX_DISTANCE_M}
                    status={scanResult?.status ?? (isLocationValid ? 'VALID' : 'INVALID')}
                  />
                  
                  {/* Clean Status Area */}
                  <div className="p-4 space-y-4 border-t border-[#F4F4F5]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Jarak Anda</p>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-bold text-[#09090B]">
                            <AnimatedNumber value={Math.round(displayDistance)} />
                          </span>
                          <span className="text-sm font-medium text-[#71717A]">meter</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Batas Maks</p>
                        <p className="text-sm font-medium text-[#3F3F46] mt-0.5">{MAX_DISTANCE_M} meter</p>
                      </div>
                    </div>

                    <StatusPill isValid={isLocationValid} fillPercent={fillPercent} />
                  </div>
                </motion.div>
              )}

              {/* Action buttons disederhanakan */}
              <motion.div variants={staggerItem}>
                <Button
                  variant="ghost"
                  className="w-full h-11 text-sm font-medium hover:bg-[#F4F4F5] rounded-xl transition-colors duration-150 text-[#71717A]"
                  onClick={startLocationTracking}
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Segarkan Lokasi GPS
                </Button>
              </motion.div>

            </motion.div>
          </motion.div>
        )}

        {/* ── SUCCESS ───────────────────────────────────────────────────────── */}
        {step === 'SUCCESS' && (
          <motion.div
            key="success"
            initial={PAGE_INIT} animate={PAGE_IN} exit={{ ...PAGE_OUT, transition: exitTransition }}
            transition={pageTransition}
            className="w-full max-w-md z-10"
          >
            <Card className="border-[#E4E4E7] shadow-xl bg-white text-[#09090B] rounded-2xl overflow-hidden">
              <CardContent className="pt-10 pb-10 flex flex-col items-center gap-5 text-center">
                <SuccessRing>
                  <motion.div
                    className="w-[72px] h-[72px] rounded-full bg-[#09090B] flex items-center justify-center"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.55, type: 'spring', bounce: 0.5 }}
                  >
                    <motion.svg
                      width="32" height="32" viewBox="0 0 24 24"
                      fill="none" stroke="white" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.85, duration: 0.38, ease: 'easeOut' }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  </motion.div>
                </SuccessRing>

                <motion.div
                  className="space-y-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="text-2xl font-bold tracking-tight">Presensi Berhasil!</h2>
                  <p className="text-[#09090B] text-base font-semibold">{student?.nama_siswa}</p>
                  <p className="text-[#71717A] text-sm">{student?.kelas} · NIS {student?.nis}</p>
                </motion.div>

                <motion.div
                  className="inline-flex items-center gap-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-xl px-4 py-2.5"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.56, type: 'spring', bounce: 0.42 }}
                >
                  <MapPin className="w-4 h-4 text-[#71717A]" />
                  <p className="text-sm font-medium text-[#3F3F46]">
                    Jarak: <AnimatedNumber value={Math.round(scanResult?.distance ?? 0)} suffix=" m" />
                  </p>
                </motion.div>

                <motion.div className="flex gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.78 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      animate={{ backgroundColor: ['#09090B', '#D4D4D8', '#D4D4D8'] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
                    />
                  ))}
                </motion.div>

                <motion.p
                  className="text-xs text-[#A1A1AA]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.92 }}
                >
                  Halaman akan direset dalam 5 detik…
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
