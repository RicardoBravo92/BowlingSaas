import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeftRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Filter,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  Ticket,
  UserPlus,
  X,
} from 'lucide-react';
import * as api from '@/api/endpoints';
import { type AdminBooking, type AvailabilityGrid, type UserSearchResult } from '@/api/endpoints';
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusLabel: Record<AdminBooking['status'], string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
  ASSIGNED: 'Asignada',
};

const statusBadge: Record<AdminBooking['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function AdminBookings() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminBooking['status'] | 'ALL'>('ALL');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [moveTarget, setMoveTarget] = useState<AdminBooking | null>(null);
  const [moveGrid, setMoveGrid] = useState<AvailabilityGrid[]>([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveSlots, setMoveSlots] = useState<string[]>([]);
  const [moveCurrent, setMoveCurrent] = useState<string[]>([]);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [success, setSuccess] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDate, setAssignDate] = useState(todayStr);
  const [assignUserQuery, setAssignUserQuery] = useState('');
  const [assignUsers, setAssignUsers] = useState<UserSearchResult[]>([]);
  const [assignSearching, setAssignSearching] = useState(false);
  const [assignSelectedUser, setAssignSelectedUser] = useState<UserSearchResult | null>(null);
  const [assignGrid, setAssignGrid] = useState<AvailabilityGrid[]>([]);
  const [assignGridLoading, setAssignGridLoading] = useState(false);
  const [assignSlots, setAssignSlots] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const filtersActive =
    statusFilter !== 'ALL' || fromDate !== todayStr || toDate !== todayStr;

  const clearFilters = useCallback(() => {
    setStatusFilter('ALL');
    setFromDate(todayStr);
    setToDate(todayStr);
  }, [todayStr]);

  // Guards against out-of-order responses from the filters (WARNING-4).
  const fetchSeq = useRef(0);
  // Same guard for the availability grid fetched inside the assign dialog.
  const gridSeqRef = useRef(0);

  const fetchBookings = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (fromDate && toDate && fromDate > toDate) {
        if (seq !== fetchSeq.current) return;
        setBookings([]);
        setError('La fecha "desde" no puede ser mayor que "hasta".');
        return;
      }
      const res = await api.getAdminBookings({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      if (seq !== fetchSeq.current) return;
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      if (seq !== fetchSeq.current) return;
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Error al cargar las reservas.');
      setBookings([]);
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  }, [statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // A quick filter change invalidates any in-flight fetch.
  useEffect(() => {
    return () => {
      // Invalidating on unmount is intentional: we WANT the freshest value at
      // cleanup time, so reading the ref here is correct, not a stale read.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchSeq.current++;
    };
  }, []);

  const runAction = useCallback(
    async (booking: AdminBooking, action: 'confirm' | 'cancel') => {
      if (action === 'cancel' && !window.confirm(`¿Cancelar la reserva #${booking.id} de ${booking.user_full_name}?`)) {
        return;
      }
      setActingId(booking.id);
      setError('');
      try {
        if (action === 'confirm') {
          await api.confirmBookingPayment(booking.id);
        } else {
          await api.cancelAdminBooking(booking.id);
        }
        await fetchBookings();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { detail?: string } } };
        setError(e?.response?.data?.detail || 'No se pudo completar la acción.');
      } finally {
        setActingId(null);
      }
    },
    [fetchBookings],
  );

  const openMove = useCallback(async (booking: AdminBooking) => {
    setMoveTarget(booking);
    setMoveSlots([]);
    setMoveCurrent([]);
    setMoveError('');
    setSuccess('');
    setMoveGrid([]);
    setMoveLoading(true);
    try {
      const res = await api.getAvailability(booking.booking_date);
      const grid = Array.isArray(res.data) ? res.data : [];
      setMoveGrid(grid);
      // Pre-select the booking's current cells (marked green in the dialog)
      const currentKeys = booking.items.flatMap((item) => {
        const row = grid.find((g) => g.lane_id === item.lane_id);
        if (!row) return [];
        const time = `${String(item.start_hour).padStart(2, '0')}:00`;
        const match = row.slots.find((s) => s.time === time);
        return match ? [match.slot_key] : [];
      });
      setMoveCurrent(currentKeys);
      setMoveSlots(currentKeys);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMoveError(e?.response?.data?.detail || 'No se pudo cargar la disponibilidad.');
    } finally {
      setMoveLoading(false);
    }
  }, []);

  const toggleMoveSlot = useCallback((slotKey: string) => {
    setMoveSlots((prev) =>
      prev.includes(slotKey) ? prev.filter((k) => k !== slotKey) : [...prev, slotKey],
    );
  }, []);

  const confirmMove = useCallback(async () => {
    if (!moveTarget || moveSlots.length === 0) return;
    setMoving(true);
    setMoveError('');
    setSuccess('');
    try {
      await api.moveBooking(moveTarget.id, moveSlots);
      setSuccess(`Reserva #${moveTarget.id} movida correctamente.`);
      setMoveTarget(null);
      await fetchBookings();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setMoveError(e?.response?.data?.detail || 'No se pudo mover la reserva.');
    } finally {
      setMoving(false);
    }
  }, [moveTarget, moveSlots, fetchBookings]);

  // Out-of-order guard for the user search (BLOCK-2): only the most recent
  // query may populate the dropdown.
  const searchSeq = useRef(0);
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        searchSeq.current++;
        setAssignUsers([]);
        setAssignSearching(false);
        return;
      }
      const seq = ++searchSeq.current;
      setAssignSearching(true);
      try {
        const res = await api.searchUsers(query.trim());
        if (seq !== searchSeq.current) return;
        setAssignUsers(Array.isArray(res.data) ? res.data : []);
        setAssignError('');
      } catch (err: unknown) {
        if (seq !== searchSeq.current) return;
        const e = err as { response?: { data?: { detail?: string } } };
        setAssignError(e?.response?.data?.detail || 'No se pudo buscar al usuario.');
      } finally {
        if (seq === searchSeq.current) setAssignSearching(false);
      }
    },
    [],
  );

  // Debounce the user search so every keystroke doesn't hit the API.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelUserSearch = useCallback(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchSeq.current++;
  }, []);
  const queueUserSearch = useCallback(
    (query: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        void searchUsers(query);
      }, 300);
    },
    [searchUsers],
  );

  useEffect(() => {
    return () => {
      cancelUserSearch();
    };
  }, [cancelUserSearch]);

  const openAssign = useCallback(async () => {
    cancelUserSearch();
    setAssignDate(todayStr);
    setAssignUserQuery('');
    setAssignUsers([]);
    setAssignSelectedUser(null);
    setAssignSlots([]);
    setAssignError('');
    setSuccess('');
    setAssignGrid([]);
    setAssignOpen(true);
    setAssignGridLoading(true);
    const gridSeq = ++gridSeqRef.current;
    try {
      const res = await api.getAvailability(todayStr);
      if (gridSeq !== gridSeqRef.current) return;
      setAssignGrid(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      if (gridSeq !== gridSeqRef.current) return;
      const e = err as { response?: { data?: { detail?: string } } };
      setAssignError(e?.response?.data?.detail || 'No se pudo cargar la disponibilidad.');
    } finally {
      if (gridSeq === gridSeqRef.current) setAssignGridLoading(false);
    }
  }, [todayStr, cancelUserSearch]);

  const changeAssignDate = useCallback(async (date: string) => {
    setAssignDate(date);
    setAssignSlots([]);
    setAssignError('');
    setAssignGrid([]);
    setAssignGridLoading(true);
    const gridSeq = ++gridSeqRef.current;
    try {
      const res = await api.getAvailability(date);
      if (gridSeq !== gridSeqRef.current) return;
      setAssignGrid(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      if (gridSeq !== gridSeqRef.current) return;
      const e = err as { response?: { data?: { detail?: string } } };
      setAssignError(e?.response?.data?.detail || 'No se pudo cargar la disponibilidad.');
    } finally {
      if (gridSeq === gridSeqRef.current) setAssignGridLoading(false);
    }
  }, []);

  const toggleAssignSlot = useCallback((slotKey: string) => {
    setAssignSlots((prev) =>
      prev.includes(slotKey) ? prev.filter((k) => k !== slotKey) : [...prev, slotKey],
    );
  }, []);

  const pickAssignUser = useCallback((u: UserSearchResult) => {
    setAssignSelectedUser(u);
    setAssignUserQuery(u.full_name);
    setAssignUsers([]);
  }, []);

  const confirmAssign = useCallback(async () => {
    if (!assignSelectedUser || assignSlots.length === 0) return;
    setAssigning(true);
    setAssignError('');
    setSuccess('');
    try {
      await api.assignBooking({
        user_id: assignSelectedUser.id,
        booking_date: assignDate,
        slot_keys: assignSlots,
      });
      setSuccess(`Pista asignada a ${assignSelectedUser.full_name}.`);
      setAssignOpen(false);
      await fetchBookings();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setAssignError(e?.response?.data?.detail || 'No se pudo asignar la pista.');
    } finally {
      setAssigning(false);
    }
  }, [assignSelectedUser, assignSlots, assignDate, fetchBookings]);

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.user_full_name.toLowerCase().includes(q) ||
      b.user_email.toLowerCase().includes(q)
    );
  });

  const countBy = (s: AdminBooking['status']) => bookings.filter((b) => b.status === s).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reservas de Clientes</h1>
        <p className="text-slate-500 mt-1">Paga y administra las reservas de todos los clientes.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Reservas</p>
              <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pendientes de pago</p>
              <p className="text-2xl font-bold text-slate-900">{countBy('PENDING')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pagadas</p>
              <p className="text-2xl font-bold text-slate-900">{countBy('PAID')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold text-slate-700">Filtrar</span>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v: string) => setStatusFilter(v as AdminBooking['status'] | 'ALL')}
        >
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
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-lg border-slate-200 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}

      {success && (
        <div className="p-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">{success}</div>
      )}

      <Card className="shadow-sm border-slate-100 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-slate-50/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Todas las reservas</CardTitle>
            <CardDescription>{filtered.length} reservas en la lista</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={openAssign} className="gap-2 border-indigo-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-300">
              <Gift className="w-4 h-4" />
              Asignar pista
            </Button>
            <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="font-medium">Cargando reservas...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
              <Ticket className="w-12 h-12 opacity-40" />
              <p className="font-medium">
                {filtersActive || search
                  ? 'No hay reservas que coincidan con los filtros.'
                  : 'Todavía no hay reservas.'}
              </p>
              {(filtersActive || search) && (
                <Button
                  variant="outline"
                  onClick={() => { clearFilters(); setSearch(''); }}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  {/* Client */}
                  <div className="flex items-center gap-3 min-w-0 w-full sm:w-56">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                      {booking.user_full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{booking.user_full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{booking.user_email}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 w-full sm:w-44">
                    <CalendarDays className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {format(new Date(booking.booking_date + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                    </span>
                  </div>

                  {/* Lanes & hours */}
                  <div className="flex flex-wrap gap-1.5 w-full sm:w-48 min-w-0">
                    {booking.items.map((item, idx) => (
                      <span
                        key={`${item.lane_id}-${item.start_hour}-${idx}`}
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700"
                      >
                        Pista {item.lane_number} · {String(item.start_hour).padStart(2, '0')}:00
                      </span>
                    ))}
                  </div>

                  {/* Price */}
                  <span className="text-base font-black text-slate-900">${booking.total_price.toFixed(2)}</span>

                  {/* Status */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${statusBadge[booking.status]}`}>
                    {statusLabel[booking.status]}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    {booking.status !== 'CANCELLED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMove(booking)}
                        className="gap-1.5 border-sky-200 text-sky-700 hover:text-sky-800 hover:bg-sky-50 hover:border-sky-300"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        Mover
                      </Button>
                    )}
                    {booking.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actingId === booking.id}
                        onClick={() => runAction(booking, 'confirm')}
                        className="gap-1.5 border-emerald-200 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
                      >
                        {actingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirmar pago
                      </Button>
                    )}
                    {booking.status !== 'CANCELLED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actingId === booking.id}
                        onClick={() => runAction(booking, 'cancel')}
                        className="gap-1.5 border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                      >
                        <Ban className="w-4 h-4" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move dialog */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => { if (!open) setMoveTarget(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mover reserva #{moveTarget?.id}</DialogTitle>
            <DialogDescription>
              Reubica la reserva de {moveTarget?.user_full_name}. Selecciona las nuevas horas disponibles para el{' '}
              {moveTarget ? format(new Date(moveTarget.booking_date + 'T00:00:00'), 'd MMM yyyy', { locale: es }) : ''}.
            </DialogDescription>
          </DialogHeader>

          {moveLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="font-medium">Cargando disponibilidad...</span>
            </div>
          ) : moveGrid.length === 0 ? (
            <p className="py-12 text-center text-slate-400">No hay disponibilidad para ese día.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" /> Hora actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-300 inline-block" /> Actual sin marcar
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-sky-600 inline-block" /> Nueva selección
                </span>
              </div>
              {moveGrid.map((lane) => {
                const visible = lane.slots.filter((s) => s.available || moveCurrent.includes(s.slot_key));
                if (visible.length === 0) return null;
                return (
                  <div key={lane.lane_id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-slate-700">Pista {lane.lane_number}</p>
                      <p className="text-[11px] font-medium text-slate-400">
                        {moveSlots.filter((k) => k.startsWith(`${lane.lane_id}:`)).length} seleccionadas
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visible.map((slot) => {
                        const isCurrent = moveCurrent.includes(slot.slot_key);
                        const isSelected = moveSlots.includes(slot.slot_key);
                        return (
                          <button
                            key={slot.slot_key}
                            onClick={() => toggleMoveSlot(slot.slot_key)}
                            title={
                              isCurrent
                                ? `${slot.time} — hora actual (${isSelected ? 'marcada' : 'sin marcar'})`
                                : `${slot.time} — $${slot.price.toFixed(2)}`
                            }
                            className={`
                              flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 min-w-[64px]
                              ${isCurrent
                                ? isSelected
                                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-200 scale-105'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                                : isSelected
                                  ? 'bg-sky-600 border-sky-700 text-white shadow-md shadow-sky-200 scale-105'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-sky-400 hover:bg-sky-50 cursor-pointer'
                              }
                            `}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mb-0.5" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 mb-0.5 opacity-40" />
                            )}
                            {slot.time}
                            {isCurrent && (
                              <span className="text-[9px] uppercase tracking-wide opacity-70">Actual</span>
                            )}
                            {!isCurrent && (
                              <span className="text-[10px] opacity-70">${slot.price.toFixed(2)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {moveError && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">{moveError}</div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={confirmMove}
              disabled={!moveTarget || moveSlots.length === 0 || moving}
              className="gap-2 bg-sky-600 hover:bg-sky-700"
            >
              {moving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
              Mover reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={(open) => { if (!open) { cancelUserSearch(); setAssignOpen(false); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar pista a un cliente</DialogTitle>
            <DialogDescription>
              Regala una pista a un usuario sin cobrarle. La reserva bloqueará el horario pero no se contará en las ganancias.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* User search */}
            <div>
              <label className="text-xs font-semibold text-slate-500">Cliente</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o correo..."
                  value={assignUserQuery}
                  onChange={(e) => {
                    setAssignUserQuery(e.target.value);
                    setAssignSelectedUser(null);
                    setAssignUsers([]);
                    queueUserSearch(e.target.value);
                  }}
                  className="pl-9 h-10 rounded-lg border-slate-200 text-sm"
                />
              </div>
              {assignSearching && (
                <p className="mt-2 text-xs text-slate-400">Buscando usuarios...</p>
              )}
              {assignUsers.length > 0 && !assignSelectedUser && (
                <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
                  {assignUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => pickAssignUser(u)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-indigo-50/60"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      <UserPlus className="w-4 h-4 text-indigo-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {assignSelectedUser && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-indigo-800 truncate">{assignSelectedUser.full_name}</p>
                    <p className="text-xs text-indigo-600 truncate">{assignSelectedUser.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setAssignSelectedUser(null); setAssignUserQuery(''); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Fecha</label>
              <Input
                type="date"
                value={assignDate}
                min={todayStr}
                onChange={(e) => void changeAssignDate(e.target.value)}
                className="h-10 rounded-lg border-slate-200 text-sm"
              />
            </div>

            {/* Slot grid */}
            {assignGridLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="font-medium">Cargando disponibilidad...</span>
              </div>
            ) : assignGrid.length === 0 ? (
              <p className="py-12 text-center text-slate-400">No hay disponibilidad para ese día.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" /> Seleccionada
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-white border border-slate-200 inline-block" /> Disponible
                  </span>
                </div>
                {assignGrid.map((lane) => {
                  const visible = lane.slots.filter((s) => s.available);
                  if (visible.length === 0) return null;
                  return (
                    <div key={lane.lane_id}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-700">Pista {lane.lane_number}</p>
                        <p className="text-[11px] font-medium text-slate-400">
                          {assignSlots.filter((k) => k.startsWith(`${lane.lane_id}:`)).length} seleccionadas
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {visible.map((slot) => {
                          const isSelected = assignSlots.includes(slot.slot_key);
                          return (
                            <button
                              key={slot.slot_key}
                              onClick={() => toggleAssignSlot(slot.slot_key)}
                              title={`${slot.time} — pista libre (sin cargo)`}
                              className={`
                                flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 min-w-[64px]
                                ${isSelected
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
                              <span className="text-[10px] opacity-70">Gratis</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {assignError && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">{assignError}</div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={confirmAssign}
              disabled={!assignSelectedUser || assignSlots.length === 0 || assigning}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              Asignar pista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}