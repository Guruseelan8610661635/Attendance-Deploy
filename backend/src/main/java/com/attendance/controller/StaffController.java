package com.attendance.controller;

import java.util.List;
import java.util.ArrayList;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.attendance.dto.ApiResponse;
import com.attendance.dto.StaffRegistrationDTO;
import com.attendance.model.Staff;
import com.attendance.model.Subject;
import com.attendance.model.TimetableSession;
import com.attendance.model.User;
import com.attendance.repository.StaffRepository;
import com.attendance.repository.SubjectRepository;
import com.attendance.repository.TimetableSessionRepository;
import com.attendance.repository.UserRepository;
import com.attendance.service.StaffService;
import com.attendance.exception.ResourceNotFoundException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/staff")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3007", "http://localhost:5173"})
@PreAuthorize("hasRole('ADMIN')")
public class StaffController {

    private final StaffRepository staffRepo;
    private final UserRepository userRepo;
    private final SubjectRepository subjectRepo;
    private final TimetableSessionRepository timetableRepo;
    private final PasswordEncoder passwordEncoder;
    private final StaffService staffService;

    public StaffController(StaffRepository staffRepo, UserRepository userRepo, SubjectRepository subjectRepo, 
                          TimetableSessionRepository timetableRepo, PasswordEncoder passwordEncoder, StaffService staffService) {
        this.staffRepo = staffRepo;
        this.userRepo = userRepo;
        this.subjectRepo = subjectRepo;
        this.timetableRepo = timetableRepo;
        this.passwordEncoder = passwordEncoder;
        this.staffService = staffService;
    }

