'use client';

import React, { useState } from 'react';
import { Interaction } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlatformIcon } from './platform-badge';

interface MessageViewProps {
    interaction: Interaction | null;
    onMarkDone?: () => void;
}

// AI-generated reply templates based on intent
const generateAIReply = (interaction: Interaction): string => {
    const { aiIntent, senderUsername, platform, type } = interaction;

    switch (aiIntent) {
        case 'purchase_intent':
            return `Hi @${senderUsername}! 🛍️ Thank you for your interest! Yes, this item is still available. Would you like me to share more details or reserve it for you?`;
        case 'shipping_inquiry':
            return `Hi @${senderUsername}! 📦 We ship nationwide with 2-3 day delivery. Shipping is Rs. 150 for standard or Rs. 250 for express. Do you want me to process your order?`;
        case 'pricing_inquiry':
            return `Hi @${senderUsername}! 💵 Great question! This item is priced at Rs. 1,500. We also have combo deals available. Would you like to know more?`;
        case 'complaint':
            return `Hi @${senderUsername}, I'm really sorry to hear about this issue. 🙏 Could you please share your order details so I can look into this immediately? We'll make it right!`;
        case 'support_request':
            return `Hi @${senderUsername}! 🆘 Thanks for reaching out. I'd be happy to help you with this. Could you share more details about the issue you're facing?`;
        default:
            return `Hi @${senderUsername}! 👋 Thanks for your message! How can I help you today?`;
    }
};

