import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const students = [
    { nis: '1001', nama_siswa: 'Ahmad Budi', kelas: 'X IPA 1' },
    { nis: '1002', nama_siswa: 'Siti Aminah', kelas: 'X IPA 1' },
    { nis: '1003', nama_siswa: 'Joko Susilo', kelas: 'X IPS 2' },
    { nis: '1004', nama_siswa: 'Rina Wati', kelas: 'XI IPA 3' },
    { nis: '1005', nama_siswa: 'Bagus Prakoso', kelas: 'XII IPS 1' },
    { nis: '1006', nama_siswa: 'Dewi Lestari', kelas: 'XII IPS 1' },
    { nis: '1007', nama_siswa: 'Bima Sakti', kelas: 'X IPA 2' },
    { nis: '1008', nama_siswa: 'Citra Kirana', kelas: 'XI IPS 1' },
  ];

  for (const s of students) {
    await prisma.student.upsert({
      where: { nis: s.nis },
      update: {},
      create: s,
    });
  }
  console.log('Seed completed: Inserted sample students from SMAN 1 Ambarawa');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
