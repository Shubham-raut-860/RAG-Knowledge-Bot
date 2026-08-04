import React, { useState, useEffect, useRef } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link
} from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut,
  Database,
  Users,
  Loader2,
  Sparkles,
  Settings,
  User,
  MessageSquare,
  ArrowLeft,
  Eye,
  EyeOff,
  Download,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  CheckCheck,
  ChevronDown,
  Trash2,
  Sun,
  Moon,
  Pencil,
  X as XIcon,
} from 'lucide-react';

import {
  authApi,
  chatApi,
  adminApi,
  healthApi,
  getCurrentUser,
} from './lib/api';
import {
  DocumentRecord,
  UserRecord,
  MessageRecord,
  ChatSession,
} from './types';
import { useTheme } from './lib/ThemeContext';
import { toast } from './lib/toast';
import Markdown from './lib/Markdown';

import ApiSettings from './components/ApiSettings';
import SessionList from './components/SessionList';
import UploadDocument from './components/UploadDocument';
import CitationsPanel from './components/CitationsPanel';
import LandingPage from './components/LandingPage';

// ── PRIVATE ROUTE GUARD ──────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// ── THEME TOGGLE BUTTON ──────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
      style={{
        color: 'var(--text-muted)',
        background: 'transparent',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
      }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      id="theme-toggle-btn"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 30, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          className="flex"
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4" />
            : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

// ── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ isRegister }: { isRegister: boolean }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => { setErrorText(null); }, [isRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setLoading(true);
    try {
      if (isRegister) {
        const r = await authApi.register({ username: username.trim(), password });
        localStorage.setItem('rag_token', r.access_token);
        toast.success('Account created! Welcome to AERIS.');
      } else {
        const r = await authApi.login({ username: username.trim(), password });
        localStorage.setItem('rag_token', r.access_token);
        toast.success('Signed in successfully.');
      }
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Connection failed.';
      setErrorText(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)',
    borderColor: 'var(--border-default)',
    color: 'var(--text-primary)',
  };
  const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)' };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 mesh-gradient overflow-hidden font-sans transition-colors duration-300"
         style={{ color: 'var(--text-primary)' }}>
      <div className="absolute inset-0 noise-bg mix-blend-overlay" />
      {/* Theme toggle on auth pages */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <ThemeToggle />
      </div>

      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-all"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Platform
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md sm:mx-4 md:mx-0 relative z-10"
      >
        <div className="text-center mb-10 space-y-4">
          <div
            className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
          >
            <span className="font-bold tracking-tighter text-xl">AG</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-sm font-light" style={{ color: 'var(--text-muted)' }}>
            {isRegister ? 'Enter your details to get started.' : 'Sign in to your workspace.'}
          </p>
        </div>

        <div className="glass-card rounded-[2rem] p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {errorText && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500 font-light mb-2 text-center">
                    {errorText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-xs font-medium ml-1" style={labelStyle}>Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                style={inputStyle}
                className="w-full rounded-2xl border py-3.5 px-4 text-sm outline-none transition-all placeholder:opacity-40"
                onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                id="auth-username-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium ml-1" style={labelStyle}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  className="w-full rounded-2xl border py-3.5 pl-4 pr-12 text-sm outline-none transition-all placeholder:opacity-40"
                  onFocus={e => (e.target.style.borderColor = 'var(--border-focus)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
                  id="auth-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl py-4 text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all mt-4 flex items-center justify-center gap-2"
              style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
              id="auth-submit-btn"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isRegister ? 'Continue' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            {isRegister ? (
              <p className="text-sm font-light" style={{ color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-medium" style={{ color: 'var(--text-primary)' }}>Sign in</Link>
              </p>
            ) : (
              <p className="text-sm font-light" style={{ color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <Link to="/register" className="font-medium" style={{ color: 'var(--text-primary)' }}>Sign up</Link>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── SESSION SKELETON ─────────────────────────────────────────────────────────
function SessionSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {[80, 60, 70, 50, 65].map((w, i) => (
        <div key={i} className="px-3 py-3 rounded-xl">
          <div className="skeleton h-3 mb-1.5" style={{ width: `${w}%` }} />
          <div className="skeleton h-2" style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  );
}

// ── MESSAGE SKELETON ─────────────────────────────────────────────────────────
function MessageSkeleton() {
  return (
    <div className="py-8 px-6 max-w-3xl mx-auto w-full space-y-6">
      {[true, false, true, false].map((isUser, i) => (
        <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && <div className="skeleton w-8 h-8 rounded-xl shrink-0" />}
          <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: '65%' }}>
            <div className="skeleton h-4 rounded-xl w-full" />
            <div className="skeleton h-4 rounded-xl" style={{ width: '80%' }} />
            {i % 2 === 0 && <div className="skeleton h-4 rounded-xl" style={{ width: '55%' }} />}
          </div>
          {isUser && <div className="skeleton w-8 h-8 rounded-xl shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage() {
  const navigate = useNavigate();
  const { toggleTheme, theme } = useTheme();
  const [user, setUser] = useState<{ username: string; role: string; userId: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'admin'>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionHistories, setSessionHistories] = useState<Record<string, MessageRecord[]>>({});

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [analytics, setAnalytics] = useState<{ avg_latency_ms: number; total_tokens_used: number; total_queries: number } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [editingMsgIdx, setEditingMsgIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); chatInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault(); startNewThread();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) navigate('/login');
    else setUser(currentUser);
    const openSettings = () => setShowSettings(true);
    window.addEventListener('open-api-settings', openSettings);
    return () => window.removeEventListener('open-api-settings', openSettings);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadChatSessions();
      checkHealth();
      if (user.role === 'admin') loadAdminData();
    }
  }, [user]);

  useEffect(() => {
    if (!showScrollBtn) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading]);

  const checkHealth = async () => {
    try { const h = await healthApi.get(); setServerOnline(h.status === 'ok'); }
    catch { setServerOnline(false); }
  };

  const loadChatSessions = async () => {
    setSessionsLoading(true);
    try {
      const list = await chatApi.getSessions();
      setSessions(list);
      list.forEach(async (s) => {
        try {
          const res = await chatApi.getHistory(s.session_id);
          setSessionHistories(prev => ({ ...prev, [s.session_id]: res.messages || [] }));
        } catch { /* skip */ }
      });
    } catch (e) { console.error('Failed fetching sessions', e); }
    finally { setSessionsLoading(false); }
  };

  const loadAdminData = async () => {
    setAdminLoading(true);
    try {
      const [docs, usrs, stats] = await Promise.all([adminApi.getDocuments(), adminApi.getUsers(), adminApi.getAnalytics()]);
      setDocuments(docs);
      setUsers(usrs);
      setAnalytics(stats);
    } catch (e) { console.error('Admin data failed', e); }
    finally { setAdminLoading(false); }
  };

  const selectSession = async (id: string) => {
    setSelectedSessionId(id);
    setMessagesLoading(true);
    try {
      const res = await chatApi.getHistory(id);
      const items = res.messages || [];
      setMessages(items);
      setSessionHistories(prev => ({ ...prev, [id]: items }));
    } catch { setMessages([]); }
    finally { setMessagesLoading(false); }
  };

  const startNewThread = () => {
    setSelectedSessionId(null);
    setMessages([]);
    setTimeout(() => chatInputRef.current?.focus(), 80);
  };

  const handleSend = async (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const txt = preset || messageInput.trim();
    if (!txt || chatLoading) return;
    if (!preset) setMessageInput('');

    const userMsg: MessageRecord = { role: 'user', content: txt, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (selectedSessionId) setSessionHistories(prev => ({ ...prev, [selectedSessionId]: [...(prev[selectedSessionId] || []), userMsg] }));
    setChatLoading(true);

    try {
      let isFirstChunk = true;
      let streamedResponse = '';
      let metaSources: any[] = [];
      let finalSessionId = selectedSessionId || '';

      await chatApi.stream(
        txt,
        selectedSessionId || undefined,
        (chunk) => {
          if (isFirstChunk) {
            setChatLoading(false);
            isFirstChunk = false;
            const botMsg: MessageRecord = { role: 'assistant', content: chunk, sources: metaSources, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, botMsg]);
            streamedResponse += chunk;
          } else {
            streamedResponse += chunk;
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].content = streamedResponse;
              return newMsgs;
            });
          }
        },
        (meta) => {
          metaSources = meta.sources || [];
          if (!selectedSessionId) {
            finalSessionId = meta.session_id;
            setSelectedSessionId(finalSessionId);
            loadChatSessions();
          }
        }
      );

      // Finalize histories
      const botMsg: MessageRecord = { role: 'assistant', content: streamedResponse, sources: metaSources, created_at: new Date().toISOString() };
      setSessionHistories(prev => {
        // If we just created the session, the userMsg wasn't saved in the dict yet, so add both.
        // If it was already there, we added userMsg before. Let's just reconstruct the full list.
        const currentList = prev[finalSessionId] || [];
        // prevent double adding userMsg
        const listWithoutUserMsg = selectedSessionId ? currentList : [...currentList, userMsg];
        return { ...prev, [finalSessionId]: [...listWithoutUserMsg, botMsg] };
      });

    } catch (err: any) {
      const msg = err.message || err.response?.data?.detail || 'Connection failed.';
      toast.error(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}`, created_at: new Date().toISOString() }]);
    } finally { 
      setChatLoading(false); 
    }
  };

  const saveEdit = async (idx: number) => {
    const txt = editingText.trim();
    if (!txt || !selectedSessionId) {
      setEditingMsgIdx(null);
      return;
    }
    
    const msg = messages[idx];
    if (!msg.id) {
       toast.error("Cannot edit this message right now.");
       setEditingMsgIdx(null);
       return;
    }

    const truncatedMessages = messages.slice(0, idx);
    const userMsg = { ...msg, content: txt };
    setMessages([...truncatedMessages, userMsg]);
    setEditingMsgIdx(null);
    setChatLoading(true);

    try {
      let isFirstChunk = true;
      let streamedResponse = '';
      let metaSources: any[] = [];
      
      await chatApi.editMessage(
        msg.id,
        txt,
        (chunk) => {
          if (isFirstChunk) {
            setChatLoading(false);
            isFirstChunk = false;
            const botMsg: MessageRecord = { role: 'assistant', content: chunk, sources: metaSources, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, botMsg]);
            streamedResponse += chunk;
          } else {
            streamedResponse += chunk;
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].content = streamedResponse;
              return newMsgs;
            });
          }
        },
        (meta) => {
          metaSources = meta.sources || [];
        }
      );

      const botMsg: MessageRecord = { role: 'assistant', content: streamedResponse, sources: metaSources, created_at: new Date().toISOString() };
      setSessionHistories(prev => ({ ...prev, [selectedSessionId]: [...truncatedMessages, userMsg, botMsg] }));

    } catch (err: any) {
      const msgErr = err.message || 'Connection failed.';
      toast.error(msgErr);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msgErr}`, created_at: new Date().toISOString() }]);
    } finally {
      setChatLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chatApi.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      setSessionHistories(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
      if (selectedSessionId === sessionId) startNewThread();
      toast.success('Thread deleted.');
    } catch { toast.error('Failed to delete thread.'); }
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const deleteDocument = async (id: number) => {
    try {
      await adminApi.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted.');
    } catch { toast.error('Failed to delete document.'); }
  };

  const toggleRole = async (u: UserRecord) => {
    const role = u.role === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.updateUserRole(u.id, role);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
      toast.success(`${u.username} is now ${role}.`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to update role.');
    }
  };

  const logout = () => {
    localStorage.removeItem('rag_token');
    toast.info('Signed out.');
    navigate('/login');
  };

  const exportBackup = (fmt: 'md' | 'json') => {
    if (!selectedSessionId) return;
    const msgs = sessionHistories[selectedSessionId] || messages;
    const content = fmt === 'json'
      ? JSON.stringify(msgs, null, 2)
      : msgs.map(m => `**${m.role.toUpperCase()}**\n${m.content}`).join('\n\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = `backup_${selectedSessionId.substring(0, 8)}.${fmt}`;
    a.click();
    toast.success(`Exported as .${fmt}`);
  };

  // ── Inline style helpers for themed elements ──────────────────────────────
  const surfaceStyle = { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' };
  const cardStyle    = { background: 'var(--bg-card)',    borderColor: 'var(--border-soft)' };
  const navStyle     = { borderColor: 'var(--nav-border)' };
  const sidebarStyle = { background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' };
  const subHeaderStyle = { borderColor: 'var(--border-subtle)' };
  const inputBoxStyle  = { background: 'var(--bg-surface)', borderColor: 'var(--border-soft)' };

  return (
    <div className="relative h-screen flex flex-col overflow-hidden font-sans mesh-gradient transition-colors duration-300"
         style={{ color: 'var(--text-primary)' }}>
      <div className="absolute inset-0 noise-bg mix-blend-overlay" />

      {/* ─ TOP NAV ─────────────────────────────────────────────────────────── */}
      <header className="relative z-30 shrink-0 h-16 flex items-center justify-between px-6 border-b"
              style={navStyle}>
        <div className="flex items-center gap-3.5">
          <div
            onClick={startNewThread}
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-105 transition-all"
            style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)', boxShadow: '0 0 20px var(--glass-shadow)' }}
          >
            AG
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>AERIS</span>
            <span className="text-[11px] font-light" style={{ color: 'var(--text-muted)' }}>{user?.username}</span>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="flex items-center gap-1 rounded-xl p-1"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveTab('chat')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={activeTab === 'chat'
                ? { background: 'var(--badge-bg)', color: 'var(--badge-text)' }
                : { color: 'var(--text-muted)' }}
            >
              <MessageSquare className="h-4 w-4" /> Chat
            </button>
            <button
              onClick={() => { setActiveTab('admin'); loadAdminData(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={activeTab === 'admin'
                ? { background: 'var(--badge-bg)', color: 'var(--badge-text)' }
                : { color: 'var(--text-muted)' }}
            >
              <Database className="h-4 w-4" /> Admin
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
               style={{ border: '1px solid var(--border-soft)', color: serverOnline ? '#34d399' : '#f87171' }}>
            <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {serverOnline ? 'Online' : 'Offline'}
          </div>
          <ThemeToggle />
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            title="Sign out"
            id="logout-btn"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ─ BODY ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">

          {/* CHAT VIEW */}
          {activeTab === 'chat' ? (
            <motion.div key='placeholder_key_value' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-1 overflow-hidden">

              {/* Thread sidebar — desktop (collapsible) */}
              <motion.aside
                animate={{ width: sidebarCollapsed ? 0 : 256 }}
                transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                className="shrink-0 border-r hidden lg:flex flex-col overflow-hidden"
                style={sidebarStyle}
              >
                <div className="w-64 h-full flex flex-col">
                  <div className="px-4 py-4 border-b flex items-center justify-between shrink-0"
                       style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-faint)' }}>Threads</span>
                    <div className="flex items-center gap-1">
                      <button onClick={startNewThread} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{ color: 'var(--text-muted)' }} title="New thread (Ctrl+N)">
                        <Plus className="h-4 w-4" />
                      </button>
                      <button onClick={() => setSidebarCollapsed(true)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                              style={{ color: 'var(--text-faint)' }} title="Collapse sidebar">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {sessionsLoading
                      ? <SessionSkeleton />
                      : <SessionList
                          sessions={sessions}
                          activeSessionId={selectedSessionId}
                          onSelectSession={(id) => { selectSession(id); setMobileSidebarOpen(false); }}
                          onNewSession={() => { startNewThread(); setMobileSidebarOpen(false); }}
                          onDeleteSession={deleteSession}
                          sessionHistories={sessionHistories}
                          hideHeader
                        />
                    }
                  </div>
                </div>
              </motion.aside>

              {/* Thread sidebar — mobile overlay */}
              <AnimatePresence>
                {mobileSidebarOpen && (
                  <>
                    <motion.div
                      key='placeholder_key_value'
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setMobileSidebarOpen(false)}
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    />
                    <motion.aside
                      key='placeholder_key_value'
                      initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                      className="fixed left-0 top-0 bottom-0 z-50 w-72 border-r flex flex-col overflow-hidden lg:hidden"
                      style={sidebarStyle}
                    >
                      <SessionList
                        sessions={sessions}
                        activeSessionId={selectedSessionId}
                        onSelectSession={(id) => { selectSession(id); setMobileSidebarOpen(false); }}
                        onNewSession={() => { startNewThread(); setMobileSidebarOpen(false); }}
                        onDeleteSession={deleteSession}
                        sessionHistories={sessionHistories}
                      />
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>

              {/* Chat column */}
              <div className="flex-1 flex flex-col overflow-hidden">

                {/* Thread sub-header */}
                <div className="shrink-0 h-12 flex items-center justify-between px-5 border-b" style={subHeaderStyle}>
                  <div className="flex items-center gap-3">
                    {sidebarCollapsed && (
                      <button onClick={() => setSidebarCollapsed(false)}
                              className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center transition-all"
                              style={{ color: 'var(--text-muted)' }} title="Expand sidebar">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: 'var(--text-muted)' }} title="Open threads">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-faint)' }}>
                      {selectedSessionId ? `Thread · ${selectedSessionId.substring(0, 8)}` : 'New conversation'}
                    </span>
                  </div>
                  {selectedSessionId && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={startNewThread}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all"
                              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                        <Plus className="h-3 w-3" /> New
                      </button>
                      <button onClick={() => exportBackup('md')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-widest border transition-all"
                              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                        <Download className="h-3 w-3" /> MD
                      </button>
                      <button onClick={() => exportBackup('json')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-widest border transition-all"
                              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                        <Download className="h-3 w-3" /> JSON
                      </button>
                      <button
                        onClick={() => deleteSession(selectedSessionId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all"
                        style={{ color: 'var(--text-faint)', borderColor: 'var(--border-subtle)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        title="Delete this thread"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto relative" onScroll={handleChatScroll}>
                  {messagesLoading ? (
                    <MessageSkeleton />
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-lg w-full space-y-8">
                        <div className="space-y-4">
                          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto"
                               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)' }}>
                            <Sparkles className="h-7 w-7" style={{ color: 'var(--text-muted)' }} />
                          </div>
                          <div>
                            <h2 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>How can I help?</h2>
                            <p className="text-base font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>Ask anything about your uploaded documents. Every answer is grounded to your data.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { t: 'Summarize', s: 'the main project objectives' },
                            { t: 'Explain', s: 'the compliance rules' },
                            { t: 'Find', s: 'key risk factors mentioned' },
                            { t: 'List', s: 'all action items' },
                          ].map(({ t, s }) => (
                            <button key={t} onClick={() => handleSend(undefined, `${t} ${s}`)}
                                    className="text-left p-4 rounded-2xl border transition-all group"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-soft)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-soft)'; }}>
                              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t}</p>
                              <p className="text-xs font-light leading-snug" style={{ color: 'var(--text-muted)' }}>{s}</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="py-8 px-6 max-w-3xl mx-auto w-full space-y-6">
                      {messages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className={`flex gap-3 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-md"
                                 style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                              <span className="text-[10px] font-bold tracking-tighter">AG</span>
                            </div>
                          )}
                          <div className={`flex flex-col max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {editingMsgIdx === idx ? (
                              <div className="w-full flex flex-col items-end gap-2">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-[300px] sm:w-[450px] p-3 text-sm rounded-xl border outline-none resize-y min-h-[100px]"
                                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-focus)', color: 'var(--text-primary)' }}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingMsgIdx(null)}
                                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                          style={{ color: 'var(--text-muted)' }}>
                                    Cancel
                                  </button>
                                  <button onClick={() => saveEdit(idx)}
                                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                                          style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                                    Save & Regenerate
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative px-5 py-3.5 text-sm leading-relaxed rounded-2xl"
                                   style={msg.role === 'user'
                                     ? { background: 'var(--msg-user-bg)', color: 'var(--msg-user-text)',
                                         borderRadius: '1rem 1rem 0.25rem 1rem', fontWeight: 500 }
                                     : { background: 'var(--msg-bot-bg)', color: 'var(--msg-bot-text)',
                                         border: '1px solid var(--msg-bot-border)',
                                         borderRadius: '1rem 1rem 1rem 0.25rem', fontWeight: 300 }}>
                                {msg.role === 'assistant'
                                  ? <Markdown content={msg.content} />
                                  : msg.content
                                }
                              </div>
                            )}

                            {/* Utility buttons */}
                            {editingMsgIdx !== idx && (
                              <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                {msg.role === 'user' && (
                                  <button
                                    onClick={() => { setEditingMsgIdx(idx); setEditingText(msg.content); }}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
                                    style={{ color: 'var(--text-faint)' }}
                                    title="Edit message"
                                  >
                                    <Pencil className="h-3 w-3" /> Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => copyMessage(msg.content, idx)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
                                  style={{ color: 'var(--text-faint)' }}
                                  title="Copy message"
                                >
                                  {copiedMsgIdx === idx
                                    ? <><CheckCheck className="h-3 w-3 text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
                                    : <><Copy className="h-3 w-3" /> Copy</>}
                                </button>
                              </div>
                            )}
                            
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-2 w-full"><CitationsPanel sources={msg.sources} /></div>
                            )}
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                 style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                              <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {chatLoading && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-md"
                               style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                            <span className="text-[10px] font-bold tracking-tighter">AG</span>
                          </div>
                          <div className="px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2"
                               style={{ background: 'var(--msg-bot-bg)', border: '1px solid var(--msg-bot-border)' }}>
                            <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]"
                                  style={{ background: 'var(--text-muted)' }} />
                            <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]"
                                  style={{ background: 'var(--text-muted)' }} />
                            <span className="w-2 h-2 rounded-full animate-bounce"
                                  style={{ background: 'var(--text-muted)' }} />
                          </div>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>
                  )}

                  {/* Scroll-to-bottom */}
                  <AnimatePresence>
                    {showScrollBtn && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all z-10"
                        style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}
                        title="Scroll to bottom"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input */}
                <div className="shrink-0 px-6 py-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <form onSubmit={handleSend}
                        className="max-w-3xl mx-auto flex items-center gap-3 border rounded-2xl px-5 py-3.5 transition-all"
                        style={inputBoxStyle}
                        onFocus={e => (e.currentTarget as HTMLFormElement).style.borderColor = 'var(--border-focus)'}
                        onBlur={e => (e.currentTarget as HTMLFormElement).style.borderColor = 'var(--border-soft)'}
                  >
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Ask about your documents…"
                      className="flex-1 bg-transparent text-sm py-1 focus:outline-none font-light placeholder:opacity-40"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    <button type="submit" disabled={!messageInput.trim() || chatLoading}
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-20 transition-all active:scale-95"
                            style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                      {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </button>
                  </form>
                  <p className="text-center text-[11px] mt-2.5 font-light" style={{ color: 'var(--text-faint)' }}>
                    Ctrl+K to focus · Ctrl+N for new thread
                  </p>
                </div>

              </div>
            </motion.div>

          ) : (
            /* ADMIN VIEW */
            <motion.div key='placeholder_key_value' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
              <div className="max-w-5xl mx-auto">
                <div className="mb-7">
                  <h1 className="text-xl font-semibold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>Administration</h1>
                  <p className="text-sm font-light" style={{ color: 'var(--text-muted)' }}>Manage your knowledge base and team access.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Analytics */}
                  {analytics && (
                    <div className="col-span-1 lg:col-span-2 grid grid-cols-3 gap-5">
                      <div className="rounded-2xl border p-4 flex flex-col justify-center" style={cardStyle}>
                        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Avg Latency</p>
                        <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{analytics.avg_latency_ms} <span className="text-sm font-normal">ms</span></p>
                      </div>
                      <div className="rounded-2xl border p-4 flex flex-col justify-center" style={cardStyle}>
                        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Tokens Used</p>
                        <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{analytics.total_tokens_used?.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border p-4 flex flex-col justify-center" style={cardStyle}>
                        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Queries Executed</p>
                        <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{analytics.total_queries?.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* Knowledge Base */}
                  <div className="rounded-2xl border overflow-hidden" style={cardStyle}>
                    <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                           style={{ background: 'var(--bg-elevated)' }}>
                        <Database className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Knowledge Base</h2>
                        <p className="text-[11px] font-light" style={{ color: 'var(--text-muted)' }}>Upload and manage indexed documents</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <UploadDocument documents={documents} onSuccess={loadAdminData} onDelete={deleteDocument} />
                    </div>
                  </div>

                  {/* Access Control */}
                  <div className="rounded-2xl border overflow-hidden" style={cardStyle}>
                    <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                           style={{ background: 'var(--bg-elevated)' }}>
                        <Users className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Access Control</h2>
                        <p className="text-[11px] font-light" style={{ color: 'var(--text-muted)' }}>Manage user roles and permissions</p>
                      </div>
                    </div>
                    <div className="p-4">
                      {adminLoading ? (
                        <div className="space-y-2 py-4">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                              <div className="flex items-center gap-2.5">
                                <div className="skeleton w-7 h-7 rounded-lg" />
                                <div>
                                  <div className="skeleton h-3 w-24 mb-1" />
                                  <div className="skeleton h-2 w-12" />
                                </div>
                              </div>
                              <div className="skeleton h-6 w-16 rounded-lg" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {users.map((u) => {
                            const isSelf = u.username === user?.username;
                            return (
                              <div key={u.id}
                                   className="flex items-center justify-between rounded-xl px-3.5 py-2.5 border transition-all"
                                   style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                       style={{ background: 'var(--bg-elevated)' }}>
                                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                      {u.username.substring(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                                      {u.username}
                                      {isSelf && (
                                        <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded font-bold tracking-wide"
                                              style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                                          YOU
                                        </span>
                                      )}
                                    </p>
                                    <span className="text-[10px] uppercase tracking-widest font-light" style={{ color: 'var(--text-muted)' }}>
                                      {u.role}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleRole(u)}
                                  disabled={isSelf}
                                  className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold border disabled:opacity-20 transition-all"
                                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
                                  onMouseEnter={e => { if (!isSelf) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--badge-bg)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--badge-text)'; } }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                                >
                                  {u.role === 'admin' ? 'Demote' : 'Promote'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ApiSettings isOpen={showSettings} onClose={() => setShowSettings(false)} onHealthUpdate={(ok) => setServerOnline(ok)} />
    </div>
  );
}

// ── APP ROUTER ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage isRegister={false} />} />
        <Route path="/register" element={<AuthPage isRegister={true} />} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
