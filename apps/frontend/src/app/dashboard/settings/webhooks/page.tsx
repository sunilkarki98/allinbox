'use client';

import { useState } from 'react';
import { Plus, Trash2, RefreshCw, TestTube2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Webhook {
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    lastDelivery: string | null;
    failureCount: number;
}

const AVAILABLE_EVENTS = [
    'interaction.created',
    'interaction.analyzed',
    'contact.created',
    'contact.updated',
];

const MOCK_WEBHOOKS: Webhook[] = [
    {
        id: '1',
        url: 'https://example.com/webhooks/unified',
        events: ['interaction.created', 'interaction.analyzed'],
        isActive: true,
        lastDelivery: '2026-02-01T12:00:00Z',
        failureCount: 0,
    },
];

export default function WebhooksPage() {
    const [webhooks, setWebhooks] = useState<Webhook[]>(MOCK_WEBHOOKS);
    const [newUrl, setNewUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleCreateWebhook = async () => {
        if (!newUrl.trim() || !newUrl.startsWith('https://')) {
            toast.error('Please enter a valid HTTPS URL');
            return;
        }
        if (selectedEvents.length === 0) {
            toast.error('Select at least one event');
            return;
        }

        setIsCreating(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        setWebhooks(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                url: newUrl,
                events: selectedEvents,
                isActive: true,
                lastDelivery: null,
                failureCount: 0,
            },
        ]);

        setIsCreating(false);
        setNewUrl('');
        setSelectedEvents([]);
        setDialogOpen(false);
        toast.success('Webhook created!');
    };

    const handleDeleteWebhook = (id: string) => {
        setWebhooks(prev => prev.filter(w => w.id !== id));
        toast.success('Webhook deleted');
    };

    const handleTestWebhook = async (id: string) => {
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 1500)),
            {
                loading: 'Sending test payload...',
                success: 'Test webhook delivered successfully!',
                error: 'Failed to deliver test webhook',
            }
        );
    };

    const toggleEvent = (event: string) => {
        setSelectedEvents(prev =>
            prev.includes(event)
                ? prev.filter(e => e !== event)
                : [...prev, event]
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
                <p className="text-muted-foreground">
                    Receive real-time notifications when events occur in your account.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Webhook Endpoints</CardTitle>
                            <CardDescription>
                                Configure endpoints to receive event notifications.
                            </CardDescription>
                        </div>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Endpoint
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Webhook Endpoint</DialogTitle>
                                    <DialogDescription>
                                        Events will be sent as POST requests with a JSON payload.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Endpoint URL</label>
                                        <Input
                                            placeholder="https://your-server.com/webhooks"
                                            value={newUrl}
                                            onChange={(e) => setNewUrl(e.target.value)}
                                            className="mt-1.5"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">Events to Subscribe</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {AVAILABLE_EVENTS.map((event) => (
                                                <Badge
                                                    key={event}
                                                    variant={selectedEvents.includes(event) ? 'default' : 'outline'}
                                                    className="cursor-pointer"
                                                    onClick={() => toggleEvent(event)}
                                                >
                                                    {event}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button onClick={handleCreateWebhook} disabled={isCreating}>
                                        {isCreating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                                        Add Endpoint
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Endpoint</TableHead>
                                <TableHead>Events</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Delivery</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {webhooks.map((webhook) => (
                                <TableRow key={webhook.id}>
                                    <TableCell className="font-mono text-sm max-w-[200px] truncate">
                                        {webhook.url}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                                            {webhook.events.map((event) => (
                                                <Badge key={event} variant="secondary" className="text-xs">
                                                    {event.split('.')[1]}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {webhook.isActive ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">Disabled</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {webhook.lastDelivery
                                            ? new Date(webhook.lastDelivery).toLocaleDateString()
                                            : <span className="text-muted-foreground">Never</span>}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleTestWebhook(webhook.id)}
                                        >
                                            <TestTube2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteWebhook(webhook.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {webhooks.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No webhooks configured. Add one to start receiving events.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
