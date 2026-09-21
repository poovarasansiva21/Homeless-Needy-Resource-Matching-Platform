import axios from 'axios';
import { 
  User, 
  RequestItem, 
  Resource, 
  Donation, 
  AppNotification, 
  AiClassificationResponse 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sahaayaa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (data: Partial<User> & { password: string }) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data.user as User;
  },
  getDemoUsers: async () => {
    const res = await apiClient.get('/auth/demo-users');
    return res.data.demo_accounts;
  },
};

export const requestsApi = {
  create: async (data: any) => {
    const res = await apiClient.post('/requests', data);
    return res.data;
  },
  getAll: async (params?: { category?: string; urgency?: string; status?: string; my_only?: boolean }) => {
    const res = await apiClient.get('/requests', { params });
    return res.data.requests as RequestItem[];
  },
  getById: async (id: number) => {
    const res = await apiClient.get(`/requests/${id}`);
    return res.data;
  },
  updateStatus: async (id: number, status: string, notes?: string) => {
    const res = await apiClient.put(`/requests/${id}/status`, { status, notes });
    return res.data;
  },
  accept: async (id: number) => {
    const res = await apiClient.post(`/requests/${id}/accept`);
    return res.data;
  },
  donate: async (id: number, donation_type: string, notes?: string) => {
    const res = await apiClient.post(`/requests/${id}/donate`, { donation_type, notes });
    return res.data;
  },
};

export const resourcesApi = {
  getAll: async (params?: { category?: string; lat?: number; lon?: number; radius?: number }) => {
    const res = await apiClient.get('/resources', { params });
    return res.data.resources as Resource[];
  },
  getById: async (id: number) => {
    const res = await apiClient.get(`/resources/${id}`);
    return res.data.resource as Resource;
  },
  create: async (data: Partial<Resource>) => {
    const res = await apiClient.post('/resources', data);
    return res.data.resource as Resource;
  },
};

export const aiApi = {
  classify: async (text: string, people_count: number = 1, situation: string = '', latitude?: number, longitude?: number) => {
    const res = await apiClient.post('/ai/classify', { 
      text, 
      people_count, 
      situation,
      latitude,
      longitude 
    });
    return res.data as AiClassificationResponse;
  },
};

export const matchingApi = {
  find: async (params: {
    request_id?: number;
    category?: string;
    people_count?: number;
    urgency_level?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const res = await apiClient.post('/matching/find', params);
    return res.data.matches as any[];
  },
  liveClassify: async (data: {
    text: string;
    people_count?: number;
    situation?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const res = await apiClient.post('/matching/classify', data);
    return res.data;
  },
};

export const dashboardApi = {
  getImpact: async () => {
    const res = await apiClient.get('/dashboard/impact');
    return res.data.impact as {
      total_requests: number;
      verified_requests: number;
      resources_available: number;
      completed_requests: number;
    };
  },
  getAdmin: async () => {
    const res = await apiClient.get('/dashboard/admin');
    return res.data;
  },
  getNgo: async () => {
    const res = await apiClient.get('/dashboard/ngo');
    return res.data;
  },
  getDonor: async () => {
    const res = await apiClient.get('/dashboard/donor');
    return res.data;
  },
  getNotifications: async () => {
    const res = await apiClient.get('/dashboard/notifications');
    return res.data.notifications as AppNotification[];
  },
  markRead: async (id: number) => {
    const res = await apiClient.put(`/dashboard/notifications/${id}/read`);
    return res.data;
  },
};

export const adminApi = {
  verify: async (id: number, notes?: string) => {
    const res = await apiClient.post(`/admin/requests/${id}/verify`, { notes });
    return res.data;
  },
  reject: async (id: number, reason?: string) => {
    const res = await apiClient.post(`/admin/requests/${id}/reject`, { reason });
    return res.data;
  },
  getDuplicates: async () => {
    const res = await apiClient.get('/admin/duplicates');
    return res.data.duplicates as RequestItem[];
  },
  getAuditLogs: async () => {
    const res = await apiClient.get('/admin/audit-logs');
    return res.data.audit_logs;
  },
  getUsers: async () => {
    const res = await apiClient.get('/admin/users');
    return res.data.users as User[];
  },
};

export default apiClient;
