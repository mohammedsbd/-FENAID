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
import { useToast } from '@/hooks/use-toast';
import { AppointmentDrawer } from '@/components/dashboard/appointments/appointment-drawer';
import { AttendanceDrawer } from '@/components/dashboard/appointments/attendance-drawer';

export default function AppointmentsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
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
          params: { month: format(currentMonth, 'yyyy-MM') } 
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
      toast({ title: 'Error', description: 'Failed to load appointments.', variant: 'destructive' });
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
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage therapy sessions and member meetings.</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-muted p-1 rounded-lg flex">
            <Button 
              variant={view === 'calendar' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('calendar')}
              className="px-3"
            >
              <CalendarIcon className="w-4 h-4 mr-2" /> Calendar
            </Button>
            <Button 
              variant={view === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('list')}
              className="px-3"
            >
              <List className="w-4 h-4 mr-2" /> List
            </Button>
          </div>
          <Button onClick={() => { setEditingAppointment(null); setDrawerOpen(true); }} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> New Appointment
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search title, participant, or staff..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center">
              <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Types" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.values(AppointmentType).map(t => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(AppointmentStatus).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Staff</SelectItem>
            {staff.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading appointments...</p>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView 
          currentMonth={currentMonth} 
          setCurrentMonth={setCurrentMonth} 
          appointments={filteredAppointments}
          onDayClick={handleDayClick}
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

function CalendarView({ currentMonth, setCurrentMonth, appointments, onDayClick }: any) {
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
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-5 h-[600px]">
        {days.map((day, i) => {
          const dayApps = appointments.filter((app: Appointment) => isSameDay(new Date(app.scheduledAt), day));
          return (
            <div 
              key={i} 
              className={cn(
                "border-r border-b p-2 transition-colors cursor-pointer hover:bg-muted/30",
                !isSameMonth(day, monthStart) && "bg-muted/10 text-muted-foreground",
                isSameDay(day, new Date()) && "bg-primary/5"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className={cn(
                "text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
              )}>
                {format(day, 'd')}
              </div>
              <div className="flex flex-wrap gap-1">
                {dayApps.slice(0, 4).map((app: any) => (
                  <div 
                    key={app.id} 
                    className={cn("w-2 h-2 rounded-full", getTypeColor(app.type))} 
                    title={`${app.title} (${app.type})`}
                  />
                ))}
                {dayApps.length > 4 && (
                  <div className="text-[10px] text-muted-foreground font-bold">+{dayApps.length - 4}</div>
                )}
              </div>
              {dayApps.length > 0 && (
                <div className="mt-2 space-y-1 hidden md:block">
                  {dayApps.slice(0, 2).map((app: any) => (
                    <div key={app.id} className="text-[10px] truncate bg-muted p-1 rounded border leading-tight">
                      {format(new Date(app.scheduledAt), 'h:mm')} {app.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ appointments, onEdit, onView }: any) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Participant</TableHead>
            <TableHead>Assigned Staff</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                No appointments found for the current selection.
              </TableCell>
            </TableRow>
          ) : appointments.map((app: any) => (
            <TableRow key={app.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onView(app.id)}>
              <TableCell className="font-medium">{app.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider">
                  {app.type.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(new Date(app.scheduledAt), 'MMM d, yyyy')}
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> {format(new Date(app.scheduledAt), 'h:mm a')} ({app.durationMinutes}m)
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col space-y-1">
                  {app.child && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={app.child.photoUrl} />
                        <AvatarFallback>C</AvatarFallback>
                      </Avatar>
                      <div className="text-xs">
                        <div className="font-medium">{app.child.fullName}</div>
                        <div className="text-muted-foreground uppercase text-[8px] font-bold">Child</div>
                      </div>
                    </div>
                  )}
                  {app.parent && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={app.parent.photoUrl} />
                        <AvatarFallback>P</AvatarFallback>
                      </Avatar>
                      <div className="text-xs">
                        <div className="font-medium">{app.parent.fullName}</div>
                        <div className="text-muted-foreground uppercase text-[8px] font-bold">Parent</div>
                      </div>
                    </div>
                  )}
                  {!app.child && !app.parent && (
                    <span className="text-muted-foreground italic text-xs">None</span>
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
                  app.status === 'COMPLETED' ? "bg-green-50 text-green-700 border-green-200" :
                  app.status === 'CANCELLED' ? "bg-rose-50 text-rose-700 border-rose-200" :
                  "bg-blue-50 text-blue-700 border-blue-200"
                )}>
                  {app.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(app.id)}>
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
