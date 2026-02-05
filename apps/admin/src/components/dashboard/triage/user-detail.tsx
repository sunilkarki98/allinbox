'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Interaction } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';

// ===== ICONS =====
const IconChevronLeft = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const IconExternalLink = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
);

const IconClipboard = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

const IconCheck = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const IconStar = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" stroke="none">
        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
);

const IconStarOutline = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
);

const IconChatBubble = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
);

const IconEnvelope = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const IconFire = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
    </svg>
);

const IconCurrencyDollar = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconSparkles = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

// ===== SMART AI SUGGESTION HELPERS =====
const INTENT_DEFAULT_REPLIES: Record<string, string> = {
    'purchase_intent': "Hi! Thanks for your interest! 🙌 I'll DM you the details.",
    'pricing_inquiry': "Hi! I'll send you the pricing details in DM. 📩",
    'shipping_inquiry': "We deliver nationwide! DM me your location for delivery info. 🚚",
    'support_request': "Sorry for any inconvenience. Let me look into this for you. 🙏",
    'general': "Thanks for reaching out! How can I help you today? 😊"
};

const processAiSuggestion = (item: Interaction): string | null => {
    let suggestion = item.aiSuggestion;

    // If no AI suggestion, try intent-based default
    if (!suggestion || suggestion.trim().length < 5) {
        const intent = item.aiIntent || 'general';
        suggestion = INTENT_DEFAULT_REPLIES[intent] || INTENT_DEFAULT_REPLIES['general'];
    }

    // Priority: Use stored productPrice, fallback to caption extraction
    let extractedPrice: string | undefined = item.productPrice;
    if (!extractedPrice) {
        const priceMatch = item.postCaption?.match(/(?:Rs\.?|₹|NPR|USD|\$|€)\s*[\d,]+(?:\.\d{2})?/i);
        extractedPrice = priceMatch?.[0];
    }

    // Get product name if available
    const productName = item.productName;

    // Replace placeholders with extracted data
    if (extractedPrice) {
        suggestion = suggestion.replace(/\{price\}|\{PRICE\}|\[PRICE\]|Rs\.\s*\?+/gi, extractedPrice);
    } else {
        suggestion = suggestion
            .replace(/\{price\}|\{PRICE\}|\[PRICE\]|Rs\.\s*\?+/gi, '')
            .replace(/The price is\s*\./gi, '')
            .replace(/It costs\s*\./gi, '');
    }

    if (productName) {
        suggestion = suggestion.replace(/\{product\}|\{PRODUCT\}|\[PRODUCT\]/gi, productName);
    } else {
        suggestion = suggestion.replace(/\{product\}|\{PRODUCT\}|\[PRODUCT\]/gi, 'this item');
    }

    // Clean up
    suggestion = suggestion.replace(/\s+/g, ' ').trim();

    // Validate final suggestion
    if (suggestion.length < 10) return null;

    return suggestion;
};

interface UserDetailViewProps {
    username?: string;
    postId?: string;
    interactions: Interaction[];
    onClose: () => void;
    isMobile?: boolean;
}

