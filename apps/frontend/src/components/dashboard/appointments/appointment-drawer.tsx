'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, FileText, Loader2, Search, Repeat, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AppointmentType, AppointmentStatus } from '@/types/appointments';
import { cn } from '@/lib/utils';

interface AppointmentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment?: any; // For editing
}

export function AppointmentDrawer({ open, onClose, onSuccess, appointment }: AppointmentDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ children: any[], parents: any[] }>({ children: [], parents: [] });
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AppointmentType>(AppointmentType.THERAPY);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [staffId, setStaffId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('DAILY');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [notes, setNotes] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchStaff();
      if (appointment) {
        setTitle(appointment.title);
        setType(appointment.type);
        const d = new Date(appointment.scheduledAt);
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toTimeString().slice(0, 5));
        setDuration(appointment.durationMinutes.toString());
        setStaffId(appointment.staffId);
        setIsRecurring(appointment.isRecurring);
        setSelectedChild(appointment.child || null);
        setSelectedParent(appointment.parent || null);
      }
    } else {
      resetForm();
    }
  }, [open, appointment]);

  useEffect(() => {
    if (search.length > 2) {
      handleSearch();
    } else {
      setSearchResults({ children: [], parents: [] });
    }
  }, [search]);

  async function fetchStaff() {
    try {
      const res = await api.get('/accounts/directory');
      setStaff(res.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }

  async function handleSearch() {
    try {
      const [childRes, parentRes] = await Promise.all([
        api.get(`/children?search=${search}&limit=5`),
        api.get(`/parents?search=${search}&limit=5`)
      ]);
      setSearchResults({
        children: childRes.data?.data || [],
        parents: parentRes.data?.data || []
      });
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  function resetForm() {
    setTitle('');
    setType(AppointmentType.THERAPY);
    setDate('');
    setTime('');
    setDuration('60');
    setStaffId('');
    setIsRecurring(false);
    setRecurrenceRule('DAILY');
    setRecurrenceEnd('');
    setNotes('');
    setSelectedChild(null);
    setSelectedParent(null);
    setSearch('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date || !time || !staffId) {
      toast({ title: 'Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const payload = {
        title,
        type,
        scheduledAt,
        durationMinutes: parseInt(duration),
        staffId,
        childId: selectedChild?.id || null,
        parentId: selectedParent?.id || null,
        isRecurring,
        recurrenceRule: isRecurring ? `${recurrenceRule};UNTIL=${recurrenceEnd}` : null,
        notes,
      };

      if (appointment) {
        await api.patch(`/appointments/${appointment.id}`, payload);
        toast({ title: 'Success', description: 'Appointment updated successfully.' });
      } else {
        await api.post('/appointments', payload);
        toast({ title: 'Success', description: 'Appointment scheduled successfully.' });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save appointment:', error);
      toast({ title: 'Error', description: 'Failed to save appointment.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{appointment ? 'Edit Appointment' : 'New Appointment'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              placeholder="e.g. Weekly Therapy Session" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AppointmentType).map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input 
                type="number" 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 pt-2">
            <Label>Linked Participants (Search and select)</Label>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search child or parent name..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {searchResults.children.length > 0 || searchResults.parents.length > 0 ? (
                <div className="border rounded-md max-h-48 overflow-y-auto bg-muted/20">
                  {searchResults.children.map(c => (
                    <div key={c.id} className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b last:border-0" onClick={() => { setSelectedChild(c); setSearch(''); }}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6"><AvatarImage src={c.photoUrl} /><AvatarFallback>C</AvatarFallback></Avatar>
                        <span className="text-sm">{c.fullName} <span className="text-[10px] text-muted-foreground ml-1 uppercase">Child</span></span>
                      </div>
                      {selectedChild?.id === c.id && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                  ))}
                  {searchResults.parents.map(p => (
                    <div key={p.id} className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b last:border-0" onClick={() => { setSelectedParent(p); setSearch(''); }}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6"><AvatarImage src={p.photoUrl} /><AvatarFallback>P</AvatarFallback></Avatar>
                        <span className="text-sm">{p.fullName} <span className="text-[10px] text-muted-foreground ml-1 uppercase">Parent</span></span>
                      </div>
                      {selectedParent?.id === p.id && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                  ))}
                </div>
              ) : search.length > 2 && (
                <div className="text-center p-4 text-xs text-muted-foreground border rounded-md">No results found</div>
              )}

              <div className="space-y-2">
                {selectedChild && (
                  <div className="flex items-center justify-between p-2 border rounded-md bg-blue-50/50 border-blue-100">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8"><AvatarImage src={selectedChild.photoUrl} /><AvatarFallback>C</AvatarFallback></Avatar>
                      <div>
                        <div className="text-sm font-medium">{selectedChild.fullName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Child</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedChild(null)}><X className="w-4 h-4" /></Button>
                  </div>
                )}
                {selectedParent && (
                  <div className="flex items-center justify-between p-2 border rounded-md bg-amber-50/50 border-amber-100">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8"><AvatarImage src={selectedParent.photoUrl} /><AvatarFallback>P</AvatarFallback></Avatar>
                      <div>
                        <div className="text-sm font-medium">{selectedParent.fullName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Parent</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedParent(null)}><X className="w-4 h-4" /></Button>
                  </div>
                )}
                {!selectedChild && !selectedParent && (
                  <div className="text-xs text-center p-3 border border-dashed rounded-md text-muted-foreground">
                    No participants linked
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="recurring">Recurring Appointment</Label>
              </div>
              <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>

            {isRecurring && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ends On</Label>
                  <Input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} required={isRecurring} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="notes">Notes</Label>
            <textarea 
              id="notes"
              className="w-full min-h-[100px] p-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>

        <div className="p-4 border-t bg-muted/10 flex space-x-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {appointment ? 'Update Appointment' : 'Schedule Appointment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
