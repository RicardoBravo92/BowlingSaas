import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Phone, Save } from 'lucide-react';
import * as api from '@/api/endpoints';
import { type BusinessSettings } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    api
      .getSettings()
      .then((res) => {
        if (active && res.data) {
          setSettings(res.data);
          setForm({
            name: res.data.name ?? '',
            address: res.data.address ?? '',
            phone: res.data.phone ?? '',
          });
        }
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { detail?: string } } };
        if (active) setError(e?.response?.data?.detail || 'No se pudieron cargar los ajustes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.updateSettings({
        name: form.name,
        address: form.address,
        phone: form.phone,
      });
      setSettings(res.data);
      setSuccess('Ajustes guardados correctamente.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'No se pudieron guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  }, [form, settings]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="font-medium">Cargando ajustes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración del Sistema</h1>
        <p className="text-slate-500 mt-1">Ajustes del negocio que se muestran a los clientes.</p>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">{success}</div>
      )}

      <Card className="shadow-sm border-slate-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Datos del negocio
          </CardTitle>
          <CardDescription>
            El nombre, dirección y teléfono aparecen en la landing page pública y en el header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Nombre del negocio</Label>
            <Input
              id="settings-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Bowling SaaS"
              className="max-w-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-address">Dirección</Label>
            <Input
              id="settings-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Ej: Calle 123, Centro Ciudad"
              className="max-w-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">Teléfono</Label>
            <div className="relative max-w-lg">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="settings-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Ej: +1 (555) 123-4567"
                className="pl-9"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}