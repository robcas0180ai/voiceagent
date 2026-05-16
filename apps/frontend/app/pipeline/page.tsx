'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LogOut, Phone } from 'lucide-react';

const STAGES = [
  { key: 'to_call', label: 'Por llamar', color: 'border-gray-600' },
  { key: 'called', label: 'Llamado', color: 'border-blue-600' },
  { key: 'interested', label: 'Interesado', color: 'border-green-600' },
  { key: 'not_interested', label: 'No interesado', color: 'border-red-600' },
  { key: 'callback', label: 'Rellamar', color: 'border-yellow-600' },
];

export default function PipelinePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: camps } = await api.get('/api/campaigns');
      const allContacts: any[] = [];
      for (const c of camps.campaigns || []) {
        const { data } = await api.get(`/api/campaigns/${c.id}/contacts`);
        allContacts.push(...(data.contacts || []).map((ct: any) => ({ ...ct, campaignName: c.name })));
      }
      setContacts(allContacts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const moveStage = async (contactId: string, stage: string) => {
    try {
      const contact = contacts.find(c => c.id === contactId);
      await api.put(`/api/campaigns/${contact.campaign_id}/contacts/${contactId}`, { pipeline_stage: stage });
      fetchContacts();
    } catch (err) { console.error(err); }
  };

  const makeCall = async (contactId: string) => {
    setCalling(contactId);
    try {
      await api.post(`/api/calls/contact/${contactId}`);
      fetchContacts();
    } catch (err: any) {
      alert('Error: ' + err.response?.data?.error);
    } finally { setCalling(null); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg">VoiceAgent</span>
          <div className="flex gap-4 text-sm">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">Dashboard</button>
            <button onClick={() => router.push('/campaigns')} className="text-gray-400 hover:text-white transition-colors">Campañas</button>
            <button onClick={() => router.push('/pipeline')} className="text-white font-medium">Pipeline</button>
            <button onClick={() => router.push('/agent')} className="text-gray-400 hover:text-white transition-colors">Agente IA</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button onClick={logout} className="text-gray-400 hover:text-white"><LogOut size={16} /></button>
        </div>
      </nav>

      <div className="p-6 max-w-full mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Pipeline CRM</h1>
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(stage => {
              const stageContacts = contacts.filter(c => c.pipeline_stage === stage.key);
              return (
                <div key={stage.key} className="min-w-[220px] flex-shrink-0">
                  <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${stage.color}`}>
                    <span className="text-sm font-medium">{stage.label}</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{stageContacts.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageContacts.map(c => (
                      <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                        <div className="font-medium text-sm mb-1">{c.name || 'Sin nombre'}</div>
                        <div className="text-xs text-gray-400 mb-2">{c.phone}</div>
                        <div className="text-xs text-gray-500 mb-3">{c.campaignName}</div>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => makeCall(c.id)}
                            disabled={calling === c.id}
                            className="flex items-center gap-1 text-xs bg-blue-950 text-blue-400 border border-blue-800 px-2 py-1 rounded hover:bg-blue-900 disabled:opacity-50 transition-colors"
                          >
                            <Phone size={10} />
                            {calling === c.id ? '...' : 'Llamar'}
                          </button>
                          {STAGES.filter(s => s.key !== stage.key).map(s => (
                            <button
                              key={s.key}
                              onClick={() => moveStage(c.id, s.key)}
                              className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                            >
                              → {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {stageContacts.length === 0 && (
                      <div className="text-xs text-gray-600 text-center py-4">Sin contactos</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
