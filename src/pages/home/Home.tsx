import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, MapPin, Phone, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/api/endpoints';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [business, setBusiness] = useState<{ name: string; address: string; phone: string }>({
    name: 'Bowling SaaS',
    address: 'Calle 123, Centro Ciudad',
    phone: '+1 (555) 123-4567',
  });

  useEffect(() => {
    let active = true;
    api
      .getSettings()
      .then((res) => {
        if (active && res.data) {
          setBusiness({
            name: res.data.name || 'Bowling SaaS',
            address: res.data.address || '',
            phone: res.data.phone || '',
          });
        }
      })
      .catch(() => {
        // keep defaults if the API is unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">{business.name}</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/bookings')} className="text-sm font-medium text-slate-600 hover:text-indigo-600">Disponibilidad</button>
            {user ? (
              <Button onClick={() => navigate('/dashboard')} className="rounded-full px-6">Mi Panel</Button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600">Iniciar Sesión</button>
                <Button onClick={() => navigate('/register')} className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700">Registrarse</Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider">
              <Star className="w-3 h-3 fill-current" />
              El mejor centro de la ciudad
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1]">
              Vive la Experiencia <span className="text-indigo-600">Ultimate</span> de Bowling
            </h1>
            <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
              Reserva pistas VIP en segundos, disfruta de nuestro lounge de clase mundial y compite en el ambiente más vibrante de la ciudad.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={() => navigate('/bookings')} size="lg" className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-base font-semibold group shadow-lg shadow-indigo-100">
                Reservar Ahora
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button onClick={() => navigate('/register')} size="lg" variant="outline" className="h-14 px-8 rounded-2xl border-slate-200 text-base font-semibold">
                Ver Instalaciones
              </Button>
            </div>
            <div className="flex items-center gap-8 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                ))}
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-900">+500</span> reservas esta semana
              </p>
            </div>
          </div>
          <div className="relative animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
            <div className="absolute -inset-4 bg-indigo-600/5 blur-3xl rounded-full" />
            <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-200/50 border border-slate-100">
              <img 
                src="/luxury_bowling_hero.svg" 
                alt="Luxury Bowling Alley" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 animate-bounce duration-[3s]">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                   <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Pistas Libres</p>
                   <p className="text-xl font-black text-slate-900">¡Reserva Ya!</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-12">
          {[
            { label: 'Pistas Modernas', value: '24' },
            { label: 'Zona VIP', value: '4' },
            { label: 'Apertura', value: '24/7' },
            { label: 'Calificación', value: '4.9/5' },
          ].map((stat, i) => (
            <div key={i} className="flex-1 min-w-[150px] text-center lg:text-left">
              <p className="text-4xl font-black text-indigo-600 mb-1">{stat.value}</p>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Info */}
      <footer className="py-12 border-t border-slate-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 grayscale brightness-0 opacity-50">
            <Zap className="w-5 h-5 fill-current text-slate-900" />
            <span className="font-bold text-lg tracking-tight">{business.name}</span>
          </div>
          <div className="flex gap-8">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MapPin className="w-4 h-4 text-indigo-500" />
              {business.address}
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Phone className="w-4 h-4 text-indigo-500" />
              {business.phone}
            </div>
          </div>
          <p className="text-xs text-slate-400">© 2026 {business.name}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
