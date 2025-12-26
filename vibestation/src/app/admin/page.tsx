'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  FileText,
  Flag,
  TrendingUp,
  Music2,
  DollarSign,
  Eye,
  MessageSquare,
} from 'lucide-react';

// Placeholder stats - in production, fetch from API
const stats = [
  { title: 'Total Users', value: '12,345', change: '+12%', icon: Users },
  { title: 'Total Posts', value: '45,678', change: '+8%', icon: FileText },
  { title: 'Active Artists', value: '1,234', change: '+5%', icon: Music2 },
  { title: 'Pending Reports', value: '23', change: '-15%', icon: Flag },
  { title: 'Daily Views', value: '234K', change: '+20%', icon: Eye },
  { title: 'Comments Today', value: '5,678', change: '+10%', icon: MessageSquare },
  { title: 'Revenue (MTD)', value: '$12,345', change: '+18%', icon: DollarSign },
  { title: 'Growth Rate', value: '15.2%', change: '+2.5%', icon: TrendingUp },
];

const recentActivity = [
  { type: 'user', message: 'New user registered: john_doe', time: '2 minutes ago' },
  { type: 'post', message: 'Post flagged for review: ID #12345', time: '5 minutes ago' },
  { type: 'report', message: 'New report submitted: Spam content', time: '10 minutes ago' },
  { type: 'creator', message: 'Creator application approved: music_lover', time: '15 minutes ago' },
  { type: 'ad', message: 'New ad campaign started: Brand XYZ', time: '30 minutes ago' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction title="Review Reports" count={23} href="/admin/reports" />
              <QuickAction title="Pending Creators" count={5} href="/admin/creators" />
              <QuickAction title="Flagged Content" count={12} href="/admin/moderation" />
              <QuickAction title="New Users" count={45} href="/admin/users" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current platform health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatusItem title="API Server" status="operational" />
            <StatusItem title="Database" status="operational" />
            <StatusItem title="CDN" status="operational" />
            <StatusItem title="Music API" status="operational" />
            <StatusItem title="Payment Gateway" status="operational" />
            <StatusItem title="Email Service" status="degraded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        {count}
      </span>
    </a>
  );
}

function StatusItem({ title, status }: { title: string; status: 'operational' | 'degraded' | 'down' }) {
  const statusColors = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{title}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
        <span className="text-xs capitalize text-muted-foreground">{status}</span>
      </div>
    </div>
  );
}
