'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LogOut, Clock, ChevronDown, ChevronUp, Play } from 'lucide-react';
import React from 'react';

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [playing, setPlaying] = useState<string | null>(null);

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

  const playRecording = (callId: string, url: string) => {
    if (playing === callId) {
      setPlaying(null);
      return;
    }
    setPlaying(callId);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => setPlaying(null);
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
  };

  const statusBadge = (status: string) => {
    const map: any = {
      completed: 'bg-green-950 text-green-400 border-green-800',
      initiated: 'bg-blue-950 text-blue-400 border-blue-800',
      'no-answer': 'bg-yellow-950 text-yellow-400 border-yellow-800',
      failed: 'bg-red-950 text-red-400 border-red-800',
    };
    return map[status] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const renderSummary = (summary: string) => {
    try {
      const history = JSON.parse(summary);
      if (Array.isArray(history)) {
        return (
          <div className="space-y-3">
            {history.map((h: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${h.role === 'assistant' ? 'bg-blue-600' : 'bg-gray-600'}`}>
                  {h.role === 'assistant' ? '🤖' : '👤'}
                </div>
                <div className="flex-1">
                  <span className={`text-xs font-medium ${h.role === 'assistant' ? 'text-blue-400' : 'text-gray-400'}`}>
                    {h.role === 'assistant' ? 'Agente' : 'Cliente'}
                  </span>
                  <p className="text-sm text-gray-200 mt-0.5">{h.content}</p>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return <p className="text-sm text-gray-300">{summary}</p>;
    } catch {
      return <p className="text-sm text-gray-300">{summary}</p>;
    }
  };

  const filteredCalls = calls.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'interesado') return c.result === 'interesado';
    if (filter === 'no_interesado') return c.result === 'no_interesado';
    if (filter === 'callback') return c.result === 'callback';
    if (filter === 'completed') return c.status === 'completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg">VoiceAgent</span>
          <div className="flex gap-4 text-sm">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => router.push('/campaigns')} className="text-gray-400 hover:text-white transition-colors">Campañas</button>
            <button onClick={() => router.push('/pipeline')} className="text-gray-400 hover:text-white transition-colors">Pipeline</button>
            <button onClick={() => router.push('/agent')} className="text-gray-400 hover:text-white transition-colors">Agente IA</button>
            <button onClick={() => router.push('/calls')} className="text-white font-medium">Llamadas</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={logout} className="text-gray-400 hover:text-white"><LogOut size={16} /></button>
        </div>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Llamadas</h1>
          <button onClick={fetchCalls} className="text-xs text-blue-400 hover:text-blue-300">Actualizar</button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'completed', label: 'Completadas' },
            { key: 'interesado', label: '✓ Interesados' },
            { key: 'callback', label: '↩ Rellamar' },
            { key: 'no_interesado', label: '✗ No interesados' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">
                {f.key === 'all' ? calls.length :
                 f.key === 'completed' ? calls.filter(c => c.status === 'completed').length :
                 calls.filter(c => c.result === f.key).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No hay llamadas con ese filtro</div>
        ) : (
          <div className="space-y-3">
            {filteredCalls.map(call => (
              <div key={call.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                      📞
                    </div>
                    <div>
                      <div className="font-medium text-sm">{call.contacts?.name || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-400 font-mono">{call.contacts?.phone}</div>
                    </div>
                    <div className="text-xs text-gray-500">{call.campaigns?.name}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-1 rounded border ${statusBadge(call.status)}`}>
                      {call.status}
                    </span>
                    {call.result && (
                      <span className={`text-xs px-2 py-1 rounded border ${resultBadge(call.result)}`}>
                        {resultLabel[call.result] || call.result}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={12} />
                      {call.duration_seconds
                        ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, '0')}`
                        : '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(call.created_at).toLocaleString('es-MX')}
                    </div>

                    {/* Botón reproducir grabación */}
                    {call.recording_url && (
                      <button
                        onClick={() => playRecording(call.id, call.recording_url)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          playing === call.id
                            ? 'bg-green-950 text-green-400 border-green-800'
                            : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <Play size={10} />
                        {playing === call.id ? 'Reproduciendo...' : 'Escuchar'}
                      </button>
                    )}

                    {call.summary && call.summary.length > 10 && (
                      <button
                        onClick={() => setExpanded(expanded === call.id ? null : call.id)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {expanded === call.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded === call.id ? 'Ocultar' : 'Ver detalle'}
                      </button>
                    )}
                  </div>
                </div>

                {expanded === call.id && call.summary && (
                  <div className="border-t border-gray-800 p-5 bg-gray-800/30">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-4">Conversación</div>
                    {renderSummary(call.summary)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
