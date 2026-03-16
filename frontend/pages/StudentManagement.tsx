
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Users, 
  Briefcase, 
  X, 
  Save,
  CheckCircle2,
  FilterX,
  ChevronDown,
  CalendarDays,
  AlertCircle,
  Loader
} from 'lucide-react';
import { UserRole, Student, User } from '../types';
import studentService, { StudentDTO } from '../services/studentService';
import staffService, { StaffDTO } from '../services/staffService';

interface StudentManagementProps {
  userRole?: UserRole;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isStudent = userRole === UserRole.STUDENT;
  const isAdmin = userRole === UserRole.ADMIN;
  
  // Contextual department filter from URL
  const deptContext = searchParams.get('dept');
  
  // State for registry data
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [staff, setStaff] = useState<StaffDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab and Search state
  const [activeTab, setActiveTab] = useState<'students' | 'faculty'>(isStudent ? 'faculty' : 'students');
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [staffCodeError, setStaffCodeError] = useState<string | null>(null);

  // Fetch students from backend on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await studentService.getAll();
        setStudents(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load students');
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!isStudent) {
      fetchStudents();
    } else {
      setLoading(false);
    }
  }, [isStudent]);

  // Fetch staff from backend on mount
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setStaffLoading(true);
        const data = await staffService.getAll();
        setStaff(data);
      } catch (err: any) {
        console.error('Error fetching staff:', err);
        // Don't set error for staff as it's not critical for students tab
        setStaff([]);
      } finally {
        setStaffLoading(false);
      }
    };

    if (isAdmin) {
      fetchStaff();
    } else {
      setStaffLoading(false);
    }
  }, [isAdmin]);

  // Filter Logic - Scoped by Department and Year if present
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.rollNo || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYear = yearFilter === '' || s.semester?.toString() === yearFilter || s.section === yearFilter;
      
      if (!deptContext || !isAdmin) return matchesSearch && matchesYear;
      
      const programme = deptContext.toLowerCase();
      const studentDept = (s.department || '').toLowerCase();
      const matchesDept = programme.includes(studentDept) || studentDept.includes(programme);
      
      return matchesSearch && matchesDept && matchesYear;
    });
  }, [students, searchTerm, deptContext, isAdmin, yearFilter]);

  const filteredStaff = useMemo(() => {
    // Ensure staff is always an array
    const staffArray = Array.isArray(staff) ? staff : [];
    
    return staffArray.filter(s => {
      const matchesSearch = (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.email || "")?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYear = yearFilter === '' || s.year === yearFilter;

      if (!deptContext || !isAdmin) return matchesSearch && matchesYear;
      
      const programme = deptContext.toLowerCase();
      const staffDept = (s.department || "").toLowerCase();
      const staffSubject = (s.subject || "").toLowerCase();
      
      const matchesDept = programme.includes(staffDept) || staffDept.includes(programme) || 
                          programme.includes(staffSubject) || staffSubject.includes(programme);
                          
      return matchesSearch && matchesDept && matchesYear;
    });
  }, [staff, searchTerm, deptContext, isAdmin, yearFilter]);

  const handleOpenEditModal = (item: any = null) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setPasswordInput('');
    setStaffCodeError(null);
    setIsEditModalOpen(true);
  };

  const handleClearFilter = () => {
    setSearchParams({});
    setYearFilter('');
  };

  const handleDeleteStudent = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    try {
      setIsSaving(true);
      await studentService.delete(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete student');
      console.error('Error deleting student:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      setIsSaving(true);
      await staffService.delete(id as number);
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff');
      console.error('Error deleting staff:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());

    if (activeTab === 'students') {
      try {
        setIsSaving(true);
        if (editingItem) {
          // Update existing student
          const updated = await studentService.update(editingItem.id, {
            id: editingItem.id,
            name: data.name,
            rollNo: data.rollNumber,
            department: data.class,
            semester: parseInt(data.semester) || 1,
            section: data.section,
            email: data.email,
            phone: data.phone,
            status: data.status || 'ACTIVE',
          });
          setStudents(prev => prev.map(s => s.id === editingItem.id ? updated : s));
        } else {
          // Create new student
          const newStudent: StudentDTO = {
            name: data.name,
            rollNo: data.rollNumber,
            department: data.class,
            semester: parseInt(data.semester) || 1,
            section: data.section,
            status: 'ACTIVE',
          };
          const created = await studentService.create(newStudent);
          setStudents(prev => [created, ...prev]);
        }
        setIsEditModalOpen(false);
        setEditingItem(null);
      } catch (err: any) {
        setError(err.message || 'Failed to save student');
        console.error('Error saving student:', err);
      } finally {
        setIsSaving(false);
      }
    } else {
      // Staff management with backend API
      try {
        setIsSaving(true);
        setStaffCodeError(null);
        
        if (editingItem) {
          // Update existing staff
          const updated = await staffService.update(editingItem.id as number, {
            id: editingItem.id as number,
            name: data.name,
            email: data.email,
            department: data.department || 'Computer Science',
            subject: data.subject || 'General',
            phone: data.phone,
            qualification: data.qualification,
            experience: parseInt(data.experience) || 0,
            status: data.status || 'ACTIVE',
          });
          setStaff(prev => prev.map(s => s.id === editingItem.id ? updated : s));
        } else {
          // Create new staff - validate staff code first
          const staffCode = data.staffCode?.trim();
          
          // Check if staff code already exists
          const staffArray = Array.isArray(staff) ? staff : [];
          const codeExists = staffArray.some(s => s.staffCode?.toUpperCase() === staffCode?.toUpperCase());
          if (codeExists) {
            setStaffCodeError(`Staff code "${staffCode}" is already in use. Please use a different code.`);
            setIsSaving(false);
            return;
          }
          
          const newStaff: StaffDTO = {
            staffCode: staffCode,
            name: data.name,
            email: data.email,
            password: passwordInput || data.password,
            department: data.department || 'Computer Science',
            subject: data.subject || 'General',
            phone: data.phone,
            qualification: data.qualification,
            experience: parseInt(data.experience) || 0,
            status: 'ACTIVE',
          };
          const created = await staffService.create(newStaff);
          setStaff(prev => [created, ...prev]);
        }
        setIsEditModalOpen(false);
        setEditingItem(null);
      } catch (err: any) {
        setError(err.message || 'Failed to save staff');
        console.error('Error saving staff:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-20">
      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-4 p-6 bg-rose-50 border border-rose-200 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-rose-900">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && activeTab === 'students' && (
        <div className="flex items-center justify-center gap-3 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
          <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
          <p className="font-bold text-slate-600">Loading student data...</p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
            {isStudent ? 'Faculty' : (deptContext ? deptContext : 'Registry')} <br/>Directory
          </h1>
          <p className="text-slate-500 font-medium text-xl mt-6">
            {isStudent 
              ? 'Authorized listing of academic faculty and department heads.' 
              : `Institutional ledger for ${deptContext ? `the ${deptContext} stream.` : 'identity management.'}`}
          </p>
          {(deptContext || yearFilter) && isAdmin && (
            <button 
              onClick={handleClearFilter}
              className="mt-6 flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-200"
            >
              <FilterX className="w-4 h-4" /> Reset Global Filter
            </button>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-6">
          {isAdmin && (
            <button 
              onClick={() => handleOpenEditModal()}
              className="flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Register {activeTab === 'students' ? 'Student' : 'Staff'}
            </button>
          )}

          {/* Academic Year Selection Dropdown */}
          <div className="relative w-64 group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <CalendarDays className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <select 
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-10 py-4 font-black text-[10px] text-slate-900 uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-200 transition-all appearance-none cursor-pointer card-shadow"
            >
              <option value="">Select Academic Year</option>
              <option value="Year 1">Year 1</option>
              <option value="Year 2">Year 2</option>
              <option value="Year 3">Year 3</option>
            </select>
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Access Control: Students cannot switch tabs */}
      {!isStudent && (
        <div className="flex p-2 bg-white rounded-[2rem] border border-slate-100 w-fit shadow-sm">
           <TabButton active={activeTab === 'students'} onClick={() => setActiveTab('students')} label="Student Ledger" icon={<Users className="w-4 h-4" />} />
           <TabButton active={activeTab === 'faculty'} onClick={() => setActiveTab('faculty')} label="Faculty Roster" icon={<Briefcase className="w-4 h-4" />} />
        </div>
      )}

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 card-shadow overflow-visible">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
             <input 
               type="text" 
               placeholder={`Search ${activeTab === 'students' ? 'students' : 'faculty'}...`} 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-bold"
             />
          </div>
        </div>

        <div className="mt-10 overflow-visible border border-slate-50 rounded-[2.5rem]">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="w-32 px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{activeTab === 'students' ? 'ROLL ID' : 'STAFF ID'}</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">IDENTITY DETAILS</th>
                <th className="w-56 px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'students' ? 'ACADEMIC PATHWAY' : 'DEPARTMENT'}</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">CREDENTIAL STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(activeTab === 'students' ? filteredStudents : filteredStaff).map((item: any) => (
                <tr 
                  key={item.id} 
                  className={`group ${isAdmin && activeTab === 'students' ? 'cursor-pointer hover:bg-slate-50/50' : 'hover:bg-slate-50/50'} transition-all duration-300`}
                  onClick={() => isAdmin && activeTab === 'students' && handleOpenEditModal(item)}
                >
                  <td className="px-8 py-6 font-mono text-xs font-bold text-slate-500 text-center">{item.rollNo || item.id?.toString().toUpperCase()}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform shadow-sm ${activeTab === 'students' ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'}`}>
                        {(item.name || "U").charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg tracking-tight leading-none mb-1.5">{item.name || "Unknown"}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.email || `${item.department} | ${item.section}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {activeTab === 'students' ? (
                       <span className="text-sm font-bold text-slate-600 tracking-tight">{item.department} | Sem {item.semester}</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-600 tracking-tight">{item.department}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.year || 'Global'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all min-w-[140px] text-center ${
                        activeTab === 'students' 
                          ? (item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100')
                          : 'bg-violet-50 text-violet-600 border-violet-100'
                      }`}>
                        {activeTab === 'students' ? item.status : 'AUTHORIZED ACCESS'}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => activeTab === 'students' ? handleDeleteStudent(item.id) : handleDeleteStaff(item.id)}
                          disabled={isSaving}
                          className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all disabled:opacity-50"
                          title={`Delete ${activeTab === 'students' ? 'student' : 'staff member'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(activeTab === 'students' ? filteredStudents : filteredStaff).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Users className="w-12 h-12 opacity-20" />
                      <p className="font-black uppercase tracking-[0.2em] text-xs">No records found for this criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal (Admin Only) */}
      {isEditModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500 max-h-[90vh] flex flex-col">
            <form onSubmit={handleSaveEdit} className="p-12 overflow-y-auto flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-10 sticky top-0 bg-white">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                    {activeTab === 'students' ? <Users className="w-8 h-8" /> : <Briefcase className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{editingItem ? 'Revise' : 'Initialize'} Identity</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Access Management</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-100 transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {!editingItem && activeTab === 'faculty' && Array.isArray(staff) && staff.length > 0 && (
                  <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">⚠️ Existing Staff Codes</p>
                    <div className="flex flex-wrap gap-2">
                      {staff.map((s) => (
                        <span key={s.id} className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                          {s.staffCode}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-amber-700 mt-3">Use a different code for the new staff member (e.g., STAFF002, STAFF003, etc.)</p>
                  </div>
                )}
                <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label><input required name="name" defaultValue={editingItem?.name || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                {activeTab === 'students' ? (
                  <>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Number</label><input required name="rollNumber" defaultValue={editingItem?.rollNo || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semester</label><select required name="semester" defaultValue={editingItem?.semester?.toString() || yearFilter || '1'} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label><select required name="section" defaultValue={editingItem?.section || 'A'} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="F">F</option><option value="G">G</option><option value="H">H</option></select></div>
                    <div className="space-y-3 md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label><input required name="class" defaultValue={editingItem?.department || (deptContext ? deptContext : 'Computer Science')} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    <div className="space-y-3 md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input type="email" name="email" defaultValue={editingItem?.email || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    <div className="space-y-3 md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input type="tel" name="phone" defaultValue={editingItem?.phone || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    {!editingItem && (
                      <div className="space-y-2 md:col-span-2 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">🔐 Login Credentials Auto-Generated</p>
                        <p className="text-sm text-indigo-700 font-semibold">Username: Student Name | Password: Roll Number</p>
                        <p className="text-xs text-indigo-600">Student can login with their name and roll number.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Code</label>
                      <input 
                        required 
                        name="staffCode" 
                        defaultValue={editingItem?.staffCode || ''} 
                        onChange={() => setStaffCodeError(null)}
                        className={`w-full bg-slate-50 border rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 transition-all ${
                          staffCodeError 
                            ? 'border-rose-300 focus:ring-rose-100' 
                            : 'border-slate-100 focus:ring-indigo-100'
                        }`}
                        placeholder="e.g., STAFF001" 
                        disabled={editingItem ? true : false}
                      />
                      {staffCodeError && (
                        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-rose-700">{staffCodeError}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Email</label><input required type="email" name="email" defaultValue={editingItem?.email || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    {!editingItem && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                        <input 
                          required 
                          type="password" 
                          name="password" 
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className={`w-full bg-slate-50 border rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 transition-all ${
                            passwordInput.length > 0 && passwordInput.length < 6
                              ? 'border-rose-300 focus:ring-rose-100'
                              : passwordInput.length >= 6
                              ? 'border-emerald-300 focus:ring-emerald-100'
                              : 'border-slate-100 focus:ring-indigo-100'
                          }`}
                          placeholder="Minimum 6 characters"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          {passwordInput.length === 0 ? (
                            <p className="text-[9px] text-slate-400">Required: at least 6 characters</p>
                          ) : passwordInput.length < 6 ? (
                            <>
                              <X className="w-4 h-4 text-rose-500 flex-shrink-0" />
                              <p className="text-[9px] text-rose-600 font-semibold">{6 - passwordInput.length} more characters needed</p>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <p className="text-[9px] text-emerald-600 font-semibold">Password is valid</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label><input required name="department" defaultValue={editingItem?.department || (deptContext ? deptContext : 'Computer Science')} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subjects</label><input name="subject" defaultValue={editingItem?.subject || ''} placeholder="e.g. Physics, Chemistry (Comma Separated)" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input type="tel" name="phone" defaultValue={editingItem?.phone || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qualification</label><input name="qualification" defaultValue={editingItem?.qualification || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Experience (Years)</label><input type="number" name="experience" defaultValue={editingItem?.experience || '0'} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100" /></div>
                  </>
                )}
              </div>
              <div className="mt-12 flex gap-4 sticky bottom-0 bg-white pt-6 border-t border-slate-100"><button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 border border-slate-100 transition-all disabled:opacity-50" disabled={isSaving}>Cancel</button><button type="submit" disabled={isSaving} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">{isSaving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {isSaving ? 'Saving...' : 'Synchronize Identity'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-10 py-5 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-105' : 'text-slate-400 hover:text-indigo-600'}`}>{icon}{label}</button>
);

export default StudentManagement;
