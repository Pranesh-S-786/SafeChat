import React, { useState } from 'react';
import { Search, Plus, MessageSquare, AlertCircle, Users } from 'lucide-react';
import type { Conversation } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isLoading: boolean;
  error?: string | null;
}

// Curated pastel avatar backgrounds matching Image 1
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-amber-100 text-amber-700 border-amber-200',
];

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  isLoading,
  error,
}) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all');

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (activeFilter === 'groups') {
      return Boolean(c.is_group);
    }
    const other = c.participants.find((p) => p.id !== user?.id);
    if (!other && !c.is_group) return false;
    
    // Filter tab
    if (activeFilter === 'unread' && (!c.unread_count || c.unread_count === 0)) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      if (c.is_group) {
        return Boolean(
          c.group_name?.toLowerCase().includes(q) ||
          c.participants.some((p) => p.display_name.toLowerCase().includes(q))
        );
      }
      const nameMatch = other?.display_name.toLowerCase().includes(q);
      const emailMatch = other?.email.toLowerCase().includes(q);
      const userMatch = other?.username ? other.username.toLowerCase().includes(q) : false;
      return Boolean(nameMatch || emailMatch || userMatch);
    }

    return true;
  });

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-md select-none overflow-hidden">
      {/* Top Search & Create Bar (Matching Image 1) */}
      <div className="p-4 pb-3 space-y-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-2xl bg-slate-100/80 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all border border-transparent focus:border-emerald-300"
            />
          </div>

          <button
            type="button"
            onClick={onNewChat}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 active:scale-95"
            title="Start New Encrypted Conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Pills: All | Unread | Groups (Matching Image 1) */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
              activeFilter === 'unread'
                ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('groups')}
            className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
              activeFilter === 'groups'
                ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            Groups
          </button>
        </div>
      </div>

      {/* Conversations List with Scrollbar */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100/60 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-slate-200" />
                  <div className="h-2.5 w-40 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-2">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
            <p className="text-xs font-semibold text-slate-800">Unable to load conversations</p>
            <p className="text-[11px] text-slate-500">{error}</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-3 border border-emerald-100">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Your conversations will appear here</h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-[210px] leading-relaxed">
              Connect with registered users to start private, end-to-end encrypted conversations.
            </p>
            <button
              type="button"
              onClick={onNewChat}
              className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Start a conversation</span>
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No conversations matching "{search}"
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isGroup = Boolean(conv.is_group);
            const other = conv.participants.find((p) => p.id !== user?.id);
            if (!other && !isGroup) return null;

            const isSelected = conv.id === selectedConversationId;
            const displayName = isGroup ? (conv.group_name || 'Group Chat') : (other?.display_name || 'User');
            const initial = displayName.charAt(0).toUpperCase();
            const colorClass = getAvatarColor(displayName);
            const avatarUrl = !isGroup ? other?.avatar_url : null;

            const time = conv.last_message?.created_at
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
                className={`flex w-full items-center gap-3.5 p-3 rounded-2xl transition-all duration-150 text-left ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-50/95 to-emerald-100/40 border border-emerald-200/60 shadow-xs'
                    : 'hover:bg-slate-100/60'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full overflow-hidden font-bold text-sm shadow-xs border ${
                      isGroup ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : colorClass
                    }`}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : isGroup ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{displayName}</span>
                      {isGroup && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded-md font-semibold border border-indigo-200">
                          {conv.participants.length}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{time}</span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-1.5">
                    <p
                      className={`text-[11px] truncate flex items-center gap-1 ${
                        isSelected ? 'text-emerald-700 font-medium' : 'text-slate-500'
                      }`}
                    >
                      <span>{conv.last_message?.decryptedText || (isGroup ? 'Group encrypted channel' : 'Encrypted conversation')}</span>
                    </p>

                    {Boolean(conv.unread_count && conv.unread_count > 0) && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white shrink-0 shadow-xs">
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
    </div>
  );
};