export const MessageView: React.FC<MessageViewProps> = ({ interaction, onMarkDone }) => {
    const [copied, setCopied] = useState(false);
    const [showReplyNotice, setShowReplyNotice] = useState(false);

    if (!interaction) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 text-gray-400 h-full">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Ready to Triage?</h3>
                <p className="text-slate-500 text-sm max-w-xs text-center mb-6">
                    You have <span className="font-semibold text-emerald-600">3 priority leads</span> waiting for a response.
                </p>
                <div className="flex gap-3">
                    <Button disabled variant="outline" className="opacity-50">Shortcut: J / K</Button>
                </div>
            </div>
        );
    }

    const handleCopyReply = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard! Paste in the native app.');
        setTimeout(() => setCopied(false), 2000);
    };

    const openNativeApp = () => {
        window.open(interaction.postUrl || '#', '_blank');
    };

    const aiGeneratedReply = generateAIReply(interaction);

    // Message type display
    const typeIcon = interaction.type === 'DM' ? '✉️' : '💬';
    const typeLabel = interaction.type === 'DM' ? 'Direct Message' : 'Comment';
    const typeColor = interaction.type === 'DM' ? 'purple' : 'orange';

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            {/* Header */}
            {/* Header */}
            <header className="bg-white border-b border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10 sticky top-0 text-left">
                <div className="max-w-3xl mx-auto px-4 py-3 w-full">
                    {/* Row layout with wrap fallback for very narrow screens */}
                    <div className="flex flex-wrap justify-between items-center gap-2">
                        {/* User Info */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                                    {interaction.senderUsername[0].toUpperCase()}
                                </div>
                                {/* Platform Icon Overlay */}
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-50">
                                    {interaction.platform === 'INSTAGRAM' ? (
                                        <span className="text-pink-500 block">
                                            <PlatformIcon platform="INSTAGRAM" className="w-3 h-3" />
                                        </span>
                                    ) : interaction.platform === 'TIKTOK' ? (
                                        <span className="text-black block">
                                            <PlatformIcon platform="TIKTOK" className="w-3 h-3" />
                                        </span>
                                    ) : interaction.platform === 'WHATSAPP' ? (
                                        <span className="text-green-600 block">
                                            <PlatformIcon platform="WHATSAPP" className="w-3 h-3" />
                                        </span>
                                    ) : (
                                        <span className="text-blue-600 block">
                                            <PlatformIcon platform="FACEBOOK" className="w-3 h-3" />
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="font-bold text-sm text-slate-900 leading-none truncate">@{interaction.senderUsername}</h2>
                                    {/* Minimized Type Badge */}
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 whitespace-nowrap">
                                        {interaction.type === 'DM' ? 'DM' : 'Com'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                    Active {new Date(interaction.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-shrink-0">
                            <Button variant="ghost" onClick={openNativeApp} className="text-xs h-7 text-slate-500 hover:text-slate-800 px-2">
                                <span className="hidden sm:inline">Open</span>
                                <span className="sm:hidden">↗</span>
                            </Button>
                            {!interaction.isReplied && (
                                <Button
                                    className="text-xs h-7 bg-slate-900 hover:bg-slate-800 text-white shadow-sm whitespace-nowrap px-3"
                                    onClick={() => {
                                        if (onMarkDone) onMarkDone();
                                        else toast.success('Marked as done!');
                                    }}
                                >
                                    Mark Done
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Cross-Channel Context Banner */}
            {/* Cross-Channel Context Banner */}
            {interaction.sourcePostId && (
                <div className="px-3 pt-3">
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg py-2 px-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-indigo-900/80">
                            <span className="font-semibold text-indigo-900">From Instagram Ad:</span>
                            <span className="truncate max-w-[200px] opacity-75">{interaction.postUrl || 'View Post'}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50 px-2 font-medium"
                            onClick={() => window.open(interaction.postUrl || '#', '_blank')}
                        >
                            View Ad ↗
                        </Button>
                    </div>
                </div>
            )}

            {/* Message Body */}
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50">
                <div className="max-w-3xl mx-auto space-y-4">

                    {interaction.flagUrgent && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex gap-2 text-xs text-red-900 items-center">
                            <span className="text-base">🔥</span>
                            <div className="flex-1 font-medium">High Priority</div>
                        </div>
                    )}

                    {/* Original Message (Moved Top) */}
                    <div>
                        <div className="flex gap-3 mb-2">
                            {/* Initials Avatar */}
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                                {interaction.senderUsername[0].toUpperCase()}
                            </div>
                            {/* Bubble */}
                            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm max-w-[90%]">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                    {interaction.type === 'DM' ? 'Their Message' : 'Their Comment'}
                                </p>
                                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{interaction.contentText}</p>
                                <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                                    {new Date(interaction.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AI Generated Reply (Moved Bottom) */}
                    <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm ring-1 ring-emerald-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">⚡</span>
                                <h4 className="text-xs font-bold text-emerald-900">Suggested Action</h4>
                                {interaction.aiIntent && (
                                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0 rounded-full font-bold uppercase tracking-wide">
                                        {interaction.aiIntent.replace(/_/g, ' ')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Reply Text */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 font-mono text-xs text-slate-700 leading-relaxed">
                            {aiGeneratedReply}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleCopyReply(aiGeneratedReply)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold shadow-sm"
                            >
                                Copy Reply
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Reply Templates */}
            <div className="bg-white border-t border-gray-200 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-3xl mx-auto">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Templates</h3>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
                        {[
                            'Yes, still available! 📩',
                            'Price: Rs. 1,500 💵',
                            'Check our bio! 🛍️',
                            'Sold out 😔',
                            'Thanks! 🙏'
                        ].map((template, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleCopyReply(template)}
                                className="flex-shrink-0 px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-full text-xs text-gray-700 hover:text-emerald-700 transition-all whitespace-nowrap active:scale-95"
                            >
                                {template}
                            </button>
                        ))}
                    </div>

                    {/* Navigation Tip - Desktop only */}
                    <div className="hidden md:flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">Navigate:</span>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">J</kbd>
                            <span className="text-xs text-gray-400">Next</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">K</kbd>
                            <span className="text-xs text-gray-400">Previous</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">E</kbd>
                            <span className="text-xs text-gray-400">Mark Done</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
