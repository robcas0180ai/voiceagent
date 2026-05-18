'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Save } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';

export default function AgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    agent_name: 'Sofía',
    gender: 'female',
    tone: 'profesional y amable',
    company_name: '',
    industry: '',
    product_description: '',
    objections: '',
    voicemail_enabled: true,
    retry_enabled: true,
    max_retries: 2,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/api/agent');
      if (data.config) setForm(data.config);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.post('/api/agent', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm text-gray-400 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Configurar Agente IA</h1>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Save size={16} />
            {saved ? '✅ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-medium mb-4">Identidad del agente</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Nombre del agente</label>
                  <input className={inputClass} value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} placeholder="Sofía" />
                </div>
                <div>
                  <label className={labelClass}>Género de la voz</label>
                  <select className={inputClass} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="female">Mujer</option>
                    <option value="male">Hombre</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tono</label>
                  <select className={inputClass} value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}>
                    <option value="profesional y amable">Profesional y amable</option>
                    <option value="directo y confiado">Directo y confiado</option>
                    <option value="cercano y casual">Cercano y casual</option>
                    <option value="formal y serio">Formal y serio</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre de la empresa</label>
                  <input className={inputClass} value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className={labelClass}>Industria</label>
                  <input className={inputClass} value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Seguros, Fintech, Salud..." />
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-medium mb-4">Producto y argumentos</h2>
              <div className="mb-4">
                <label className={labelClass}>Descripción del producto</label>
                <textarea className={`${inputClass} min-h-[80px] resize-none`} value={form.product_description} onChange={e => setForm({ ...form, product_description: e.target.value })} placeholder="Describe tu producto o servicio, beneficios principales, precio..." />
              </div>
              <div>
                <label className={labelClass}>Manejo de objeciones</label>
                <textarea className={`${inputClass} min-h-[80px] resize-none`} value={form.objections} onChange={e => setForm({ ...form, objections: e.target.value })} placeholder="P: Es muy caro → R: Tenemos planes desde $X..." />
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-medium mb-4">Comportamiento de llamadas</h2>
              <div className="space-y-4">
                {[
                  { key: 'voicemail_enabled', label: 'Dejar mensaje de voz', desc: 'Si no contesta después de 3 timbres' },
                  { key: 'retry_enabled', label: 'Reintentar automáticamente', desc: 'Si no contesta en el primer intento' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setForm({ ...form, [item.key]: !(form as any)[item.key] })}
                      className={`w-10 h-6 rounded-full transition-colors relative ${(form as any)[item.key] ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${(form as any)[item.key] ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