    /**
     * Register a new staff member with automatic user account creation
     * POST /api/admin/staff/register
     * 
     * ALSO ASSIGNS STAFF TO TIMETABLE SESSIONS FOR THEIR SUBJECT
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Staff>> registerStaff(@Valid @RequestBody StaffRegistrationDTO dto) {
        try {
            // Check if user already exists
            if (userRepo.findByUsernameIgnoreCase(dto.getEmail()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("User with this email already exists"));
            }
            
            // Check if staff code is already used
            if (staffRepo.findByStaffCode(dto.getStaffCode()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Staff code already in use"));
            }
            
            // Create new User
            User user = new User();
            user.setUsername(dto.getEmail());
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
            user.setRole("ROLE_STAFF"); // Role with ROLE_ prefix
            user.setEnabled(true);
            User savedUser = userRepo.save(user);
            
            // Create new Staff with the created User
            Staff staff = new Staff();
            staff.setStaffCode(dto.getStaffCode());
            staff.setName(dto.getName());
            staff.setDepartment(dto.getDepartment());
            // Collect subjects list and set comma separated legacy string
            if (dto.getSubjects() != null && !dto.getSubjects().isEmpty()) {
                String combinedSubjects = String.join(", ", dto.getSubjects());
                staff.setSubject(combinedSubjects.length() > 100 ? combinedSubjects.substring(0, 97) + "..." : combinedSubjects);
            }
            
            staff.setPhone(dto.getPhone());
            staff.setQualification(dto.getQualification());
            staff.setExperience(dto.getExperience());
            staff.setUser(savedUser);
            staff.setActive(true);
            
            // AUTO-POPULATE staff_subjects table for all provided subjects
            if (dto.getSubjects() != null && !dto.getSubjects().isEmpty()) {
                List<Subject> subjectsList = new ArrayList<>();
                for (String subjName : dto.getSubjects()) {
                    if (subjName == null || subjName.isBlank()) continue;
                    String sanitizedName = subjName.trim();
                    Subject subject = subjectRepo.findBySubjectName(sanitizedName)
                        .orElseGet(() -> {
                            // Create new subject if it doesn't exist
                            Subject newSubject = new Subject();
                            newSubject.setSubjectName(sanitizedName);
                            newSubject.setSubjectCode(generateSubjectCode(sanitizedName));
                            newSubject.setDepartment(dto.getDepartment());
                            newSubject.setSemester(1); // Default semester
                            newSubject.setCredits(4); // Default credits
                            return subjectRepo.save(newSubject);
                        });
                    subjectsList.add(subject);
                }
                staff.setSubjects(subjectsList);
            }
            
            Staff savedStaff = staffRepo.save(staff);
            
            // AUTO-ASSIGN STAFF TO TIMETABLE SESSIONS FOR THEIR SUBJECT
            assignStaffToTimetableSessions(savedStaff);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Staff registered successfully with timetable assignment", savedStaff));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to register staff: " + e.getMessage()));
        }
    }
    
    /**
     * Assign staff to all timetable sessions that teach their subject
     * This creates a bidirectional sync between Staff-Subject-TimetableSession
     */
    private void assignStaffToTimetableSessions(Staff staff) {
        try {
            // If staff has subjects, find and assign them to matching timetable sessions
            if (staff.getSubjects() != null && !staff.getSubjects().isEmpty()) {
                long totalAssigned = 0;
                
                for (Subject subject : staff.getSubjects()) {
                    System.out.println("🔗 Processing subject '" + subject.getSubjectName() + "' (ID=" + subject.getId() + ") for staff: " + staff.getName());
                    
                    // Find all ACTIVE timetable sessions for this subject (regardless of current staff assignment)
                    List<TimetableSession> sessionsForSubject = timetableRepo.findBySubjectIdAndActiveTrue(subject.getId());
                    
                    System.out.println("📚 Found " + sessionsForSubject.size() + " active sessions for subject: " + subject.getSubjectName());
                    
                    // Assign staff to those sessions
                    for (TimetableSession session : sessionsForSubject) {
                        // IMPORTANT: Assign staff even if another staff was assigned before
                        // This ensures the most recently registered staff for a subject gets the sessions
                        Long previousStaffId = session.getStaff() != null ? session.getStaff().getId() : null;
                        
                        session.setStaff(staff);
                        session.setFacultyId(String.valueOf(staff.getId())); // Update transient field
                        session.setFacultyName(staff.getName()); // Update transient field
                        
                        TimetableSession saved = timetableRepo.save(session);
                        totalAssigned++;
                        
                        if (previousStaffId != null && !previousStaffId.equals(staff.getId())) {
                            System.out.println("  ✅ Updated session ID=" + session.getId() + ": Assigned from Staff(ID=" + previousStaffId + ") → Staff(ID=" + staff.getId() + ") " + staff.getName());
                        } else {
                            System.out.println("  ✅ Assigned session ID=" + session.getId() + " to " + staff.getName() + " (" + session.getDayOfWeek() + " " + session.getStartTime() + ")");
                        }
                    }
                    
                    System.out.println("✅ Total assignments for subject '" + subject.getSubjectName() + "': " + sessionsForSubject.size());
                }
                
                System.out.println("✅ Staff '" + staff.getName() + "' (ID=" + staff.getId() + ") now has access to " + totalAssigned + " total timetable sessions");
            } else {
                System.out.println("⚠️ Staff '" + staff.getName() + "' has no subjects assigned yet");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Warning: Could not auto-assign staff to timetable sessions: " + e.getMessage());
            e.printStackTrace();
            // Don't fail the registration if assignment fails
        }
    }

    /**
     * Generate subject code from subject name
     * Example: "Data Structures" -> "DS101"
     */
    private String generateSubjectCode(String subjectName) {
        if (subjectName == null || subjectName.isBlank()) {
            return "SUB" + System.currentTimeMillis() % 1000;
        }
        
        // Take first letters of each word
        String[] words = subjectName.trim().split("\\s+");
        StringBuilder code = new StringBuilder();
        
        for (String word : words) {
            if (!word.isEmpty()) {
                code.append(word.charAt(0));
            }
        }
        
        // Add random number to make it unique
        code.append(String.format("%03d", (int)(Math.random() * 1000)));
        
        return code.toString().toUpperCase();
    }

    /**
     * Get all staff members
     * GET /api/admin/staff
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Staff>>> all() {
        return ResponseEntity.ok(ApiResponse.success(staffRepo.findAll()));
    }

    /**
     * Create staff directly (legacy endpoint - requires existing user)
     * POST /api/admin/staff
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Staff>> add(@RequestBody Staff staff) {
        Staff saved = staffRepo.save(staff);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Staff created successfully", saved));
    }

    /**
     * Get staff by ID
     * GET /api/admin/staff/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Staff>> getById(@PathVariable Long id) {
        return staffRepo.findById(id)
                .map(staff -> ResponseEntity.ok(ApiResponse.success(staff)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update staff
     * PUT /api/admin/staff/{id}
     * 
     * ALSO SYNCS TIMETABLE SESSION ASSIGNMENTS
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Staff>> update(@PathVariable Long id, @RequestBody Staff staffUpdates) {
        return staffRepo.findById(id)
                .map(staff -> {
                    staff.setName(staffUpdates.getName());
                    staff.setDepartment(staffUpdates.getDepartment());
                    staff.setSubject(staffUpdates.getSubject());
                    staff.setPhone(staffUpdates.getPhone());
                    staff.setQualification(staffUpdates.getQualification());
                    staff.setExperience(staffUpdates.getExperience());
                    
                    // AUTO-UPDATE staff_subjects table if subject changed
                    if (staffUpdates.getSubject() != null && !staffUpdates.getSubject().isBlank()) {
                        String[] subjArray = staffUpdates.getSubject().split(",");
                        List<Subject> subjectsList = new ArrayList<>();
                        for (String subjStr : subjArray) {
                            String subjectName = subjStr.trim();
                            if (subjectName.isEmpty()) continue;
                            Subject subject = subjectRepo.findBySubjectName(subjectName)
                                .orElseGet(() -> {
                                    // Create new subject if it doesn't exist
                                    Subject newSubject = new Subject();
                                    newSubject.setSubjectName(subjectName);
                                    newSubject.setSubjectCode(generateSubjectCode(subjectName));
                                    newSubject.setDepartment(staffUpdates.getDepartment());
                                    newSubject.setSemester(1); // Default semester
                                    newSubject.setCredits(4); // Default credits
                                    return subjectRepo.save(newSubject);
                                });
                            subjectsList.add(subject);
                        }
                        staff.setSubjects(subjectsList);
                    }
                    
                    Staff updated = staffRepo.save(staff);
                    
                    // AUTO-ASSIGN TO TIMETABLE SESSIONS
                    assignStaffToTimetableSessions(updated);
                    
                    return ResponseEntity.ok(ApiResponse.success("Staff updated successfully with timetable sync", updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Disable staff member
     * PUT /api/admin/staff/{id}/disable
     */
    @PutMapping("/{id}/disable")
    public ResponseEntity<ApiResponse<Void>> disable(@PathVariable Long id) {
        return staffRepo.findById(id)
                .map(staff -> {
                    staff.setActive(false);
                    staffRepo.save(staff);
                    return ResponseEntity.ok(ApiResponse.<Void>success("Staff disabled successfully", null));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete staff member
     * DELETE /api/admin/staff/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        try {
            staffService.delete(id);
            return ResponseEntity.ok(ApiResponse.<Void>success("Staff deleted successfully", null));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to delete staff: " + e.getMessage()));
        }
    }
}

