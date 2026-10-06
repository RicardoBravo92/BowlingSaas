import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as api from '@/api/endpoints';
import { type MyBooking } from '@/api/endpoints';
import { useAuth, type User } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  MoreHorizontal,
  ChevronRight,
  UserCheck,
  LayoutGrid,
  CalendarDays,
  Clock3,
  Ticket,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface StatBooking {
  id: number;
  client_name?: string;
  name?: string;
  lane?: string;
  lane_name?: string;
  time?: string;
  slot_time?: string;
  amount?: number;
  price?: number;
  status?: string;
}

interface DashboardStats {
  total_revenue?: number;
  total_paid_bookings?: number;
  revenue_last_7_days?: number;
  average_ticket?: number;
  period?: string;
  daily_history?: { date: string; count: number }[];
}

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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
}> = ({ title, value, icon: Icon, trend, trendUp }) => (
  <Card className='shadow-sm border-slate-100 hover:shadow-md transition-shadow group'>
    <CardContent className='p-6'>
      <div className='flex items-center justify-between mb-4'>
        <div className='w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300'>
          <Icon className='w-6 h-6' />
        </div>
        {trend && (
          <div
            className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
          >
            <TrendingUp className={`w-3 h-3 ${trendUp ? '' : 'rotate-180'}`} />
            {trend}
          </div>
        )}
      </div>
      <div className='space-y-1'>
        <p className='text-sm font-medium text-slate-500'>{title}</p>
        <h3 className='text-2xl font-bold text-slate-900'>{value}</h3>
      </div>
    </CardContent>
  </Card>
);

