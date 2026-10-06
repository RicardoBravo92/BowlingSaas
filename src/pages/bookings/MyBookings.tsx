import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarDays,
  Clock3,
  Filter,
  Loader2,
  Lock,
  RefreshCw,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import * as api from '@/api/endpoints';
import { type MyBooking } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusLabel: Record<MyBooking['status'], string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
  ASSIGNED: 'Asignada',
};

const statusBadge: Record<MyBooking['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<MyBooking['status'] | 'ALL'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtersActive = statusFilter !== 'ALL' || fromDate !== '' || toDate !== '';

  const clearFilters = useCallback(() => {
    setStatusFilter('ALL');
    setFromDate('');
    setToDate('');
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (fromDate && toDate && fromDate > toDate) {
        setBookings([]);
        setError('La fecha "desde" no puede ser mayor que "hasta".');
        return;
      }
      const res = await api.getMyBookings({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'No se pudieron cargar tus reservas.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate]);

  const handleCancel = useCallback(async (bookingId: number) => {
    if (!window.confirm('¿Seguro que quieres cancelar esta reserva?')) return;
    setCancellingId(bookingId);
    setError('');
    try {
      await api.cancelBooking(bookingId);
      await fetchBookings();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'No se pudo cancelar la reserva.');
    } finally {
      setCancellingId(null);
    }
  }, [fetchBookings]);

  useEffect(() => {
    if (user) fetchBookings();
  }, [user, fetchBookings]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
        <Lock className="w-12 h-12 opacity-40" />
        <p className="font-medium">Inicia sesión para ver tus reservas.</p>
        <Button onClick={() => navigate('/login')} className="bg-indigo-600 hover:bg-indigo-700">
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis Reservas</h1>
          <p className="text-slate-500 mt-1">Historial de reservas de tu cuenta.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold text-slate-700">Filtrar</span>
        </div>
        <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v as MyBooking['status'] | 'ALL')}>
          <SelectTrigger className="w-44 h-10 rounded-lg border-slate-200 text-sm font-medium">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="PENDING">Pendiente de pago</SelectItem>
            <SelectItem value="PAID">Pagada</SelectItem>
            <SelectItem value="ASSIGNED">Asignada</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Desde</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-lg border-slate-200 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Hasta</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-lg border-slate-200 text-sm"
          />
        </div>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-slate-500 hover:text-slate-700">
            <X className="w-4 h-4" />
            Limpiar
          </Button>
        )}
        <span className="ml-auto text-xs font-medium text-slate-400">
          {bookings.length === 1 ? '1 reserva' : `${bookings.length} reservas`}
        </span>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="font-medium">Cargando reservas...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <Ticket className="w-12 h-12 opacity-40" />
          <p className="font-medium">
            {filtersActive ? 'No hay reservas que coincidan con los filtros.' : 'Todavía no tienes reservas.'}
          </p>
          {filtersActive ? (
            <Button variant="outline" onClick={clearFilters} className="gap-2">
              <X className="w-4 h-4" />
              Limpiar filtros
            </Button>
          ) : (
            <Button onClick={() => navigate('/bookings')} className="bg-indigo-600 hover:bg-indigo-700">
              Ver Disponibilidad
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="shadow-sm border-slate-100 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-4 bg-slate-50/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-slate-100">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {format(new Date(booking.booking_date + 'T00:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Reserva #{booking.id} · creada {format(new Date(booking.created_at), "d MMM HH:mm", { locale: es })}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusBadge[booking.status]}`}>
                    {statusLabel[booking.status]}
                  </span>
                  <span className="text-lg font-black text-slate-900">${booking.total_price.toFixed(2)}</span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {booking.items.map((item, idx) => (
                    <div
                      key={`${item.lane_id}-${item.start_hour}-${idx}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
                    >
                      <span className="font-bold text-indigo-600">Pista {item.lane_number}</span>
                      <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                      {String(item.start_hour).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
                {booking.status !== 'CANCELLED' && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <p className={`text-xs font-medium ${booking.status === 'PENDING' ? 'text-amber-600' : booking.status === 'ASSIGNED' ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {booking.status === 'PENDING'
                        ? 'Pendiente de pago — se cancela automáticamente si no se paga dentro de los 10 minutos.'
                        : booking.status === 'ASSIGNED'
                          ? 'Esta pista fue asignada a tu cuenta sin costo.'
                          : '¿No puedes ir? Puedes cancelar tu reserva aquí.'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="gap-2 shrink-0 border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                    >
                      {cancellingId === booking.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Cancelar reserva
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
