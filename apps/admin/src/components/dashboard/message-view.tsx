'use client';

import React, { useState } from 'react';
import { Interaction } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MessageViewProps {
    interaction: Interaction | null;
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

export const MessageView: React.FC<MessageViewProps> = ({ interaction }) => {
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
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a message to view details and reply</p>
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
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 border border-gray-100">
                        {interaction.senderUsername[0].toUpperCase()}
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">@{interaction.senderUsername}</h2>
                        <div className="flex items-center gap-2 text-xs">
                            {/* Platform Badge */}
                            <span className={`font-semibold ${interaction.platform === 'INSTAGRAM' ? 'text-pink-600' : 'text-green-600'
                                }`}>
                                {interaction.platform}
                            </span>
                            <span className="text-gray-300">•</span>
                            {/* Message Type - Clear Distinction */}
                            <span className={`font-semibold px-1.5 py-0.5 rounded ${interaction.type === 'DM'
                                ? 'text-purple-600 bg-purple-50'
                                : 'text-orange-600 bg-orange-50'
                                }`}>
                                {typeIcon} {typeLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={openNativeApp} className="text-xs h-9">
                        Reply on {interaction.platform} ↗
                    </Button>
                    {!interaction.isReplied && (
                        <Button
                            className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                toast.success('Marked as done!');
                                // In a real app, this would call an API, but for now we just show visual feedback
                                interaction.isReplied = true;
                            }}
                        >
                            Mark Done ✓
                        </Button>
                    )}
                </div>
            </header>

            {/* Message Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    {/* Platform Reply Notice */}
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm text-blue-800 items-start">
                        <span className="text-xl">ℹ️</span>
                        <div>
                            <p className="font-bold">Reply via {interaction.platform}</p>
                            <p className="text-blue-700">
                                Please copy your reply and use the official {interaction.platform} app to respond.
                            </p>
                        </div>
                    </div>

                    {interaction.flagUrgent && (
                        <div className="mb-6 bg-red-50 border border-red-100 rounded-lg p-3 flex gap-3 text-sm text-red-800 items-start">
                            <span className="text-xl">🔥</span>
                            <div>
                                <p className="font-bold">High Priority</p>
                                <p>Customer interaction contains urgent keywords.</p>
                            </div>
                        </div>
                    )}

                    {/* AI Generated Reply - READY TO COPY */}
                    <div className="mb-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-400/50 rounded-xl p-5 shadow-lg relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl"></div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🤖</span>
                                <h4 className="text-sm font-bold text-emerald-900">AI Suggested Reply</h4>
                                {interaction.aiIntent && (
                                    <span className="text-xs text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-200 font-semibold capitalize">
                                        {interaction.aiIntent.replace(/_/g, ' ')}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-emerald-600 font-medium">
                                {interaction.aiConfidence || 85}% match
                            </span>
                        </div>

                        {/* The actual reply message - PROMINENT */}
                        <div className="bg-white border border-emerald-100 rounded-lg p-4 mb-4">
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {aiGeneratedReply}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleCopyReply(aiGeneratedReply)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                            >
                                📋 Copy Reply
                            </Button>
                            <Button
                                onClick={openNativeApp}
                                variant="outline"
                                className="h-10 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                                Open {interaction.platform} ↗
                            </Button>
                        </div>
                    </div>

                    {/* Original Message */}
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {interaction.type === 'DM' ? 'Their Message' : 'Their Comment'}
                        </p>
                    </div>
                    <div className="flex gap-4 mb-8">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600 mt-1">
                            {interaction.senderUsername[0].toUpperCase()}
                        </div>
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm max-w-[85%]">
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{interaction.contentText}</p>
                            <p className="text-xs text-gray-400 mt-2 text-right">
                                {new Date(interaction.receivedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Reply Templates */}
            <div className="bg-white border-t border-gray-200 p-4 md:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-3xl mx-auto">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Templates (Click to Copy)</h3>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            'Yes, still available! DM for details 📩',
                            'Price: Rs. 1,500 (delivery extra)',
                            'Check our bio for more options! 🛍️',
                            'Sorry, this item is sold out 😔',
                            'Thanks for your interest! 🙏'
                        ].map((template, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleCopyReply(template)}
                                className="flex-shrink-0 px-4 py-2 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-full text-sm text-gray-700 hover:text-emerald-700 transition-all whitespace-nowrap active:scale-95"
                            >
                                {template}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
