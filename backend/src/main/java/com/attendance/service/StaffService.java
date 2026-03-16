package com.attendance.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.attendance.exception.ResourceNotFoundException;
import com.attendance.model.Staff;
import com.attendance.model.User;
import com.attendance.repository.StaffRepository;
import com.attendance.repository.UserRepository;

import com.attendance.repository.TimetableSessionRepository;

@Service
@Transactional
public class StaffService {

    private final StaffRepository staffRepository;
    private final UserRepository userRepository;
    private final TimetableSessionRepository timetableSessionRepository;

    public StaffService(StaffRepository staffRepository, UserRepository userRepository,
                        TimetableSessionRepository timetableSessionRepository) {
        this.staffRepository = staffRepository;
        this.userRepository = userRepository;
        this.timetableSessionRepository = timetableSessionRepository;
    }

    public Staff save(Staff staff) {
        return staffRepository.save(staff);
    }

    public List<Staff> getAll() {
        return staffRepository.findAll();
    }

    public Staff getById(Long id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", "id", id));
    }

    public Staff update(Long id, Staff staff) {
        Staff existing = getById(id);
        existing.setName(staff.getName());
        existing.setDepartment(staff.getDepartment());
        existing.setActive(staff.isActive());
        return staffRepository.save(existing);
    }

    public void disable(Long id) {
        Staff staff = getById(id);
        staff.setActive(false);
        staffRepository.save(staff);
    }

    public void delete(Long id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff", "id", id));
        
        // Remove this staff from any associated timetable sessions to prevent foreign key constraint violations
        timetableSessionRepository.removeStaffFromAllSessions(id);
        
        // Clear the staff_subjects join table entries to prevent FK constraint violations
        if (staff.getSubjects() != null) {
            staff.getSubjects().clear();
        }
        staffRepository.save(staff);
        staffRepository.flush();
        
        // Get the associated user before deleting staff
        User associatedUser = staff.getUser();
        
        // Delete the staff record
        staffRepository.deleteById(id);
        
        // Then delete the associated user if it exists
        if (associatedUser != null) {
            userRepository.deleteById(associatedUser.getId());
        }
    }
}
