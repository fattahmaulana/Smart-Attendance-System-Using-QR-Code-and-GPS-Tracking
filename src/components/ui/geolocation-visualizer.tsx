import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Navigation } from 'lucide-react';

interface GeolocationVisualizerProps {
  studentLat?: number;
  studentLng?: number;
  schoolLat: number;
  schoolLng: number;
  distance: number;
  maxDistance: number;
  status?: 'VALID' | 'INVALID' | 'PENDING';
}

export function GeolocationVisualizer({
  studentLat,
  studentLng,
  schoolLat,
  schoolLng,
  distance,
  maxDistance,
  status = 'PENDING'
}: GeolocationVisualizerProps) {
  const isValid = status === 'VALID';
  const isInvalid = status === 'INVALID';
  
  // Calculate percentage for the progress bar (cap at 100%)
  const percentage = Math.min((distance / maxDistance) * 100, 100);

  return (
    <div className="w-full space-y-4 p-4 rounded-xl bg-[#F9FAFB] border border-[#E4E4E7]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-[#09090B]">
          <Navigation className="w-4 h-4 text-[#09090B]" />
          <span>Verifikasi Lokasi</span>
        </div>
        {status !== 'PENDING' && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isValid 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-red-100 text-red-700'
            }`}
          >
            {isValid ? 'Within Range' : 'Out of Range'}
          </motion.div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[#71717A]">
          <span>Jarak Anda: <strong className="text-[#09090B]">{Math.round(distance)}m</strong></span>
          <span>Maks: {maxDistance}m</span>
        </div>
        
        <div className="relative h-3 w-full bg-[#E4E4E7] rounded-full overflow-hidden">
          {/* Safe Zone Indicator */}
          <div className="absolute top-0 left-0 h-full bg-emerald-500/20 w-full" />
          
          {/* Distance Bar */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute top-0 left-0 h-full rounded-full ${
              isValid ? 'bg-emerald-500' : isInvalid ? 'bg-red-500' : 'bg-[#09090B]'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E4E4E7]">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">Koordinat Sekolah</p>
          <p className="text-xs font-mono text-[#09090B]">
            {schoolLat.toFixed(4)}, {schoolLng.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">Koordinat Anda</p>
          <p className="text-xs font-mono text-[#09090B]">
            {studentLat ? `${studentLat.toFixed(4)}, ${studentLng?.toFixed(4)}` : 'Mencari...'}
          </p>
        </div>
      </div>
    </div>
  );
}
