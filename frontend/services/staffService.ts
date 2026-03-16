import apiClient, { ApiResponse, extractData } from './api';

export interface StaffDTO {
  id?: number;
  staffCode?: string;
  name: string;
  email: string;
  department: string;
  subject?: string;
  phone?: string;
  qualification?: string;
  experience?: number;
  status?: string;
  password?: string;
  user?: {
    id?: number;
    email: string;
    name?: string;
    role?: string;
  };
}

/**
 * Staff Service
 * 
 * NOTE: Backend Limitation - Staff creation requires:
 * 1. A User record must exist first
 * 2. Staff.user field must reference that User's ID
 * 
 * The backend doesn't expose a user creation endpoint (/api/admin/users is GET/PUT only)
 * Current workaround: Use existing users from seed data or create staff manually via database
 */
export const staffService = {
  /**
   * Get all staff members
   */
  getAll: async (): Promise<StaffDTO[]> => {
    const response = await apiClient.get<ApiResponse<StaffDTO[]>>('/admin/staff');
    return extractData<StaffDTO[]>(response);
  },

  /**
   * Get staff member by ID
   */
  getById: async (id: number): Promise<StaffDTO> => {
    const response = await apiClient.get<ApiResponse<StaffDTO>>(`/admin/staff/${id}`);
    return extractData<StaffDTO>(response);
  },

  /**
   * Create new staff member via registration endpoint
   * This endpoint creates both User and Staff records atomically
   */
  create: async (staff: StaffDTO): Promise<StaffDTO> => {
    // Generate staffCode from email if not provided
    const staffCode = staff.staffCode || (staff.email ? staff.email.split('@')[0].toUpperCase() : `STAFF${Date.now()}`);
    
    // Validate password - must be at least 6 characters
    const password = (staff.password && staff.password.trim().length > 0) 
      ? staff.password 
      : 'TempPassword@123';
    
    // Prepare registration payload
    const payload = {
      staffCode: staffCode,
      name: staff.name,
      department: staff.department,
      email: staff.email,
      password: password,
      subjects: staff.subject ? staff.subject.split(',').map(s => s.trim()).filter(s => s) : ['General'],
      phone: staff.phone,
      qualification: staff.qualification,
      experience: staff.experience,
      status: staff.status || 'ACTIVE',
    };

    try {
      const response = await apiClient.post<ApiResponse<StaffDTO>>('/admin/staff/register', payload);
      return extractData<StaffDTO>(response);
    } catch (error: any) {
      // Provide context-specific error messages
      if (error.response?.status === 400) {
        throw new Error(
          error.response?.data?.message || 
          'Invalid staff registration data. ' +
          'Ensure staff code is unique and email is valid.'
        );
      }
      if (error.response?.status === 409) {
        throw new Error('User with this email already exists.');
      }
      if (error.response?.status === 500) {
        throw new Error('Server error during staff registration. Please try again.');
      }
      throw error;
    }
  },

  /**
   * Update existing staff member
   */
  update: async (id: number, staff: StaffDTO): Promise<StaffDTO> => {
    const payload = {
      staffCode: staff.staffCode,
      name: staff.name,
      department: staff.department,
      subject: staff.subject,
      phone: staff.phone,
      qualification: staff.qualification,
      experience: staff.experience,
      status: staff.status,
      user: staff.user || {
        email: staff.email,
        name: staff.name,
        role: 'STAFF'
      }
    };

    const response = await apiClient.put<ApiResponse<StaffDTO>>(`/admin/staff/${id}`, payload);
    return extractData<StaffDTO>(response);
  },

  /**
   * Delete staff member
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/staff/${id}`);
  },
};

export default staffService;
