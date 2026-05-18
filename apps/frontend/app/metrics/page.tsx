'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Phone, Clock, TrendingUp, Users, Target, PhoneCall } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';

export default function MetricsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data } = await api.get('/api/metrics');
      setMetrics(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const maxDay = metrics?.callsByDay ? Math.max(...Object.values(metrics.callsByDay) as number[], 1) : 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Métricas de uso</h1>
            <p className="text-gray-400 text-sm mt-1 capitalize">{metrics?.period}</p>
          </div>
          <button onClick={fetchMetrics} className="text-xs text-blue-400 hover:text-blue-300">Actualizar</button>
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Llamadas este mes', value: metrics?.totalCalls, icon: Phone, color: 'text-blue-400', desc: `${metrics?.completedCalls} completadas` },
                { label: 'Minutos usados', value: metrics?.totalMinutes, icon: Clock, color: 'text-amber-400', desc: 'minutos de voz' },
                { label: 'Campañas activas', value: metrics?.activeCampaigns, icon: PhoneCall, color: 'text-green-400', desc: 'en ejecución' },
              ].map((m, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</span>
                    <m.icon size={16} className={m.color} />
                  </div>
                  <div className="text-3xl font-semibold">{m.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Tasa de contacto', value: `${metrics?.contactRate}%`, icon: Target, color: 'text-blue-400', desc: 'llamadas completadas' },
                { label: 'Tasa de conversión', value: `${metrics?.conversionRate}%`, icon: TrendingUp, color: 'text-green-400', desc: 'a interesados' },
                { label: 'Interesados', value: metrics?.interestedCalls, icon: Users, color: 'text-green-400', desc: 'prospectos calificados' },
                { label: 'Rellamar', value: metrics?.callbackCalls, icon: Phone, color: 'text-yellow-400', desc: 'pidieron callback' },
              ].map((m, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{m.label}</span>
                    <m.icon size={14} className={m.color} />
                  </div>
                  <div className="text-2xl font-semibold">{m.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="font-medium text-sm mb-4">Llamadas por día</h2>
                {Object.keys(metrics?.callsByDay || {}).length === 0 ? (
                  <div className="text-center text-gray-600 py-8 text-sm">Sin datos este mes</div>
                ) : (
                  <div className="flex items-end gap-1 h-32">
                    {Object.entries(metrics?.callsByDay || {}).map(([day, count]: [string, any]) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-blue-600 rounded-t opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${(count / maxDay) * 100}%`, minHeight: '4px' }} title={`${day}: ${count}`} />
                        <span className="text-gray-600" style={{ fontSize: '9px' }}>{day}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="font-medium text-sm mb-4">Distribución de resultados</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Interesados', value: metrics?.interestedCalls, color: 'bg-green-500' },
                    { label: 'No interesados', value: metrics?.notInterestedCalls, color: 'bg-red-500' },
                    { label: 'Rellamar', value: metrics?.callbackCalls, color: 'bg-yellow-500' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{item.label}</span>
                        <span>{item.value} ({metrics?.totalCalls > 0 ? Math.round((item.value / metrics.totalCalls) * 100) : 0}%)</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${metrics?.totalCalls > 0 ? (item.value / metrics.totalCalls) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
