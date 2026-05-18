'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/ui/Navbar';

const STAGES = [
  { key: 'to_call', label: 'Por llamar', color: 'border-gray-700' },
  { key: 'called', label: 'Llamado', color: 'border-blue-700' },
  { key: 'interested', label: 'Interesado', color: 'border-green-700' },
  { key: 'callback', label: 'Rellamar', color: 'border-yellow-700' },
  { key: 'not_interested', label: 'No interesado', color: 'border-red-700' },
];

export default function PipelinePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: camps } = await api.get('/api/campaigns');
      const allContacts: any[] = [];
      for (const camp of camps.campaigns || []) {
        const { data } = await api.get(`/api/campaigns/${camp.id}/contacts`);
        (data.contacts || []).forEach((c: any) => allContacts.push({ ...c, campaignName: camp.name }));
      }
      setContacts(allContacts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const byStage = (stage: string) => contacts.filter(c => c.pipeline_stage === stage);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Pipeline CRM</h1>
          <button onClick={fetchContacts} className="text-xs text-blue-400 hover:text-blue-300">Actualizar</button>
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {STAGES.map(stage => (
              <div key={stage.key} className={`bg-gray-900 border ${stage.color} rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">{stage.label}</h3>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{byStage(stage.key).length}</span>
                </div>
                <div className="space-y-2">
                  {byStage(stage.key).map(c => (
                    <div key={c.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm font-medium truncate">{c.name || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{c.phone}</div>
                      <div className="text-xs text-gray-500 mt-1">{c.campaignName}</div>
                    </div>
                  ))}
                  {byStage(stage.key).length === 0 && (
                    <div className="text-xs text-gray-600 text-center py-4">Sin contactos</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
