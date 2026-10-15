import React, { useState } from 'react';
import {
  Shield,
  Search,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Plus,
  Send,
  Mic,
  FileText,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  PhoneCall,
  Settings,
  Sparkles,
  Wifi,
  Battery,
} from 'lucide-react';

interface InteractivePhonesProps {
  onOpenJuryModal: (messageText: string) => void;
  onOpenVideoChallenge: () => void;
  onGetStarted: () => void;
}

interface MockConversation {
  id: string;
  name: string;
  avatar: string;
  avatarBg: string;
  avatarText?: string;
  time: string;
  lastMessage: string;
  unreadCount?: number;
  isOnline?: boolean;
}

interface MockMessage {
  id: string;
  sender: 'aarav' | 'user';
  text?: string;
  time: string;
  type?: 'text' | 'file' | 'ai_alert';
  fileName?: string;
  fileSize?: string;
  alertTitle?: string;
  alertSubtitle?: string;
}

export const InteractivePhones: React.FC<InteractivePhonesProps> = ({
  onOpenJuryModal,
  onOpenVideoChallenge,
  onGetStarted,
}) => {
  const [selectedChatId, setSelectedChatId] = useState<string>('aarav');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [phone1Tab, setPhone1Tab] = useState<'chats' | 'calls' | 'settings'>('chats');
  const [composerText, setComposerText] = useState<string>('');

  const [conversations] = useState<MockConversation[]>([
    {
      id: 'aarav',
      name: 'Aarav',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      avatarBg: 'bg-indigo-100',
      time: '10:24 AM',
      lastMessage: "Let's meet tomorrow!",
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: 'college_group',
      name: 'College Group',
      avatar: '',
      avatarBg: 'bg-blue-100 text-blue-600',
      avatarText: 'CG',
      time: '9:18 AM',
      lastMessage: 'Notes updated',
    },
    {
      id: 'diya',
      name: 'Diya',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      avatarBg: 'bg-pink-100',
      time: 'Yesterday',
      lastMessage: "Sure, I'll check.",
    },
    {
      id: 'project_team',
      name: 'Project Team',
      avatar: '',
      avatarBg: 'bg-emerald-100 text-emerald-700',
      avatarText: 'PT',
      time: 'Yesterday',
      lastMessage: 'File: proposal.pdf',
    },
    {
      id: 'family',
      name: 'Family',
      avatar: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=150&auto=format&fit=crop&q=80',
      avatarBg: 'bg-amber-100',
      time: 'Mon',
      lastMessage: 'Call when free',
    },
  ]);

  const [messages, setMessages] = useState<MockMessage[]>([
    {
      id: 'm1',
      sender: 'aarav',
      text: 'Hey! Are you free today?',
      time: '10:24 AM',
      type: 'text',
    },
    {
      id: 'm2',
      sender: 'user',
      text: "Yes, let's meet.",
      time: '10:25 AM',
      type: 'text',
    },
    {
      id: 'm3',
      sender: 'aarav',
      fileName: 'Project Plan.pdf',
      fileSize: '2.4 MB',
      time: '10:26 AM',
      type: 'file',
    },
    {
      id: 'm4',
      sender: 'aarav',
      alertTitle: 'AI Check',
      alertSubtitle: 'Link looks suspicious',
      time: '10:26 AM',
      type: 'ai_alert',
    },
    {
      id: 'm5',
      sender: 'user',
      text: 'Thanks for checking!',
      time: '10:27 AM',
      type: 'text',
    },
  ]);

  const activeContact =
    conversations.find((c) => c.id === selectedChatId) || conversations[0];

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = composerText.trim();
    if (!trimmed) return;

    const newMsg: MockMessage = {
      id: `m_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };

    setMessages((prev) => [...prev, newMsg]);
    setComposerText('');

    // If message contains suspicious keywords, trigger an interactive AI alert card demonstration!
    const lower = trimmed.toLowerCase();
    const isSuspicious =
      lower.includes('http') ||
      lower.includes('free') ||
      lower.includes('win') ||
      lower.includes('crypto') ||
      lower.includes('code') ||
      lower.includes('password') ||
      lower.includes('urgent');

    if (isSuspicious) {
      setTimeout(() => {
        const alertMsg: MockMessage = {
          id: `alert_${Date.now()}`,
          sender: 'aarav',
          alertTitle: 'AI Check',
          alertSubtitle: 'Potential phishing risk flagged by jury',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'ai_alert',
        };
        setMessages((prev) => [...prev, alertMsg]);
      }, 700);
    }
  };

  return (
    <div className="relative flex w-full max-w-5xl items-center justify-center select-none py-6 lg:py-10">
      {/* Background Ambient Fluid Glow Shapes */}
      <div className="pointer-events-none absolute -top-12 -left-10 h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute top-10 right-4 h-80 w-80 rounded-full bg-purple-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-72 w-72 rounded-full bg-pink-300/25 blur-3xl" />

      {/* Decorative Sparkle Icons */}
      <div className="pointer-events-none absolute -top-4 right-12 text-purple-400 opacity-80 animate-pulse">
        <Sparkles className="h-6 w-6" />
      </div>

      {/* Two Phones Container */}
      <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4 lg:gap-8 w-full">
        {/* ============================================================ */}
        {/* PHONE 1: LEFT PHONE (Conversations List View)                */}
        {/* ============================================================ */}
        <div className="relative z-10 w-[275px] sm:w-[295px] md:w-[285px] lg:w-[310px] shrink-0 transform md:-rotate-3 md:-translate-y-2 hover:rotate-0 hover:translate-y-0 transition-transform duration-500 ease-out">
          {/* Phone Outer Shell Bezel */}
          <div className="rounded-[44px] border-[8px] border-slate-200/90 bg-white p-1 shadow-2xl shadow-indigo-950/15 ring-1 ring-slate-900/5">
            {/* Screen Area */}
            <div className="relative flex flex-col h-[540px] sm:h-[570px] rounded-[36px] bg-slate-50/70 overflow-hidden text-slate-800">
              {/* Notch & Status Bar */}
              <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-800">
                <span>9:41</span>
                {/* Speaker pill notch */}
                <div className="h-3.5 w-20 rounded-full bg-slate-900/90" />
                <div className="flex items-center gap-1.5 text-slate-700">
                  <div className="flex items-end gap-0.5 h-2.5">
                    <span className="w-0.5 h-1 bg-slate-700 rounded-xs" />
                    <span className="w-0.5 h-1.5 bg-slate-700 rounded-xs" />
                    <span className="w-0.5 h-2 bg-slate-700 rounded-xs" />
                    <span className="w-0.5 h-2.5 bg-slate-700 rounded-xs" />
                  </div>
                  <Wifi className="h-2.5 w-2.5" />
                  <Battery className="h-3 w-3" />
                </div>
              </div>

              {/* App Brand Header */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Shield className="h-4 w-4 fill-white" />
                  </div>
                  <span className="text-xs font-extrabold tracking-tight text-slate-900">
                    SAFE<span className="text-indigo-600">CHAT</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-700">Online</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-4 py-2.5 bg-white">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full rounded-xl bg-slate-100 py-1.5 pl-8 pr-3 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Content by Tab */}
              {phone1Tab === 'chats' ? (
                /* Conversation List */
                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
                  {filteredConversations.map((conv) => {
                    const isSelected = conv.id === selectedChatId;
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => setSelectedChatId(conv.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-50/80 shadow-xs ring-1 ring-indigo-200/60'
                            : 'hover:bg-white/80'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {conv.avatar ? (
                            <img
                              src={conv.avatar}
                              alt={conv.name}
                              className="h-10 w-10 rounded-full object-cover shadow-xs border border-slate-200/60"
                            />
                          ) : (
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${conv.avatarBg}`}
                            >
                              {conv.avatarText}
                            </div>
                          )}
                          {conv.isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                          )}
                        </div>

                        {/* Name & Last Message */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {conv.name}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {conv.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {conv.lastMessage}
                          </p>
                        </div>

                        {/* Unread badge */}
                        {conv.unreadCount && (
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs">
                            {conv.unreadCount}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : phone1Tab === 'calls' ? (
                /* Calls View */
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Recent Encrypted Calls
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-xs space-y-2 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Aarav</div>
                          <div className="text-[10px] text-slate-400">Incoming • 14 mins ago</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600">P2P Encrypted</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-xs space-y-2 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-indigo-600" />
                        <div>
                          <div className="text-xs font-bold text-slate-800">College Group</div>
                          <div className="text-[10px] text-slate-400">Video Challenge • Yesterday</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600">Attested</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Settings View */
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Security Controls
                  </div>
                  <div className="rounded-2xl bg-white p-3 border border-slate-100 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">E2EE Keys</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        RSA-2048 Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">AI Scam Jury</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Ensemble 4-Vote
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">Keystroke Biometrics</span>
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        Continuous Dwell/Flight
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Navigation Bar */}
              <div className="flex items-center justify-around border-t border-slate-200/80 bg-white/95 px-2 py-2">
                <button
                  type="button"
                  onClick={() => setPhone1Tab('chats')}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors ${
                    phone1Tab === 'chats' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chats</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhone1Tab('calls')}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors ${
                    phone1Tab === 'calls' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Calls</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhone1Tab('settings')}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition-colors ${
                    phone1Tab === 'settings' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHONE 2: RIGHT PHONE (Active Chat & AI Check Alert View)     */}
        {/* ============================================================ */}
        <div className="relative z-20 w-[285px] sm:w-[305px] md:w-[295px] lg:w-[325px] shrink-0 md:-ml-8 transform md:rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
          {/* Phone Outer Shell Bezel with Sleek Shadow */}
          <div className="rounded-[44px] border-[8px] border-slate-200/90 bg-white p-1 shadow-2xl shadow-indigo-950/25 ring-1 ring-slate-900/5">
            {/* Screen Area */}
            <div className="relative flex flex-col h-[550px] sm:h-[580px] rounded-[36px] bg-slate-50 overflow-hidden text-slate-800">
              {/* Notch & Status Bar */}
              <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-800 bg-white">
                <span>9:41</span>
                <div className="h-3.5 w-20 rounded-full bg-slate-900/90" />
                <div className="flex items-center gap-1.5 text-slate-700">
                  <div className="flex items-end gap-0.5 h-2.5">
                    <span className="w-0.5 h-1 bg-slate-700 rounded-xs" />
                    <span className="w-0.5 h-1.5 bg-slate-700 rounded-xs" />
                    <span className="w-0.5 h-2 bg-slate-700 rounded-xs" />
                    <span className="w-0.5 h-2.5 bg-slate-700 rounded-xs" />
                  </div>
                  <Wifi className="h-2.5 w-2.5" />
                  <Battery className="h-3 w-3" />
                </div>
              </div>

              {/* Chat Top Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-100 shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Focus phone 1
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  {/* Avatar & Contact info */}
                  <div className="relative">
                    {activeContact.avatar ? (
                      <img
                        src={activeContact.avatar}
                        alt={activeContact.name}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${activeContact.avatarBg}`}
                      >
                        {activeContact.avatarText}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-none">
                      {activeContact.name}
                    </div>
                    <span className="text-[10px] font-medium text-emerald-600">Online</span>
                  </div>
                </div>

                {/* Call / Video Actions */}
                <div className="flex items-center gap-2 text-slate-600">
                  <button
                    type="button"
                    onClick={onOpenVideoChallenge}
                    title="Audio Call (Encrypted)"
                    className="rounded-full p-1.5 hover:bg-slate-100 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenVideoChallenge}
                    title="Biometric Video Verification"
                    className="rounded-full p-1.5 hover:bg-slate-100 transition-colors"
                  >
                    <Video className="h-3.5 w-3.5 text-indigo-600" />
                  </button>
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Canvas */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/90">
                {messages.map((msg) => {
                  if (msg.type === 'file') {
                    return (
                      /* Attachment message bubble */
                      <div key={msg.id} className="flex justify-start">
                        <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-xs border border-slate-200/80 max-w-[85%]">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {msg.fileName}
                            </div>
                            <div className="text-[10px] text-slate-400">{msg.fileSize}</div>
                          </div>
                          <span className="text-[9px] text-slate-400 self-end shrink-0">
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (msg.type === 'ai_alert') {
                    return (
                      /* AI Check Card (as prominently displayed in user's image) */
                      <div key={msg.id} className="flex justify-start w-full">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenJuryModal(
                              'URGENT: Click here to verify your account or send payment link: https://scam-safechat-phish.biz'
                            )
                          }
                          className="group flex w-full max-w-[92%] items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/90 p-3 shadow-xs hover:bg-rose-100/90 hover:shadow-md transition-all text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                <span>{msg.alertTitle || 'AI Check'}</span>
                                <span className="text-[9px] font-semibold text-rose-600 bg-rose-200/60 px-1.5 py-0.2 rounded-full">
                                  Ensemble Risk
                                </span>
                              </div>
                              <div className="text-[11px] font-medium text-rose-700">
                                {msg.alertSubtitle || 'Link looks suspicious'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-1">
                            <span className="text-[9px] text-rose-400">{msg.time}</span>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-200/80 text-rose-700 group-hover:bg-rose-300 transition-colors">
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  }

                  const isUser = msg.sender === 'user';
                  return (
                    /* Regular text bubble */
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-2xl px-3 py-2 text-xs shadow-xs max-w-[80%] ${
                          isUser
                            ? 'bg-emerald-100/80 text-slate-800 rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-xs'
                        }`}
                      >
                        <p className="leading-snug">{msg.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                          <span>{msg.time}</span>
                          {isUser && <CheckCheck className="h-3 w-3 text-sky-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 border-t border-slate-200/70 bg-white px-3 py-2"
              >
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />

                <button
                  type="submit"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 active:scale-95 transition-all"
                >
                  {composerText.trim() ? (
                    <Send className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
