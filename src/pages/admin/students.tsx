import React, { useState, useEffect, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState
} from '@tanstack/react-table';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Upload, Plus, Search, Trash2, Edit, ChevronDown, ChevronUp, ChevronsUpDown, FileX } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/src/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Label } from "@/src/components/ui/label";

type Student = {
  id: string;
  nis: string;
  nama_siswa: string;
  kelas: string;
  keterangan: string | null;
  status: string | null;
};

export default function AdminStudents() {
  const [data, setData] = useState<Student[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ nis: '', nama_siswa: '', kelas: '', keterangan: '', status: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alert Dialog State
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/students');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      toast.error('Gagal memuat data siswa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(data.map((s: Student) => s.kelas));
    return Array.from(classes).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (classFilter === 'all') return data;
    return data.filter((s: Student) => s.kelas === classFilter);
  }, [data, classFilter]);

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    try {
      const res = await fetch(`/api/admin/students/${studentToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Siswa berhasil dihapus');
        fetchStudents();
      } else {
        toast.error('Gagal menghapus siswa');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setIsAlertOpen(false);
      setStudentToDelete(null);
    }
  };

  const openDeleteAlert = (id: string) => {
    setStudentToDelete(id);
    setIsAlertOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/^\uFEFF/, ''),
      complete: async (results) => {
        const students = results.data.map((row: any) => ({
          nis: row.nis || row.nisn || '',
          nama_siswa: row.nama_siswa || row.nama || row.name || '',
          kelas: row.kelas || row.class || '',
          keterangan: row.keterangan || row.desc || '',
          status: row.status || ''
        })).filter(s => s.nis && s.nama_siswa && s.kelas);

        if (students.length === 0) {
          toast.error('Format CSV tidak valid', { description: 'Pastikan ada kolom nis, nama_siswa, dan kelas' });
          return;
        }

        const loadingToast = toast.loading(`Mengimpor ${students.length} data...`);
        try {
          const res = await fetch('/api/admin/students/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students })
          });
          const resultData = await res.json();
          if (res.ok) {
            toast.success(`Berhasil mengimpor ${resultData.imported} siswa`, { id: loadingToast });
            fetchStudents();
          } else {
            toast.error('Gagal mengimpor data', { id: loadingToast });
          }
        } catch (err) {
          toast.error('Terjadi kesalahan server', { id: loadingToast });
        }
      }
    });
    e.target.value = ''; // reset
  };

  const openSheet = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        nis: student.nis,
        nama_siswa: student.nama_siswa,
        kelas: student.kelas,
        keterangan: student.keterangan || '',
        status: student.status || ''
      });
    } else {
      setEditingStudent(null);
      setFormData({ nis: '', nama_siswa: '', kelas: '', keterangan: '', status: '' });
    }
    setIsSheetOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const url = editingStudent 
      ? `/api/admin/students/${editingStudent.id}` 
      : '/api/admin/students';
    const method = editingStudent ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success(editingStudent ? 'Data siswa diperbarui' : 'Siswa berhasil ditambahkan');
        setIsSheetOpen(false);
        fetchStudents();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan data');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo<ColumnDef<Student>[]>(() => [
    { 
      accessorKey: 'nis', 
      header: ({ column }: { column: any }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-[#71717A] hover:text-[#09090B] px-0"
          >
            NIS
            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> : <ChevronsUpDown className="ml-2 h-4 w-4" />}
          </Button>
        )
      }
    },
    { 
      accessorKey: 'nama_siswa', 
      header: ({ column }: { column: any }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-[#71717A] hover:text-[#09090B] px-0"
          >
            Nama Siswa
            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> : <ChevronsUpDown className="ml-2 h-4 w-4" />}
          </Button>
        )
      }
    },
    { accessorKey: 'kelas', header: 'Kelas' },
    { accessorKey: 'keterangan', header: 'Keterangan' },
    { accessorKey: 'status', header: 'Status' },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => openSheet(row.original)} className="h-8 w-8 text-[#71717A] hover:text-[#09090B] hover:bg-[#F9FAFB]">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openDeleteAlert(row.original.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: { pageSize: 10 }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#09090B]">Manajemen Siswa</h1>
          <p className="text-[#71717A] mt-1">Kelola data siswa dan import via CSV</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="gap-2 border-[#E4E4E7] text-[#09090B] hover:bg-[#F9FAFB]">
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
          </div>
          <Button onClick={() => openSheet()} className="gap-2 bg-[#09090B] hover:bg-[#09090B]/90 text-white">
            <Plus className="w-4 h-4" /> Tambah Siswa
          </Button>
        </div>
      </div>

      <Card className="border-[#E4E4E7] shadow-none rounded-md bg-white">
        <CardHeader className="pb-4 border-b border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:max-w-sm">
            <Search className="w-5 h-5 text-[#71717A]" />
            <Input 
              placeholder="Cari NIS, Nama..." 
              value={globalFilter ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
              className="bg-white border-[#E4E4E7] focus-visible:ring-[#09090B]"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={classFilter} onValueChange={(val) => setClassFilter(val || 'all')}>
              <SelectTrigger className="border-[#E4E4E7] focus:ring-[#09090B]">
                <SelectValue placeholder="Filter Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {uniqueClasses.map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F9FAFB]">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id} className="border-[#E4E4E7] hover:bg-transparent">
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} className="text-[#71717A] font-medium">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i: number) => (
                    <TableRow key={i} className="border-[#E4E4E7]">
                      {columns.map((_, j: number) => (
                        <TableCell key={j}>
                          <div className="h-5 bg-[#F9FAFB] rounded animate-pulse border border-[#E4E4E7]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} className="border-[#E4E4E7]">
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="text-[#09090B]">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-48 text-center text-[#71717A]">
                      <div className="flex flex-col items-center justify-center">
                        <FileX className="w-10 h-10 mb-4 opacity-20" />
                        <p className="text-base font-medium text-[#09090B]">Belum ada data siswa</p>
                        <p className="text-sm mt-1">Silakan tambah data baru atau import via CSV.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between p-4 border-t border-[#E4E4E7]">
            <div className="text-sm font-medium text-[#71717A]">
              Menampilkan {table.getRowModel().rows.length} dari {filteredData.length} siswa
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-md border-[#E4E4E7] text-[#09090B]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-md border-[#E4E4E7] text-[#09090B]"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md bg-white border-l border-[#E4E4E7]">
          <SheetHeader>
            <SheetTitle className="text-[#09090B]">{editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</SheetTitle>
            <SheetDescription className="text-[#71717A]">
              Masukkan detail informasi siswa di bawah ini.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleFormSubmit} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nis" className="text-[#09090B]">NIS</Label>
                <Input 
                  id="nis" 
                  value={formData.nis} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nis: e.target.value})} 
                  required 
                  className="border-[#E4E4E7] focus-visible:ring-[#09090B]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama_siswa" className="text-[#09090B]">Nama Siswa</Label>
                <Input 
                  id="nama_siswa" 
                  value={formData.nama_siswa} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nama_siswa: e.target.value})} 
                  required 
                  className="border-[#E4E4E7] focus-visible:ring-[#09090B]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kelas" className="text-[#09090B]">Kelas</Label>
                <Input 
                  id="kelas" 
                  value={formData.kelas} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, kelas: e.target.value})} 
                  required 
                  className="border-[#E4E4E7] focus-visible:ring-[#09090B]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keterangan" className="text-[#09090B]">Keterangan (Opsional)</Label>
                <Input 
                  id="keterangan" 
                  value={formData.keterangan} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, keterangan: e.target.value})} 
                  className="border-[#E4E4E7] focus-visible:ring-[#09090B]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-[#09090B]">Status (Opsional)</Label>
                <Input 
                  id="status" 
                  value={formData.status} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, status: e.target.value})} 
                  className="border-[#E4E4E7] focus-visible:ring-[#09090B]"
                />
              </div>
            </div>
            <SheetFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-[#09090B] hover:bg-[#09090B]/90 text-white">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-white border-[#E4E4E7]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#09090B]">Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#71717A]">
              Tindakan ini tidak dapat dibatalkan. Data siswa ini akan dihapus secara permanen dari server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default" className="border-[#E4E4E7] text-[#09090B] hover:bg-[#F9FAFB]">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
