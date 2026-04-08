import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Login berhasil');
        navigate('/admin');
      } else {
        toast.error('Login gagal', { description: data.error });
      }
    } catch (error) {
      toast.error('Terjadi kesalahan', { description: 'Gagal menghubungi server' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl border-[#E4E4E7] rounded-xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 bg-[#09090B] text-white rounded-xl flex items-center justify-center mb-2 shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#09090B]">Admin Portal</CardTitle>
          <CardDescription className="text-[#71717A]">Login untuk mengakses dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#09090B]">Username</label>
              <Input 
                placeholder="admin" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-[#E4E4E7] focus-visible:ring-[#09090B]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#09090B]">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-[#E4E4E7] focus-visible:ring-[#09090B]"
              />
            </div>
            <Button className="w-full mt-2 bg-[#09090B] hover:bg-[#09090B]/90 text-white" type="submit" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
