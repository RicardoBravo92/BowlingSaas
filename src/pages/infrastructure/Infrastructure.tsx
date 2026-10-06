import { useCallback, useEffect, useState } from 'react';
import { 
  Building2, 
  Loader2, 
  Pencil, 
  Save, 
  Plus, 
  Trash2,
  CalendarDays,
  CheckCircle2,
  PlusCircle,
  Clock3,
  Wrench,
  Power,
  History,
  X
} from 'lucide-react';
import * as api from '@/api/endpoints';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type UpdateSlotRequest } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface Lane {
  id: number;
  number: string;
  type: string;
  is_active: boolean;
}

interface Schedule {
  id: number;
  name: string;
}

interface PriceSlot {
  id: number;
  start_time: string;
  end_time: string;
  price: number;
  premium_price: number;
}

interface DayConfig {
  day_of_week: number;
  schedule_id: number;
}

interface AvailabilitySlot {
  slot_id: number;
  time: string;
  price: number;
  premium_price?: number;
}

interface AvailabilityLane {
  lane_id: number;
  lane_number: string;
  type: string;
  slots: AvailabilitySlot[];
}

interface MaintenanceRecord {
  id: number;
  lane_id: number;
  lane_number: string;
  reason: string | null;
  started_at: string;
  ended_at: string | null;
  changed_by: number | null;
}

const dayNames = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

const laneTypeLabel: Record<string, string> = {
  NORMAL: 'Estándar', 
  PREMIUM: 'Premium',
};

