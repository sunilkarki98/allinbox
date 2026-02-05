import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const InboxItemSkeleton = () => (
    <div className="p-4 border-l-4 border-transparent">
        <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
                <Skeleton className="w-6 h-6 rounded-md" />
                <Skeleton className="w-24 h-4" />
            </div>
            <Skeleton className="w-12 h-3" />
        </div>
        <div className="flex gap-3">
            <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-3/4 h-3" />
                <div className="flex gap-2 pt-1">
                    <Skeleton className="w-10 h-3 rounded-full" />
                    <Skeleton className="w-16 h-3 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

export const TriagePostSkeleton = () => (
    <div className="p-4 flex gap-4">
        <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2 py-1">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-2/3 h-4" />
            <div className="flex gap-4 pt-2">
                <Skeleton className="w-8 h-3" />
                <Skeleton className="w-8 h-3" />
                <Skeleton className="w-8 h-3" />
            </div>
        </div>
    </div>
);

export const MessageViewSkeleton = () => (
    <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-20 h-3" />
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="w-20 h-9 rounded-lg" />
                <Skeleton className="w-20 h-9 rounded-lg" />
            </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
            {/* Incoming */}
            <div className="flex gap-4">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="space-y-2 max-w-[70%]">
                    <Skeleton className="w-full h-20 rounded-2xl rounded-tl-none" />
                </div>
            </div>

            {/* Outgoing */}
            <div className="flex flex-row-reverse gap-4">
                <div className="space-y-2 max-w-[70%] w-64">
                    <Skeleton className="w-full h-12 rounded-2xl rounded-tr-none" />
                </div>
            </div>

            {/* Incoming Long */}
            <div className="flex gap-4">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="space-y-2 max-w-[70%] w-96">
                    <Skeleton className="w-full h-32 rounded-2xl rounded-tl-none" />
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
            <Skeleton className="w-full h-24 rounded-xl" />
        </div>
    </div>
);
