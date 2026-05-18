'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Phone, Users, TrendingUp, Clock, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const { data } = await api.get('/api/calls');
      setCalls(data.calls || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const completed = calls.filter(c => c.status === 'completed').length;
  const interested = calls.filter(c => c.result === 'interesado').length;
  const avgDuration = calls.length > 0
    ? Math.round(calls.reduce((a, c) => a + (c.duration_seconds || 0), 0) / calls.length)
    : 0;

  const statusBadge = (status: string) => {
    const map: any = {
      completed: 'bg-green-950 text-green-400 border-green-800',
      initiated: 'bg-blue-950 text-blue-400 border-blue-800',
      'no-answer': 'bg-yellow-950 text-yellow-400 border-yellow-800',
      busy: 'bg-red-950 text-red-400 border-red-800',
      failed: 'bg-red-950 text-red-400 border-red-800',
    };
    return map[status] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const resultBadge = (result: string) => {
    const map: any = {
      interesado: 'bg-green-950 text-green-400 border-green-800',
      no_interesado: 'bg-red-950 text-red-400 border-red-800',
      callback: 'bg-yellow-950 text-yellow-400 border-yellow-800',
      en_curso: 'bg-blue-950 text-blue-400 border-blue-800',
    };
    return map[result] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const resultLabel: any = {
    interesado: '✓ Interesado',
    no_interesado: '✗ No interesado',
    callback: '↩ Rellamar',
    en_curso: '● En curso',
    continuar: '● En curso'
  };

  const renderSummary = (summary: string) => {
    try {
      const history = JSON.parse(summary);
      if (Array.isArray(history)) {
        return (
          <div className="space-y-2">
            {history.map((h: any, i: number) => (
              <div key={i} className={`flex gap-2 ${h.role === 'assistant' ? 'text-blue-300' : 'text-gray-300'}`}>
                <span className="text-xs font-medium flex-shrink-0 mt-0.5">
                  {h.role === 'assistant' ? '🤖 Agente:' : '👤 Cliente:'}
                </span>
                <span className="text-xs">{h.content}</span>
              </div>
            ))}
          </div>
        );
      }
      return <p className="text-sm">{summary}</p>;
    } catch {
      return <p className="text-sm">{summary}</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg">VoiceAgent</span>
          <div className="flex gap-4 text-sm">
            <button onClick={() => router.push('/dashboard')} className="text-white font-medium">Dashboard</button>
            <button onClick={() => router.push('/campaigns')} className="text-gray-400 hover:text-white transition-colors">Campañas</button>
            <button onClick={() => router.push('/pipeline')} className="text-gray-400 hover:text-white transition-colors">Pipeline</button>
            <button onClick={() => router.push('/agent')} className="text-gray-400 hover:text-white transition-colors">Agente IA</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={logout} className="text-gray-400 hover:text-white"><LogOut size={16} /></button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total llamadas', value: calls.length, icon: Phone, color: 'text-blue-400' },
            { label: 'Completadas', value: completed, icon: TrendingUp, color: 'text-green-400' },
            { label: 'Interesados', value: interested, icon: Users, color: 'text-purple-400' },
            { label: 'Duración prom.', value: `${Math.floor(avgDuration / 60)}:${String(avgDuration % 60).padStart(2, '0')}`, icon: Clock, color: 'text-amber-400' },
          ].map((m, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</span>
                <m.icon size={16} className={m.color} />
              </div>
              <div className="text-2xl font-semibold">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-medium">Llamadas recientes</h2>
            <button onClick={fetchCalls} className="text-xs text-blue-400 hover:text-blue-300">Actualizar</button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : calls.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay llamadas aún</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-800">
                  <th className="px-6 py-3 text-left">Contacto</th>
                  <th className="px-6 py-3 text-left">Campaña</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Resultado</th>
                  <th className="px-6 py-3 text-left">Duración</th>
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-left">Resumen</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <React.Fragment key={call.id}>
                    <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3 text-sm">
                        <div className="font-medium">{call.contacts?.name || 'Sin nombre'}</div>
                        <div className="text-gray-400 text-xs">{call.contacts?.phone}</div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">{call.campaigns?.name || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded border ${statusBadge(call.status)}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {call.result && call.result !== 'en_curso' ? (
                          <span className={`text-xs px-2 py-1 rounded border ${resultBadge(call.result)}`}>
                            {resultLabel[call.result] || call.result}
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, '0')}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-400">
                        {new Date(call.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-6 py-3">
                        {call.summary && call.summary.length > 10 && (
                          <button
                            onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {expanded === call.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expanded === call.id ? 'Ocultar' : 'Ver resumen'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === call.id && call.summary && (
                      <tr className="border-b border-gray-800 bg-gray-800/30">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="text-sm text-gray-300 leading-relaxed max-w-3xl">
                            <span className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Resumen de la conversación</span>
                            {renderSummary(call.summary)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
