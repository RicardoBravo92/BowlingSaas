import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, Loader2, CheckCircle2, Circle, RefreshCw, Lock } from 'lucide-react';
import * as api from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
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

interface Slot {
  slot_id: number;
  slot_key: string;
  time: string;
  price: number;
  available: boolean;
}

interface LaneGrid {
  lane_id: number;
  lane_number: string;
  type: string; // Backend uses 'type'
  slots: Slot[];
}

const laneTypeLabel: Record<string, string> = {
  NORMAL: 'Estándar',
  PREMIUM: 'VIP',
};

const laneTypeColor: Record<string, string> = {
  NORMAL: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  PREMIUM: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function Bookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [grid, setGrid] = useState<LaneGrid[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [reserving, setReserving] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelectedKeys([]);
    setSuccess('');
    try {
      const res = await api.getAvailability(date);
      setGrid(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Error cargando disponibilidad');
      setGrid([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  // Load today's availability automatically on mount (and when the date changes)
  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  const handleReserve = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (selectedKeys.length === 0) return;
    setReserving(true);
    setError('');
    setSuccess('');
    try {
      await api.createBooking({
        booking_date: date,
        slot_keys: selectedKeys,
      });
      setSuccess('¡Reserva creada exitosamente! Está pendiente de confirmación.');
      setSelectedKeys([]);
      fetchGrid();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Error al crear la reserva');
    } finally {
      setReserving(false);
    }
  };

  const toggleSelect = (slot_key: string, available: boolean) => {
    if (!available) return;
    setSuccess('');
    
    setSelectedKeys((prev) => 
      prev.includes(slot_key)
        ? prev.filter(k => k !== slot_key)
        : [...prev, slot_key]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reservaciones</h1>
          <p className="text-slate-500 mt-1">Consulta disponibilidad y crea reservaciones por pista.</p>
        </div>
      </div>

      {/* Date Picker + Fetch */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            Seleccionar Fecha
          </CardTitle>
          <CardDescription>Elige una fecha para ver la disponibilidad en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label htmlFor="booking-date">Fecha de reserva</Label>
              <Input
                id="booking-date"
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchGrid} disabled={loading} className="gap-2 shrink-0">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Ver Disponibilidad
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Grid */}
      {grid.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Disponibilidad — {format(new Date(date + 'T00:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" /> Seleccionado</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" /> Disponible</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" /> Ocupado</span>
            </div>
          </div>

          <div className="grid gap-6">
            {grid.map((lane) => (
              <Card key={lane.lane_id} className="shadow-sm border-slate-100 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-50/60 px-6 py-4">
                  <div>
                    <CardTitle className="text-base">Pista {lane.lane_number}</CardTitle>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${laneTypeColor[lane.type] ?? 'bg-slate-100 text-slate-600'}`}>
                    {laneTypeLabel[lane.type] ?? lane.type}
                  </span>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {lane.slots.map((slot) => {
                      const isSelected = selectedKeys.includes(slot.slot_key);
                      return (
                        <button
                          key={slot.slot_key}
                          disabled={!slot.available}
                          onClick={() => toggleSelect(slot.slot_key, slot.available)}
                          title={`${slot.time} — $${slot.price}`}
                          className={`
                            flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150
                            ${!slot.available
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                              : isSelected
                                ? 'bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-200 scale-105'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
                            }
                          `}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 mb-0.5" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 mb-0.5 opacity-40" />
                          )}
                          {slot.time}
                          <span className="text-[10px] opacity-70">${slot.price?.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reserve CTA */}
          {selectedKeys.length > 0 && (
            <div className="sticky bottom-6 flex justify-end">
              <div className="bg-white border border-slate-200 shadow-xl rounded-2xl px-6 py-4 flex items-center gap-6">
                <div className="text-sm">
                  <p className="font-semibold text-slate-800">Horas seleccionadas</p>
                  <p className="text-slate-500">
                    Has seleccionado {selectedKeys.length} {selectedKeys.length === 1 ? 'hora' : 'horas'} en total.
                  </p>
                </div>
                {user ? (
                  <Button onClick={handleReserve} disabled={reserving} className="gap-2 shrink-0">
                    {reserving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar Reserva
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/login')} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shrink-0">
                    <Lock className="w-4 h-4" />
                    Inicia sesión para reservar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && grid.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <CalendarDays className="w-12 h-12 opacity-40" />
          <p className="font-medium">Selecciona una fecha y presiona <span className="text-indigo-600">"Ver Disponibilidad"</span></p>
        </div>
      )}
    </div>
  );
}
