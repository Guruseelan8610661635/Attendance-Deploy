
import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RotateCcw, 
  BookOpen, 
  Coffee, 
  Utensils, 
  Settings2, 
  Timer, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Clock, 
  ChevronLeft,
  CalendarDays,
  LayoutGrid,
  Settings,
  Layers,
  Users,
  Edit,
  X,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserRole, Subject } from '../types';
import apiClient from '../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Removed SEMESTER_SUBJECTS - now loaded dynamically from database

interface PeriodInterval {
  id: string;
  start: string;
  end: string;
}

interface SubjectOption {
  id: number;
  subjectCode: string;
  subjectName: string;
  semester: number;
  isElective: boolean;
}

const formatTo12h = (time24: string) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Helper Components
const ChevronDown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

const LegendItem = ({ label, color }: { label: string; color: string }) => (
  <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
    <div className={`w-3 h-3 rounded-full ${color}`}></div>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

const FixedBreakInput = ({ label, start, end, icon }: { label: string; start: string; end: string; icon: React.ReactNode }) => {
  const [valStart, setValStart] = useState(start);
  const [valEnd, setValEnd] = useState(end);

  return (
    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">{icon}</div>
        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-1">From <span className="text-indigo-600">{formatTo12h(valStart)}</span></label>
          <input type="time" value={valStart} onChange={(e) => setValStart(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700" />
        </div>
        <div className="pt-4 font-black text-slate-300">/</div>
        <div className="flex-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-1">To <span className="text-indigo-600">{formatTo12h(valEnd)}</span></label>
          <input type="time" value={valEnd} onChange={(e) => setValEnd(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700" />
        </div>
      </div>
    </div>
  );
};

// Main Component
const TimetableManagement: React.FC = () => {
  const currentUserRole = (window as any).currentUserRole || UserRole.ADMIN;
  const currentUser = (window as any).currentUser;
  const isStaff = currentUserRole === UserRole.STAFF;

  const [periods, setPeriods] = useState<PeriodInterval[]>([
    { id: 'p1', start: '09:00', end: '09:45' },
    { id: 'p2', start: '09:45', end: '10:30' },
    { id: 'p3', start: '10:45', end: '11:30' },
    { id: 'p4', start: '11:30', end: '12:00' },
    { id: 'p5', start: '13:00', end: '13:50' },
  ]);

  const [timetable, setTimetable] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    DAYS.forEach(day => {
      initial[day] = Array(5).fill('Select Subject');
    });
    return initial;
  });

  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [semesterSubjects, setSemesterSubjects] = useState<SubjectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('Computer Science');
  
  // Teacher-specific filters
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<number[]>([1, 2, 3]);
  const [availableClasses, setAvailableClasses] = useState<string[]>(['A', 'B', 'C']);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Subject Registry Management (Admin Only)
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    subjectCode: '',
    subjectName: '',
    department: 'Computer Science',
    semester: 1,
    credits: 3,
    isElective: false
  });
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Fetch subjects from backend
  const fetchSubjects = async (department?: string, semester?: number) => {
    try {
      setSubjectLoading(true);
      let url = '/admin/subjects';
      const params = [];
      if (department) params.push(`department=${encodeURIComponent(department)}`);
      if (semester) params.push(`semester=${semester}`);
      if (params.length > 0) url += '?' + params.join('&');
      
      const response = await apiClient.get(url);
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setSubjectLoading(false);
    }
  };

  // Load subjects when modal opens or semester changes
  useEffect(() => {
    if (!isStaff && showSubjectModal) {
      const semesterNum = selectedSemester ? parseInt(selectedSemester.split(' ')[1]) : undefined;
      fetchSubjects('Computer Science', semesterNum);
    }
  }, [showSubjectModal, selectedSemester, isStaff]);

  useEffect(() => {
    setTimetable(prev => {
      const next = { ...prev };
      DAYS.forEach(day => {
        const currentLen = next[day].length;
        if (currentLen < periods.length) {
          next[day] = [...next[day], ...Array(periods.length - currentLen).fill('Select Subject')];
        } else if (currentLen > periods.length) {
          next[day] = next[day].slice(0, periods.length);
        }
      });
      return next;
    });
  }, [periods.length]);

  // Fetch teacher's schedule when filters change (for STAFF role)
  useEffect(() => {
    if (!isStaff || !selectedYear || !selectedSemester || !selectedClass) {
      setScheduleData([]);
      return;
    }

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const department = currentUser?.department || 'Computer Science';
        const response = await apiClient.get(
          `/teacher/schedule?department=${encodeURIComponent(department)}&year=${selectedYear}&semester=${selectedSemester}&className=${selectedClass}`
        );
        
        console.log('📅 Teacher Schedule API Response:', response.data);
        const data = response.data.data || [];
        setScheduleData(data);
        
        // Convert API data to timetable format
        const newTimetable: Record<string, string[]> = {};
        DAYS.forEach(day => {
          newTimetable[day] = Array(periods.length).fill('Free Period');
        });
        
        data.forEach((session: any) => {
          const dayIndex = DAYS.indexOf(session.dayOfWeek);
          if (dayIndex !== -1) {
            // Find period slot based on start time
            const sessionStart = session.startTime;
            const periodIndex = periods.findIndex(p => p.start === sessionStart.substring(0, 5));
            if (periodIndex !== -1 && newTimetable[DAYS[dayIndex]]) {
              // Show class context: [Year] [Class] - [Department]
              const classContext = session.classContext || `Year ${selectedYear} ${selectedClass} - ${department}`;
              newTimetable[DAYS[dayIndex]][periodIndex] = `${session.subjectName}\n${classContext}`;
            }
          }
        });
        
        setTimetable(newTimetable);
      } catch (error) {
        console.error('❌ Error fetching teacher schedule:', error);
        // Show empty schedule on error
        const emptyTimetable: Record<string, string[]> = {};
        DAYS.forEach(day => {
          emptyTimetable[day] = Array(periods.length).fill('Free Period');
        });
        setTimetable(emptyTimetable);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [isStaff, selectedYear, selectedSemester, selectedClass, periods]);

  // Fetch available years for teacher's department
  useEffect(() => {
    if (!isStaff) return;

    const fetchYears = async () => {
      try {
        const department = currentUser?.department || 'Computer Science';
        const response = await apiClient.get(`/teacher/years?department=${encodeURIComponent(department)}`);
        setAvailableYears(response.data.data || [1, 2, 3]);
      } catch (error) {
        console.error('Error fetching years:', error);
        setAvailableYears([1, 2, 3]);
      }
    };

    fetchYears();
  }, [isStaff, currentUser]);

  // Fetch available classes when year and semester change
  useEffect(() => {
    if (!isStaff || !selectedYear || !selectedSemester) return;

    const fetchClasses = async () => {
      try {
        const department = currentUser?.department || 'Computer Science';
        const response = await apiClient.get(
          `/teacher/classes?department=${encodeURIComponent(department)}&year=${selectedYear}&semester=${selectedSemester}`
        );
        setAvailableClasses(response.data.data || ['A', 'B', 'C']);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setAvailableClasses(['A', 'B', 'C']);
      }
    };

    fetchClasses();
  }, [isStaff, selectedYear, selectedSemester, currentUser]);

  // ✨ NEW: Fetch subjects with staff assigned when semester is selected
  // This ensures only subjects that have staff can be used in timetable
  const fetchSemesterSubjects = async (semesterNum: number) => {
    try {
      setLoadingSubjects(true);
      const response = await apiClient.get(
        `/admin/subjects/with-staff?department=${encodeURIComponent(selectedDepartment)}&semester=${semesterNum}`
      );
      const subjectsData = response.data.data || [];
      
      // Transform SubjectWithStaffDTO to SubjectOption format
      const transformedSubjects = subjectsData.map((subject: any) => ({
        id: subject.id,
        subjectCode: subject.code,
        subjectName: subject.subjectName,
        semester: subject.semester,
        isElective: false, // Not used in this context
        assignedStaff: subject.assignedStaff // Keep staff info for reference
      }));
      
      setSemesterSubjects(transformedSubjects);
      console.log(`✅ Loaded ${transformedSubjects.length} subjects with staff for Semester ${semesterNum}`);
      
      if (transformedSubjects.length === 0) {
        console.warn(`⚠️  No subjects with assigned staff found for ${selectedDepartment}, Semester ${semesterNum}`);
        console.warn('   Please assign staff to subjects in Admin Settings first.');
      }
    } catch (error) {
      console.error('Error fetching semester subjects with staff:', error);
      setSemesterSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ✨ NEW: Watch for semester changes and load subjects + existing timetable
  useEffect(() => {
    if (!selectedSemester) {
      setSemesterSubjects([]);
      return;
    }
    const semesterNum = parseInt(selectedSemester.split(' ')[1]);
    
    const loadData = async () => {
      // 1. Fetch subjects first
      await fetchSemesterSubjects(semesterNum);

      // 2. Then fetch existing timetable
      if (!isStaff) {
        try {
          setSaving(true);
          const response = await apiClient.get('/admin/timetable');
          const allSessions = response.data.data || [];
          console.log('🔍 Loaded all timetable sessions from DB:', allSessions);
          
          // Filter for this specific class using structured fields
          const classSessions = allSessions.filter((s: any) => 
            s.department === selectedDepartment && 
            s.semester === semesterNum && 
            (s.section === 'A' || !s.section)
          );
          console.log(`🔍 Filtered sessions for ${selectedDepartment} Sem ${semesterNum}:`, classSessions);

          const newTimetable: Record<string, string[]> = {};
          DAYS.forEach(day => {
            newTimetable[day] = Array(periods.length).fill('Select Subject');
          });

          if (classSessions.length > 0) {
            // Sort: sessions WITH subjects first, nulls last — so valid subjects always win
            const sorted = [...classSessions].sort((a: any, b: any) => {
              const aHas = !!(a.subjectName || a.subjectCode);
              const bHas = !!(b.subjectName || b.subjectCode);
              return (bHas ? 1 : 0) - (aHas ? 1 : 0);
            });

            sorted.forEach((session: any) => {
              const dayIndex = DAYS.indexOf(session.dayOfWeek);
              if (dayIndex !== -1) {
                const periodIndex = session.sessionNumber ? session.sessionNumber - 1 : -1;
                const subjectValue = session.subjectName || session.subjectCode;
                
                if (periodIndex >= 0 && periodIndex < periods.length && subjectValue) {
                  // Only overwrite with a real subject (never overwrite a good value with undefined)
                  if (newTimetable[DAYS[dayIndex]][periodIndex] === 'Select Subject') {
                    newTimetable[DAYS[dayIndex]][periodIndex] = subjectValue;
                  }
                }
              }
            });
          }
          console.log('📅 Final constructed Timetable Layout:', newTimetable);
          setTimetable(newTimetable);
        } catch (error) {
          console.error('Error fetching existing timetable:', error);
        } finally {
          setSaving(false);
        }
      }
    };
    
    loadData();
  }, [selectedSemester, selectedDepartment, periods.length]);

  // Subject CRUD Handlers
  const handleCreateSubject = async () => {
    try {
      setSubjectLoading(true);
      await apiClient.post('/admin/subjects', subjectForm);
      alert('✅ Subject created successfully!');
      setSubjectForm({
        subjectCode: '',
        subjectName: '',
        department: 'Computer Science',
        semester: 1,
        credits: 3,
        isElective: false
      });
      const semesterNum = selectedSemester ? parseInt(selectedSemester.split(' ')[1]) : undefined;
      await fetchSubjects('Computer Science', semesterNum);
    } catch (error: any) {
      console.error('Error creating subject:', error);
      alert('❌ ' + (error.response?.data?.message || 'Error creating subject'));
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    try {
      setSubjectLoading(true);
      await apiClient.put(`/admin/subjects/${editingSubject.id}`, subjectForm);
      alert('✅ Subject updated successfully!');
      setEditingSubject(null);
      setSubjectForm({
        subjectCode: '',
        subjectName: '',
        department: 'Computer Science',
        semester: 1,
        credits: 3,
        isElective: false
      });
      const semesterNum = selectedSemester ? parseInt(selectedSemester.split(' ')[1]) : undefined;
      await fetchSubjects('Computer Science', semesterNum);
    } catch (error: any) {
      console.error('Error updating subject:', error);
      alert('❌ ' + (error.response?.data?.message || 'Error updating subject'));
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?\n\nThis will fail if the subject is assigned to active timetable sessions.`)) {
      return;
    }
    try {
      setSubjectLoading(true);
      await apiClient.delete(`/admin/subjects/${id}`);
      alert('✅ Subject deleted successfully!');
      const semesterNum = selectedSemester ? parseInt(selectedSemester.split(' ')[1]) : undefined;
      await fetchSubjects('Computer Science', semesterNum);
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      alert('❌ ' + (error.response?.data?.message || 'Error deleting subject'));
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      department: subject.department,
      semester: subject.semester,
      credits: subject.credits,
      isElective: subject.isElective
    });
  };

  const handleCancelEdit = () => {
    setEditingSubject(null);
    setSubjectForm({
      subjectCode: '',
      subjectName: '',
      department: 'Computer Science',
      semester: 1,
      credits: 3,
      isElective: false
    });
  };

  const handlePeriodChange = (id: string, field: 'start' | 'end', value: string) => {
    setPeriods(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const newId = `p${Date.now()}`;
    setPeriods([...periods, { id: newId, start: lastPeriod?.end || '09:00', end: '16:00' }]);
  };

  const removePeriod = (id: string) => {
    if (periods.length <= 1) return;
    setPeriods(periods.filter(p => p.id !== id));
  };

  const handleSubjectChange = async (day: string, periodIndex: number, subject: string) => {
    // Update local state immediately for UI responsiveness
    setTimetable(prev => ({
      ...prev,
      [day]: prev[day].map((sub, i) => i === periodIndex ? subject : sub)
    }));

    // Only save to database for admin and when semester is selected
    if (!isStaff && selectedSemester && subject !== 'Select Subject') {
      try {
        const period = periods[periodIndex];
        const semesterNum = parseInt(selectedSemester.split(' ')[1]); // Extract number from "Semester 1"

        // Find subject code from subject name
        const subjectObj = semesterSubjects.find(s => s.subjectName === subject);
        const subjectCode = subjectObj?.subjectCode || null;

        const sessionData = {
          dayOfWeek: day,
          periodNumber: periodIndex + 1,
          sessionNumber: periodIndex + 1,
          startTime: period.start + ':00',
          endTime: period.end + ':00',
          department: selectedDepartment,
          semester: semesterNum,
          section: 'A',
          subjectId: subjectCode,
          facultyId: null,   // Will need staff selection in future
          roomNumber: null
        };

        console.log('💾 Auto-saving session to database:', sessionData);
        
        const response = await apiClient.post('/admin/timetable', sessionData);
        console.log('✅ Session auto-saved:', response.data);
        
      } catch (error) {
        console.error('❌ Error auto-saving session:', error);
      }
    }
  };

  const checkConflict = (day: string, subject: string) => {
    if (subject === 'Select Subject' || subject === 'Free Period') return false;
    return timetable[day].filter(s => s === subject).length > 1;
  };

  const handleSave = async () => {
    if (!selectedSemester) {
      alert('⚠️ Please select a semester before committing changes.');
      return;
    }

    setSaving(true);
    try {
      const sessionPromises: Promise<any>[] = [];
      const semesterNum = parseInt(selectedSemester.split(' ')[1]);
      
      DAYS.forEach((day) => {
        timetable[day].forEach((subject, periodIndex) => {
          if (subject && subject !== 'Select Subject' && subject !== 'Free Period') {
            const period = periods[periodIndex];
            
            // Find subject code from subject name
            const subjectObj = semesterSubjects.find(s => s.subjectName === subject);
            const subjectCode = subjectObj?.subjectCode || null;
            
            const sessionData = {
              dayOfWeek: day, // mapped field name
              periodNumber: periodIndex + 1,
              sessionNumber: periodIndex + 1, // required by backend
              startTime: period.start + ':00',
              endTime: period.end + ':00',
              department: selectedDepartment,
              semester: semesterNum,
              section: 'A',
              subjectId: subjectCode,
              facultyId: null,
              roomNumber: `R${periodIndex + 1}01`
            };
            
            sessionPromises.push(apiClient.post('/admin/timetable', sessionData));
          }
        });
      });
      
      console.log(`💾 Batch saving ${sessionPromises.length} timetable sessions...`);
      const results = await Promise.all(sessionPromises);
      console.log('✅ All sessions saved:', results);
      
      setSaving(false);
      alert(`✅ Institutional Schedule successfully synchronized!\n${sessionPromises.length} sessions saved to timetable_session table.`);
    } catch (error) {
      setSaving(false);
      console.error('❌ Error saving timetable:', error);
      alert('❌ Error saving timetable to database. Please check console and try again.');
    }
  };

  const resetTimetable = () => {
    if (confirm('Revert to default institutional 5-period structure?')) {
      setPeriods([
        { id: 'p1', start: '09:00', end: '09:45' },
        { id: 'p2', start: '09:45', end: '10:30' },
        { id: 'p3', start: '10:45', end: '11:30' },
        { id: 'p4', start: '11:30', end: '12:00' },
        { id: 'p5', start: '13:00', end: '13:50' },
      ]);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 max-w-[1800px] mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-12 rounded-[3.5rem] border border-slate-100 card-shadow">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6 hover:text-indigo-600 transition-colors group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
            {isStaff ? 'Teaching Schedule' : 'Timetable'} <br/>{isStaff ? 'Manager' : 'Configurator'}
          </h1>
          <p className="text-slate-500 font-medium text-xl mt-6 flex items-center gap-3">
             <LayoutGrid className="w-6 h-6 text-indigo-600 opacity-40" /> 
             {isStaff 
               ? 'View your teaching schedule with class context - read-only mode.'
               : 'Live master schedule view with normal time (12h) mapping.'
             }
          </p>
        </div>

        <div className="flex items-center gap-4">
          {!isStaff && (
            <>
              <button 
                onClick={resetTimetable}
                className="px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all flex items-center gap-3"
              >
                <RotateCcw className="w-4 h-4" /> Reset Timetable
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving Timetable...' : 'Save Timetable'}
              </button>
            </>
          )}
          {isStaff && (
            <div className="bg-amber-50 border border-amber-200 px-6 py-3 rounded-2xl">
              <p className="text-amber-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Read-Only View
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Teacher Filters Section (Only for STAFF role) */}
      {isStaff && (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 card-shadow">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <Settings className="w-6 h-6 text-indigo-600" />
            Teaching Schedule Filter
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Year Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Year</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <CalendarDays className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <select 
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedClass('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-10 py-4 font-black text-[10px] text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-200 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Select Year</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Semester Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semester</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <BookOpen className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <select 
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(e.target.value);
                    setSelectedClass('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-10 py-4 font-black text-[10px] text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-200 transition-all appearance-none cursor-pointer shadow-sm"
                  disabled={!selectedYear}
                >
                  <option value="">Select Semester</option>
                  {[1, 2, 3, 4, 5, 6].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Class Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <Users className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-10 py-4 font-black text-[10px] text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-200 transition-all appearance-none cursor-pointer shadow-sm"
                  disabled={!selectedYear || !selectedSemester}
                >
                  <option value="">Select Class</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
          
          {(!selectedYear || !selectedSemester || !selectedClass) && (
            <div className="mt-8 text-center py-8 bg-slate-50 rounded-2xl">
              <p className="text-slate-400 font-medium">Please select all filters to view your teaching schedule</p>
            </div>
          )}
          
          {loading && (
            <div className="mt-8 text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-slate-500">Loading schedule...</p>
            </div>
          )}
        </div>
      )}

      {/* Only show timetable grid for admin or when staff has selected filters */}
      {(!isStaff || (selectedYear && selectedSemester && selectedClass && !loading)) && (
        <>
      {/* 2. Semester Selection Dropdown (Admin Only) */}
      {!isStaff && (
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 card-shadow flex flex-col md:flex-row items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-lg tracking-tight">Semester Filter</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Academic Term</p>
          </div>
        </div>
        <div className="relative flex-1 max-w-sm">
          <select 
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-8 py-4 font-black text-sm text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all appearance-none cursor-pointer shadow-inner"
          >
            <option value="">Select Semester</option>
            {[1, 2, 3, 4, 5, 6].map(sem => (
              <option key={sem} value={`Semester ${sem}`}>Semester {sem}</option>
            ))}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {selectedSemester && (
          <div className={`px-6 py-4 rounded-2xl border flex items-center gap-3 animate-in zoom-in-95 ${
            loadingSubjects 
              ? 'bg-blue-50 text-blue-600 border-blue-100' 
              : semesterSubjects.length === 0
                ? 'bg-amber-50 text-amber-600 border-amber-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
             <div className={`w-2 h-2 rounded-full ${
               loadingSubjects 
                 ? 'bg-blue-500 animate-pulse' 
                 : semesterSubjects.length === 0
                   ? 'bg-amber-500'
                   : 'bg-emerald-500'
             }`}></div>
             <span className="text-[10px] font-black uppercase tracking-widest">
               {loadingSubjects 
                 ? 'Loading subjects...' 
                 : semesterSubjects.length === 0
                   ? 'No subjects with staff'
                   : `${semesterSubjects.length} subjects available`}
             </span>
          </div>
        )}
        <button
          onClick={() => setShowSubjectModal(true)}
          className="px-6 py-4 bg-violet-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-700 transition-all flex items-center gap-2 shadow-lg"
        >
          <Database className="w-4 h-4" />
          Manage Subjects
        </button>
      </div>
      )}

      {/* Show warning if no subjects with staff available */}
      {!isStaff && selectedSemester && !loadingSubjects && semesterSubjects.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[3rem] p-8 flex items-start gap-4">
          <div className="bg-amber-500 text-white p-3 rounded-2xl flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-amber-900 text-lg mb-2">No Subjects Available for Timetable</h4>
            <p className="text-sm text-amber-700 mb-4">
              No subjects with assigned staff were found for <strong>{selectedDepartment}</strong>, <strong>{selectedSemester}</strong>.
            </p>
            <p className="text-sm text-amber-700 mb-4">
              <strong>To create timetable sessions:</strong>
            </p>
            <ol className="list-decimal list-inside text-sm text-amber-700 space-y-2 ml-4">
              <li>Go to <strong>Admin Settings → Staff Management</strong></li>
              <li>Create or edit staff members</li>
              <li>Assign subjects to each staff member</li>
              <li>Return here to create timetable sessions</li>
            </ol>
            <div className="mt-4 flex gap-3">
              <Link 
                to="/admin/settings" 
                className="px-6 py-3 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Go to Staff Management
              </Link>
              <button
                onClick={() => setShowSubjectModal(true)}
                className="px-6 py-3 bg-white border border-amber-300 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-50 transition-all flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Manage Subjects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. THE MASTER VIEW */}
      <div className="bg-white rounded-[4rem] border border-slate-100 card-shadow overflow-x-auto min-h-[600px]">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
           <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Academic Grid</h3>
           </div>
           <div className="flex gap-6">
              <LegendItem label="Conflict Detected" color="bg-amber-500" />
              <LegendItem label="Institutional Hour" color="bg-indigo-600" />
           </div>
        </div>

        <div className="min-w-max">
          {/* Dynamic Columns Header */}
          <div className="grid bg-indigo-50/80 border-b border-slate-200" style={{ gridTemplateColumns: `200px repeat(${periods.length}, minmax(220px, 1fr))` }}>
            <div className="p-10 border-r border-slate-200 flex items-center justify-center font-black text-[11px] uppercase tracking-[0.2em] text-slate-500">Week Day</div>
            {periods.map((p, idx) => (
              <div key={p.id} className="p-10 flex flex-col items-center justify-center border-r border-slate-200 last:border-0 bg-white shadow-[inset_0_0_20px_rgba(79,70,229,0.03)]">
                <span className="font-black text-indigo-700 text-lg mb-1 tracking-tight">Period {idx + 1}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                  {formatTo12h(p.start)} - {formatTo12h(p.end)}
                </span>
              </div>
            ))}
          </div>

          {/* Day Rows */}
          <div className="divide-y divide-slate-100">
            {DAYS.map((day) => (
              <div key={day} className="grid group" style={{ gridTemplateColumns: `200px repeat(${periods.length}, minmax(220px, 1fr))` }}>
                <div className="p-10 border-r border-slate-200 flex items-center justify-center bg-slate-100/30">
                  <span className="font-black text-slate-900 text-lg tracking-tight">{day}</span>
                </div>
                
                {timetable[day].map((subject, idx) => {
                  const hasConflict = checkConflict(day, subject);
                  const isPlaceholder = subject === 'Select Subject';
                  const isFree = subject === 'Free Period' || !subject;
                  // ✨ Use dynamically loaded subjects from database
                  const availableSubjects = semesterSubjects.map(s => s.subjectName);
                  
                  // For teacher view, split subject and class context
                  const subjectParts = subject.split('\n');
                  const subjectName = subjectParts[0];
                  const classContext = subjectParts[1];
                  
                  return (
                    <div key={idx} className={`p-6 border-r border-slate-100 last:border-0 hover:bg-indigo-50/20 transition-all flex flex-col gap-2 relative min-h-[120px] ${hasConflict ? 'bg-amber-50/60' : ''}`}>
                      {isStaff ? (
                        // Teacher Read-Only View
                        <div className={`w-full h-full rounded-2xl px-6 py-6 flex flex-col justify-center ${isFree ? 'bg-slate-50 border border-slate-200' : 'bg-white border-2 border-indigo-200 shadow-sm'}`}>
                          <div className={`font-black text-sm ${isFree ? 'text-slate-400' : 'text-slate-900'} mb-2`}>
                            {subjectName}
                          </div>
                          {classContext && (
                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 inline-block">
                              {classContext}
                            </div>
                          )}
                          {isFree && (
                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">
                              No Class Scheduled
                            </div>
                          )}
                        </div>
                      ) : (
                        // Admin Edit View - Now with dynamic subjects
                        <div className="relative group">
                          {loadingSubjects ? (
                            <div className="w-full bg-slate-50/80 border border-slate-200 rounded-[1.8rem] px-6 py-7 text-sm font-black text-slate-400 cursor-not-allowed flex items-center justify-center gap-2">
                              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
                              Loading subjects...
                            </div>
                          ) : (
                            <>
                              <select 
                                value={subjectName}
                                disabled={!selectedSemester}
                                onChange={(e) => handleSubjectChange(day, idx, e.target.value)}
                                className={`
                                  w-full bg-slate-50/80 border rounded-[1.8rem] px-6 py-7 text-sm font-black outline-none focus:ring-8 focus:ring-indigo-100 focus:bg-white focus:border-indigo-400 transition-all appearance-none cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                                  ${isPlaceholder ? 'text-indigo-400/60 border-slate-200' : hasConflict ? 'text-amber-900 border-amber-400 bg-white' : 'text-slate-900 border-indigo-100 bg-white'}
                                `}
                              >
                                <option value="Select Subject" className="text-slate-400 bg-white font-bold">
                                  {!selectedSemester 
                                    ? 'Select Semester First' 
                                    : availableSubjects.length === 0 
                                      ? 'No subjects with staff assigned' 
                                      : `Select Subject (${availableSubjects.length} available)`}
                                </option>
                                {availableSubjects.map(s => (
                                  <option key={s} value={s} className="text-slate-900 font-bold bg-white py-4">{s}</option>
                                ))}
                                <option value="Free Period" className="text-slate-600 font-bold bg-slate-50 py-4">-- Free Period --</option>
                              </select>
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-600 transition-colors">
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      
                      {hasConflict && (
                        <div className="absolute top-4 right-4 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg z-10 animate-bounce">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. CONFIGURATION CONTROLS (Admin Only) */}
      {!isStaff && (
      <div className="space-y-12">
        <div className="flex items-center gap-4 mb-2">
           <div className="bg-indigo-600 p-2 rounded-xl">
             <Settings className="w-5 h-5 text-white" />
           </div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Architecture Controls</h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Period Interval Management */}
          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 card-shadow">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-black text-slate-900 text-2xl tracking-tighter flex items-center gap-3">
                <Clock className="w-7 h-7 text-indigo-600" /> Manage Period Timing
              </h3>
              <button 
                onClick={addPeriod}
                className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Slot
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {periods.map((p, idx) => (
                <div key={p.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:border-indigo-200 transition-all">
                   <div className="flex items-center justify-between mb-6">
                      <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">P{idx + 1} ARCHITECTURE</span>
                      <button 
                        onClick={() => removePeriod(p.id)}
                        className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Start <span className="text-indigo-600">({formatTo12h(p.start)})</span></label>
                        <input 
                          type="time" 
                          value={p.start}
                          onChange={(e) => handlePeriodChange(p.id, 'start', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-xs font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">End <span className="text-indigo-600">({formatTo12h(p.end)})</span></label>
                        <input 
                          type="time" 
                          value={p.end}
                          onChange={(e) => handlePeriodChange(p.id, 'end', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-xs font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Break Protocols */}
          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 card-shadow h-fit">
            <h3 className="font-black text-slate-900 text-2xl tracking-tighter flex items-center gap-3 mb-10">
              <Settings2 className="w-7 h-7 text-indigo-600" /> Institutional Protocols
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FixedBreakInput label="Morning Recess" start="10:30" end="10:45" icon={<Coffee className="w-5 h-5 text-amber-500" />} />
              <FixedBreakInput label="Academic Lunch" start="12:00" end="13:00" icon={<Utensils className="w-5 h-5 text-emerald-500" />} />
              <div className="md:col-span-2">
                <FixedBreakInput label="Afternoon Break" start="13:50" end="14:00" icon={<Clock className="w-5 h-5 text-indigo-500" />} />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      </>
      )}

      {/* Subject Registry Modal (Admin Only) */}
      {!isStaff && showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Subject Registry</h2>
                  <p className="text-violet-100 text-sm font-medium">Manage subjects for {selectedSemester || 'all semesters'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSubjectModal(false);
                  handleCancelEdit();
                }}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Add/Edit Form */}
              <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-200">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  {editingSubject ? <Edit className="w-5 h-5 text-amber-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                  {editingSubject ? 'Edit Subject' : 'Add New Subject'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Subject Code</label>
                    <input
                      type="text"
                      value={subjectForm.subjectCode}
                      onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value.toUpperCase() })}
                      placeholder="CS104"
                      disabled={!!editingSubject}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100 disabled:opacity-50 disabled:bg-slate-100"
                    />
                    {editingSubject && (
                      <p className="text-[9px] text-slate-400 mt-1 ml-1">Subject code cannot be changed</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Subject Name</label>
                    <input
                      type="text"
                      value={subjectForm.subjectName}
                      onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
                      placeholder="Data Structures"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Department</label>
                    <input
                      type="text"
                      value={subjectForm.department}
                      onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                      placeholder="Computer Science"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Semester</label>
                    <select
                      value={subjectForm.semester}
                      onChange={(e) => setSubjectForm({ ...subjectForm, semester: parseInt(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={subjectForm.credits}
                      onChange={(e) => setSubjectForm({ ...subjectForm, credits: parseInt(e.target.value) || 3 })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="isElective"
                      checked={subjectForm.isElective}
                      onChange={(e) => setSubjectForm({ ...subjectForm, isElective: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-4 focus:ring-violet-100"
                    />
                    <label htmlFor="isElective" className="text-sm font-bold text-slate-700 cursor-pointer">Elective Subject</label>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  {editingSubject && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={editingSubject ? handleUpdateSubject : handleCreateSubject}
                    disabled={subjectLoading || !subjectForm.subjectCode || !subjectForm.subjectName}
                    className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {subjectLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : editingSubject ? (
                      <><Edit className="w-4 h-4" /> Update Subject</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Add Subject</>
                    )}
                  </button>
                </div>
              </div>

              {/* Subjects List */}
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Registered Subjects</h3>
                {subjectLoading && !subjects.length ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Loading subjects...</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No subjects found. Add your first subject above.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-violet-300 transition-all flex items-center justify-between group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-black uppercase">
                              {subject.subjectCode}
                            </span>
                            <h4 className="font-black text-slate-900 text-lg">{subject.subjectName}</h4>
                            {subject.isElective && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">Elective</span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-xs text-slate-500">
                            <span>📚 {subject.department}</span>
                            <span>📅 Semester {subject.semester}</span>
                            <span>⭐ {subject.credits} Credits</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(subject)}
                            className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all opacity-0 group-hover:opacity-100"
                            title="Edit Subject"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject.id, subject.subjectName)}
                            className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject Registry Modal (Admin Only) */}
      {!isStaff && showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Subject Registry</h2>
                  <p className="text-violet-100 text-sm font-medium">Manage subjects for {selectedSemester || 'all semesters'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSubjectModal(false);
                  handleCancelEdit();
                }}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Add/Edit Form */}
              <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-200">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  {editingSubject ? <Edit className="w-5 h-5 text-amber-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                  {editingSubject ? 'Edit Subject' : 'Add New Subject'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Subject Code</label>
                    <input
                      type="text"
                      value={subjectForm.subjectCode}
                      onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value.toUpperCase() })}
                      placeholder="CS104"
                      disabled={!!editingSubject}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100 disabled:opacity-50 disabled:bg-slate-100"
                    />
                    {editingSubject && (
                      <p className="text-[9px] text-slate-400 mt-1 ml-1">Subject code cannot be changed</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Subject Name</label>
                    <input
                      type="text"
                      value={subjectForm.subjectName}
                      onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
                      placeholder="Data Structures"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Department</label>
                    <input
                      type="text"
                      value={subjectForm.department}
                      onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                      placeholder="Computer Science"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Semester</label>
                    <select
                      value={subjectForm.semester}
                      onChange={(e) => setSubjectForm({ ...subjectForm, semester: parseInt(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={subjectForm.credits}
                      onChange={(e) => setSubjectForm({ ...subjectForm, credits: parseInt(e.target.value) || 3 })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="isElective"
                      checked={subjectForm.isElective}
                      onChange={(e) => setSubjectForm({ ...subjectForm, isElective: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-4 focus:ring-violet-100"
                    />
                    <label htmlFor="isElective" className="text-sm font-bold text-slate-700 cursor-pointer">Elective Subject</label>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  {editingSubject && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={editingSubject ? handleUpdateSubject : handleCreateSubject}
                    disabled={subjectLoading || !subjectForm.subjectCode || !subjectForm.subjectName}
                    className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {subjectLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : editingSubject ? (
                      <><Edit className="w-4 h-4" /> Update Subject</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Add Subject</>
                    )}
                  </button>
                </div>
              </div>

              {/* Subjects List */}
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Registered Subjects</h3>
                {subjectLoading && !subjects.length ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Loading subjects...</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No subjects found. Add your first subject above.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-violet-300 transition-all flex items-center justify-between group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-black uppercase">
                              {subject.subjectCode}
                            </span>
                            <h4 className="font-black text-slate-900 text-lg">{subject.subjectName}</h4>
                            {subject.isElective && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">Elective</span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-xs text-slate-500">
                            <span>📚 {subject.department}</span>
                            <span>📅 Semester {subject.semester}</span>
                            <span>⭐ {subject.credits} Credits</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(subject)}
                            className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all opacity-0 group-hover:opacity-100"
                            title="Edit Subject"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject.id, subject.subjectName)}
                            className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableManagement;
