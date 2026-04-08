import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { User, QrCode, ArrowRight, CheckCircle2 } from 'lucide-react';
import { MAX_DISTANCE_M, SCHOOL_COORDS } from '@/src/lib/haversine';
import { GeolocationVisualizer } from '@/src/components/ui/geolocation-visualizer';

export default function ScanPage() {
  const [nis, setNis] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [step, setStep] = useState<'INPUT_NIS' | 'SCANNING' | 'SUCCESS'>('INPUT_NIS');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleVerifyNis = async () => {
    if (!nis || !/^\d+$/.test(nis)) {
      toast.error('NIS tidak valid', { description: 'Harap masukkan NIS yang hanya berisi angka.' });
      return;
    }

    const loadingToast = toast.loading('Memverifikasi NIS...');
    try {
      const res = await fetch(`/api/students/${nis}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);
        toast.dismiss(loadingToast);
        startLocationTracking();
      } else {
        toast.error('Siswa tidak ditemukan', { id: loadingToast, description: 'Pastikan NIS yang dimasukkan benar.' });
      }
    } catch (e) {
      toast.error('Terjadi kesalahan', { id: loadingToast });
    }
  };

  const startLocationTracking = () => {
    setIsLocating(true);
    setStep('SCANNING');
    
    if (!navigator.geolocation) {
      toast.error('Geolokasi tidak didukung');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        toast.error('Error Lokasi', { description: 'Gagal mendapatkan lokasi presisi.' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleScan = async (result: any) => {
    if (!result || !result[0] || !location) return;
    const token = result[0].rawValue;
    
    const loadingToast = toast.loading('Memvalidasi presensi...');

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis,
          token,
          latitude: location.lat,
          longitude: location.lng,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Presensi Berhasil', { id: loadingToast });
        setScanResult({ status: 'VALID', distance: data.distance });
        setStep('SUCCESS');
        
        // Reset after 5 seconds
        setTimeout(() => {
          setStep('INPUT_NIS');
          setNis('');
          setStudent(null);
          setScanResult(null);
          setLocation(null);
        }, 5000);
      } else {
        toast.error('Presensi Gagal', { id: loadingToast, description: data.error });
        if (data.distance) {
          setScanResult({ status: 'INVALID', distance: data.distance });
        }
      }
    } catch (error) {
      toast.error('Terjadi Kesalahan', { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E4E4E7]/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E4E4E7]/50 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'INPUT_NIS' && (
          <motion.div 
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md z-10"
          >
            <Card className="border-[#E4E4E7] shadow-xl bg-white text-[#09090B] rounded-xl">
              <CardHeader className="text-center space-y-2 pb-8">
                <div className="mx-auto w-16 h-16 bg-[#09090B] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <QrCode className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight">Presensi QR</CardTitle>
                <CardDescription className="text-[#71717A] text-base">
                  Masukkan NIS Anda untuk memulai
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Input 
                    placeholder="NIS Siswa" 
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="h-14 text-xl text-center bg-white border-[#E4E4E7] text-[#09090B] placeholder:text-[#71717A] focus-visible:ring-[#09090B]"
                    type="number"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyNis()}
                  />
                </div>
                <Button 
                  className="w-full h-14 text-lg font-medium bg-[#09090B] hover:bg-[#09090B]/90 text-white border-0" 
                  onClick={handleVerifyNis}
                  disabled={!nis}
                >
                  Lanjutkan <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'SCANNING' && (
          <motion.div 
            key="scan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-md z-10 space-y-4"
          >
            {/* Student Info Card */}
            <div className="bg-white rounded-2xl p-4 ring-1 ring-[#E4E4E7] flex items-center gap-4 text-[#09090B] shadow-sm">
              <div className="w-12 h-12 bg-[#F9FAFB] border border-[#E4E4E7] rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-[#09090B]" />
              </div>
              <div>
                <p className="font-bold text-lg">{student?.nama_siswa}</p>
                <p className="text-sm text-[#71717A]">{student?.kelas} • NIS: {student?.nis}</p>
              </div>
            </div>

            {/* Scanner Area */}
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] ring-1 ring-[#E4E4E7] shadow-xl">
              {location ? (
                <>
                  <Scanner 
                    onScan={handleScan}
                    formats={['qr_code']}
                    components={{
                      finder: false
                    }}
                  />
                  {/* Futuristic Scanner Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                      {/* Corner markers */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
                      
                      {/* Scanning line */}
                      <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 w-full h-0.5 bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  <p>Mendapatkan Lokasi GPS...</p>
                </div>
              )}
            </div>

            {/* Geolocation Visualizer */}
            {location && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-[#E4E4E7]">
                <GeolocationVisualizer 
                  studentLat={location.lat}
                  studentLng={location.lng}
                  schoolLat={SCHOOL_COORDS.lat}
                  schoolLng={SCHOOL_COORDS.lng}
                  distance={scanResult?.distance || 0}
                  maxDistance={MAX_DISTANCE_M}
                  status={scanResult?.status || 'PENDING'}
                />
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#09090B]" 
              onClick={() => {
                setStep('INPUT_NIS');
                setScanResult(null);
              }}
            >
              Batal
            </Button>
          </motion.div>
        )}

        {step === 'SUCCESS' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md z-10"
          >
            <Card className="border-[#E4E4E7] shadow-xl bg-white text-[#09090B] overflow-hidden relative rounded-xl">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[#F9FAFB] rounded-full blur-2xl" />
              <CardContent className="pt-10 pb-10 text-center space-y-6 relative z-10">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="mx-auto w-24 h-24 bg-[#09090B] rounded-full flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">Presensi Berhasil!</h2>
                  <p className="text-[#09090B] text-lg font-medium">{student?.nama_siswa}</p>
                  <p className="text-[#71717A]">{student?.kelas}</p>
                </div>

                <div className="bg-[#F9FAFB] border border-[#E4E4E7] rounded-xl p-4 inline-block">
                  <p className="text-sm font-medium text-[#09090B]">Jarak dari sekolah: {Math.round(scanResult?.distance || 0)}m</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
