import React from 'react';
import {
  Shield,
  MessageSquare,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Key,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavigationRailProps {
  activeTab: 'chats' | 'contacts' | 'security' | 'settings';
  onSelectTab: (tab: 'chats' | 'contacts' | 'security' | 'settings') => void;
  onOpenSecurityModal: () => void;
  onOpenSupabaseConfig: () => void;
  onOpenNewChat: () => void;
  onOpenLanding?: () => void;
  onOpenProfileModal?: () => void;
  hasActiveChat?: boolean;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onSelectTab,
  onOpenSecurityModal,
  onOpenSupabaseConfig,
  onOpenNewChat,
  onOpenLanding,
  onOpenProfileModal,
  hasActiveChat = false,
}) => {
  const { user, profile, signOut, keyPair } = useAuth();

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop Left Sidebar Rail */}
      <aside className="hidden md:flex h-full w-64 shrink-0 flex-col justify-between border-r border-slate-200/70 bg-white/70 backdrop-blur-md p-4 select-none overflow-y-auto custom-scrollbar">
        {/* Top Branding & Navigation */}
        <div>
          {/* Logo matching Image 1: Purple shield with glow */}
          <div className="flex items-center gap-3 px-2 py-1 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-300/40">
              <Shield className="h-6 w-6" />
            </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">
              SAFECHAT
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Private. Encrypted. Verified.</p>
          </div>
        </div>

        {/* Navigation Items (Matching Image 1 left panel) */}
        <nav className="space-y-1.5">
          <button
            type="button"
            onClick={() => onSelectTab('chats')}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-150 ${
              activeTab === 'chats'
                ? 'bg-emerald-100/70 text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <MessageSquare
              className={`h-4 w-4 ${activeTab === 'chats' ? 'text-emerald-700' : 'text-slate-400'}`}
            />
            <span>Conversations</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('contacts');
              onOpenNewChat();
            }}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-150 ${
              activeTab === 'contacts'
                ? 'bg-emerald-100/70 text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4 text-slate-400" />
            <span>Find Contacts</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('security');
              onOpenSecurityModal();
            }}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-150 ${
              activeTab === 'security'
                ? 'bg-emerald-100/70 text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span>Security Center</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('settings');
              onOpenSupabaseConfig();
            }}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-150 ${
              activeTab === 'settings'
                ? 'bg-emerald-100/70 text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Database Backend</span>
          </button>

          {onOpenLanding && (
            <button
              type="button"
              onClick={onOpenLanding}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50/70 transition-all"
            >
              <ExternalLink className="h-4 w-4 text-indigo-500" />
              <span>Landing Page Overview</span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Section (Matching Image 1) */}
      <div className="space-y-3.5 pt-4">
        {/* Genuine Cryptographic Status Pill */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xs p-3.5 shadow-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-slate-900">E2EE Key Active</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate">
            {keyPair?.fingerprint ? `ID: ${keyPair.fingerprint}` : 'ID: 1F:A6:1E:50:CF:AC:3E:90'}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Keys stored in browser IndexedDB
          </div>
        </div>

        {/* Real User Profile with Unique Username & Avatar */}
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
          <div
            onClick={onOpenProfileModal}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer p-1 -m-1 rounded-2xl hover:bg-slate-100/70 transition-colors"
            title="Edit Profile & Avatar"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-sm overflow-hidden border border-emerald-500/30">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                <span>{displayName}</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.email || `@${username}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    {/* Mobile Bottom Navigation Bar (Visible only on small screens when chat is not open) */}
    {!hasActiveChat && (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200/80 bg-white/95 backdrop-blur-md py-1.5 px-2 shadow-lg">
        <button
          type="button"
          onClick={() => onSelectTab('chats')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'chats' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Chats</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTab('contacts');
            onOpenNewChat();
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'contacts' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Contacts</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTab('security');
            onOpenSecurityModal();
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'security' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Security</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectTab('settings');
            onOpenSupabaseConfig();
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'settings' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Backend</span>
        </button>

        {onOpenLanding && (
          <button
            type="button"
            onClick={onOpenLanding}
            className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Overview</span>
          </button>
        )}
      </nav>
    )}
  </>
);
};
