import React, { useState } from 'react';
import { Shield, Plus, LogOut, Search, Lock, CheckCircle2, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Conversation } from '../../lib/types';

interface SidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChat: () => void;
  onOpenSecuritySettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onOpenNewChat,
  onOpenSecuritySettings,
}) => {
  const { user, profile, signOut } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const otherParticipant = c.participants.find((p) => p.id !== user?.id);
    if (!otherParticipant) return false;
    const matchName = otherParticipant.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEmail = otherParticipant.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchEmail;
  });

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/95 sm:w-80 md:w-96 select-none">
      {/* Header with User Info & Actions */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-950">
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </div>

          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-100 truncate max-w-[130px]">
                {profile?.display_name || 'My Account'}
              </span>
              <span title="E2EE Keys Initialized" className="text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 inline" />
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
              {profile?.email}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
            title="Start New Chat"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenSecuritySettings}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
            title="Security & Privacy Center"
          >
            <Shield className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={signOut}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-800/60">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-slate-800/80 bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500">
            <MessageSquare className="h-10 w-10 text-slate-700 mb-2 stroke-1" />
            <p className="text-xs font-medium text-slate-400">No conversations</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Click the + icon above to start an encrypted chat with a registered user.
            </p>
            <button
              onClick={onOpenNewChat}
              className="mt-4 rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-slate-700 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No conversations matching "{searchQuery}"
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const other = conv.participants.find((p) => p.id !== user?.id);
            if (!other) return null;
            const isSelected = conv.id === selectedConversationId;

            const timeFormatted = conv.last_message?.created_at
              ? new Date(conv.last_message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-slate-800/90 text-white'
                    : 'hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700/80 text-emerald-400 font-semibold text-sm">
                    {other.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                </div>

                {/* Info & Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {other.display_name}
                    </span>
                    <span className="text-[10px] text-slate-500">{timeFormatted}</span>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5 text-emerald-400 shrink-0 inline" />
                      <span>{conv.last_message?.decryptedText || 'Encrypted conversation'}</span>
                    </p>
                    {Boolean(conv.unread_count && conv.unread_count > 0) && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer System Status */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 p-3 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-medium text-slate-300">E2EE Armed</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          AI Jury: Active (4/4)
        </span>
      </div>
    </aside>
  );
};
