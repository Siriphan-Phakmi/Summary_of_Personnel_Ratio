import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { useTheme } from 'next-themes';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  color: 'purple' | 'sky' | 'emerald' | 'yellow';
}

interface CalendarWithEventsProps {
  events?: Event[];
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
  onAddEvent?: () => void;
  className?: string;
  showUpcomingEvents?: boolean;
  darkMode?: boolean;
}

type ViewMode = 'day' | 'week' | 'month';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EXAMPLE_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Meeting with a friends',
    description: 'Meet-Up for Travel Destination Discussion',
    date: '2024-01-10',
    startTime: '10:00',
    endTime: '11:00',
    color: 'purple'
  },
  {
    id: '2',
    title: 'Visiting online courcse',
    description: 'Checks updates for design course',
    date: '2024-01-10',
    startTime: '05:40',
    endTime: '13:00',
    color: 'sky'
  },
  {
    id: '3',
    title: 'Development meet',
    description: 'Discussion with developer for upcoming project',
    date: '2024-01-14',
    startTime: '10:00',
    endTime: '11:00',
    color: 'emerald'
  },
  {
    id: '4',
    title: 'Developer Meetup',
    description: 'Code review and planning session',
    date: '2024-01-07',
    startTime: '10:00',
    endTime: '11:00',
    color: 'emerald'
  },
  {
    id: '5',
    title: 'Developer Meetup',
    description: 'Sprint planning session',
    date: '2024-01-19',
    startTime: '10:00',
    endTime: '11:00',
    color: 'sky'
  },
  {
    id: '6',
    title: 'Friends Meet',
    description: 'Reunion with old friends',
    date: '2024-02-04',
    startTime: '09:00',
    endTime: '13:42',
    color: 'purple'
  }
];