export default function Infrastructure() {
  const { user } = useAuth();
  const isMaintenanceOnly = user?.role === 'MAINTENANCE';
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [dayConfigs, setDayConfigs] = useState<DayConfig[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Availability state
  const [availability, setAvailability] = useState<AvailabilityLane[]>([]);
  const [editingSlot, setEditingSlot] = useState<{ id: number, start_time?: string, end_time?: string, price: string, premium_price: string } | null>(null);

  // Maintenance history state
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [maintenanceLaneFilter, setMaintenanceLaneFilter] = useState<string>('all');

  // Controlled Tabs state
  const [activeTab, setActiveTab] = useState(isMaintenanceOnly ? 'lanes' : 'availability');

  // Create & Edit Lane state
  const [newLane, setNewLane] = useState({ number: '', type: 'NORMAL' });
  const [isLaneDialogOpen, setIsLaneDialogOpen] = useState(false);
  const [editingLane, setEditingLane] = useState<{ id: number, number: string, type: string } | null>(null);

  // Management state
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<PriceSlot[]>([]);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');

  // New Slot state
  const [newSlot, setNewSlot] = useState({ start_time: '10:00', end_time: '11:00', price: '15', premium_price: '20' });

  const fetchScheduleSlots = useCallback(async (scheduleId: number) => {
    try {
      const res = await api.getSlotsBySchedule(scheduleId);
      setScheduleSlots(res.data);
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [lanesRes, schedulesRes, daysRes] = await Promise.all([
        api.getLanes(),
        api.getSchedules(),
        api.getDayConfigs()
      ]);
      setLanes(lanesRes.data);
      setSchedules(schedulesRes.data);
      setDayConfigs(daysRes.data);

      if (schedulesRes.data.length > 0) {
        // Set to first schedule ONLY if none is currently selected
        setSelectedScheduleId(prev => {
          if (!prev) {
             const firstId = schedulesRes.data[0].id;
             fetchScheduleSlots(firstId);
             return firstId;
          }
          return prev;
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const availRes = await api.getAvailability(today);
      setAvailability(availRes.data);

      const historyRes = await api.getMaintenanceHistory();
      setMaintenanceRecords(historyRes.data);
    } catch (err) {
      console.error(err);
      if (!isRefresh) setMsg({ text: 'Error al cargar datos', type: 'error' });
    } finally {
      // Small delay prevents flickering only on initial load
      if (!isRefresh) setTimeout(() => setLoading(false), 200);
    }
  }, [fetchScheduleSlots]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (selectedScheduleId) {
      fetchScheduleSlots(selectedScheduleId);
    }
  }, [selectedScheduleId, fetchScheduleSlots]);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  // --- Lane Actions ---
  const handleCreateLane = async () => {
    try {
      if (!newLane.number) return;
      await api.createLane(newLane);
      setIsLaneDialogOpen(false);
      setNewLane({ number: '', type: 'NORMAL' });
      setActiveTab('lanes'); // Ensure we stay on lanes tab
      showMsg('Pista creada');
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al crear pista', 'error');
    }
  };

  const handleDeleteLane = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar esta pista?')) return;
    try {
      await api.deleteLane(id);
      showMsg('Pista eliminada');
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al eliminar pista', 'error');
    }
  };

  const handleSaveLane = async () => {
    if (!editingLane) return;
    try {
      await api.updateLane(editingLane.id, { number: editingLane.number, type: editingLane.type });
      setEditingLane(null);
      showMsg('Pista actualizada');
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al actualizar pista', 'error');
    }
  };

  const handleToggleLane = async (lane: Lane) => {
    const target = !lane.is_active;
    if (target && !confirm(`¿Poner la pista ${lane.number} en mantenimiento?`)) return;
    if (!target && !confirm(`¿Reactivar la pista ${lane.number}?`)) return;
    try {
      const payload: { is_active: boolean; maintenance_reason?: string } = { is_active: target };
      if (target) {
        const reason = prompt('Motivo del mantenimiento (opcional):', '')?.trim() || undefined;
        if (reason) payload.maintenance_reason = reason;
      }
      await api.updateLane(lane.id, payload);
      showMsg(target ? 'Pista en mantenimiento' : 'Pista reactivada');
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al cambiar estado de pista', 'error');
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-VE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const filteredRecords = maintenanceLaneFilter === 'all'
    ? maintenanceRecords
    : maintenanceRecords.filter(r => String(r.lane_id) === maintenanceLaneFilter);

  // --- Schedule Actions ---
  const handleCreateSchedule = async () => {
    try {
      if (!newScheduleName) return;
      await api.createSchedule({ name: newScheduleName });
      setIsScheduleDialogOpen(false);
      setNewScheduleName('');
      showMsg('Horario creado');
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al crear horario', 'error');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('¿Eliminar este horario? Esto borrará todas sus franjas de precio.')) return;
    try {
      await api.deleteSchedule(id);
      showMsg('Horario eliminado');
      if (selectedScheduleId === id) setSelectedScheduleId(null);
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al eliminar horario', 'error');
    }
  };

  // --- Day Config Actions ---
  const handleUpdateDayConfig = async (day: number, scheduleId: string) => {
    try {
      await api.updateDayConfig(day, parseInt(scheduleId));
      showMsg('Día actualizado');
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al actualizar día', 'error');
    }
  };

  // --- Price/Slot Actions (Global View & Schedule List) ---
  const handleSaveSlot = async () => {
    if (!editingSlot) return;
    try {
      const payload: UpdateSlotRequest = { 
        price: parseFloat(editingSlot.price),
        premium_price: parseFloat(editingSlot.premium_price)
      };
      if (editingSlot.start_time) {
        payload.start_time = editingSlot.start_time.length === 5 ? `${editingSlot.start_time}:00` : editingSlot.start_time;
      }
      if (editingSlot.end_time) {
        payload.end_time = editingSlot.end_time.length === 5 ? `${editingSlot.end_time}:00` : editingSlot.end_time;
      }

      await api.updateSlot(editingSlot.id, payload);
      setEditingSlot(null);
      showMsg('Actualizado correctamente');
      fetchData(true);
      if (selectedScheduleId) fetchScheduleSlots(selectedScheduleId);
    } catch (err) {
      console.error(err);
      showMsg('Error al actualizar', 'error');
    }
  };

  // --- Slot Actions (Per Schedule) ---
  const handleAddSlot = async () => {
    if (!selectedScheduleId) return;
    try {
      const start = newSlot.start_time.length === 5 ? `${newSlot.start_time}:00` : newSlot.start_time;
      const end = newSlot.end_time.length === 5 ? `${newSlot.end_time}:00` : newSlot.end_time;
      
      await api.createSlot({ 
        start_time: start,
        end_time: end,
        price: parseFloat(newSlot.price),
        premium_price: parseFloat(newSlot.premium_price),
        schedule_id: selectedScheduleId 
      });
      showMsg('Franja horaria añadida');
      fetchScheduleSlots(selectedScheduleId);
      // Also refresh availability if this schedule is active today
      if (dayConfigs.find(dc => dc.schedule_id === selectedScheduleId)) {
        const today = new Date().toISOString().split('T')[0];
        const availRes = await api.getAvailability(today);
        setAvailability(availRes.data);
      }
    } catch (err) {
      console.error(err);
      showMsg('Error al añadir franja', 'error');
    }
  };

  const handleDeleteSlot = async (slot_id: number) => {
    try {
      await api.deleteSlot(slot_id);
      showMsg('Franja eliminada');
      if (selectedScheduleId) fetchScheduleSlots(selectedScheduleId);
      fetchData(true);
    } catch (err) {
      console.error(err);
      showMsg('Error al eliminar franja', 'error');
    }
  };


  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Infraestructura</h1>
          <p className="text-slate-500 mt-2 text-lg">Define cómo funciona tu centro de boliche.</p>
        </div>
        
        {msg && (
          <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border animate-in fade-in zoom-in duration-300 ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            <CheckCircle2 className="size-4" />
            {msg.text}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="font-medium">Sincronizando infraestructura...</span>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 w-full sm:w-auto h-auto grid grid-cols-2 sm:flex">
          {!isMaintenanceOnly && (
            <TabsTrigger value="availability" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-sm">
              Estado Actual
            </TabsTrigger>
          )}
          <TabsTrigger value="lanes" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-sm">
            Pistas
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-sm">
            Mantenimiento
          </TabsTrigger>
          {!isMaintenanceOnly && (
            <TabsTrigger value="schedules" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-sm">
              Horarios y Precios
            </TabsTrigger>
          )}
        </TabsList>

        {/* --- TAB: AVAILABILITY --- */}
        <TabsContent value="availability" className="space-y-6">
          <div className="grid gap-6">
            {availability.length === 0 && (
              <Card className="p-12 text-center bg-slate-50 border-dashed border-2 rounded-3xl">
                <CalendarDays className="size-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">Sin configuración para hoy.</p>
                <p className="text-slate-400 text-sm mt-1">Asigna un horario al día de hoy en la pestaña "Horarios y Precios".</p>
              </Card>
            )}
            {availability.map((lane) => (
              <Card key={lane.lane_id} className="overflow-hidden border-slate-200/60 shadow-sm rounded-2xl">
                <CardHeader className="bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-slate-100">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Pista {lane.lane_number}</CardTitle>
                      <CardDescription className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                        {laneTypeLabel[lane.type] || lane.type}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 divide-x divide-y divide-slate-100">
                    {lane.slots.map((slot: AvailabilitySlot) => (
                      <div key={slot.slot_id} className="p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-50/50 transition-colors group relative">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{slot.time}</span>
                        
                        {editingSlot && editingSlot.id === slot.slot_id ? (
                          <div className="flex items-center gap-1 scale-90">
                            <Input 
                              type="number" 
                              min="0"
                              className="h-8 w-16 text-center font-bold px-1 rounded-md"
                              value={editingSlot.price}
                              onChange={(e) => setEditingSlot({ ...editingSlot, price: e.target.value })}
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleSaveSlot}>
                              <Save className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-black text-slate-900">${slot.price}</span>
                            <button 
                              onClick={() => setEditingSlot({ id: slot.slot_id, price: String(slot.price), premium_price: String(slot.premium_price || 0) })}
                              className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-slate-400 hover:text-indigo-600 transition-all font-bold"
                            >
                              <Pencil className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- TAB: LANES --- */}
        <TabsContent value="lanes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {!isMaintenanceOnly && (
            <Dialog open={isLaneDialogOpen} onOpenChange={setIsLaneDialogOpen}>
              <DialogTrigger asChild>
                <Card className="border-dashed border-2 border-slate-200 hover:border-indigo-400 cursor-pointer group transition-all rounded-3xl min-h-[160px] flex flex-col items-center justify-center bg-slate-50/20">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-3">
                    <Plus className="size-6" />
                  </div>
                  <span className="font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">Nueva Pista</span>
                </Card>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Agregar Pista</DialogTitle>
                  <DialogDescription>Crea un nuevo carril numerado.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Número</label>
                    <Input 
                      placeholder="Ej: 1" 
                      className="rounded-xl h-12"
                      value={newLane.number}
                      onChange={e => setNewLane({...newLane, number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tipo</label>
                    <Select value={newLane.type} onValueChange={(v: string) => setNewLane({...newLane, type: v})}>
                      <SelectTrigger className="rounded-xl h-12 border-slate-200">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">Estándar</SelectItem>
                        <SelectItem value="PREMIUM">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateLane} className="h-12 w-full font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                    Crear Pista
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}

            {lanes.map((lane) => (
              <Card key={lane.id} className={`rounded-3xl border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all ${!lane.is_active ? 'bg-slate-50 opacity-90' : ''}`}>
                <div className="p-6">
                  {editingLane?.id === lane.id ? (
                    <div className="space-y-3">
                      <Input 
                        value={editingLane.number} 
                        onChange={e => setEditingLane({...editingLane, number: e.target.value})}
                        className="font-bold text-center h-10 rounded-xl"
                        autoFocus
                      />
                      <Select value={editingLane.type} onValueChange={(v) => setEditingLane({...editingLane, type: v})}>
                        <SelectTrigger className="h-10 rounded-xl mb-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORMAL">Estándar</SelectItem>
                          <SelectItem value="PREMIUM">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 rounded-xl" onClick={handleSaveLane}>Guardar</Button>
                        <Button variant="ghost" className="h-9 rounded-xl text-slate-500" onClick={() => setEditingLane(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div
                          className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl transition-all hover:scale-105"
                          onClick={isMaintenanceOnly ? undefined : () => setEditingLane({ id: lane.id, number: lane.number, type: lane.type })}
                        >
                          {lane.number}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isMaintenanceOnly && (
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600" onClick={() => setEditingLane({ id: lane.id, number: lane.number, type: lane.type })}>
                            <Pencil className="size-4" />
                          </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title={lane.is_active ? 'Poner en mantenimiento' : 'Reactivar pista'}
                            className={lane.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-emerald-600 hover:text-emerald-700'}
                            onClick={() => handleToggleLane(lane)}
                          >
                            {lane.is_active ? <Wrench className="size-4" /> : <Power className="size-4" />}
                          </Button>
                          {!isMaintenanceOnly && (
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600" onClick={() => handleDeleteLane(lane.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <h3 className="text-lg font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors" onClick={isMaintenanceOnly ? undefined : () => setEditingLane({ id: lane.id, number: lane.number, type: lane.type })}>Pista {lane.number}</h3>
                        {!lane.is_active && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-widest text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                            <Wrench className="size-3" />
                            Mantenimiento
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {laneTypeLabel[lane.type] || lane.type}
                      </p>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- TAB: MAINTENANCE HISTORY --- */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <History className="size-5 text-indigo-600" />
                Historial de Mantenimiento
              </h3>
              <p className="text-slate-500 text-sm mt-1">Registro de cuándo y por qué cada pista estuvo fuera de servicio.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar pista:</span>
              <Select value={maintenanceLaneFilter} onValueChange={setMaintenanceLaneFilter}>
                <SelectTrigger className="w-[140px] h-9 rounded-lg border-slate-200 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {lanes.map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>Pista {l.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-sm">
            <div className="p-0 overflow-x-auto">
              {filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium flex flex-col items-center gap-3">
                  <Wrench className="size-8 text-slate-300" />
                  Sin registros de mantenimiento todavía.
                </div>
              ) : (
                <table className="w-full min-w-[640px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left">Pista</th>
                      <th className="px-6 py-3 text-left">Inicio</th>
                      <th className="px-6 py-3 text-left">Fin</th>
                      <th className="px-6 py-3 text-left">Motivo</th>
                      <th className="px-6 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map(record => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-900">Pista {record.lane_number}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{formatDate(record.started_at)}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{formatDate(record.ended_at)}</td>
                        <td className="px-6 py-4 text-slate-600">{record.reason || <span className="text-slate-400">—</span>}</td>
                        <td className="px-6 py-4">
                          {record.ended_at ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                              <CheckCircle2 className="size-3" /> Resuelto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                              <Wrench className="size-3" /> En progreso
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* --- TAB: SCHEDULES & PRICES --- */}
        <TabsContent value="schedules" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Days Column */}
            <div className="lg:col-span-1 space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CalendarDays className="size-5 text-indigo-600" />
                Asignación Semanal
              </h3>
              <Card className="rounded-3xl shadow-sm border-slate-200 overflow-hidden divide-y divide-slate-100">
                {dayNames.map((name, idx) => {
                  const currentSched = dayConfigs.find(dc => dc.day_of_week === idx)?.schedule_id;
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/30 transition-colors">
                      <span className="font-bold text-sm text-slate-600">{name}</span>
                      <Select 
                        value={String(currentSched || '')} 
                        onValueChange={(val: string) => handleUpdateDayConfig(idx, val)}
                      >
                        <SelectTrigger className="w-[140px] h-9 rounded-lg border-slate-200 text-xs font-medium">
                          <SelectValue placeholder="Sin horario" />
                        </SelectTrigger>
                        <SelectContent>
                          {schedules.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </Card>
            </div>

            {/* Schedules and Slots Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Clock3 className="size-5 text-indigo-600" />
                  Planes de Precios
                </h3>
                
                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-full bg-slate-900 hover:bg-slate-800 font-bold px-4">
                      + Nuevo Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl border-none">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black">Nuevo Plan de Precios</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Input 
                        placeholder="Nombre del plan (ej: Fines de Semana)" 
                        className="rounded-xl h-12"
                        value={newScheduleName}
                        onChange={e => setNewScheduleName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreateSchedule} className="w-full h-12 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700 shadow-xl">Crear Plan</Button>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-2 sm:flex flex-wrap gap-2">
                {schedules.map(s => (
                  <Button 
                    key={s.id}
                    variant={selectedScheduleId === s.id ? 'default' : 'outline'}
                    className={`rounded-xl font-bold px-4 h-10 transition-all ${selectedScheduleId === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    onClick={() => setSelectedScheduleId(s.id)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>

              {selectedScheduleId ? (
                <Card className="rounded-3xl border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900">Configurar Franjas</h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-300 hover:text-rose-600" onClick={() => handleDeleteSchedule(selectedScheduleId)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex gap-1 items-center bg-white border rounded-xl p-1 shadow-sm px-2">
                        <Input type="time" className="h-8 w-24 border-none p-0 text-center text-sm font-bold" value={newSlot.start_time} onChange={e => setNewSlot({...newSlot, start_time: e.target.value})}/>
                        <span className="text-slate-300">-</span>
                        <Input type="time" className="h-8 w-24 border-none p-0 text-center text-sm font-bold" value={newSlot.end_time} onChange={e => setNewSlot({...newSlot, end_time: e.target.value})}/>
                        <div className="w-px h-4 bg-slate-100 mx-2" />
                        <span className="text-slate-400 font-bold text-sm ml-1 select-none" title="Precio Normal">N: $</span>
                        <Input type="number" min="0" className="h-8 w-16 border-none p-0 text-center text-sm font-bold" value={newSlot.price} onChange={e => setNewSlot({...newSlot, price: e.target.value})} title="Precio Normal"/>
                        <div className="w-px h-4 bg-slate-100 mx-1" />
                        <span className="text-amber-500 font-bold text-sm ml-1 select-none" title="Precio Premium">P: $</span>
                        <Input type="number" min="0" className="h-8 w-16 border-none p-0 text-center text-sm text-amber-600 font-bold" value={newSlot.premium_price} onChange={e => setNewSlot({...newSlot, premium_price: e.target.value})} title="Precio Premium"/>
                      </div>
                      <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl h-10 px-4 transition-all" onClick={handleAddSlot}>
                        <PlusCircle className="size-4 mr-2" />
                        Añadir
                      </Button>
                    </div>
                  </div>

                  <div className="p-0">
                    {scheduleSlots.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-medium">No hay franjas definidas para este plan.</div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-3 text-left">Horario</th>
                            <th className="px-6 py-3 text-left">Precio Normal</th>
                            <th className="px-6 py-3 text-left">Precio Premium</th>
                            <th className="px-6 py-3 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {scheduleSlots.map(slot => (
                            <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4 font-bold text-slate-700">
                                {editingSlot?.id === slot.id ? (
                                  <div className="flex items-center gap-1">
                                    <Input 
                                      type="time"
                                      className="h-8 w-24 text-center text-sm font-bold border-indigo-200"
                                      value={editingSlot.start_time || slot.start_time.substring(0, 5)}
                                      onChange={(e) => setEditingSlot({ ...editingSlot, start_time: e.target.value })}
                                    />
                                    <span className="text-slate-400 mx-1">-</span>
                                    <Input 
                                      type="time"
                                      className="h-8 w-24 text-center text-sm font-bold border-indigo-200"
                                      value={editingSlot.end_time || slot.end_time.substring(0, 5)}
                                      onChange={(e) => setEditingSlot({ ...editingSlot, end_time: e.target.value })}
                                    />
                                  </div>
                                ) : (
                                  `${slot.start_time.substring(0,5)} - ${slot.end_time.substring(0,5)}`
                                )}
                              </td>
                              <td className="px-6 py-4 font-black border-l-transparent text-indigo-600 text-lg">
                                {editingSlot?.id === slot.id ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-400">$</span>
                                    <Input 
                                      type="number" 
                                      min="0"
                                      className="h-8 w-20 px-2 font-black text-lg text-slate-900 border-indigo-200 focus-visible:ring-indigo-500"
                                      value={editingSlot.price}
                                      onChange={(e) => setEditingSlot({ ...editingSlot, price: e.target.value })}
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <span 
                                    className="cursor-pointer border-b border-transparent hover:border-indigo-600 transition-colors"
                                    onClick={() => setEditingSlot({ id: slot.id, start_time: slot.start_time, end_time: slot.end_time, price: String(slot.price), premium_price: String(slot.premium_price || 0) })}
                                  >
                                    ${slot.price}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-black border-l-transparent text-amber-600 text-lg">
                                {editingSlot?.id === slot.id ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-400">$</span>
                                    <Input 
                                      type="number" 
                                      min="0"
                                      className="h-8 w-20 px-2 font-black text-lg text-amber-600 border-amber-200 focus-visible:ring-amber-500"
                                      value={editingSlot.premium_price}
                                      onChange={(e) => setEditingSlot({ ...editingSlot, premium_price: e.target.value })}
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" onClick={handleSaveSlot}>
                                      <Save className="size-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={() => setEditingSlot(null)}>
                                      <X className="size-4" /> 
                                    </Button>
                                  </div>
                                ) : (
                                  <span 
                                    className="cursor-pointer border-b border-transparent hover:border-amber-600 transition-colors"
                                    onClick={() => setEditingSlot({ id: slot.id, start_time: slot.start_time, end_time: slot.end_time, price: String(slot.price), premium_price: String(slot.premium_price || 0) })}
                                  >
                                    ${slot.premium_price || 0}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => setEditingSlot({ id: slot.id, start_time: slot.start_time, end_time: slot.end_time, price: String(slot.price), premium_price: String(slot.premium_price || 0) })}>
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleDeleteSlot(slot.id)}>
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="p-20 text-center bg-slate-50 border-dashed border-2 rounded-3xl text-slate-400">
                  Selecciona un plan para editar sus precios.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
