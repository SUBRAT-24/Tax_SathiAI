/**
 * Chat Slice — chat sessions, messages, streaming state.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../utils/api';

interface Source {
  doc_name: string;
  category: string;
  page: number;
  relevance_score: number;
  text_preview: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  confidence_score?: number;
  intent_tag?: string;
  feedback?: string;
  is_bookmarked?: boolean;
  timestamp: string;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: number | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  suggestions: string[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  sessions: [],
  currentSessionId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  suggestions: [],
  loading: false,
  error: null,
};

export const fetchSessions = createAsyncThunk('chat/fetchSessions', async () => {
  const { data } = await api.get('/chat/sessions');
  return data.data;
});

export const fetchSessionMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (sessionId: number) => {
    const { data } = await api.get(`/chat/sessions/${sessionId}`);
    return { sessionId, messages: data.data.messages };
  }
);

export const sendQuery = createAsyncThunk(
  'chat/sendQuery',
  async ({ query, sessionId }: { query: string; sessionId?: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/chat/query', { query, session_id: sessionId });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Query failed');
    }
  }
);

export const fetchSuggestions = createAsyncThunk('chat/fetchSuggestions', async () => {
  const { data } = await api.get('/chat/suggestions');
  return data.data;
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
    startStreaming: (state) => {
      state.isStreaming = true;
      state.streamingContent = '';
    },
    appendStreamToken: (state, action: PayloadAction<string>) => {
      state.streamingContent += action.payload;
    },
    stopStreaming: (state) => {
      state.isStreaming = false;
      if (state.streamingContent) {
        state.messages.push({
          id: Date.now(),
          role: 'assistant',
          content: state.streamingContent,
          timestamp: new Date().toISOString(),
        });
        state.streamingContent = '';
      }
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentSessionId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
      })
      .addCase(fetchSessionMessages.fulfilled, (state, action) => {
        state.currentSessionId = action.payload.sessionId;
        state.messages = action.payload.messages;
      })
      .addCase(sendQuery.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendQuery.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSessionId = action.payload.session_id;
        state.messages.push({
          id: action.payload.message_id,
          role: 'assistant',
          content: action.payload.answer,
          sources: action.payload.sources,
          confidence_score: action.payload.confidence,
          intent_tag: action.payload.intent,
          timestamp: new Date().toISOString(),
        });
        state.suggestions = action.payload.suggestions || [];
      })
      .addCase(sendQuery.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchSuggestions.fulfilled, (state, action) => {
        state.suggestions = action.payload;
      });
  },
});

export const {
  setCurrentSession,
  addUserMessage,
  startStreaming,
  appendStreamToken,
  stopStreaming,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
