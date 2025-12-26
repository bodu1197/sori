'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, TrendingUp, Users, Eye, Plus } from 'lucide-react';

// Placeholder data
const advertisers = [
  { id: '1', company: 'Brand A', balance: 5000, spent: 12500, campaigns: 5, status: 'active' },
  { id: '2', company: 'Brand B', balance: 2000, spent: 8000, campaigns: 3, status: 'active' },
  { id: '3', company: 'Brand C', balance: 0, spent: 500, campaigns: 1, status: 'inactive' },
];

export default function AdvertisersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advertisers</h1>
          <p className="text-muted-foreground">Manage advertising accounts and campaigns</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Advertiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Advertisers
            </div>
            <div className="text-2xl font-bold">{advertisers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Balance
            </div>
            <div className="text-2xl font-bold">
              ${advertisers.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Total Spent
            </div>
            <div className="text-2xl font-bold">
              ${advertisers.reduce((sum, a) => sum + a.spent, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Active Campaigns
            </div>
            <div className="text-2xl font-bold">
              {advertisers.reduce((sum, a) => sum + a.campaigns, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advertiser Accounts</CardTitle>
          <CardDescription>View and manage advertiser accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advertisers.map((advertiser) => (
                  <TableRow key={advertiser.id}>
                    <TableCell className="font-medium">{advertiser.company}</TableCell>
                    <TableCell>${advertiser.balance.toLocaleString()}</TableCell>
                    <TableCell>${advertiser.spent.toLocaleString()}</TableCell>
                    <TableCell>{advertiser.campaigns}</TableCell>
                    <TableCell>
                      <Badge variant={advertiser.status === 'active' ? 'default' : 'secondary'}>
                        {advertiser.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
