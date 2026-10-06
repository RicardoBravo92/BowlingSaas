import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token expired (401): clear the session and force a login.
// A failed login attempt (401 from /auth/login) is ignored so the form can show its error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const url: string = error.config?.url ?? '';
    const isLoginAttempt = url.includes('/auth/login');

    if (status === 401 && !isLoginAttempt) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface CreateBookingRequest {
  booking_date: string;
  slot_keys: string[];
}

export interface MyBookingItem {
  lane_id: number;
  lane_number: string;
  start_hour: number;
}

export interface MyBooking {
  id: number;
  booking_date: string;
  total_price: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'ASSIGNED';
  expires_at: string | null;
  created_at: string;
  items: MyBookingItem[];
}

export interface CreateLaneRequest {
  number: string;
  type: string;
}

export interface UpdateLaneRequest {
  number?: string;
  type?: string;
  is_active?: boolean;
  maintenance_reason?: string;
}

export interface MaintenanceRecord {
  id: number;
  lane_id: number;
  lane_number: string;
  reason: string | null;
  started_at: string;
  ended_at: string | null;
  changed_by: number | null;
}

export interface CreateScheduleRequest {
  name: string;
}

export interface UpdateSlotRequest {
  start_time?: string;
  end_time?: string;
  price?: number;
  premium_price?: number;
}

export interface CreateSlotRequest {
  start_time: string;
  end_time: string;
  price: number;
  premium_price: number;
  schedule_id: number;
}

export interface UpdateUserRequest {
  role?: string;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

// Auth
export const login = (data: LoginRequest) => {
  const formData = new URLSearchParams();
  formData.append('username', data.username);
  formData.append('password', data.password);

  return api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

export const register = (data: RegisterRequest) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const forgotPassword = (email: string) =>
  api.post<{ message: string }>('/auth/forgot-password', { email });
export const resetPassword = (token: string, new_password: string) =>
  api.post<{ message: string }>('/auth/reset-password', { token, new_password });

// Bookings
export interface AvailabilitySlot {
  slot_id: number;
  slot_key: string;
  time: string;
  price: number;
  available: boolean;
}

export interface AvailabilityGrid {
  lane_id: number;
  lane_number: string;
  type: string;
  slots: AvailabilitySlot[];
}

export const getAvailability = (date: string) =>
  api.get<AvailabilityGrid[]>(`/bookings/availability?booking_date=${date}`);
export const createBooking = (payload: CreateBookingRequest) => api.post('/bookings/reserve', payload);

export interface MyBookingsParams {
  status?: MyBooking['status'];
  from_date?: string;
  to_date?: string;
}

export const getMyBookings = (params?: MyBookingsParams) =>
  api.get<MyBooking[]>('/bookings/my', { params });

export const cancelBooking = (bookingId: number) => api.delete<MyBooking>(`/bookings/${bookingId}`);

export interface AdminBooking extends MyBooking {
  user_id: number;
  user_full_name: string;
  user_email: string;
}

export interface AdminBookingsParams {
  status?: MyBooking['status'];
  from_date?: string;
  to_date?: string;
}

export const getAdminBookings = (params?: AdminBookingsParams) =>
  api.get<AdminBooking[]>('/admin/bookings', { params });
export const confirmBookingPayment = (bookingId: number) =>
  api.post(`/admin/confirm-payment/${bookingId}`);
export const cancelAdminBooking = (bookingId: number) =>
  api.delete(`/admin/bookings/${bookingId}`);
export const moveBooking = (bookingId: number, slotKeys: string[]) =>
  api.post(`/admin/bookings/${bookingId}/move`, { slot_keys: slotKeys });

export interface UserSearchResult {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

export const searchUsers = (q: string) =>
  api.get<UserSearchResult[]>('/admin/users/search', { params: { q } });
export const assignBooking = (payload: {
  user_id: number;
  booking_date: string;
  slot_keys: string[];
}) => api.post<AdminBooking>('/admin/bookings/assign', payload);

// Admin/Owner
export const getUsers = (params?: PaginationParams) => api.get('/admin/users', { params });
export const getUser = (user_id: number) => api.get(`/admin/users/${user_id}`);
export const updateUser = (user_id: number, data: UpdateUserRequest) => api.patch(`/admin/users/${user_id}`, data);
export const getStats = () => api.get('/admin/stats');

// Infrastructure
export const getLanes = () => api.get('/infrastructure/lanes');
export const createLane = (data: CreateLaneRequest) => api.post('/infrastructure/lanes', data);
export const deleteLane = (lane_id: number) => api.delete(`/infrastructure/lanes/${lane_id}`);
export const updateLane = (lane_id: number, data: UpdateLaneRequest) => api.patch(`/infrastructure/lanes/${lane_id}`, data);
export const getMaintenanceHistory = (params?: { lane_id?: number }) =>
  api.get('/infrastructure/lanes/maintenance', { params });

export const updateSlot = (slot_id: number, data: UpdateSlotRequest) =>
  api.patch(`/infrastructure/slots/${slot_id}`, data);

export const getSchedules = () => api.get('/infrastructure/schedules');
export const createSchedule = (data: CreateScheduleRequest) => api.post('/infrastructure/schedules', data);
export const deleteSchedule = (id: number) => api.delete(`/infrastructure/schedules/${id}`);

export const getDayConfigs = () => api.get('/infrastructure/days');
export const updateDayConfig = (day_of_week: number, schedule_id: number) =>
  api.put(`/infrastructure/days/${day_of_week}`, { schedule_id });

export const createSlot = (data: CreateSlotRequest) => api.post('/infrastructure/slots', data);
export const deleteSlot = (slot_id: number) => api.delete(`/infrastructure/slots/${slot_id}`);

// Settings
export interface BusinessSettings {
  id: number;
  name: string;
  address: string;
  phone: string;
}

export const getSettings = () => api.get<BusinessSettings>('/settings');
export const updateSettings = (data: Partial<Omit<BusinessSettings, 'id'>>) =>
  api.put<BusinessSettings>('/settings', data);
export const getSlotsBySchedule = (schedule_id: number) => api.get(`/infrastructure/slots/schedule/${schedule_id}`);