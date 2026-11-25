/**
 * Chat Slice — chat sessions, messages, citations, feedback, bookmarks, suggestions.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

export interface Source {
  doc_name?: string;
  category?: string;
  page?: number;
  section?: string;
  relevance_score?: number;
  text_preview?: string;
}

export interface ChatMessageItem {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  confidence_score?: number;
  intent_tag?: string;
  response_time_ms?: number;
  feedback?: 'thumbs_up' | 'thumbs_down' | string | null;
  is_bookmarked?: boolean;
  timestamp: string;
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface BookmarkItem {
  id: number;
  content: string;
  sources?: Source[];
  confidence_score?: number;
  timestamp: string;
}

interface ChatState {
  sessions: ChatSession[];
  sessionsLoading: boolean;
  currentSessionId: number | null;
  messages: ChatMessageItem[];
  messagesLoading: boolean;
  bookmarks: BookmarkItem[];
  suggestions: string[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  sessions: [],
  sessionsLoading: false,
  currentSessionId: null,
  messages: [],
  messagesLoading: false,
  bookmarks: [],
  suggestions: [],
  loading: false,
  error: null,
};

export const fetchSessions = createAsyncThunk('chat/fetchSessions', async () => {
  const { data } = await api.get('/chat/sessions');
  return (data.data || []) as ChatSession[];
});

export const fetchSessionMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (sessionId: number) => {
    const { data } = await api.get(`/chat/sessions/${sessionId}`);
    return {
      sessionId,
      messages: (data.data?.messages || []) as ChatMessageItem[],
    };
  }
);

export const renameSession = createAsyncThunk(
  'chat/renameSession',
  async ({ sessionId, title }: { sessionId: number; title: string }) => {
    await api.put(`/chat/sessions/${sessionId}`, { title });
    return { sessionId, title };
  }
);

export const deleteSession = createAsyncThunk(
  'chat/deleteSession',
  async (sessionId: number) => {
    await api.delete(`/chat/sessions/${sessionId}`);
    return sessionId;
  }
);

export const sendQuery = createAsyncThunk(
  'chat/sendQuery',
  async ({ query, sessionId }: { query: string; sessionId?: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/chat/query', { query, session_id: sessionId });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || error.response?.data?.message || 'Query failed');
    }
  }
);

export const submitFeedback = createAsyncThunk(
  'chat/submitFeedback',
  async ({ messageId, feedback }: { messageId: number; feedback: 'thumbs_up' | 'thumbs_down' }) => {
    await api.post('/chat/feedback', { message_id: messageId, feedback });
    return { messageId, feedback };
  }
);

export const toggleBookmark = createAsyncThunk(
  'chat/toggleBookmark',
  async (messageId: number) => {
    const { data } = await api.post(`/chat/bookmark/${messageId}`);
    return { messageId, bookmarked: Boolean(data.data?.bookmarked) };
  }
);

export const fetchBookmarks = createAsyncThunk('chat/fetchBookmarks', async () => {
  const { data } = await api.get('/chat/bookmarks');
  return (data.data || []) as BookmarkItem[];
});

export const fetchSuggestions = createAsyncThunk('chat/fetchSuggestions', async () => {
  const { data } = await api.get('/chat/suggestions');
  return (data.data || []) as string[];
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<number | null>) => {
      state.currentSessionId = action.payload;
    },
    addUserMessage: (state, action: PayloadAction<string>) => {
      state.messages.push({
        id: Date.now(),
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentSessionId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.sessionsLoading = true;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.sessionsLoading = false;
        state.sessions = action.payload;
      })
      .addCase(fetchSessions.rejected, (state) => {
        state.sessionsLoading = false;
      })
      .addCase(fetchSessionMessages.pending, (state) => {
        state.messagesLoading = true;
      })
      .addCase(fetchSessionMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.currentSessionId = action.payload.sessionId;
        state.messages = action.payload.messages;
      })
      .addCase(fetchSessionMessages.rejected, (state) => {
        state.messagesLoading = false;
      })
      .addCase(renameSession.fulfilled, (state, action) => {
        const s = state.sessions.find((item) => item.id === action.payload.sessionId);
        if (s) s.title = action.payload.title;
      })
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((item) => item.id !== action.payload);
        if (state.currentSessionId === action.payload) {
          state.currentSessionId = null;
          state.messages = [];
        }
      })
      .addCase(sendQuery.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendQuery.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        state.currentSessionId = payload.session_id;
        state.messages.push({
          id: payload.message_id,
          role: 'assistant',
          content: payload.answer,
          sources: payload.sources,
          confidence_score: payload.confidence,
          intent_tag: payload.intent,
          response_time_ms: payload.response_time_ms,
          timestamp: new Date().toISOString(),
        });
        if (Array.isArray(payload.suggestions) && payload.suggestions.length > 0) {
          state.suggestions = payload.suggestions;
        }
      })
      .addCase(sendQuery.rejected, (state, action) => {
        state.loading = false;
        const errorMsg = (action.payload as string) || 'Something went wrong. Please try again.';
        state.error = errorMsg;
        state.messages.push({
          id: Date.now(),
          role: 'assistant',
          content: `**Unable to complete request:** ${errorMsg}\n\nPlease verify your connection and try again.`,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(submitFeedback.fulfilled, (state, action) => {
        const msg = state.messages.find((m) => m.id === action.payload.messageId);
        if (msg) msg.feedback = action.payload.feedback;
      })
      .addCase(toggleBookmark.fulfilled, (state, action) => {
        const msg = state.messages.find((m) => m.id === action.payload.messageId);
        if (msg) msg.is_bookmarked = action.payload.bookmarked;
      })
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.bookmarks = action.payload;
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        if (state.suggestions.length === 0) {
          state.suggestions = action.payload;
        }
      });
  },
});

export const { setCurrentSession, addUserMessage, clearMessages } = chatSlice.actions;

export default chatSlice.reducer;
