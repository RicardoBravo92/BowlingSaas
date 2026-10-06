import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  Settings,
  Users,
  LogOut,
  ChevronsUpDown,
  Gauge,
  Ticket,
  ClipboardList,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import * as api from '@/api/endpoints';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NavItem {
  name: string;
  path: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  /** Roles allowed to see this item. Omit = visible to all authenticated users */
  roles?: UserRole[];
  /** Hide from guests (unauthenticated visitors) */
  requiresAuth?: boolean;
}

const navMain: NavItem[] = [
  { name: 'Dashboard',       path: '/dashboard',      icon: LayoutDashboard },
  { name: 'Reservaciones',   path: '/bookings',       icon: CalendarCheck },
  { name: 'Mis Reservas',    path: '/my-bookings',    icon: Ticket,       requiresAuth: true },
  { name: 'Infraestructura', path: '/infrastructure', icon: Building2,    roles: ['OWNER', 'MANAGER', 'MAINTENANCE'] },
  { name: 'Usuarios',        path: '/users',          icon: Users,        roles: ['OWNER'] },
];

const navSecondary: NavItem[] = [
  { name: 'Reservas',       path: '/admin-bookings', icon: ClipboardList, roles: ['OWNER', 'CASHIER', 'MANAGER'] },
  { name: 'Configuración', path: '/settings', icon: Settings, roles: ['OWNER', 'CASHIER', 'MANAGER'] },
];

const settingsRoles: UserRole[] = ['OWNER', 'CASHIER', 'MANAGER'];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('Bowling SaaS');

  useEffect(() => {
    let active = true;
    api
      .getSettings()
      .then((res) => {
        if (active && res.data?.name) setBusinessName(res.data.name);
      })
      .catch(() => {
        // keep the default brand if the API is unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const roleLabel: Record<string, string> = {
    OWNER: 'Propietario',
    CASHIER: 'Cajero',
    MANAGER: 'Gerente',
    MAINTENANCE: 'Mantenimiento',
    USER: 'Cliente',
  };

  const isVisible = (item: NavItem) => {
    if (item.requiresAuth && !user) return false;
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header — Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2 cursor-default select-none">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Gauge className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{businessName}</span>
                  <span className="truncate text-xs text-muted-foreground">Panel de control</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.filter(isVisible).map((item) => (
                <SidebarMenuItem key={item.path}>
                  <NavLink to={item.path}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.name}
                        asChild
                      >
                        <span>
                          <item.icon />
                          <span>{item.name}</span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.filter(isVisible).map((item) => (
                <SidebarMenuItem key={item.path}>
                  <NavLink to={item.path}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.name}
                        asChild
                      >
                        <span>
                          <item.icon />
                          <span>{item.name}</span>
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer — User / Auth */}
      <SidebarFooter className="p-3 border-t border-slate-100/50">
        {user ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="w-full hover:bg-slate-100/80 transition-all rounded-xl group px-2"
                  >
                    <div className="shrink-0 relative">
                      <Avatar className="h-8 w-8 rounded-lg border border-slate-200 shadow-sm">
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px] uppercase">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    
                    <div className="flex flex-col flex-1 min-w-0 text-left ml-2 text-sm leading-none gap-1">
                      <span className="truncate font-bold text-slate-900 leading-none">
                        {user.full_name}
                      </span>
                      <span className="truncate text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none">
                        {roleLabel[user.role] || user.role}
                      </span>
                    </div>
                    <ChevronsUpDown className="size-3 text-slate-400 shrink-0" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent
                  side="top"
                  align="end"
                  sideOffset={12}
                  className="w-56 p-1.5 rounded-xl shadow-2xl border-slate-200 bg-white"
                >
                  {user?.role && settingsRoles.includes(user.role) && (
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => navigate('/settings')}
                    >
                      <Settings className="size-4 text-slate-500" />
                      <span className="text-sm font-medium">Configuración</span>
                    </DropdownMenuItem>
                  )}
                  
                  <div className="h-px bg-slate-100 my-1 mx-1" />
                  
                  <DropdownMenuItem 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-rose-600 hover:bg-rose-50 transition-colors"
                    onClick={logout}
                  >
                    <LogOut className="size-4" />
                    <span className="text-sm font-bold">Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100"
          >
            <LogOut className="size-3 rotate-180" />
            Iniciar Sesión
          </button>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
