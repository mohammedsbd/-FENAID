'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  HandCoins,
  Calendar,
  Lock,
  CheckCircle2,
  MoreVertical,
  ChevronRight,
  User,
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/lib/api';
import { format } from 'date-fns';
import { FundAllocation, Donation, FundAllocationStatus, DonorType } from '@/types/finance';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AllocationDrawer } from './allocation-drawer';
import { DonationDrawer } from './donation-drawer';
import { DisburseModal } from './disburse-modal';
import { AcknowledgeModal } from './acknowledge-modal';
import { useLocale } from '@/components/providers/locale-provider';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { ExportButton, ExportFormat } from '@/components/dashboard/export-button';
import { 
  exportToCSV, 
  exportToExcelHTML, 
  exportToWordHTML, 
  exportToPDF, 
  escapeHTML, 
  formatEnum,
  formatDate
} from '@/lib/export';

export default function FinanceClient() {
  const [activeTab, setActiveTab] = useState<'allocations' | 'donations'>('allocations');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAllocated: 0,
    totalDisbursed: 0,
    totalDonations: 0,
  });
  const [allocations, setAllocations] = useState<FundAllocation[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const { toast } = useToast();
  const { t } = useLocale();

  // Drawers and Modals State
  const [allocationDrawerOpen, setAllocationDrawerOpen] = useState(false);
  const [donationDrawerOpen, setDonationDrawerOpen] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [acknowledgeModalOpen, setAcknowledgeModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<FundAllocation | null>(null);

  // Filters
  const [allocationStatus, setAllocationStatus] = useState<string>('ALL');
  const [donorType, setDonorType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [activeTab, debouncedSearch, allocationStatus, donorType, startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const adminStatsRes = await api.get('/dashboard/admin');
      if (adminStatsRes.data?.stats) {
        setStats({
          totalAllocated: adminStatsRes.data.stats.totalFundsAllocated,
          totalDisbursed: adminStatsRes.data.stats.totalFundsDisbursed,
          totalDonations: adminStatsRes.data.stats.totalDonationsThisYear,
        });
      }

      if (activeTab === 'allocations') {
        const params: any = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (allocationStatus !== 'ALL') params.status = allocationStatus;
        if (startDate) params.startDate = new Date(startDate).toISOString();
        if (endDate) params.endDate = new Date(endDate).toISOString();

        const res = await api.get('/fund-allocations', { params });
        setAllocations(res.data);
      } else {
        const params: any = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (donorType !== 'ALL') params.donorType = donorType;
        if (startDate) params.startDate = new Date(startDate).toISOString();
        if (endDate) params.endDate = new Date(endDate).toISOString();

        const res = await api.get('/donations', { params });
        setDonations(res.data);
      }
    } catch (error) {
      console.error('Unexpected error in fetchData:', error);
      toast({
        title: t('finance.error', 'Error'),
        description: t('finance.loadError', 'Failed to load financial records.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDisburseClick = (e: React.MouseEvent, allocation: FundAllocation) => {
    e.stopPropagation();
    setSelectedAllocation(allocation);
    setDisburseModalOpen(true);
  };

  const handleAcknowledgeClick = (e: React.MouseEvent, allocation: FundAllocation) => {
    e.stopPropagation();
    setSelectedAllocation(allocation);
    setAcknowledgeModalOpen(true);
  };

  const handleExport = async (formatType: ExportFormat) => {
    setExporting(true);
    try {
      const filename = `${activeTab}-export-${new Date().toISOString().split('T')[0]}`;
      const title = activeTab === 'allocations' ? t('finance.export.allocationsTitle', 'Fund Allocations Directory') : t('finance.export.donationsTitle', 'Donations Directory');

      if (activeTab === 'allocations') {
        const headers = [t('finance.parentName', 'Parent Name'), t('finance.amountEtb', 'Amount (ETB)'), t('finance.purpose', 'Purpose'), t('finance.date', 'Date'), t('finance.status', 'Status'), t('finance.acknowledged', 'Acknowledged')];
        const rows = allocations.map(a => [
          a.parent.fullName,
          a.amount.toString(),
          a.purpose,
          format(new Date(a.allocationDate), 'MMM d, yyyy'),
          a.status,
          a.parentAcknowledged ? t('finance.yes', 'Yes') : t('finance.no', 'No')
        ]);

        if (formatType === 'csv') {
          exportToCSV(headers, rows, `${filename}.csv`);
        } else if (formatType === 'excel') {
          exportToExcelHTML(title, headers, rows, `${filename}.xls`);
        } else if (formatType === 'docx') {
          let contentHTML = `<table><thead><tr>${headers.map(h => `<th>${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>`;
          rows.forEach(row => {
            contentHTML += `<tr>${row.map(cell => `<td>${escapeHTML(cell)}</td>`).join('')}</tr>`;
          });
          contentHTML += `</tbody></table>`;
          exportToWordHTML(title, contentHTML, `${filename}.doc`);
        } else if (formatType === 'pdf') {
          let htmlBody = `<table style="width:100%; border-collapse:collapse;"><thead><tr>${headers.map(h => `<th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc; text-align:left;">${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>`;
          rows.forEach(row => {
            htmlBody += `<tr>${row.map(cell => `<td style="border:1px solid #cbd5e1; padding:8px;">${escapeHTML(cell)}</td>`).join('')}</tr>`;
          });
          htmlBody += `</tbody></table>`;
          exportToPDF(title, htmlBody);
        }
      } else {
        const headers = [t('finance.receiptNo', 'Receipt No.'), t('finance.donorName', 'Donor Name'), t('finance.type', 'Type'), t('finance.amountEtb', 'Amount (ETB)'), t('finance.date', 'Date'), t('finance.restricted', 'Restricted'), t('finance.receivedBy', 'Received By')];
        const rows = donations.map(d => [
          d.receiptNumber,
          d.donorName,
          d.donorType,
          d.amount.toString(),
          format(new Date(d.donationDate), 'MMM d, yyyy'),
          d.isRestricted ? `${t('finance.yes', 'Yes')} (${d.restrictedToChild?.fullName || d.restrictedToService?.name || t('finance.unknown', 'Unknown')})` : t('finance.no', 'No'),
          d.receivedBy?.fullName || t('finance.system', 'System')
        ]);

        if (formatType === 'csv') {
          exportToCSV(headers, rows, `${filename}.csv`);
        } else if (formatType === 'excel') {
          exportToExcelHTML(title, headers, rows, `${filename}.xls`);
        } else if (formatType === 'docx') {
          let contentHTML = `<table><thead><tr>${headers.map(h => `<th>${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>`;
          rows.forEach(row => {
            contentHTML += `<tr>${row.map(cell => `<td>${escapeHTML(cell)}</td>`).join('')}</tr>`;
          });
          contentHTML += `</tbody></table>`;
          exportToWordHTML(title, contentHTML, `${filename}.doc`);
        } else if (formatType === 'pdf') {
          let htmlBody = `<table style="width:100%; border-collapse:collapse;"><thead><tr>${headers.map(h => `<th style="border:1px solid #cbd5e1; padding:8px; background:#f8fafc; text-align:left;">${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>`;
          rows.forEach(row => {
            htmlBody += `<tr>${row.map(cell => `<td style="border:1px solid #cbd5e1; padding:8px;">${escapeHTML(cell)}</td>`).join('')}</tr>`;
          });
          htmlBody += `</tbody></table>`;
          exportToPDF(title, htmlBody);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast({ title: t('finance.error', 'Error'), description: t('finance.exportError', 'Failed to export data.'), variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalAllocated', 'Total Allocated')}</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalAllocated.toLocaleString()} ETB</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-primary">
              <Clock className="w-3 h-3 mr-1" />
              <span>{t('finance.lifetimeAllocations', 'Lifetime allocations')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalDisbursed', 'Total Disbursed')}</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalDisbursed.toLocaleString()} ETB</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              <span>{t('finance.verifiedDisbursements', 'Verified disbursements')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('finance.totalDonations', 'Total Donations Received')}</p>
                <h3 className="text-2xl font-bold mt-1">{stats.totalDonations.toLocaleString()} ETB</h3>
              </div>
              <div className="p-3 bg-accent/10 rounded-full">
                <HandCoins className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-accent">
              <Calendar className="w-3 h-3 mr-1" />
              <span>{t('finance.currentFiscalYear', 'Current fiscal year')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b pb-1">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('allocations')}
              className={cn(
                "pb-3 text-sm font-medium transition-colors relative",
                activeTab === 'allocations' 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('finance.fundAllocations', 'Fund Allocations')}
              {activeTab === 'allocations' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('donations')}
              className={cn(
                "pb-3 text-sm font-medium transition-colors relative",
                activeTab === 'donations' 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('finance.donations', 'Donations')}
              {activeTab === 'donations' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
          <div className="flex items-center space-x-2 pb-2">
            <ExportButton onExport={handleExport} loading={exporting} />
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => activeTab === 'allocations' ? setAllocationDrawerOpen(true) : setDonationDrawerOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {activeTab === 'allocations' ? t('finance.newAllocation', 'New Allocation') : t('finance.recordDonation', 'Record Donation')}
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4 py-2">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={activeTab === 'allocations' ? t('finance.searchAllocations', 'Search parent name or purpose...') : t('finance.searchDonations', 'Search donor name or receipt...')}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {activeTab === 'allocations' ? (
              <select 
                className="text-sm border rounded-md px-2 py-1 bg-background"
                value={allocationStatus}
                onChange={(e) => setAllocationStatus(e.target.value)}
              >
                <option value="ALL">{t('finance.allStatuses', 'All Statuses')}</option>
                <option value="ALLOCATED">{t('finance.allocated', 'Allocated')}</option>
                <option value="DISBURSED">{t('finance.disbursed', 'Disbursed')}</option>
              </select>
            ) : (
              <select 
                className="text-sm border rounded-md px-2 py-1 bg-background"
                value={donorType}
                onChange={(e) => setDonorType(e.target.value)}
              >
                <option value="ALL">{t('finance.allDonorTypes', 'All Donor Types')}</option>
                <option value="INDIVIDUAL">{t('finance.individual', 'Individual')}</option>
                <option value="ORGANIZATION">{t('finance.organization', 'Organization')}</option>
                <option value="ANONYMOUS">{t('finance.anonymous', 'Anonymous')}</option>
              </select>
            )}
            <CalendarDatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder={t('finance.fromDate', 'From date')}
            />
            <span className="text-muted-foreground">{t('finance.to', 'to')}</span>
            <CalendarDatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder={t('finance.toDate', 'To date')}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {activeTab === 'allocations' ? (
                <TableRow>
                  <TableHead>{t('finance.parentName', 'Parent Name')}</TableHead>
                  <TableHead>{t('finance.amount', 'Amount')}</TableHead>
                  <TableHead>{t('finance.purpose', 'Purpose')}</TableHead>
                  <TableHead>{t('finance.allocationDate', 'Allocation Date')}</TableHead>
                  <TableHead>{t('finance.status', 'Status')}</TableHead>
                  <TableHead className="text-center">{t('finance.ack', 'Ack.')}</TableHead>
                  <TableHead className="text-right">{t('finance.actions', 'Actions')}</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead>{t('finance.receiptNo', 'Receipt No.')}</TableHead>
                  <TableHead>{t('finance.donorName', 'Donor Name')}</TableHead>
                  <TableHead>{t('finance.type', 'Type')}</TableHead>
                  <TableHead>{t('finance.amount', 'Amount')}</TableHead>
                  <TableHead>{t('finance.date', 'Date')}</TableHead>
                  <TableHead>{t('finance.restricted', 'Restricted')}</TableHead>
                  <TableHead>{t('finance.receivedBy', 'Received By')}</TableHead>
                  <TableHead className="text-right">{t('finance.actions', 'Actions')}</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={activeTab === 'allocations' ? 7 : 8} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="w-8 h-8 text-muted-foreground animate-pulse" />
                      <p className="text-muted-foreground">{t('finance.loadingRecords', 'Loading records...')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : activeTab === 'allocations' ? (
                allocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {t('finance.noAllocations', 'No fund allocations found.')}
                    </TableCell>
                  </TableRow>
                ) : allocations.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={item.parent.photoUrl} />
                          <AvatarFallback>{item.parent.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{item.parent.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{item.amount.toLocaleString()} ETB</TableCell>
                    <TableCell>{item.purpose}</TableCell>
                    <TableCell>{format(new Date(item.allocationDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.status === 'DISBURSED' ? 'default' : 'outline'}
                        className={cn(
                          item.status === 'ALLOCATED' && "bg-primary/5 text-primary border-primary/20",
                          item.status === 'DISBURSED' && "bg-green-50 text-green-700 border-green-200"
                        )}
                      >
                        {t(`enum.allocationStatus.${item.status.toLowerCase()}`, item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.parentAcknowledged ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'DISBURSED' && item.parentAcknowledged ? (
                        <div className="flex items-center justify-end text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100 w-fit ml-auto">
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          <span className="text-xs font-semibold uppercase tracking-wider">{t('finance.verified', 'Verified')}</span>
                          <Lock className="w-3 h-3 ml-2" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1">
                          {item.status !== 'DISBURSED' && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              title={t('finance.markAsDisbursed', 'Mark as Disbursed')} 
                              className="text-primary h-8 w-8"
                              onClick={(e) => handleDisburseClick(e, item)}
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Button>
                          )}
                          {!item.parentAcknowledged && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              title={t('finance.recordAcknowledgement', 'Record Acknowledgement')} 
                              className="text-accent h-8 w-8"
                              onClick={(e) => handleAcknowledgeClick(e, item)}
                            >
                              <HandCoins className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                donations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {t('finance.noDonations', 'No donation records found.')}
                    </TableCell>
                  </TableRow>
                ) : donations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.receiptNumber}</TableCell>
                    <TableCell className="font-medium">{item.donorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {t(`enum.donorType.${item.donorType.toLowerCase()}`, item.donorType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{item.amount.toLocaleString()} ETB</TableCell>
                    <TableCell>{format(new Date(item.donationDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {item.isRestricted ? (
                        <div className="space-y-1">
                          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex items-center w-fit">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {t('finance.restricted', 'Restricted')}
                          </Badge>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {item.restrictedToChild?.fullName || item.restrictedToService?.name || t('finance.unknown', 'Unknown')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t('finance.no', 'No')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{item.receivedBy?.fullName || t('finance.system', 'System')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                         <div className="flex items-center text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border text-[10px] font-medium uppercase tracking-wider">
                          <Lock className="w-3 h-3 mr-1" />
                           {t('finance.immutable', 'Immutable')}
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Components */}
      <AllocationDrawer 
        open={allocationDrawerOpen} 
        onClose={() => setAllocationDrawerOpen(false)} 
        onSuccess={fetchData} 
      />
      <DonationDrawer 
        open={donationDrawerOpen} 
        onClose={() => setDonationDrawerOpen(false)} 
        onSuccess={fetchData} 
      />
      <DisburseModal 
        open={disburseModalOpen} 
        allocation={selectedAllocation} 
        onClose={() => setDisburseModalOpen(false)} 
        onSuccess={fetchData} 
      />
      <AcknowledgeModal 
        open={acknowledgeModalOpen} 
        allocation={selectedAllocation} 
        onClose={() => setAcknowledgeModalOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
}
