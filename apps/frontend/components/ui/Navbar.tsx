'use client';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/campaigns', label: 'Campañas' },
    { href: '/pipeline', label: 'Pipeline' },
    { href: '/agent', label: 'Agente IA' },
    { href: '/calls', label: 'Llamadas' },
    { href: '/metrics', label: 'Métricas' },
  ];

  return (
    <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-lg cursor-pointer" onClick={() => router.push('/dashboard')}>VoiceAgent</span>
        <div className="flex gap-4 text-sm">
          {links.map(link => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className={`transition-colors ${pathname === link.href ? 'text-white font-medium' : 'text-gray-400 hover:text-white'}`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">{user?.email}</span>
        <button onClick={logout} className="text-gray-400 hover:text-white"><LogOut size={16} /></button>
      </div>
    </nav>
  );
}
