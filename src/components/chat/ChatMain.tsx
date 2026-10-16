import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Video,
  Plus,
  Send,
  Lock,
  Check,
  CheckCheck,
  ShieldAlert,
  AlertTriangle,
  Smile,
  Paperclip,
  Activity,
  Phone,
  MoreVertical,
  Download,
  Mic,
  ArrowLeft,
  Users,
  Trash2,
  FileText,
  ScanFace,
  ShieldCheck,
} from 'lucide-react';
import type {
  AIJuryResult,
  Conversation,
  DecryptedMessage,
  FileMetadata,
  KeystrokeRiskReport,
  MessageType,
  Profile,
} from '../../lib/types';
import { KeystrokeCollector } from '../../lib/keystroke';
import { CallModal } from './CallModal';
import { EmojiPicker } from './EmojiPicker';
import { VoiceMessageBubble } from './VoiceMessageBubble';

interface ChatMainProps {
  conversation: Conversation | null;
  messages: DecryptedMessage[];
  currentUserId: string;
  onSendMessage: (
    text: string,
    juryResult?: AIJuryResult,
    keystrokeAnomaly?: boolean,
    messageType?: MessageType,
    fileMetadata?: FileMetadata
  ) => Promise<void>;
  onOpenVideoChallenge: () => void;
  onTestMyFace?: () => void;
  onToggleSecurityPanel: () => void;
  onInspectJury: (msg: DecryptedMessage) => void;
  onOpenNewChat: () => void;
  isLoadingMessages: boolean;
  onKeystrokeUpdate?: (report: KeystrokeRiskReport) => void;
  onBack?: () => void;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onClearLegacyMessages?: () => Promise<void>;
}

