import { useEffect, useState } from 'react';
import { Users, Shield, UserCheck, Loader2, ChevronRight, Search, RefreshCw } from 'lucide-react';
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

interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'USER' | 'CASHIER' | 'MANAGER' | 'MAINTENANCE' | 'OWNER';
}

const roleLabel: Record<string, string> = {
  USER: 'Cliente',
  CASHIER: 'Cajero',
  MANAGER: 'Gerente',
  MAINTENANCE: 'Mantenimiento',
  OWNER: 'Propietario',
};

const roleBadge: Record<string, string> = {
  USER: 'bg-slate-100 text-slate-600 border-slate-200',
  CASHIER: 'bg-blue-50 text-blue-700 border-blue-200',
  MANAGER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-200',
  OWNER: 'bg-amber-50 text-amber-700 border-amber-200',
};

const roleOptions = ['USER', 'CASHIER', 'MANAGER', 'MAINTENANCE', 'OWNER'] as const;

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getUsers({ skip: 0, limit: 100 });
      setUsers(Array.isArray(res.data) ? res.data : []);

    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Error al cargar los usuarios (se requiere rol Owner)');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (newRole: string) => {
    if (!selectedUser) return;
    setUpdatingRole(true);
    setRoleMsg('');
    try {
      const res = await api.updateUser(selectedUser.id, { role: newRole });
      setRoleMsg('Rol actualizado correctamente');
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: res.data.role } : u))
      );
      setSelectedUser({ ...selectedUser, role: res.data.role as User['role'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setRoleMsg(e?.response?.data?.detail || 'Error al actualizar el rol');
    } finally {
      setUpdatingRole(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalByRole = (role: string) => users.filter((u) => u.role === role).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Usuarios</h1>
          <p className="text-slate-500 mt-1">Gestiona el personal y los clientes registrados.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Clientes</p>
              <p className="text-2xl font-bold text-slate-900">{totalByRole('USER')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Cajeros</p>
              <p className="text-2xl font-bold text-slate-900">{totalByRole('CASHIER')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Propietarios</p>
              <p className="text-2xl font-bold text-slate-900">{totalByRole('OWNER')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <Card className="lg:col-span-2 shadow-sm border-slate-100 overflow-hidden">
          <CardHeader className="px-6 py-4 bg-slate-50/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Lista de Usuarios</CardTitle>
              <CardDescription>{filtered.length} usuarios encontrados</CardDescription>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Cargando usuarios...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No se encontraron usuarios</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setRoleMsg(''); }}
                    className={`w-full flex items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-slate-50 group
                      ${selectedUser?.id === user.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {user.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${roleBadge[user.role]}`}>
                      {roleLabel[user.role] ?? user.role}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Detail */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="px-6 py-4 bg-slate-50/60">
            <CardTitle className="text-base">Detalle de Usuario</CardTitle>
            <CardDescription>Selecciona un usuario para editar</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-300 space-y-3">
                <Users className="w-10 h-10" />
                <p className="text-sm text-slate-400">Selecciona un usuario de la lista</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3 pb-5 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedUser.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-800">{selectedUser.full_name}</p>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5">ID #{selectedUser.id}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cambiar Rol</p>
                  <div className="space-y-2">
                    {roleOptions.map((role) => (
                      <button
                        key={role}
                        disabled={updatingRole || selectedUser.role === role}
                        onClick={() => handleUpdateRole(role)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                          ${selectedUser.role === role
                            ? 'bg-indigo-600 border-indigo-700 text-white cursor-default'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
                          } disabled:opacity-60`}
                      >
                        <span>{roleLabel[role]}</span>
                        {selectedUser.role === role && <Shield className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>

                  {updatingRole && (
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Actualizando...
                    </div>
                  )}

                  {roleMsg && (
                    <div className={`p-3 text-xs rounded-lg border ${roleMsg.includes('Error')
                      ? 'text-red-600 bg-red-50 border-red-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                      {roleMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
