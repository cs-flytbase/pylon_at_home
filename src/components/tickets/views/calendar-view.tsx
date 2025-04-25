"use client";

import { useState, useEffect } from 'react';
import { Ticket } from '@/types/database';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

type CalendarViewProps = {
  initialTickets?: Ticket[];
};

export function CalendarView({ initialTickets }: CalendarViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets || []);
  const [loading, setLoading] = useState(!initialTickets);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthTickets, setMonthTickets] = useState<{[key: string]: Ticket[]}>({});

  // Get month and year for display
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    if (!initialTickets) {
      const fetchTickets = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Initialize the Supabase client
          const supabase = createClient();
          
          // Fetch real tickets from Supabase with customer and assignee info
          console.log('Fetching tickets from Supabase for Calendar view...');
          const { data, error } = await supabase
            .from('tickets')
            .select(`
              *,
              customer:customer_id (
                id,
                full_name,
                email,
                avatar_url
              ),
              assignee:assignee_id (
                id,
                full_name,
                email,
                avatar_url,
                role
              )
            `)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching tickets:', error);
            throw new Error(`Error fetching tickets: ${error.message}`);
          }
          
          console.log(`Successfully fetched ${data?.length || 0} tickets from database`);
          setTickets(data as Ticket[] || []);
        } catch (err) {
          console.error('Failed to fetch tickets:', err);
          setError('Failed to load tickets. Please try again.');
          toast.error('Failed to load tickets');
          // Don't use mock data, just show empty state
          setTickets([]);
        } finally {
          setLoading(false);
        }
      };

      fetchTickets();
    }
  }, [initialTickets]);

  // Organize tickets by date whenever tickets or current month changes
  useEffect(() => {
    const ticketsByDate: {[key: string]: Ticket[]} = {};
    
    // Get first and last day of the current month
    const firstDay = new Date(currentYear, currentDate.getMonth(), 1);
    const lastDay = new Date(currentYear, currentDate.getMonth() + 1, 0);
    
    tickets.forEach(ticket => {
      const ticketDate = new Date(ticket.created_at);
      
      // Only include tickets from current month
      if (ticketDate >= firstDay && ticketDate <= lastDay) {
        const dateKey = ticketDate.getDate().toString();
        if (!ticketsByDate[dateKey]) {
          ticketsByDate[dateKey] = [];
        }
        ticketsByDate[dateKey].push(ticket);
      }
    });
    
    setMonthTickets(ticketsByDate);
  }, [tickets, currentDate, currentYear]);

  // Navigate to previous month
  const previousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Function to get priority color for calendar
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'urgent': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Generate calendar days
  const generateCalendarDays = (isMobile = false) => {
    // Get first day of the month
    const firstDayOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
    
    // Get number of days in the month
    const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();
    
    // Create array for calendar days
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={`${isMobile ? 'h-12' : 'h-24'} border bg-muted/20`}></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = day.toString();
      const dayTickets = monthTickets[dateKey] || [];
      const isToday = (
        day === new Date().getDate() && 
        currentDate.getMonth() === new Date().getMonth() && 
        currentYear === new Date().getFullYear()
      );
      
      days.push(
        <div 
          key={`day-${day}`} 
          className={`${isMobile ? 'h-12' : 'h-24'} border ${isMobile ? 'p-1' : 'p-2'} relative ${isToday ? 'bg-primary/5 border-primary' : ''}`}
        >
          <div className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} sticky top-0 bg-background dark:bg-background`}>
            {day}
          </div>
          {!isMobile ? (
            <div className="mt-1 space-y-1 max-h-[5rem] overflow-y-auto">
              {dayTickets.slice(0, 3).map((ticket) => (
                <div 
                  key={ticket.id}
                  data-component="ticket-card"
                  className="text-xs p-1 rounded truncate cursor-pointer hover:bg-muted flex items-center"
                  onClick={() => window.location.href = `/tickets/${ticket.id}`}
                >
                  <div className={`w-2 h-2 rounded-full mr-1 ${getPriorityColor(ticket.priority)}`}></div>
                  {ticket.title}
                </div>
              ))}
              {dayTickets.length > 3 && (
                <div className="text-xs text-muted-foreground p-1">
                  +{dayTickets.length - 3} more
                </div>
              )}
            </div>
          ) : (
            dayTickets.length > 0 && (
              <div className="absolute bottom-1 right-1 left-1 flex justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
              </div>
            )
          )}
        </div>
      );
    }
    
    return days;
  };

  // Render loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4 pb-0">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array(7).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array(35).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="border-destructive/50 text-destructive">
        <CardHeader>
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Error Loading Calendar
          </div>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 text-primary underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-3 md:p-4 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base md:text-lg">{currentMonth} {currentYear}</CardTitle>
            <div className="flex space-x-1 md:space-x-2">
              <Button variant="outline" size="sm" className="h-8 w-8 md:h-9 md:w-9 p-0" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 md:h-9 md:w-9 p-0" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-4 overflow-x-auto">
          {/* Desktop Calendar View */}
          <div className="hidden md:block">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-sm font-medium text-center py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 min-w-[700px]">
              {generateCalendarDays()}
            </div>
          </div>
          
          {/* Mobile Calendar View */}
          <div className="md:hidden">
            <div className="grid grid-cols-7 gap-px mb-2">
              {[
                { key: 'sun', label: 'S' },
                { key: 'mon', label: 'M' },
                { key: 'tue', label: 'T' },
                { key: 'wed', label: 'W' },
                { key: 'thu', label: 'T' },
                { key: 'fri', label: 'F' },
                { key: 'sat', label: 'S' }
              ].map((day) => (
                <div key={day.key} className="text-xs font-medium text-center py-1">
                  {day.label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {generateCalendarDays(true)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
