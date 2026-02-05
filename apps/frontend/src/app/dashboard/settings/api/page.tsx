'use client';

import { useState } from 'react';
import { Copy, Plus, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
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

interface ApiKey {
    id: string;
    name: string;
    keyPreview: string;
    createdAt: string;
    lastUsed: string | null;
    scopes: string[];
}

// Mock data - replace with API calls
const MOCK_API_KEYS: ApiKey[] = [
    {
        id: '1',
        name: 'Production Key',
        keyPreview: 'sk_live_...x7Kp',
        createdAt: '2026-01-15',
        lastUsed: '2026-02-01',
        scopes: ['read:inbox', 'write:reply'],
    },
    {
        id: '2',
        name: 'Development Key',
        keyPreview: 'sk_test_...a3Bc',
        createdAt: '2026-01-20',
        lastUsed: null,
        scopes: ['read:inbox'],
    },
];

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
    const [newKeyName, setNewKeyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast.error('Please enter a name for the API key');
            return;
        }

        setIsCreating(true);
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const fakeKey = `sk_live_${Math.random().toString(36).substring(2, 15)}`;
        setNewlyCreatedKey(fakeKey);

        setKeys(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                name: newKeyName,
                keyPreview: `${fakeKey.slice(0, 8)}...${fakeKey.slice(-4)}`,
                createdAt: new Date().toISOString().split('T')[0],
                lastUsed: null,
                scopes: ['read:inbox', 'write:reply'],
            },
        ]);

        setIsCreating(false);
        setNewKeyName('');
        toast.success('API key created!');
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('Copied to clipboard');
    };

    const handleDeleteKey = (id: string) => {
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success('API key revoked');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
                <p className="text-muted-foreground">
                    Manage API keys for programmatic access to your account.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Your API Keys</CardTitle>
                            <CardDescription>
                                Use these keys to authenticate API requests. Keep them secret!
                            </CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Key
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {newlyCreatedKey ? 'Save Your API Key' : 'Create New API Key'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {newlyCreatedKey
                                            ? 'Copy this key now. You won\'t be able to see it again.'
                                            : 'Give your key a descriptive name to identify its purpose.'}
                                    </DialogDescription>
                                </DialogHeader>

                                {newlyCreatedKey ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                readOnly
                                                value={showKey ? newlyCreatedKey : '•'.repeat(40)}
                                                className="font-mono text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setShowKey(!showKey)}
                                            >
                                                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleCopyKey(newlyCreatedKey)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={() => setNewlyCreatedKey(null)}>
                                                Done
                                            </Button>
                                        </DialogFooter>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Input
                                            placeholder="e.g., Production Server"
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                        />
                                        <DialogFooter>
                                            <Button onClick={handleCreateKey} disabled={isCreating}>
                                                {isCreating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                                                Create Key
                                            </Button>
                                        </DialogFooter>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Scopes</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Last Used</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {keys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">{key.name}</TableCell>
                                    <TableCell>
                                        <code className="text-sm bg-muted px-2 py-1 rounded">
                                            {key.keyPreview}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {key.scopes.map((scope) => (
                                                <Badge key={scope} variant="secondary" className="text-xs">
                                                    {scope}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>{key.createdAt}</TableCell>
                                    <TableCell>
                                        {key.lastUsed || <span className="text-muted-foreground">Never</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteKey(key.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {keys.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No API keys yet. Create one to get started.
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
