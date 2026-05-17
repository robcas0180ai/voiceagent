'use client';
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import api from '@/lib/api';

interface CSVUploadProps {
  campaignId: string;
  onSuccess: () => void;
}

// Normaliza cualquier número mexicano a +52XXXXXXXXXX
const normalizePhone = (raw: string): string => {
  // Quitar todo excepto dígitos
  let digits = String(raw).replace(/\D/g, '');

  // Si empieza con 521 o 52 y tiene 12-13 dígitos, quitar el 52
  if (digits.startsWith('521') && digits.length === 13) digits = digits.slice(2);
  if (digits.startsWith('52') && digits.length === 12) digits = digits.slice(2);

  // Si empieza con 1 y tiene 11 dígitos (lada USA), quitar el 1
  if (digits.startsWith('1') && digits.length === 11) digits = digits.slice(1);

  // Quedarnos con los últimos 10 dígitos
  if (digits.length > 10) digits = digits.slice(-10);

  // Validar que tenga exactamente 10 dígitos
  if (digits.length !== 10) return '';

  return `+52${digits}`;
};

export default function CSVUpload({ campaignId, onSuccess }: CSVUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [invalidRows, setInvalidRows] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = (f: File) => {
    setFile(f);
    setResult(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        setTotalRows(rows.length);

        const processed = rows.map((row: any) => {
          const name = row.nombre || row.name || row.Nombre || row.Name || '';
          const rawPhone = String(row.telefono || row.phone || row.Telefono || row.Phone || row.celular || row.Celular || '').trim();
          const phone = normalizePhone(rawPhone);
          return { name, rawPhone, phone, valid: !!phone };
        });

        setInvalidRows(processed.filter(r => !r.valid).length);
        setPreview(processed.slice(0, 5));
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) parseFile(f);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const contacts = (results.data as any[]).map((row: any) => ({
            name: row.nombre || row.name || row.Nombre || row.Name || '',
            phone: normalizePhone(String(row.telefono || row.phone || row.Telefono || row.Phone || row.celular || row.Celular || '').trim())
          })).filter(c => c.phone);

          if (contacts.length === 0) {
            setResult({ success: false, message: 'No se encontraron números válidos. Verifica que el CSV tenga columna "telefono".' });
            setUploading(false);
            return;
          }

          const { data } = await api.post(`/api/campaigns/${campaignId}/contacts/bulk`, { contacts });
          setResult({ success: true, message: `✅ ${data.contacts.length} contactos importados. Los números se normalizaron automáticamente a formato +52.` });
          setFile(null);
          setPreview([]);
          setTotalRows(0);
          setInvalidRows(0);
          onSuccess();
        } catch (err: any) {
          setResult({ success: false, message: err.response?.data?.error || 'Error al importar contactos.' });
        } finally {
          setUploading(false);
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-950/30' : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        <Upload size={32} className="mx-auto mb-3 text-gray-500" />
        <p className="text-sm font-medium text-white mb-1">
          {file ? file.name : 'Arrastra tu CSV aquí o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-gray-500">Acepta: 10 dígitos, con lada, con +52 — se normaliza automáticamente</p>
      </div>

      {/* Plantilla */}
      <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <FileText size={14} />
          Descarga la plantilla de ejemplo
        </div>
        <button
          onClick={() => {
            const csv = 'nombre,telefono\nJuan García,8112345678\nMaría López,81 9876 5432\nPedro Martínez,+52 55 1111 2222\nAna Rodríguez,5212345678';
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'plantilla_contactos.csv'; a.click();
          }}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Descargar plantilla
        </button>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">Vista previa — {totalRows} contactos</span>
              {invalidRows > 0 && (
                <span className="text-xs bg-yellow-950 text-yellow-400 border border-yellow-800 px-2 py-0.5 rounded">
                  {invalidRows} números inválidos serán omitidos
                </span>
              )}
            </div>
            <button onClick={() => { setFile(null); setPreview([]); }} className="text-gray-600 hover:text-gray-400">
              <X size={14} />
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Tel. original</th>
                <th className="px-4 py-2 text-left">Tel. normalizado</th>
                <th className="px-4 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-2 text-xs text-gray-300">{row.name || '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{row.rawPhone}</td>
                  <td className="px-4 py-2 text-xs text-white font-mono">{row.phone || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${row.valid ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'}`}>
                      {row.valid ? '✓ válido' : '✗ inválido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          result.success ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'
        }`}>
          {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {result.message}
        </div>
      )}

      {/* Botón importar */}
      {file && preview.length > 0 && (
        <button
          onClick={upload}
          disabled={uploading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {uploading ? 'Importando...' : `Importar ${totalRows - invalidRows} contactos válidos`}
        </button>
      )}
    </div>
  );
}