const CustomerHome: React.FC<{ user: User | null }> = ({ user }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(!!user);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .getMyBookings()
      .then((res) => {
        if (active) setBookings(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setBookings([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleCancel = async (bookingId: number) => {
    if (!window.confirm('¿Seguro que quieres cancelar esta reserva?')) return;
    setCancellingId(bookingId);
    setError('');
    try {
      await api.cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' as const } : b)),
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'No se pudo cancelar la reserva.');
    } finally {
      setCancellingId(null);
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = bookings
    .filter((b) => b.status !== 'CANCELLED' && b.booking_date >= today)
    .sort((a, b) => (a.booking_date + String(a.id).padStart(6, '0')).localeCompare(b.booking_date + String(b.id).padStart(6, '0')));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
        <h1 className="text-3xl font-bold mb-2">
          {user ? `¡Hola, ${user.full_name}! 👋` : '¡Bienvenido! 🎳'}
        </h1>
        <p className="opacity-90 max-w-lg">
          {user
            ? 'Este es el resumen de tus reservas. ¿Listo para tu próxima partida?'
            : 'Consulta la disponibilidad y asegura tu pista. Inicia sesión para gestionar tus reservas.'}
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            onClick={() => navigate('/bookings')}
            className="gap-2 bg-white text-indigo-700 hover:bg-indigo-50"
          >
            <CalendarDays className="w-4 h-4" />
            Reservar pista
          </Button>
          {user ? (
            <Button
              variant="outline"
              onClick={() => navigate('/my-bookings')}
              className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Ticket className="w-4 h-4" />
              Mis Reservas
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Iniciar Sesión
            </Button>
          )}
        </div>
      </div>

      {user && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-sm border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Próximas reservas</CardTitle>
                <CardDescription>Tus reservas activas para los próximos días.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-bookings')} className="gap-1 text-indigo-600">
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="font-medium">Cargando reservas...</span>
                </div>
              ) : upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                  <Ticket className="w-10 h-10 opacity-40" />
                  <p className="font-medium">No tienes reservas próximas.</p>
                  <Button onClick={() => navigate('/bookings')} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    Reservar ahora
                  </Button>
                </div>
              ) : (
                upcoming.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-slate-100">
                        <CalendarDays className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {format(new Date(booking.booking_date + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        <p className="text-xs text-slate-500">
                          Reserva #{booking.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {booking.items.map((item, idx) => (
                        <span
                          key={`${item.lane_id}-${item.start_hour}-${idx}`}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
                        >
                          <span className="font-bold text-indigo-600">Pista {item.lane_number}</span>
                          <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                          {String(item.start_hour).padStart(2, '0')}:00
                        </span>
                      ))}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusBadge[booking.status]}`}>
                        {statusLabel[booking.status]}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="gap-1.5 shrink-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        {cancellingId === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg">Tu actividad</CardTitle>
              <CardDescription>Resumen de tu cuenta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Reservas activas</p>
                  <p className="text-2xl font-black text-slate-900">{upcoming.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Historial total</p>
                  <p className="text-2xl font-black text-slate-900">{bookings.length}</p>
                </div>
                <Ticket className="w-8 h-8 text-slate-400" />
              </div>
              <Button onClick={() => navigate('/bookings')} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                <CalendarDays className="w-4 h-4" />
                Nueva reserva
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, isOwner, isCashier } = useAuth();
  const navigate = useNavigate();
  const [recentBookings] = useState<StatBooking[]>([]);
  const [stats, setStats] = useState<DashboardStats>({});

  const isStaff = isOwner || isCashier;

  useEffect(() => {
    if (isStaff) {
      api
        .getStats()
        .then((res) => {
          setStats(res.data);
        })
        .catch(() => setStats({}));
    }
  }, [isStaff]);

  // If customer or guest, show their personal summary (the grid lives in /bookings)
  if (!user || user.role === 'USER') {
    return <CustomerHome user={user} />;
  }

  return (
    <div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900'>
            Dashboard Administrativo
          </h1>
          <p className='text-slate-500 mt-1'>
            Visión general del rendimiento de tu centro de bolos.
          </p>
        </div>
        <div className='flex gap-3'>
          <button className='flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm'>
            <Calendar className='w-4 h-4' />
            Esta Semana
          </button>
          <Button
            onClick={() => navigate('/bookings')}
            className='gap-2 bg-indigo-600 hover:bg-indigo-700'
          >
            <LayoutGrid className='w-4 h-4' />
            Nueva Reserva
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <StatCard
          title='Ventas Totales'
          value={`$${(stats.total_revenue || 0).toFixed(2)}`}
          icon={DollarSign}
          trend="+12%"
          trendUp
        />
        <StatCard
          title='Reservas Pagadas'
          value={stats.total_paid_bookings || '0'}
          icon={Calendar}
          trend="+5%"
          trendUp
        />
        <StatCard
          title='Ventas (7 días)'
          value={`$${(stats.revenue_last_7_days || 0).toFixed(2)}`}
          icon={TrendingUp}
          trend="+8%"
          trendUp
        />
        <StatCard
          title='Ticket Promedio'
          value={`$${(stats.average_ticket || 0).toFixed(2)}`}
          icon={UserCheck}
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        <Card className='lg:col-span-2 shadow-sm border-slate-100 overflow-hidden'>
          <CardHeader className='flex flex-row items-center justify-between bg-slate-50/50 p-6'>
            <div className='space-y-1'>
              <CardTitle className='text-lg'>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas reservas confirmadas en el sistema.
              </CardDescription>
            </div>
            <button className='p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-500'>
              <MoreHorizontal className='w-5 h-5' />
            </button>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='w-full overflow-x-auto'>
              <table className='w-full text-left border-collapse'>
                <thead className='text-xs uppercase font-bold text-slate-400 border-b border-slate-100'>
                  <tr>
                    <th className='px-6 py-4'>Cliente</th>
                    <th className='px-6 py-4'>Pista</th>
                    <th className='px-6 py-4'>Hora</th>
                    <th className='px-6 py-4'>Monto</th>
                    <th className='px-6 py-4 text-right'>Estado</th>
                  </tr>
                </thead>
                <tbody className='text-sm divide-y divide-slate-100'>
                  {recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No hay reservas recientes para mostrar.
                      </td>
                    </tr>
                  ) : (
                    recentBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className='hover:bg-slate-50 transition-colors group cursor-pointer'
                      >
                        <td className='px-6 py-4 font-semibold text-slate-700'>
                          {booking.client_name || booking.name || 'Invitado'}
                        </td>
                        <td className='px-6 py-4 text-slate-600'>
                          {booking.lane || booking.lane_name}
                        </td>
                        <td className='px-6 py-4 text-slate-600'>
                          {booking.time || booking.slot_time}
                        </td>
                        <td className='px-6 py-4 font-medium text-slate-900'>
                          {booking.amount || booking.price}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <span
                            className='px-2.5 py-1 rounded-full text-xs font-bold leading-none bg-emerald-50 text-emerald-600'
                          >
                            Pagado
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className='p-4 border-t border-slate-100'>
              <button
                onClick={() => navigate('/bookings')}
                className='w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 py-2 rounded-lg transition-colors group'
              >
                Ver Disponibilidad de Pistas
                <ChevronRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-sm border-slate-100'>
          <CardHeader className='p-6 pb-2'>
            <CardTitle className='text-lg'>Ocupación del Mes</CardTitle>
            <CardDescription>Reporte de {stats.period || 'últimos 30 días'}.</CardDescription>
          </CardHeader>
          <CardContent className='p-6 pt-4 space-y-6'>
            {(stats.daily_history || []).slice(-4).map((item) => (
              <div key={item.date} className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='font-medium text-slate-700'>
                    {item.date}
                  </span>
                  <span className='font-bold text-slate-900'>
                    {item.count} reservas
                  </span>
                </div>
                <div className='h-2 w-full bg-slate-100 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out'
                    style={{ width: `${Math.min(item.count * 10, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            <div className='pt-4 border-t border-slate-100 mt-6'>
              <div className='flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl'>
                <div className='w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0'>
                  <TrendingUp className='w-5 h-5' />
                </div>
                <div className='flex-1'>
                  <p className='text-xs font-semibold text-indigo-600 uppercase tracking-wider'>
                    Sistema Bowling SaaS
                  </p>
                  <p className='text-sm font-medium text-slate-700'>
                    Consulta la ocupación y gestiona la disponibilidad en tiempo real.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
