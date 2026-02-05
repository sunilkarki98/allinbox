'use client';

import { redirect } from 'next/navigation';

export default function DashboardOverviewPage() {
    redirect('/dashboard/inbox');
}