export const UserDetailView: React.FC<UserDetailViewProps> = ({
    username,
    postId,
    interactions,
    onClose,
    isMobile = false
}) => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'DM' | 'COMMENT'>('DM');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Backend contact state
    const [contact, setContact] = useState<any>(null);
    const [isPriority, setIsPriority] = useState(false);
    const [isDone, setIsDone] = useState(false);

    // Fetch contact status
    useEffect(() => {
        if (username && interactions.length > 0 && token) {
            const platform = interactions[0].platform;
            api.get(`/customers/lookup?username=${username}&platform=${platform}`, token)
                .then(c => {
                    setContact(c);
                    const tags = c.tags || [];
                    setIsPriority(tags.includes('priority'));
                    setIsDone(tags.includes('done'));
                })
                .catch(err => {
                    // Silent fail if not found or demo mode
                    console.log('Could not fetch contact details', err);
                });
        }
    }, [username, interactions, token]);

    const toggleTag = async (tag: string) => {
        if (!contact) {
            toast.error('Cannot update status in demo mode');
            return;
        }

        // Optimistic State
        const wasActive = tag === 'priority' ? isPriority : isDone;
        if (tag === 'priority') setIsPriority(!isPriority);
        if (tag === 'done') setIsDone(!isDone);

        // Calc new tags
        const currentTags = contact.tags || [];
        let newTags;
        if (wasActive) {
            newTags = currentTags.filter((t: string) => t !== tag);
        } else {
            newTags = [...currentTags, tag];
        }

        // Update local contact
        setContact({ ...contact, tags: newTags });

        try {
            await api.patch(`/customers/${contact.id}`, { tags: newTags }, token || undefined);
            toast.success(wasActive ? `Removed ${tag}` : `Marked as ${tag}`);
        } catch (err) {
            console.error('Failed to update tag', err);
            toast.error('Failed to update status');
            // Revert state
            if (tag === 'priority') setIsPriority(wasActive);
            if (tag === 'done') setIsDone(wasActive);
        }
    };

    const userHistory = useMemo(() => {
        if (!username) return [];
        return interactions
            .filter(i => i.senderUsername === username)
            .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    }, [interactions, username]);

    const visibleHistory = useMemo(() => {
        return userHistory.filter(item => item.type === activeTab);
    }, [userHistory, activeTab]);

    const handleOpenInApp = (interaction: Interaction) => {
        let url = '';
        if (interaction.platform === 'INSTAGRAM') {
            url = `https://instagram.com/${username}`;
        }
        if (url) window.open(url, '_blank');
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!username) {
        return (
            <div className="flex-1 h-full bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <IconChatBubble />
                    </div>
                    <p className="text-lg font-semibold text-slate-600">Select a lead</p>
                    <p className="text-sm text-slate-400 mt-1">View their conversation history</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 bg-white sticky top-0 z-10">
                {/* Back Button (Mobile Only) */}
                {isMobile && (
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors active:scale-95 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Go back to list"
                    >
                        <IconChevronLeft />
                    </button>
                )}

                {/* User Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">@{username}</h2>
                        {isPriority && (
                            <span className="text-amber-500">
                                <IconStar />
                            </span>
                        )}
                        {isDone && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase">
                                Done
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500">{userHistory.length} interactions</p>
                </div>

                {/* Open in App */}
                <button
                    onClick={() => userHistory[0] && handleOpenInApp(userHistory[0])}
                    className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors active:scale-95 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title="Open in App"
                >
                    <IconExternalLink />
                    <span className="hidden sm:inline">Open in App</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-2 pb-0 flex gap-6 border-b border-slate-100">
                <button
                    onClick={() => setActiveTab('DM')}
                    className={`pb-3 text-sm font-semibold transition-colors relative focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 ${activeTab === 'DM' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Messages
                    {activeTab === 'DM' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('COMMENT')}
                    className={`pb-3 text-sm font-semibold transition-colors relative focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 ${activeTab === 'COMMENT' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Comments
                    {activeTab === 'COMMENT' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {visibleHistory.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                        <p>No {activeTab === 'DM' ? 'messages' : 'comments'} found</p>
                    </div>
                )}
                {visibleHistory.map((item) => {
                    const isContextPost = item.postId === postId;
                    const time = new Date(item.receivedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return (
                        <div
                            key={item.id}
                            className={`${isContextPost ? '' : 'opacity-50'} transition-opacity hover:opacity-100`}
                        >
                            {/* Message Card */}
                            <div className={`max-w-[90%] p-5 rounded-2xl shadow-sm border ${item.type === 'COMMENT'
                                ? 'bg-slate-100 border-slate-200'
                                : 'bg-purple-100 border-purple-200'
                                }`}>
                                {/* Type & Status Badges */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${item.type === 'COMMENT'
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-indigo-100 text-indigo-700'
                                        }`}>
                                        {item.type === 'COMMENT' ? <><IconChatBubble /> Comment</> : <><IconEnvelope /> DM</>}
                                    </span>
                                    {item.flagUrgent && (
                                        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-100 text-red-700">
                                            <IconFire /> Urgent
                                        </span>
                                    )}
                                    {item.aiIntent === 'purchase_intent' && (
                                        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                                            <IconCurrencyDollar /> Buyer
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <p className="text-base text-slate-800 leading-relaxed">
                                    {item.contentText}
                                </p>

                                {/* Your Reply (from database or legacy mock) */}
                                {(item.replyText || item.yourReply) && (
                                    <div className="mt-3 ml-4 pl-4 border-l-2 border-emerald-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-emerald-600">↳ Your reply</span>
                                            <span className="text-xs text-slate-400">
                                                {item.repliedAt
                                                    ? new Date(item.repliedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                                    : item.yourReply?.sentAt
                                                        ? new Date(item.yourReply.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                                        : ''
                                                }
                                            </span>
                                        </div>
                                        <p className="text-sm text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg">
                                            {item.replyText || item.yourReply?.text}
                                        </p>
                                    </div>
                                )}

                                {/* No Reply Yet Indicator */}
                                {!item.replyText && !item.yourReply && !item.isReplied && (
                                    <div className="mt-3 ml-4 pl-4 border-l-2 border-amber-300">
                                        <span className="text-xs font-semibold text-amber-600">↳ No reply yet - respond in app</span>
                                    </div>
                                )}

                                {/* AI Suggestion - Copyable (only show if not replied) */}
                                {(() => {
                                    const smartSuggestion = processAiSuggestion(item);
                                    if (!smartSuggestion || item.yourReply || item.replyText) return null;
                                    return (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                                                    <IconSparkles /> AI Suggested Reply
                                                </span>
                                                <button
                                                    onClick={() => handleCopy(smartSuggestion, item.id)}
                                                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${copiedId === item.id
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {copiedId === item.id ? <><IconCheck /> Copied!</> : <><IconClipboard /> Copy</>}
                                                </button>
                                            </div>
                                            <p className="text-sm text-indigo-700 bg-indigo-50 px-4 py-3 rounded-xl leading-relaxed select-all">
                                                {smartSuggestion}
                                            </p>
                                        </div>
                                    );
                                })()}

                                {/* Time */}
                                <p className="text-xs text-slate-400 mt-3">{time}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center gap-3">
                <button
                    onClick={() => toggleTag('priority')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 ${isPriority
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                >
                    {isPriority ? <IconStar /> : <IconStarOutline />}
                    {isPriority ? 'Priority' : 'Mark Priority'}
                </button>
                <button
                    onClick={() => toggleTag('done')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDone
                        ? 'bg-slate-800 text-slate-300 shadow-none'
                        : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                        }`}
                >
                    <IconCheck />
                    {isDone ? 'Resolved' : 'Done'}
                </button>
            </div>
        </div>
    );
};
