import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  UserCheck,
  Shield,
  AlertCircle,
  Loader2,
  Users,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createDirectConversation,
  createGroupConversation,
  searchProfiles,
} from '../../lib/supabase';
import type { Profile } from '../../lib/types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const found = await searchProfiles(query.trim(), user.id);
        setResults(found);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to search users');
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, query.trim() ? 200 : 0);
    return () => clearTimeout(timer);
  }, [query, isOpen, user]);

  if (!isOpen) return null;

  const handleStartChat = async (targetUser: Profile) => {
    if (!user) return;
    setIsCreating(true);
    setError(null);
    try {
      const { conversationId, error: directError } = await createDirectConversation(
        user.id,
        targetUser.id
      );
      if (conversationId) {
        onSelectConversation(conversationId);
        onClose();
      } else {
        setError(directError || 'Could not create conversation.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!groupName.trim()) {
      setError('Please provide a name for your group chat.');
      return;
    }

    if (selectedUserIds.length === 0) {
      setError('Please select at least 1 contact to include in your group.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { conversationId, error: groupErr } = await createGroupConversation(
        user.id,
        selectedUserIds,
        groupName.trim()
      );

      if (conversationId) {
        onSelectConversation(conversationId);
        onClose();
      } else {
        setError(groupErr || 'Failed to create group conversation.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'direct' ? 'Start a Conversation' : 'Create Group Chat'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'direct' ? 'Direct 1-on-1 E2EE encrypted chat' : 'Multi-participant secure group'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switch between 1-on-1 and Group */}
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              mode === 'direct' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Direct Message
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
              mode === 'group' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            New Group Chat
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Group Name input in Group Mode */}
        {mode === 'group' && (
          <div className="mt-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Research Team, Security Guild..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="mt-3 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts by username (@...), name, or email..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Contacts Results List */}
        <div className="mt-3 max-h-60 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-500 text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Checking registered users...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 px-4 text-center space-y-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {query ? `No contacts matching "${query}"` : 'No other users found'}
              </p>
              <p className="text-[11px] text-slate-400">
                Register an additional account in another browser window to chat.
              </p>
            </div>
          ) : (
            results.map((targetUser) => {
              const initial = targetUser.display_name.charAt(0).toUpperCase();
              const isSelected = selectedUserIds.includes(targetUser.id);

              return (
                <div
                  key={targetUser.id}
                  onClick={() => {
                    if (mode === 'group') {
                      handleToggleMember(targetUser.id);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    mode === 'group'
                      ? isSelected
                        ? 'border-emerald-300 bg-emerald-50/70 cursor-pointer'
                        : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 cursor-pointer'
                      : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {mode === 'group' && (
                      <div className="shrink-0 text-emerald-600">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    )}

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200">
                      {initial}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{targetUser.display_name}</span>
                        {targetUser.username && (
                          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded-md border border-purple-200">
                            @{targetUser.username}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{targetUser.email}</div>
                    </div>
                  </div>

                  {mode === 'direct' && (
                    <button
                      type="button"
                      onClick={() => handleStartChat(targetUser)}
                      disabled={isCreating}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Chat</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Group creation footer */}
        {mode === 'group' && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {selectedUserIds.length} members selected
            </span>

            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={isCreating || selectedUserIds.length === 0 || !groupName.trim()}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all disabled:opacity-40 shadow-md shadow-emerald-200"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
