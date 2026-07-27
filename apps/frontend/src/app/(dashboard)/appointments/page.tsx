'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  List, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Appointment, AppointmentType, AppointmentStatus } from '@/types/appointments';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';
import { AppointmentDrawer } from '@/components/dashboard/appointments/appointment-drawer';
import { AttendanceDrawer } from '@/components/dashboard/appointments/attendance-drawer';

export default function AppointmentsPage() {
  const { t } = useLocale();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Drawers
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    fetchStaff();
  }, [currentMonth, view, typeFilter, statusFilter, staffFilter]);

  async function fetchStaff() {
    try {
      const res = await api.get('/accounts/staff?limit=100');
      setStaff(res.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (staffFilter !== 'ALL') params.staffId = staffFilter;
      
      if (view === 'calendar') {
        const res = await api.get('/appointments/calendar', { 
          params: { ...params, month: format(currentMonth, 'yyyy-MM') } 
        });
        // Flatten grouped results for calendar
        const flat: Appointment[] = Object.values(res.data).flat() as Appointment[];
        setAppointments(flat);
      } else {
        const res = await api.get('/appointments', { params });
        setAppointments(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast({ title: t('appointments.error', 'Error'), description: t('appointments.errorLoad', 'Failed to load appointments.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const filteredAppointments = appointments.filter(app => 
    app.title.toLowerCase().includes(search.toLowerCase()) ||
    app.staff.fullName.toLowerCase().includes(search.toLowerCase()) ||
    app.child?.fullName.toLowerCase().includes(search.toLowerCase()) ||
    app.parent?.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleDayClick = (day: Date) => {
    const dayApps = appointments.filter(app => isSameDay(new Date(app.scheduledAt), day));
    if (dayApps.length > 0) {
      setSelectedAppointmentId(dayApps[0].id);
      setAttendanceOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('appointments.title', 'Appointments')}</h1>
          <p className="text-muted-foreground">{t('appointments.description', 'Manage therapy sessions and member meetings.')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-muted p-1 rounded-lg flex">
            <Button 
              variant={view === 'calendar' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('calendar')}
              className="px-3"
            >
              <CalendarIcon className="w-4 h-4 mr-2" /> {t('appointments.calendarView', 'Calendar')}
            </Button>
            <Button 
              variant={view === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('list')}
              className="px-3"
            >
              <List className="w-4 h-4 mr-2" /> {t('appointments.listView', 'List')}
            </Button>
          </div>
          <Button onClick={() => { setEditingAppointment(null); setDrawerOpen(true); }} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> {t('appointments.newAppointment', 'New Appointment')}
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t('appointments.searchPlaceholder', 'Search title, participant, or staff...')} 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center">
              <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
              <SelectValue placeholder={t('appointments.allTypes', 'All Types')} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('appointments.allTypes', 'All Types')}</SelectItem>
            {Object.values(AppointmentType).map(typeVal => (
              <SelectItem key={typeVal} value={typeVal}>{t(`enum.appointmentType.${typeVal.toLowerCase()}`, typeVal.replace(/_/g, ' '))}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('appointments.allStatuses', 'All Statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('appointments.allStatuses', 'All Statuses')}</SelectItem>
            {Object.values(AppointmentStatus).map(statusVal => (
              <SelectItem key={statusVal} value={statusVal}>{t(`enum.appointmentStatus.${statusVal.toLowerCase()}`, statusVal.replace(/_/g, ' '))}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('appointments.allStaff', 'All Staff')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('appointments.allStaff', 'All Staff')}</SelectItem>
            {staff.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">{t('appointments.loading', 'Loading appointments...')}</p>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView 
          currentMonth={currentMonth} 
          setCurrentMonth={setCurrentMonth} 
          appointments={filteredAppointments}
          onDayClick={handleDayClick}
          onAppointmentClick={(id: string) => { setSelectedAppointmentId(id); setAttendanceOpen(true); }}
        />
      ) : (
        <ListView 
          appointments={filteredAppointments} 
          onEdit={(app: Appointment) => { setEditingAppointment(app); setDrawerOpen(true); }}
          onView={(id: string) => { setSelectedAppointmentId(id); setAttendanceOpen(true); }}
        />
      )}

      <AppointmentDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onSuccess={fetchData}
        appointment={editingAppointment}
      />
      
      <AttendanceDrawer 
        open={attendanceOpen}
        appointmentId={selectedAppointmentId}
        onClose={() => setAttendanceOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

function CalendarView({ currentMonth, setCurrentMonth, appointments, onDayClick, onAppointmentClick }: any) {
  const { t } = useLocale();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getTypeColor = (type: AppointmentType) => {
    switch(type) {
      case AppointmentType.THERAPY: return 'bg-blue-500';
      case AppointmentType.ASSESSMENT: return 'bg-purple-500';
      case AppointmentType.WORKSHOP: return 'bg-amber-500';
      case AppointmentType.FUND_DISBURSEMENT: return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>{t('appointments.calendar.today', 'Today')}</Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {[t('appointments.calendar.sun', 'Sun'), t('appointments.calendar.mon', 'Mon'), t('appointments.calendar.tue', 'Tue'), t('appointments.calendar.wed', 'Wed'), t('appointments.calendar.thu', 'Thu'), t('appointments.calendar.fri', 'Fri'), t('appointments.calendar.sat', 'Sat')].map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-5 min-h-[600px]">
        {days.map((day, i) => {
          const dayApps = appointments.filter((app: Appointment) => isSameDay(new Date(app.scheduledAt), day));
          return (
            <div 
              key={i} 
              className={cn(
                "border-r border-b p-1 transition-colors cursor-default",
                !isSameMonth(day, monthStart) && "bg-muted/10 text-muted-foreground",
                isSameDay(day, new Date()) && "bg-primary/5 dark:bg-primary/10"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={cn(
                  "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                  isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                {dayApps.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 h-4 font-bold">
                    {dayApps.length}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1 overflow-hidden">
                {dayApps.slice(0, 5).map((app: any) => (
                  <div 
                    key={app.id} 
                    className={cn(
                      "text-[9px] truncate p-1 rounded border leading-tight flex items-center cursor-pointer transition-all hover:ring-1 hover:ring-primary/30",
                      app.status === 'COMPLETED' ? "bg-green-50/50 border-green-100" : "bg-background border-muted"
                    )}
                    onClick={() => onAppointmentClick(app.id)}
                    title={`${app.title} - ${app.status}`}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full mr-1 shrink-0", getTypeColor(app.type))} />
                    <span className={cn("truncate font-medium", app.status === 'COMPLETED' && "text-green-800")}>
                      {format(new Date(app.scheduledAt), 'h:mm')}{app.status === 'COMPLETED' && t('appointments.calendar.completed', ' ✓')}
                    </span>
                  </div>
                ))}
                {dayApps.length > 5 && (
                  <div 
                    className="text-[9px] text-center text-muted-foreground font-semibold pt-0.5 cursor-pointer hover:text-primary"
                    onClick={() => onDayClick(day)}
                  >
                    {t('appointments.calendar.more', '+{count} more', { count: String(dayApps.length - 5) })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ appointments, onEdit, onView }: any) {
  const { t } = useLocale();
  const getAttendanceStatus = (app: any, type: 'CHILD' | 'PARENT') => {
    if (!app.attendanceRecords) return null;
    const record = app.attendanceRecords.find((r: any) => 
      type === 'CHILD' ? r.childId === app.childId : r.parentId === app.parentId
    );
    return record?.status;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PRESENT': return 'bg-green-100 text-green-700 border-green-200';
      case 'ABSENT': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'EXCUSED': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'RESCHEDULED': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('appointments.list.title', 'Title')}</TableHead>
            <TableHead>{t('appointments.list.type', 'Type')}</TableHead>
            <TableHead>{t('appointments.list.dateTime', 'Date & Time')}</TableHead>
            <TableHead>{t('appointments.list.participantAttendance', 'Participant & Attendance')}</TableHead>
            <TableHead>{t('appointments.list.assignedStaff', 'Assigned Staff')}</TableHead>
            <TableHead>{t('appointments.list.apptStatus', 'Appt. Status')}</TableHead>
            <TableHead className="text-right">{t('appointments.list.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                {t('appointments.list.noAppointments', 'No appointments found for the current selection.')}
              </TableCell>
            </TableRow>
          ) : appointments.map((app: any) => (
            <TableRow key={app.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onView(app.id)}>
              <TableCell className="font-medium">{app.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider">
                  {t(`enum.appointmentType.${app.type.toLowerCase()}`, app.type.replace(/_/g, ' '))}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(app.scheduledAt), 'MMM d, yyyy')}
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> {format(new Date(app.scheduledAt), 'h:mm a')} ({app.durationMinutes}{t('appointments.minutes', 'm')})
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col space-y-2">
                  {app.child && (
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={app.child.photoUrl} />
                          <AvatarFallback>{t('appointments.initials.child', 'C')}</AvatarFallback>
                        </Avatar>
                        <div className="text-xs">
                          <div className="font-medium">{app.child.fullName}</div>
                          <div className="text-muted-foreground uppercase text-[8px] font-bold">{t('appointments.list.child', 'Child')}</div>
                        </div>
                      </div>
                      {getAttendanceStatus(app, 'CHILD') ? (
                        <Badge className={cn("text-[8px] px-1.5 h-4", getStatusColor(getAttendanceStatus(app, 'CHILD')))}>
                          {getAttendanceStatus(app, 'CHILD')}
                        </Badge>
                      ) : (
                        <Badge variant="ghost" className="text-[8px] px-1.5 h-4 text-muted-foreground opacity-0 group-hover:opacity-100">
                          {t('appointments.list.pending', 'Pending')}
                        </Badge>
                      )}
                    </div>
                  )}
                  {app.parent && (
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={app.parent.photoUrl} />
                          <AvatarFallback>{t('appointments.initials.parent', 'P')}</AvatarFallback>
                        </Avatar>
                        <div className="text-xs">
                          <div className="font-medium">{app.parent.fullName}</div>
                          <div className="text-muted-foreground uppercase text-[8px] font-bold">{t('appointments.list.parent', 'Parent')}</div>
                        </div>
                      </div>
                      {getAttendanceStatus(app, 'PARENT') ? (
                        <Badge className={cn("text-[8px] px-1.5 h-4", getStatusColor(getAttendanceStatus(app, 'PARENT')))}>
                          {getAttendanceStatus(app, 'PARENT')}
                        </Badge>
                      ) : (
                        <Badge variant="ghost" className="text-[8px] px-1.5 h-4 text-muted-foreground opacity-0 group-hover:opacity-100">
                          {t('appointments.list.pending', 'Pending')}
                        </Badge>
                      )}
                    </div>
                  )}
                  {!app.child && !app.parent && (
                    <span className="text-muted-foreground italic text-xs">{t('appointments.list.none', 'None')}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{app.staff.fullName}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={cn(
                  "uppercase text-[10px]",
                  app.status === 'COMPLETED' ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800" :
                  app.status === 'CANCELLED' ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800" :
                  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                )}>
                  {app.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" title={t('appointments.list.logAttendance', 'Log Attendance')} className="h-8 w-8 hover:bg-green-50" onClick={() => onView(app.id)}>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(app)}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
