package com.attendance.controller;

import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.attendance.model.TimetableSession;
import com.attendance.repository.TimetableSessionRepository;
import com.attendance.dto.ApiResponse;

import com.attendance.model.Subject;
import com.attendance.model.Staff;
import com.attendance.repository.SubjectRepository;
import com.attendance.repository.StaffRepository;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin/timetable")
public class TimetableController {

    private final TimetableSessionRepository repo;
    private final SubjectRepository subjectRepo;
    private final StaffRepository staffRepo;

    public TimetableController(TimetableSessionRepository repo, SubjectRepository subjectRepo, StaffRepository staffRepo) {
        this.repo = repo;
        this.subjectRepo = subjectRepo;
        this.staffRepo = staffRepo;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<TimetableSession>> create(@RequestBody TimetableSession session) {
        // Check if session for this class/day/period already exists
        List<TimetableSession> existingSessions = repo.findByDepartmentAndSemesterAndSectionAndDayOfWeekAndSessionNumber(
            session.getDepartment(), session.getSemester(), session.getSection(), session.getDayOfWeek(), session.getSessionNumber()
        );

        TimetableSession existingSession = existingSessions.isEmpty() ? null : existingSessions.get(0);
        TimetableSession targetSession = (existingSession != null) ? existingSession : session;
        
        // Update fields if it's an existing session
        if (existingSession != null) {
            targetSession.setStartTime(session.getStartTime());
            targetSession.setEndTime(session.getEndTime());
            targetSession.setSubjectId(session.getSubjectId());
            targetSession.setFacultyId(session.getFacultyId());
            targetSession.setRoomNumber(session.getRoomNumber());
            // Clear existing relations to re-resolve them
            targetSession.setSubject(null);
            targetSession.setStaff(null);
        }

        // Resolve Subject entity if subjectCode is provided
        if (session.getSubjectId() != null && !session.getSubjectId().isEmpty()) {
            subjectRepo.findBySubjectCode(session.getSubjectId()).ifPresent(subject -> {
                targetSession.setSubject(subject);
                
                // Automatically assign the first staff member mapped to this subject if no explicit staff is provided
                if (session.getFacultyId() == null && subject.getStaff() != null && !subject.getStaff().isEmpty()) {
                    targetSession.setStaff(subject.getStaff().get(0));
                }
            });
        }
        
        // Resolve Staff entity explicitly if staffCode/facultyId is provided
        if (session.getFacultyId() != null && !session.getFacultyId().isEmpty()) {
            staffRepo.findByStaffCode(session.getFacultyId()).ifPresent(targetSession::setStaff);
        }

        TimetableSession saved = repo.save(targetSession);
        return ResponseEntity.ok(ApiResponse.success(existingSession != null ? "Timetable session updated" : "Timetable session created", saved));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<TimetableSession>>> getAll() {
        List<TimetableSession> sessions = repo.findAllWithDetails();
        return ResponseEntity.ok(ApiResponse.success(sessions));
    }

    @GetMapping("/all/clear")
    public ResponseEntity<ApiResponse<String>> deleteAll() {
        repo.deleteAll();
        return ResponseEntity.ok(ApiResponse.success("All timetable sessions wiped. Database is clean. Please close this tab and return to AttendX."));
    }
}