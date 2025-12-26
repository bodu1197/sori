'use client';

import { useState } from 'react';
import { useCreatorProfile, useCreatorStats, usePayoutHistory, useApplyAsCreator, useRequestPayout } from '@/hooks/useCreator';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  DollarSign,
  Play,
  Users,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  Wallet,
  Clock,
} from 'lucide-react';
import { TIER_THRESHOLDS, TIER_REVENUE_SHARE } from '@/lib/api/creator';
import type { CreatorTier } from '@/lib/api/creator';

const tierColors: Record<CreatorTier, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-cyan-400',
  diamond: 'bg-purple-500',
};

export default function CreatorDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: creator, isLoading: creatorLoading } = useCreatorProfile();
  const { data: stats, isLoading: statsLoading } = useCreatorStats();
  const { data: payouts } = usePayoutHistory();
  const applyMutation = useApplyAsCreator();
  const payoutMutation = useRequestPayout();

  const [payoutAmount, setPayoutAmount] = useState('');

  const handleApply = async () => {
    try {
      await applyMutation.mutateAsync();
      toast.success('Application submitted! We\'ll review it shortly.');
    } catch {
      toast.error('Failed to submit application');
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await payoutMutation.mutateAsync(amount);
      toast.success('Payout request submitted!');
      setPayoutAmount('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request payout');
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Sign in to access the Creator Dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (creatorLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Not a creator yet
  if (!creator) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Become a Creator</CardTitle>
            <CardDescription>
              Start earning from your content and build your community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted">
                <DollarSign className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">Earn Revenue</h3>
                <p className="text-sm text-muted-foreground">
                  Get paid for your plays, subscribers, and tips
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <Users className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">Build Community</h3>
                <p className="text-sm text-muted-foreground">
                  Offer exclusive content to your subscribers
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">Tier Benefits</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock higher revenue share as you grow
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <CreditCard className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">Easy Payouts</h3>
                <p className="text-sm text-muted-foreground">
                  Get paid monthly via bank transfer or PayPal
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button
                size="lg"
                onClick={handleApply}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? 'Applying...' : 'Apply Now'}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending approval
  if (creator.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Pending</h2>
            <p className="text-muted-foreground">
              Your creator application is being reviewed. We&apos;ll notify you once it&apos;s approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate progress to next tier
  const currentTier = creator.tier as CreatorTier;
  const tierOrder: CreatorTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentTierIndex = tierOrder.indexOf(currentTier);
  const nextTier = tierOrder[currentTierIndex + 1] as CreatorTier | undefined;
  const nextTierThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const tierProgress = nextTierThreshold
    ? (creator.current_month_plays / nextTierThreshold) * 100
    : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage your earnings and analytics</p>
        </div>
        <Badge className={`${tierColors[currentTier]} text-white text-sm px-3 py-1`}>
          {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Creator
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Play className="h-4 w-4" />
              Total Plays
            </div>
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-20" /> : stats?.total_plays.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Earnings
            </div>
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-20" /> : `$${stats?.total_earnings.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Subscribers
            </div>
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-20" /> : stats?.subscribers_count.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-green-500">
              <Wallet className="h-4 w-4" />
              Available Balance
            </div>
            <div className="text-2xl font-bold text-green-500">
              {statsLoading ? <Skeleton className="h-8 w-20" /> : `$${stats?.available_balance.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      {nextTier && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Progress to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(tierProgress, 100)} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{creator.current_month_plays.toLocaleString()} plays this month</span>
              <span>{nextTierThreshold?.toLocaleString()} needed</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current revenue share: {(TIER_REVENUE_SHARE[currentTier] * 100).toFixed(0)}% →
              Next tier: {(TIER_REVENUE_SHARE[nextTier] * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>This Month</CardTitle>
              <CardDescription>Your earnings breakdown for this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Plays</p>
                  <p className="text-xl font-bold">{creator.current_month_plays.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Play Revenue</p>
                  <p className="text-xl font-bold">${creator.current_month_earnings.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Subscriptions</p>
                  <p className="text-xl font-bold">$0</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Tips</p>
                  <p className="text-xl font-bold">$0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Payout</CardTitle>
              <CardDescription>
                Available balance: ${stats?.available_balance.toLocaleString() || 0}
                {stats?.pending_payout ? ` (${stats.pending_payout} pending)` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Input
                type="number"
                placeholder="Amount ($)"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="max-w-[200px]"
              />
              <Button
                onClick={handleRequestPayout}
                disabled={payoutMutation.isPending || !payoutAmount}
              >
                {payoutMutation.isPending ? 'Processing...' : 'Request Payout'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              {payouts && payouts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>{new Date(payout.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>${payout.amount.toLocaleString()}</TableCell>
                          <TableCell className="capitalize">{payout.payout_method}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                payout.status === 'completed'
                                  ? 'default'
                                  : payout.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {payout.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No payouts yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout Method</CardTitle>
              <CardDescription>Configure how you receive your earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">PayPal</p>
                  <p className="text-sm text-muted-foreground">
                    {creator.payout_method === 'paypal'
                      ? 'Connected'
                      : 'Not connected'}
                  </p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Bank Transfer</p>
                  <p className="text-sm text-muted-foreground">
                    {creator.payout_method === 'bank'
                      ? 'Connected'
                      : 'Not connected'}
                  </p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>Let fans subscribe for exclusive content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Subscriptions</p>
                  <p className="text-sm text-muted-foreground">
                    {creator.subscription_enabled
                      ? `$${creator.subscription_price}/month`
                      : 'Not enabled'}
                  </p>
                </div>
                <Button variant="outline">
                  {creator.subscription_enabled ? 'Configure' : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
