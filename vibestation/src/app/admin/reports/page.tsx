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
import { Flag, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';

// Placeholder data
const reports = [
  { id: '1', type: 'post', reason: 'Spam', reporter: 'user1', status: 'pending', created: '2024-12-20' },
  { id: '2', type: 'user', reason: 'Harassment', reporter: 'user2', status: 'pending', created: '2024-12-19' },
  { id: '3', type: 'comment', reason: 'Inappropriate', reporter: 'user3', status: 'resolved', created: '2024-12-18' },
  { id: '4', type: 'post', reason: 'Copyright', reporter: 'user4', status: 'dismissed', created: '2024-12-17' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Review and manage user reports</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flag className="h-4 w-4" />
              Total Reports
            </div>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              Pending
            </div>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="h-4 w-4" />
              Resolved
            </div>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4" />
              Dismissed
            </div>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'dismissed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Reports</CardTitle>
          <CardDescription>Review reported content and users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{report.type}</Badge>
                    </TableCell>
                    <TableCell>{report.reason}</TableCell>
                    <TableCell className="text-muted-foreground">@{report.reporter}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          report.status === 'pending'
                            ? 'secondary'
                            : report.status === 'resolved'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{report.created}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
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
