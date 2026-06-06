'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AttendanceStatus } from '@/types/appointments';
import { cn } from '@/lib/utils';

interface AttendanceDrawerProps {
  open: boolean;
  appointmentId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AttendanceDrawer({ open, appointmentId, onClose, onSuccess }: AttendanceDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [apptStatus, setApptStatus] = useState<string>('COMPLETED');
  const { toast } = useToast();

  useEffect(() => {
    if (open && appointmentId) {
      fetchDetails();
    }
  }, [open, appointmentId]);

  async function fetchDetails() {
    setLoading(true);
    try {
      const [appRes, attRes] = await Promise.all([
        api.get(`/appointments/${appointmentId}`),
        api.get(`/appointments/${appointmentId}/attendance`)
      ]);
      setAppointment(appRes.data);
      setAttendance(attRes.data);
      if (appRes.data?.status) {
        setApptStatus(appRes.data.status);
      }
    } catch (error) {
      console.error('Failed to fetch appointment details:', error);
      toast({ title: 'Error', description: 'Failed to load details.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const isAttendanceLogged = attendance.length > 0;

  async function handleLogAttendance() {
    if (!appointment) return;
    
    setSaving(true);
    try {
      const records = [];
      if (appointment.child) {
        records.push({
          targetType: 'CHILD',
          targetId: appointment.childId,
          status: statuses['CHILD'] || AttendanceStatus.PRESENT,
          notes: notes['CHILD'] || ''
        });
      }
      if (appointment.parent) {
        records.push({
          targetType: 'PARENT',
          targetId: appointment.parentId,
          status: statuses['PARENT'] || AttendanceStatus.PRESENT,
          notes: notes['PARENT'] || ''
        });
      }

      if (records.length === 0) {
        toast({ title: 'Info', description: 'No participants to log attendance for.' });
        return;
      }

      await api.post(`/appointments/${appointmentId}/attendance`, { 
        records,
        appointmentStatus: apptStatus
      });
      toast({ title: 'Success', description: 'Attendance and status updated successfully.' });
      onSuccess();
      fetchDetails();
    } catch (error) {
      console.error('Failed to log attendance:', error);
      toast({ title: 'Error', description: 'Failed to save records.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

// ... (rest of the file remains similar but I'll provide the exact block for the UI change)

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Appointment Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading details...</p>
            </div>
          ) : appointment ? (
            <>
              {/* Info Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{appointment.title}</h3>
                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline" className="mr-2 uppercase text-[10px]">{appointment.type.replace(/_/g, ' ')}</Badge>
                      <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {format(new Date(appointment.scheduledAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <Badge className={cn(
                    "uppercase text-[10px]",
                    appointment.status === 'COMPLETED' ? "bg-green-50 text-green-700 border-green-200" :
                    appointment.status === 'CANCELLED' ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {appointment.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Staff Member</p>
                    <p className="text-sm font-medium">{appointment.staff.fullName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Time & Duration</p>
                    <p className="text-sm font-medium flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> 
                      {format(new Date(appointment.scheduledAt), 'h:mm a')} ({appointment.durationMinutes} min)
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center text-sm">
                    <User className="w-4 h-4 mr-2" /> Participants & Attendance
                  </h4>
                  {isAttendanceLogged && (
                    <div className="flex items-center text-green-600 text-[10px] font-bold uppercase tracking-wider">
                      <Lock className="w-3 h-3 mr-1" /> Attendance Logged
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {appointment.child && (
                    <ParticipantRow 
                      label="Child"
                      name={appointment.child.fullName}
                      photoUrl={appointment.child.photoUrl}
                      status={isAttendanceLogged ? attendance.find((a: any) => a.childId)?.status : statuses['CHILD']}
                      onStatusChange={(v: string) => setStatuses(s => ({ ...s, CHILD: v as AttendanceStatus }))}
                      locked={isAttendanceLogged}
                      notes={isAttendanceLogged ? attendance.find((a: any) => a.childId)?.notes : notes['CHILD']}
                      onNotesChange={(v: string) => setNotes(n => ({ ...n, CHILD: v }))}
                    />
                  )}
                  {appointment.parent && (
                    <ParticipantRow 
                      label="Parent"
                      name={appointment.parent.fullName}
                      photoUrl={appointment.parent.photoUrl}
                      status={isAttendanceLogged ? attendance.find((a: any) => a.parentId)?.status : statuses['PARENT']}
                      onStatusChange={(v: string) => setStatuses(s => ({ ...s, PARENT: v as AttendanceStatus }))}
                      locked={isAttendanceLogged}
                      notes={isAttendanceLogged ? attendance.find((a: any) => a.parentId)?.notes : notes['PARENT']}
                      onNotesChange={(v: string) => setNotes(n => ({ ...n, PARENT: v }))}
                    />
                  )}
                  {!appointment.child && !appointment.parent && (
                    <p className="text-sm text-muted-foreground italic text-center py-4">No linked participants.</p>
                  )}
                </div>

                {!isAttendanceLogged && (appointment.child || appointment.parent) && (
                  <div className="pt-4 space-y-4 border-t">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Update Appointment Status</p>
                      <Select value={apptStatus} onValueChange={setApptStatus}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Set Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
                          <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      className="w-full bg-primary hover:bg-primary/90" 
                      onClick={handleLogAttendance}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Log Attendance & Update Status
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-2 flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Once logged, attendance records are immutable.
                    </p>
                  </div>
                )}

                {isAttendanceLogged && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex items-center justify-center text-green-700 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Attendance Logged — Immutable Record
                  </div>
                )}
              </div>

              {/* Notes Display */}
              {appointment.notes && (
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-semibold text-sm">Appointment Notes</h4>
                  <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground whitespace-pre-wrap italic">
                    {appointment.notes}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Appointment not found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantRow({ label, name, photoUrl, status, onStatusChange, locked, notes, onNotesChange }: any) {
  return (
    <div className="p-3 border rounded-lg bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={photoUrl} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-semibold">{name}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">{label}</div>
          </div>
        </div>
        
        <Select 
          value={status || AttendanceStatus.PRESENT} 
          onValueChange={onStatusChange}
          disabled={locked}
        >
          <SelectTrigger className="w-32 h-8 text-[11px] font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(AttendanceStatus).map(s => (
              <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {!locked ? (
        <Input 
          placeholder="Attendance notes (optional)..." 
          className="h-8 text-[11px]" 
          value={notes || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNotesChange(e.target.value)}
        />
      ) : notes ? (
        <div className="text-[11px] text-muted-foreground px-1 italic border-l-2 border-primary/20 ml-1">
          {notes}
        </div>
      ) : null}
    </div>
  );
}