export const ChatMain: React.FC<ChatMainProps> = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onOpenVideoChallenge,
  onTestMyFace,
  onToggleSecurityPanel,
  onInspectJury,
  onOpenNewChat,
  isLoadingMessages,
  onKeystrokeUpdate,
  onBack,
  onDeleteMessage,
  onClearLegacyMessages,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [liveKeystrokeReport, setLiveKeystrokeReport] = useState<KeystrokeRiskReport | null>(null);
  const [showFaceMenu, setShowFaceMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Call modal state
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');

  // Voice recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const collectorRef = useRef<KeystrokeCollector>(new KeystrokeCollector(currentUserId));
  const sendingLockRef = useRef(false);

  useEffect(() => {
    collectorRef.current.setUserId(currentUserId);
    const initialReport = collectorRef.current.analyzeAndEvaluate();
    setLiveKeystrokeReport(initialReport);
    if (onKeystrokeUpdate) {
      onKeystrokeUpdate(initialReport);
    }
  }, [currentUserId, onKeystrokeUpdate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // If no conversation is selected
  if (!conversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center chat-canvas-bg p-8 text-center select-none overflow-y-auto custom-scrollbar">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200">
            <Shield className="h-9 w-9" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            SafeChat Web
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            End-to-end encrypted messaging with AI scam protection, continuous keystroke authentication, and facial verification.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenNewChat}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Start a conversation</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>RSA-OAEP 2048 & AES-GCM 256 Client-Side Encryption</span>
          </div>
        </div>
      </div>
    );
  }

  const isGroup = Boolean(conversation.is_group);
  const otherParticipants = conversation.participants.filter((p) => p.id !== currentUserId);
  const recipient = otherParticipants[0] || ({
    id: 'unknown',
    display_name: 'Recipient',
    email: '',
  } as Profile);

  const displayName = isGroup
    ? (conversation.group_name || otherParticipants.map((p) => p.display_name.split(' ')[0]).join(', '))
    : recipient.display_name;
  const initial = displayName.charAt(0).toUpperCase();

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    const report = collectorRef.current.analyzeAndEvaluate();
    setLiveKeystrokeReport(report);
    if (onKeystrokeUpdate) {
      onKeystrokeUpdate(report);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    collectorRef.current.handleKeyDown(e);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    collectorRef.current.handleKeyUp(e);
    const report = collectorRef.current.analyzeAndEvaluate();
    setLiveKeystrokeReport(report);
    if (onKeystrokeUpdate) {
      onKeystrokeUpdate(report);
    }
  };

  const handleSend = async (
    customText?: string,
    messageType: MessageType = 'text',
    fileMetadata?: FileMetadata
  ) => {
    const text = customText !== undefined ? customText : inputText.trim();
    if ((!text && !fileMetadata) || sendingLockRef.current || isSending) return;

    sendingLockRef.current = true;
    setIsSending(true);
    if (customText === undefined) {
      setInputText('');
    }

    try {
      const currentReport = collectorRef.current.analyzeAndEvaluate();
      const hasAnomaly = Boolean(currentReport.isCalibrated && currentReport.isRiskAlert);

      // AI safety detection is ONLY done on receiving messages, NEVER on sending!
      await onSendMessage(text, undefined, hasAnomaly, messageType, fileMetadata);

      collectorRef.current.commitMessageBaseline();
      const updatedReport = collectorRef.current.analyzeAndEvaluate();
      setLiveKeystrokeReport(updatedReport);
      if (onKeystrokeUpdate) {
        onKeystrokeUpdate(updatedReport);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      if (customText === undefined) {
        setInputText(text);
      }
    } finally {
      sendingLockRef.current = false;
      setIsSending(false);
    }
  };

  // Voice Note Recording
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setRecordingDuration(0);
      setIsRecordingAudio(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const cancelRecordingAudio = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setRecordingDuration(0);
  };

  const finishAndSendAudio = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Audio = reader.result as string;
        handleSend('🎤 Voice Message', 'voice', {
          fileName: `voice_note_${Date.now()}.webm`,
          fileType: 'audio/webm',
          fileSize: blob.size,
          fileData: base64Audio,
          duration: recordingDuration,
        });
      };
      reader.readAsDataURL(blob);

      setIsRecordingAudio(false);
      setRecordingDuration(0);
    };

    mediaRecorderRef.current.stop();
  };

  // File & Image attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds the 8 MB E2EE limit.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleSend(`📎 ${file.name}`, isImage ? 'image' : 'file', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: base64,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatAudioTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex h-full flex-1 flex-col chat-canvas-bg select-none overflow-hidden relative">
      {/* Top Header Bar */}
      <div className="m-3 mb-0 flex h-16 items-center justify-between rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-md px-3 sm:px-5 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 transition-colors shadow-xs active:scale-95 cursor-pointer"
              title="Back to Conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {/* Avatar Circle */}
          <div
            onClick={onToggleSecurityPanel}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-sm border shadow-xs cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${
              isGroup ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-rose-100 text-rose-700 border-rose-200'
            }`}
            title="View Details"
          >
            {!isGroup && recipient.avatar_url ? (
              <img src={recipient.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : isGroup ? (
              <Users className="h-5 w-5" />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          <div
            onClick={onToggleSecurityPanel}
            className="cursor-pointer min-w-0"
            title="View Details"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
                {displayName}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isGroup ? `${conversation.participants.length} members` : 'Online'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls: Voice Call, Video Call, Search, More */}
        <div className="flex items-center gap-1 sm:gap-2 text-slate-600">
          <button
            type="button"
            onClick={() => {
              setCallType('voice');
              setIsCallOpen(true);
            }}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Voice Call"
          >
            <Phone className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setCallType('video');
              setIsCallOpen(true);
            }}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Video Call"
          >
            <Video className="h-4 w-4" />
          </button>

          {!isGroup && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFaceMenu(!showFaceMenu)}
                className={`rounded-full p-2 transition-colors ${
                  showFaceMenu ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Face Verification & Biometric Challenges"
              >
                <Shield className="h-4 w-4 text-emerald-600" />
              </button>

              {showFaceMenu && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Biometric Facial Verification</span>
                    <p className="text-[10px] text-slate-400">Self-test or verify contact authenticity</p>
                  </div>
                  <div className="space-y-1 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFaceMenu(false);
                        if (onTestMyFace) onTestMyFace();
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                        <ScanFace className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Test My Face (Self Test)</div>
                        <div className="text-[10px] text-slate-400">Live camera, liveness & match %</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowFaceMenu(false);
                        onOpenVideoChallenge();
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Verify {otherParticipants[0]?.display_name || 'Contact'}</div>
                        <div className="text-[10px] text-slate-400">Send challenge & receive match report</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleSecurityPanel}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Options & Security Details"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
        <div className="flex justify-center my-2">
          <span className="rounded-full bg-white/90 px-4 py-1 text-xs font-semibold text-slate-500 border border-slate-200/70 shadow-xs">
            Today
          </span>
        </div>

        {/* Legacy unreadable message notification banner */}
        {messages.some((m) => m.decryptedText === '[Encrypted Message - Key not found on device]') && (
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl bg-amber-50/95 border border-amber-200/90 p-3 text-xs text-amber-900 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Previous session messages</strong> were encrypted before account reset.
              </span>
            </div>
            {onClearLegacyMessages && (
              <button
                type="button"
                onClick={onClearLegacyMessages}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-200/90 hover:bg-amber-300 px-3 py-1.5 text-[11px] font-bold text-amber-950 transition-colors shrink-0 shadow-xs active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5 text-amber-900" />
                <span>Clean Up Messages</span>
              </button>
            )}
          </div>
        )}

        {isLoadingMessages ? (
          <div className="space-y-4 p-4">
            <div className="h-12 w-52 rounded-2xl bg-white/70 animate-pulse" />
            <div className="h-12 w-64 rounded-2xl bg-emerald-100/70 ml-auto animate-pulse" />
            <div className="h-14 w-60 rounded-2xl bg-white/70 animate-pulse" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 text-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-2 border border-emerald-100">
              <Lock className="h-5 w-5" />
            </div>
            <p className="font-semibold text-slate-700">No messages yet</p>
            <p className="mt-1 text-[11px] text-slate-400">All communications are secured with end-to-end encryption.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender_id === currentUserId;
            const sender = conversation.participants.find((p) => p.id === msg.sender_id);
            const senderName = sender?.display_name || 'Contact';
            const senderInitial = senderName.charAt(0).toUpperCase();

            // AI Jury evaluation only applies to received messages!
            const jury = !isSelf ? msg.juryResult : undefined;
            const isScam = jury?.verdict === 'SCAM';
            const isUncertain = jury?.verdict === 'UNCERTAIN';
            const isSafe = jury?.verdict === 'SAFE';

            const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const isVoice = msg.messageType === 'voice' || Boolean(msg.fileMetadata?.duration);
            const isImage = msg.messageType === 'image' || Boolean(msg.fileMetadata?.fileType?.startsWith('image/'));
            const isAttachmentText = Boolean(msg.decryptedText) && msg.decryptedText.startsWith('📎 ');
            const isFile = (msg.messageType === 'file' || Boolean(msg.fileMetadata && !isVoice && !isImage) || isAttachmentText) && !isVoice && !isImage;

            return (
              <div
                key={msg.id}
                className={`flex w-full flex-col ${isSelf ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                {/* AI Jury Warning Banner ONLY on received messages */}
                {!isSelf && (isScam || isUncertain) && (
                  <button
                    type="button"
                    onClick={() => onInspectJury(msg)}
                    className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-medium transition-all max-w-[85%] md:max-w-[70%] text-left border shadow-xs ${
                      isScam
                        ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                        : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {isScam ? (
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <span className="flex-1 truncate">
                      <strong>{isScam ? 'AI Jury Flagged Scam' : 'AI Jury Alert'}:</strong>{' '}
                      {jury?.explanation}
                    </span>
                    <span className="text-[10px] underline shrink-0 font-bold">Inspect</span>
                  </button>
                )}

                <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Sender Avatar for Incoming Messages */}
                  {!isSelf && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-xs mb-0.5 overflow-hidden">
                      {sender?.avatar_url ? (
                        <img src={sender.avatar_url} alt={senderName} className="h-full w-full object-cover" />
                      ) : (
                        <span>{senderInitial}</span>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`bubble-shadow rounded-2xl px-4 py-2.5 text-xs md:text-sm leading-relaxed transition-all ${
                      isSelf
                        ? 'bg-[#dcf8c6] text-slate-900 rounded-br-xs'
                        : 'bg-white text-slate-900 rounded-bl-xs border border-slate-100'
                    }`}
                  >
                    {isGroup && !isSelf && (
                      <div className="text-[11px] font-bold text-emerald-700 mb-1">
                        {senderName}
                      </div>
                    )}

                    {/* Voice Message Bubble */}
                    {isVoice ? (
                      <VoiceMessageBubble
                        audioUrl={msg.fileMetadata?.fileData}
                        duration={msg.fileMetadata?.duration || 0}
                        isSelf={isSelf}
                      />
                    ) : isImage && msg.fileMetadata?.fileData ? (
                      /* Image Attachment */
                      <div className="my-1 space-y-1">
                        <img
                          src={msg.fileMetadata.fileData}
                          alt="Attachment"
                          className="max-h-60 max-w-full rounded-xl object-contain border border-slate-200"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                          <span className="truncate">{msg.fileMetadata.fileName}</span>
                          <a
                            href={msg.fileMetadata.fileData}
                            download={msg.fileMetadata.fileName || 'image.png'}
                            className="text-emerald-700 font-bold hover:underline"
                          >
                            Save
                          </a>
                        </div>
                      </div>
                    ) : isFile ? (
                      /* Document File Attachment Card */
                      <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 border border-slate-200/90 my-1 min-w-[220px] max-w-sm shadow-xs hover:border-emerald-300 transition-colors">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div
                            className="font-bold text-slate-900 text-xs truncate"
                            title={msg.fileMetadata?.fileName || msg.decryptedText.replace(/^📎\s*/, '')}
                          >
                            {msg.fileMetadata?.fileName || msg.decryptedText.replace(/^📎\s*/, '')}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {msg.fileMetadata?.fileSize ? (
                              <span>{(msg.fileMetadata.fileSize / 1024).toFixed(1)} KB</span>
                            ) : null}
                            <span className="uppercase text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60">
                              {(msg.fileMetadata?.fileName || msg.decryptedText).split('.').pop()?.toUpperCase() || 'DOCUMENT'}
                            </span>
                          </div>
                        </div>
                        {msg.fileMetadata?.fileData ? (
                          <a
                            href={msg.fileMetadata.fileData}
                            download={msg.fileMetadata.fileName || msg.decryptedText.replace(/^📎\s*/, '')}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors shadow-2xs cursor-pointer"
                            title="Download File"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : (
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                            title="Encrypted file attachment"
                          >
                            <FileText className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ) : msg.decryptedText === '[Encrypted Message - Key not found on device]' ? (
                      /* Undecryptable legacy message due to past reset */
                      <div className="flex items-center gap-2 text-slate-500 py-0.5">
                        <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="italic text-[11px] text-slate-500">
                          Encrypted with previous session key
                        </span>
                        {onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(msg.id)}
                            title="Delete this message"
                            className="ml-1 text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Regular Plaintext Message */
                      <div className="whitespace-pre-wrap select-text">{msg.decryptedText}</div>
                    )}

                    {/* Warning tag on received message if sender had anomalous typing pattern */}
                    {!isSelf && msg.keystrokeAnomaly && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 border border-amber-200/90 shadow-2xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Suspicious typing pattern detected</span>
                      </div>
                    )}

                    {/* Timestamp & Status Ticks */}
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
                      <span>{timeFormatted}</span>
                      {isSelf && (
                        <span
                          className="flex items-center ml-0.5"
                          title={
                            msg.status === 'read'
                              ? 'Read (Double Blue Tick)'
                              : msg.status === 'delivered'
                              ? 'Delivered (Double Grey Tick)'
                              : 'Sent (Single Grey Tick)'
                          }
                        >
                          {msg.status === 'read' ? (
                            <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Jury Inline Safe Verification Card ONLY for Received Messages */}
                {!isSelf && isSafe && (
                  <button
                    type="button"
                    onClick={() => onInspectJury(msg)}
                    className="flex items-center gap-2.5 rounded-2xl bg-white/90 border border-slate-200/70 px-4 py-2 text-xs shadow-xs hover:bg-white transition-all text-left max-w-xs"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-xs">AI Safety Check</div>
                      <div className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <span>Message looks safe</span>
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Composer Bar */}
      <div className="p-3 sm:p-4 pt-0">
        {/* Live Keystroke Dynamics Biometrics Status */}
        {liveKeystrokeReport && liveKeystrokeReport.status !== 'opted_out' && (
          <div className="mb-2 mx-auto max-w-4xl flex items-center justify-between rounded-xl px-3.5 py-1.5 text-[11px] font-medium border bg-white/80 border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              {!liveKeystrokeReport.isCalibrated ? (
                <span className="text-slate-700">
                  <span className="text-amber-700 font-semibold">Baseline Learning Phase:</span>{' '}
                  Analyzing message {Math.min(10, (liveKeystrokeReport.enrolledMessageCount || 0) + 1)} of 10
                </span>
              ) : (
                <span className="text-emerald-800 font-medium">
                  <span className="font-semibold text-emerald-700">Continuous Keystroke Biometrics:</span> Active Baseline
                </span>
              )}
            </div>

            {!liveKeystrokeReport.isCalibrated ? (
              <span className="text-[10px] font-semibold text-amber-700">
                {liveKeystrokeReport.enrolledMessageCount}/10 messages
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                Active
              </span>
            )}
          </div>
        )}

        {/* Floating Pill Composer */}
        <div className="mx-auto max-w-4xl flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-2 shadow-lg">
          {/* File input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          {isRecordingAudio ? (
            /* Voice Recording Mode View */
            <div className="flex-1 flex items-center justify-between px-2 text-xs">
              <div className="flex items-center gap-2 text-rose-600 font-semibold">
                <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                <span>Recording Voice Note...</span>
                <span className="font-mono text-slate-700">{formatAudioTimer(recordingDuration)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecordingAudio}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-rose-600 transition-colors"
                  title="Discard Recording"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={finishAndSendAudio}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  title="Send Voice Note"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Normal Typing Mode */
            <>
              {/* Attachment Picker button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Send File or Image"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-2 text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />

              {/* Emoji button & Full Keypad Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-1.5 transition-colors ${
                    showEmojiPicker ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Choose Emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {showEmojiPicker && (
                  <EmojiPicker
                    onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>

              {/* Action Button: Voice Record if empty, Send if text present */}
              {inputText.trim() ? (
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={isSending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 active:scale-95 transition-all"
                  title="Send Encrypted Message"
                >
                  {isSending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecordingAudio}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 active:scale-95 transition-all"
                  title="Record Voice Note"
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Voice / Video Call Modal */}
      <CallModal
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        recipient={recipient}
        callType={callType}
        isGroup={isGroup}
        groupName={conversation.group_name}
      />
    </div>
  );
};
