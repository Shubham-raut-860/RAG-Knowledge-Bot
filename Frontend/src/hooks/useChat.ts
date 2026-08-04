import { useState, useCallback } from 'react';
import { chatApi } from '../lib/api';
import { MessageRecord, ChatSession } from '../types';
import { toast } from '../lib/toast';

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  
  const [sessionHistories, setSessionHistories] = useState<Record<string, MessageRecord[]>>({});

  const loadChatSessions = useCallback(async () => {
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
    } catch (e) {
      console.error('Failed fetching sessions', e);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const selectSession = useCallback(async (id: string) => {
    setSelectedSessionId(id);
    setMessagesLoading(true);
    try {
      const res = await chatApi.getHistory(id);
      const items = res.messages || [];
      setMessages(items);
      setSessionHistories(prev => ({ ...prev, [id]: items }));
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const startNewThread = useCallback(() => {
    setSelectedSessionId(null);
    setMessages([]);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await chatApi.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      setSessionHistories(prev => {
        const n = { ...prev };
        delete n[sessionId];
        return n;
      });
      if (selectedSessionId === sessionId) {
        startNewThread();
      }
      toast.success('Thread deleted.');
    } catch {
      toast.error('Failed to delete thread.');
    }
  }, [selectedSessionId, startNewThread]);

  const handleSend = useCallback(async (
    txt: string,
    onFinish?: () => void
  ) => {
    if (!txt || chatLoading) return;

    const userMsg: MessageRecord = { role: 'user', content: txt, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    
    if (selectedSessionId) {
      setSessionHistories(prev => ({ 
        ...prev, 
        [selectedSessionId]: [...(prev[selectedSessionId] || []), userMsg] 
      }));
    }
    
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

      const botMsg: MessageRecord = { role: 'assistant', content: streamedResponse, sources: metaSources, created_at: new Date().toISOString() };
      setSessionHistories(prev => {
        const currentList = prev[finalSessionId] || [];
        const listWithoutUserMsg = selectedSessionId ? currentList : [...currentList, userMsg];
        return { ...prev, [finalSessionId]: [...listWithoutUserMsg, botMsg] };
      });

    } catch (err: any) {
      const msg = err.message || err.response?.data?.detail || 'Connection failed.';
      toast.error(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}`, created_at: new Date().toISOString() }]);
    } finally { 
      setChatLoading(false);
      if (onFinish) onFinish();
    }
  }, [chatLoading, selectedSessionId, loadChatSessions]);

  const saveEdit = useCallback(async (
    idx: number,
    txt: string,
    onFinish?: () => void
  ) => {
    if (!txt || !selectedSessionId) {
      if (onFinish) onFinish();
      return;
    }
    
    const msg = messages[idx];
    if (!msg.id) {
       toast.error("Cannot edit this message right now.");
       if (onFinish) onFinish();
       return;
    }

    const truncatedMessages = messages.slice(0, idx);
    const userMsg = { ...msg, content: txt };
    setMessages([...truncatedMessages, userMsg]);
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
      if (onFinish) onFinish();
    }
  }, [messages, selectedSessionId]);

  return {
    sessions,
    sessionsLoading,
    selectedSessionId,
    messages,
    messagesLoading,
    chatLoading,
    sessionHistories,
    loadChatSessions,
    selectSession,
    startNewThread,
    deleteSession,
    handleSend,
    saveEdit,
  };
}
