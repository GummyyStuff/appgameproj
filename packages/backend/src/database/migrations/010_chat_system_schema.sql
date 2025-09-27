-- Chat System Database Schema Migration
-- Creates tables, indexes, RLS policies, and real-time triggers for the chat system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create chat_presence table for online user tracking
CREATE TABLE IF NOT EXISTS public.chat_presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL CHECK (length(username) > 0 AND length(username) <= 50),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_online BOOLEAN DEFAULT true NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_presence_is_online ON public.chat_presence(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_chat_presence_last_seen ON public.chat_presence(last_seen DESC);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages
-- Users can read all messages (public chat)
CREATE POLICY "Users can read all messages" ON public.chat_messages
  FOR SELECT USING (true);

-- Users can only insert their own messages
CREATE POLICY "Users can insert own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete messages (immutable chat history)
CREATE POLICY "No message updates allowed" ON public.chat_messages
  FOR UPDATE USING (false);

CREATE POLICY "No message deletes allowed" ON public.chat_messages
  FOR DELETE USING (false);

-- RLS Policies for chat_presence
-- Users can read all presence data
CREATE POLICY "Users can read all presence" ON public.chat_presence
  FOR SELECT USING (true);

-- Users can only manage their own presence
CREATE POLICY "Users can manage own presence" ON public.chat_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence" ON public.chat_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presence" ON public.chat_presence
  FOR DELETE USING (auth.uid() = user_id);