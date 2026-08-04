export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface SourceDoc {
  filename: string;
  content_preview: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  answer: string;
  sources: SourceDoc[];
  session_id: string;
}

export interface MessageRecord {
  role: string; // 'user' | 'assistant'
  content: string;
  sources?: SourceDoc[];
  created_at: string;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: MessageRecord[];
}

export interface ChatSession {
  session_id: string;
  created_at: string;
}

export interface DocumentRecord {
  id: number;
  original_name: string;
  chunk_count: number;
  uploaded_by?: string;
  uploaded_at: string;
  status: string; // 'processing' | 'ready' | 'error'
}

export interface DeleteDocResponse {
  deleted: boolean;
  message: string;
}

export interface UserRecord {
  id: number;
  username: string;
  role: string; // 'admin' | 'user'
  created_at: string;
}

export interface HealthResponse {
  status: string;
  chroma_docs: number;
}
