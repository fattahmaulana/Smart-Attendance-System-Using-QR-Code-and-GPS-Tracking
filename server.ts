import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

// Haversine formula utility
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Hardcoded school coordinates
const SCHOOL_LAT = -7.0170;
const SCHOOL_LNG = 110.3972;
const MAX_DISTANCE_M = 50;

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Increase payload size for CSV uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // --- API Routes ---

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.admin = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // 1. Auth Login
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    // For demo purposes, if no admin exists, create one
    let admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin && username === 'admin') {
      const hash = await bcrypt.hash('admin123', 10);
      admin = await prisma.admin.create({
        data: { username: 'admin', password_hash: hash }
      });
    }

    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ success: true, username: admin.username });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: any, res) => {
    res.json({ user: req.admin });
  });

  // 2. Generate QR Code
  app.get('/api/admin/qr', requireAuth, async (req, res) => {
    // Delete expired sessions
    await prisma.qrSession.deleteMany({
      where: { expired_at: { lt: new Date() } }
    });

    // Create new session valid for 1 minute
    const token = crypto.randomBytes(32).toString('hex');
    const expired_at = new Date(Date.now() + 60 * 1000); // 1 minute

    const session = await prisma.qrSession.create({
      data: { token, expired_at }
    });

    res.json({ token: session.token, expired_at: session.expired_at });
  });

  // 3. Scan & Validate Attendance
  app.post('/api/attendance/scan', async (req, res) => {
    const { nis, token, latitude, longitude } = req.body;

    if (!nis || !token || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate Student
    const student = await prisma.student.findUnique({ where: { nis } });
    if (!student) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan. Pastikan NIS benar.' });
    }

    // Validate Token
    const session = await prisma.qrSession.findUnique({ where: { token } });
    if (!session) {
      return res.status(400).json({ error: 'QR Code tidak valid atau sudah kedaluwarsa' });
    }
    if (new Date() > session.expired_at) {
      return res.status(400).json({ error: 'QR Code sudah kedaluwarsa' });
    }

    // Validate Location
    const distance = getDistanceFromLatLonInM(latitude, longitude, SCHOOL_LAT, SCHOOL_LNG);
    const status = distance <= MAX_DISTANCE_M ? 'VALID' : 'INVALID';

    // Check if student already has attendance record for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        nis,
        timestamp: { gte: startOfToday }
      }
    });

    // If today's attendance already exists
    if (existingAttendance) {
      // If previous status was VALID, reject the new scan
      if (existingAttendance.status === 'VALID') {
        return res.status(409).json({
          error: 'Anda sudah melakukan presensi hari ini',
          distance,
          student
        });
      }
      
      // If previous status was INVALID, update the existing record
      const updatedAttendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          latitude,
          longitude,
          distance,
          status,
          timestamp: new Date()
        },
        include: { student: true }
      });

      if (status === 'INVALID') {
        return res.status(400).json({
          error: `Lokasi di luar jangkauan (${Math.round(distance)}m). Maksimal ${MAX_DISTANCE_M}m. Silakan coba scan ulang lebih dekat ke sekolah.`,
          distance,
          student,
          updated: true
        });
      }

      return res.json({ 
        success: true, 
        message: 'Presensi berhasil diperbarui', 
        distance, 
        student,
        updated: true 
      });
    }

    // If no existing attendance today, create new record
    const attendance = await prisma.attendance.create({
      data: {
        nis,
        latitude,
        longitude,
        distance,
        status
      },
      include: { student: true }
    });

    if (status === 'INVALID') {
      return res.status(400).json({ 
        error: `Lokasi di luar jangkauan (${Math.round(distance)}m). Maksimal ${MAX_DISTANCE_M}m. Silakan coba scan ulang lebih dekat ke sekolah.`,
        distance,
        student
      });
    }

    res.json({ success: true, message: 'Presensi berhasil dicatat', distance, student });
  });

  // 3b. Validate NIS Only (for pre-scan check)
  app.get('/api/students/:nis', async (req, res) => {
    const student = await prisma.student.findUnique({ where: { nis: req.params.nis } });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  });

  // 4. Get Attendance Records
  app.get('/api/admin/attendance', requireAuth, async (req, res) => {
    const { page = '1', limit = '10', status, date } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      where.timestamp = { gte: startOfDay, lte: endOfDay };
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        include: { student: true },
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      })
    ]);

    res.json({
      data: records,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  });

  // Hapus SEMUA Data Presensi
  app.delete('/api/admin/attendance', requireAuth, async (req, res) => {
    try {
      // deleteMany({}) akan menghapus semua baris di tabel attendance
      await prisma.attendance.deleteMany({});
      res.json({ success: true, message: 'Semua data presensi berhasil dihapus' });
    } catch (e) {
      console.error('Error deleting all attendance:', e);
      res.status(500).json({ error: 'Gagal menghapus semua data presensi' });
    }
  });

  // Hapus Data Presensi
  app.delete('/api/admin/attendance/:id', requireAuth, async (req, res) => {
    try {
      await prisma.attendance.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true, message: 'Data presensi berhasil dihapus' });
    } catch (e) {
      console.error('Error deleting attendance:', e);
      res.status(500).json({ error: 'Gagal menghapus data presensi' });
    }
  });

  // 5. Get Stats
  app.get('/api/admin/stats', requireAuth, async (req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get all attendance records for today, ordered by timestamp DESC
    const allAttendanceToday = await prisma.attendance.findMany({
      where: { timestamp: { gte: startOfToday } },
      orderBy: { timestamp: 'desc' }
    });

    // Get unique students by taking the first (latest) record per NIS
    const uniqueStudentsMap = new Map();
    allAttendanceToday.forEach(record => {
      if (!uniqueStudentsMap.has(record.nis)) {
        uniqueStudentsMap.set(record.nis, record);
      }
    });

    const uniqueRecords = Array.from(uniqueStudentsMap.values());
    const validToday = uniqueRecords.filter(r => r.status === 'VALID').length;
    const invalidToday = uniqueRecords.filter(r => r.status === 'INVALID').length;
    const totalToday = validToday;
    const totalStudents = await prisma.student.count();

    res.json({ totalToday, validToday, invalidToday, totalStudents });
  });

  // 6. Student CRUD
  app.get('/api/admin/students', requireAuth, async (req, res) => {
    const students = await prisma.student.findMany({
      orderBy: { nama_siswa: 'asc' }
    });
    res.json(students);
  });

  app.post('/api/admin/students', requireAuth, async (req, res) => {
    const { nis, nama_siswa, kelas, keterangan, status } = req.body;
    try {
      const student = await prisma.student.create({
        data: { nis, nama_siswa, kelas, keterangan, status }
      });
      res.json(student);
    } catch (e: any) {
      console.error('Error creating student:', e);
      if (e.code === 'P2002') return res.status(400).json({ error: 'NIS sudah terdaftar' });
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/students/:id', requireAuth, async (req, res) => {
    const { nis, nama_siswa, kelas, keterangan, status } = req.body;
    try {
      const student = await prisma.student.update({
        where: { id: req.params.id },
        data: { nis, nama_siswa, kelas, keterangan, status }
      });
      res.json(student);
    } catch (e: any) {
      console.error('Error updating student:', e);
      if (e.code === 'P2002') return res.status(400).json({ error: 'NIS sudah terdaftar' });
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/students/:id', requireAuth, async (req, res) => {
    try {
      await prisma.student.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/students/import', requireAuth, async (req, res) => {
    const { students } = req.body; // Array of {nis, nama_siswa, kelas, keterangan, status}
    if (!Array.isArray(students)) return res.status(400).json({ error: 'Invalid data format' });

    try {
      let imported = 0;
      for (const s of students) {
        if (s.nis && s.nama_siswa && s.kelas) {
          await prisma.student.upsert({
            where: { nis: String(s.nis) },
            update: { 
              nama_siswa: s.nama_siswa, 
              kelas: s.kelas,
              keterangan: s.keterangan ? String(s.keterangan) : null,
              status: s.status ? String(s.status) : null
            },
            create: { 
              nis: String(s.nis), 
              nama_siswa: s.nama_siswa, 
              kelas: s.kelas,
              keterangan: s.keterangan ? String(s.keterangan) : null,
              status: s.status ? String(s.status) : null
            }
          });
          imported++;
        }
      }
      res.json({ success: true, imported });
    } catch (e) {
      console.error('Error importing students:', e);
      res.status(500).json({ error: 'Import failed' });
    }
  });

  // --- Vite Middleware / Static Files ---
  if (process.env.NODE_ENV !== 'production') {
    // Development: Use Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve pre-built frontend from dist/public
    const publicPath = path.join(process.cwd(), 'dist', 'public');
    app.use(express.static(publicPath, {
      maxAge: '1d',
      index: false,
    }));
    
    // SPA fallback: serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) {
          res.status(404).json({ error: 'Not found' });
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
