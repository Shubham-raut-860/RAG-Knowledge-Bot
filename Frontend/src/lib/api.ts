import axios from 'axios';
import {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  ChatResponse,
  ChatSession,
  ChatHistoryResponse,
  DocumentRecord,
  DeleteDocResponse,
  UserRecord,
  HealthResponse
} from '../types';

export const getApiUrl = (): string => {
  const metaEnv = (import.meta as any).env;
  return localStorage.getItem('rag_api_url') || (metaEnv && metaEnv.VITE_API_URL) || 'http://localhost:8000';
};

export const setApiUrl = (url: string) => {
  localStorage.setItem('rag_api_url', url);
};

// Create axios instance with interceptors for dynamic config and auth
export const api = axios.create({
  baseURL: getApiUrl(),
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  const token = localStorage.getItem('rag_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simple JWT decoder for extracting role and metadata
export function decodeJwt(token: string): { sub: string; user_id: number; role: string; exp?: number } | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode token', e);
    return null;
  }
}

// Check if user is logged in and if token is valid
export function getCurrentUser() {
  const token = localStorage.getItem('rag_token');
  if (!token) return null;
  
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  
  // Check expiration if present
  if (decoded.exp) {
    const isExpired = decoded.exp * 1000 < Date.now();
    if (isExpired) {
      localStorage.removeItem('rag_token');
      return null;
    }
  }
  
  return {
    username: decoded.sub,
    userId: decoded.user_id,
    role: decoded.role,
    token,
  };
}

// API methods matching current FastAPIs
export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/auth/login', data);
    return res.data;
  },
  
  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/auth/register', data);
    return res.data;
  },
};

export const chatApi = {
  send: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const res = await api.post<ChatResponse>('/chat', { message, session_id: sessionId });
    return res.data;
  },

  stream: async (message: string, sessionId: string | undefined, onChunk: (chunk: string) => void, onMeta: (meta: any) => void): Promise<void> => {
    const token = localStorage.getItem('rag_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${getApiUrl()}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, session_id: sessionId })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Connection failed.');
    }
    if (!response.body) throw new Error("ReadableStream not supported");

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') return;
          try {
            const data = JSON.parse(dataStr);
            if (data.meta) onMeta(data.meta);
            if (data.chunk) onChunk(data.chunk);
            if (data.error) throw new Error(data.error);
          } catch (e) {
          }
        }
      }
    }
  },

  editMessage: async (messageId: number, message: string, onChunk: (chunk: string) => void, onMeta: (meta: any) => void): Promise<void> => {
    const token = localStorage.getItem('rag_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${getApiUrl()}/chat/messages/${messageId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Connection failed.');
    }
    if (!response.body) throw new Error("ReadableStream not supported");

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') return;
          try {
            const data = JSON.parse(dataStr);
            if (data.meta) onMeta(data.meta);
            if (data.chunk) onChunk(data.chunk);
            if (data.error) throw new Error(data.error);
          } catch (e) {
          }
        }
      }
    }
  },
  
  getSessions: async (): Promise<ChatSession[]> => {
    const res = await api.get<ChatSession[]>('/chat/sessions');
    return res.data;
  },
  
  getHistory: async (sessionId: string): Promise<ChatHistoryResponse> => {
    const res = await api.get<ChatHistoryResponse>(`/chat/history/${sessionId}`);
    return res.data;
  },

  deleteSession: async (sessionId: string): Promise<{ deleted: boolean }> => {
    const res = await api.delete(`/chat/sessions/${sessionId}`);
    return res.data;
  },
};

export const adminApi = {
  getDocuments: async (): Promise<DocumentRecord[]> => {
    const res = await api.get<DocumentRecord[]>('/admin/documents');
    return res.data;
  },
  
  uploadDocument: async (file: File): Promise<{ doc_id: number; status: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/embed/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  
  deleteDocument: async (docId: number): Promise<DeleteDocResponse> => {
    const res = await api.delete<DeleteDocResponse>(`/admin/documents/${docId}`);
    return res.data;
  },
  
  getUsers: async (): Promise<UserRecord[]> => {
    const res = await api.get<UserRecord[]>('/admin/users');
    return res.data;
  },
  
  updateUserRole: async (userId: number, role: string): Promise<{ updated: boolean }> => {
    const res = await api.post(`/admin/users/${userId}/role`, { role });
    return res.data;
  },
  
  getDocStatus: async (docId: number): Promise<{ id: number; original_name: string; chunk_count: number; status: string }> => {
    const res = await api.get(`/embed/status/${docId}`);
    return res.data;
  },
  
  getAnalytics: async (): Promise<{ avg_latency_ms: number; total_tokens_used: number; total_queries: number }> => {
    const res = await api.get('/admin/analytics');
    return res.data;
  },
};

export const healthApi = {
  get: async (): Promise<HealthResponse> => {
    const res = await api.get<HealthResponse>('/health');
    return res.data;
  },
};