const CalendarWithEvents: React.FC<CalendarWithEventsProps> = ({
  events = EXAMPLE_EVENTS,
  onDateChange,
  onEventClick,
  onAddEvent,
  className = '',
  showUpcomingEvents = true,
  darkMode: propDarkMode
}) => {
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // ป้องกัน hydration mismatch โดยรอให้ client-side rendering เสร็จสมบูรณ์ก่อน
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // ใช้ค่าที่กำหนดไว้แน่นอนสำหรับ initial render เพื่อป้องกัน hydration mismatch
  // แล้วค่อยใช้ค่าจริงหลังจาก component mount แล้ว
  const isDarkMode = mounted ? (propDarkMode !== undefined ? propDarkMode : theme === 'dark') : false;

  const colorClasses = {
    bgMain: isDarkMode ? 'bg-gray-900' : 'bg-stone-50',
    bgCalendar: isDarkMode ? 'bg-gray-800' : 'bg-white',
    bgControls: isDarkMode ? 'bg-gray-700' : 'bg-indigo-50',
    bgGradient: isDarkMode ? 'from-gray-900/25 to-gray-800' : 'from-white/25 to-white',
    textPrimary: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-indigo-200',
    buttonActive: isDarkMode ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white',
    buttonInactive: isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-indigo-50 text-indigo-600',
    dayHeader: isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-indigo-50 text-indigo-600',
    currentDay: isDarkMode ? 'text-blue-400' : 'text-indigo-600',
    outsideDay: isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-400',
    hoverEffect: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-50',
  };
  
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const previousMonthDays = [];
    if (startingDayOfWeek > 0) {
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = prevMonthLastDay - startingDayOfWeek + 1; i <= prevMonthLastDay; i++) {
        previousMonthDays.push({ date: new Date(year, month - 1, i), isCurrentMonth: false });
      }
    }
    
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const nextMonthDays = [];
    const totalDaysShown = previousMonthDays.length + currentMonthDays.length;
    const remainingDays = 42 - totalDaysShown;
    
    for (let i = 1; i <= remainingDays; i++) {
      nextMonthDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return [...previousMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const getWeekDays = () => {
    const startDate = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  };

  const getEventsForMonth = () => events.filter(e => {
    const d = parseISO(e.date);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const getEventsForDate = (date: Date) => events.filter(e => e.date === format(date,'yyyy-MM-dd'));

  const getUpcomingEvents = () => events.filter(e => parseISO(e.date)>= new Date()).sort((a,b)=>parseISO(a.date).getTime()-parseISO(b.date).getTime()).slice(0,3);

  const goToPrevious = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth()-1,1));
  const goToNext = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth()+1,1));

  const handleDateSelect = (date: Date) => { setSelectedDate(date); onDateChange?.(date); };

  const renderMonthView = () => {
    const days = getDaysInMonth();
    const monthEvents = getEventsForMonth();
    
    return (
      <div className={`border ${colorClasses.border} rounded-xl`}>
        <div className={`grid grid-cols-7 border-b ${colorClasses.border}`}> 
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className={`py-1 flex items-center justify-center text-[10px] font-medium ${colorClasses.dayHeader}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const formattedDate = format(day.date, 'yyyy-MM-dd');
            const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === formattedDate;
            const isToday = format(new Date(), 'yyyy-MM-dd') === formattedDate;
            const dayEvents = events.filter(e => e.date === formattedDate);
            
            // แสดงสีตามสถานะวันนั้นๆ
            let statusColor = '';
            if (dayEvents.length > 0) {
              const event = dayEvents[0]; // ใช้อีเว้นท์แรก
              switch (event.color) {
                case 'purple': // รายงานที่อนุมัติแล้ว
                  statusColor = 'bg-purple-100 dark:bg-purple-900/30';
                  break;
                case 'emerald': // รายงานสมบูรณ์
                  statusColor = 'bg-emerald-100 dark:bg-emerald-900/30';
                  break;
                case 'yellow': // รายงานฉบับร่าง
                  statusColor = 'bg-yellow-100 dark:bg-yellow-900/30';
                  break;
                default:
                  statusColor = '';
              }
            }
            
            return (
              <div 
                key={i} 
                className={`p-1 min-h-[30px] border-r ${colorClasses.border} border-b ${colorClasses.border} 
                  ${day.isCurrentMonth ? colorClasses.bgCalendar : colorClasses.outsideDay} 
                  ${statusColor}
                  cursor-pointer relative`} 
                onClick={() => handleDateSelect(day.date)}
              >
                <span className={`text-[10px] ${
                  isSelected ? 'text-white bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center' :
                  isToday ? colorClasses.currentDay :
                  day.isCurrentMonth ? colorClasses.textPrimary : 'text-gray-500'
                }`}>
                  {format(day.date, 'd')}
                </span>
                
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-0.5 left-0 right-0 flex justify-center">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${dayEvents[0].color}-500`}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    return (<div> Week view under development </div>);
  };

  // ลบตัวแปร isDark ที่ไม่จำเป็นออกเพราะเรามี colorClasses แล้ว

  // ถ้ายังไม่ mount ให้แสดง placeholder ก่อนเพื่อป้องกัน hydration mismatch
  if (!mounted) {
    return (
      <section className={`relative bg-white dark:bg-gray-900 ${className}`}>
        <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900">
          <button className="p-1 text-indigo-600 dark:text-blue-400">Prev</button>
          <div className="text-sm font-semibold text-gray-800 dark:text-white">{format(currentDate,'MMMM yyyy')}</div>
          <button className="p-1 text-indigo-600 dark:text-blue-400">Next</button>
        </div>
        <div className="p-2">
          {/* Placeholder content until client-side rendering */}
          <div className="animate-pulse space-y-2 w-full">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      </section>
    );
  }
  
  return (
    <section className={`relative ${colorClasses.bgMain} ${className} rounded-xl`}>
      <div className="flex items-center justify-between p-2 bg-gradient-to-b from-white to-white/25 dark:from-gray-800 dark:to-gray-800/25">
        <button onClick={goToPrevious} className={`${colorClasses.currentDay} p-1`}>Prev</button>
        <div className="text-sm font-semibold text-gray-800 dark:text-white">{format(currentDate,'MMMM yyyy')}</div>
        <button onClick={goToNext} className={`${colorClasses.currentDay} p-1`}>Next</button>
      </div>
      <div className="p-2">
        {viewMode==='month'?renderMonthView():renderWeekView()}
      </div>
    </section>
  );
};

export default CalendarWithEvents;