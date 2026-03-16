package com.attendance.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.attendance.model.TimetableSession;
import com.attendance.model.Staff;

public interface TimetableSessionRepository
        extends JpaRepository<TimetableSession, Long> {

    // 🔹 Fetch ALL sessions with subject + staff eagerly loaded
    @Query("SELECT ts FROM TimetableSession ts " +
           "LEFT JOIN FETCH ts.subject " +
           "LEFT JOIN FETCH ts.staff")
    List<TimetableSession> findAllWithDetails();

    // 🔹 Pending attendance sessions for a given date
    @Query("""
        SELECT t FROM TimetableSession t
        WHERE t.id NOT IN (
            SELECT a.timetableSession.id
            FROM SessionAttendance a
            WHERE a.date = :today
        )
    """)
    List<TimetableSession> findPendingSessions(
            @Param("today") LocalDate today);
    
    // Additional methods for service layer
    List<TimetableSession> findByDepartmentAndSemesterAndActiveTrue(String department, int semester);
    
    List<TimetableSession> findByDepartmentAndSemesterAndDayOfWeekAndActiveTrue(
            String department, int semester, String dayOfWeek);
            
    java.util.List<com.attendance.model.TimetableSession> findByDepartmentAndSemesterAndSectionAndDayOfWeekAndSessionNumber(
            String department, int semester, String section, String dayOfWeek, Integer sessionNumber);
    
    // Case-insensitive day of week query
    @Query("SELECT ts FROM TimetableSession ts WHERE ts.department = :department " +
           "AND ts.semester = :semester AND LOWER(ts.dayOfWeek) = LOWER(:dayOfWeek) " +
           "AND ts.active = true ORDER BY ts.startTime")
    List<TimetableSession> findByDepartmentAndSemesterAndDayOfWeekIgnoreCaseAndActiveTrue(
            @Param("department") String department, 
            @Param("semester") int semester, 
            @Param("dayOfWeek") String dayOfWeek);
    
    // Case-insensitive day of week query with section filter
    @Query("SELECT ts FROM TimetableSession ts WHERE ts.department = :department " +
           "AND ts.semester = :semester AND ts.section = :section " +
           "AND LOWER(ts.dayOfWeek) = LOWER(:dayOfWeek) " +
           "AND ts.active = true ORDER BY ts.startTime")
    List<TimetableSession> findByDepartmentAndSemesterAndSectionAndDayOfWeekIgnoreCaseAndActiveTrue(
            @Param("department") String department, 
            @Param("semester") int semester,
            @Param("section") String section,
            @Param("dayOfWeek") String dayOfWeek);
    
    List<TimetableSession> findByStaffAndDayOfWeekAndActiveTrue(Staff staff, String dayOfWeek);
    
    // Find all active sessions by staff ID with eager loading of subject and staff
    @Query("SELECT ts FROM TimetableSession ts " +
           "LEFT JOIN FETCH ts.subject " +
           "LEFT JOIN FETCH ts.staff " +
           "LEFT JOIN FETCH ts.classEntity " +
           "WHERE ts.staff.id = :staffId AND ts.active = true")
    List<TimetableSession> findByStaffIdAndActiveTrue(@Param("staffId") Long staffId);
    
    // Find sessions by subject (for dependency checking)
    List<TimetableSession> findBySubjectAndActiveTrue(com.attendance.model.Subject subject);
    
    // Find today's sessions for a staff member with eager loading of subject and staff
    @Query("SELECT ts FROM TimetableSession ts " +
           "LEFT JOIN FETCH ts.subject " +
           "LEFT JOIN FETCH ts.staff " +
           "LEFT JOIN FETCH ts.classEntity " +
           "WHERE ts.staff.id = :staffId " +
           "AND LOWER(ts.dayOfWeek) = LOWER(:dayOfWeek) " +
           "AND ts.active = true " +
           "ORDER BY ts.startTime")
    List<TimetableSession> findByFacultyIdAndDayOfWeekAndIsActiveTrue(
            @Param("staffId") Long staffId, @Param("dayOfWeek") String dayOfWeek);
    
    // Find sessions by subject ID for staff assignment
    List<TimetableSession> findBySubjectIdAndActiveTrue(Long subjectId);
    
    List<TimetableSession> findByActiveTrue();
    
    // Staff-specific queries for cascading filters
    List<TimetableSession> findByDepartmentAndActiveTrue(String department);
    
    List<TimetableSession> findByDepartmentAndSemesterAndSectionAndActiveTrue(
            String department, int semester, String section);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE TimetableSession t SET t.staff = null WHERE t.staff.id = :staffId")
    void removeStaffFromAllSessions(@Param("staffId") Long staffId);
}
