package com.attendance.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.attendance.model.SessionAttendance;


public interface SessionAttendanceRepository extends JpaRepository<SessionAttendance, Long> {

	List<SessionAttendance> findByStudentId(Long studentId);

    /** Count all attendance records for a student (avoids lazy-load entity graph issues) */
    @Query("SELECT COUNT(sa) FROM SessionAttendance sa WHERE sa.student.id = :studentId")
    long countTotalByStudentId(@Param("studentId") Long studentId);

    /** Count PRESENT + OD attendance records for a student */
    @Query("SELECT COUNT(sa) FROM SessionAttendance sa WHERE sa.student.id = :studentId AND (sa.status = com.attendance.model.AttendanceStatus.PRESENT OR sa.status = com.attendance.model.AttendanceStatus.OD)")
    long countPresentByStudentId(@Param("studentId") Long studentId);

	List<SessionAttendance> findByTimetableSessionId(Long sessionId);

	List<SessionAttendance> findByTimetableSessionSubjectId(Long subjectId);

	List<SessionAttendance> findByDate(LocalDate date);

	List<SessionAttendance> findByDateBetween(LocalDate from, LocalDate to);
	
	@Query("SELECT sa FROM SessionAttendance sa WHERE sa.student.id = :studentId AND sa.timetableSession.id = :sessionId AND sa.date = :date")
	Optional<SessionAttendance>
	findByStudentIdAndTimetableSessionIdAndDate(
	    @Param("studentId") Long studentId,
	    @Param("sessionId") Long sessionId,
	    @Param("date") LocalDate date
	);
	
	// Additional queries for statistics
	@Query("SELECT COALESCE(sub.subjectName, 'Unknown Subject'), " +
		   "SUM(CASE WHEN sa.status = 'PRESENT' OR sa.status = 'OD' THEN 1 ELSE 0 END), " +
		   "COUNT(sa) " +
		   "FROM SessionAttendance sa " +
		   "JOIN sa.timetableSession ts " +
		   "LEFT JOIN ts.subject sub " +
		   "WHERE sa.student.id = :studentId " +
		   "GROUP BY sub.id, sub.subjectName")
	List<Object[]> findAttendanceByStudentGroupedBySubject(@Param("studentId") Long studentId);
	
		    @Query("SELECT AVG(CAST(SUM(CASE WHEN sa.status IN ('PRESENT','OD') THEN 1 ELSE 0 END) AS double) * 100.0 / COUNT(sa)) " +
	       "FROM SessionAttendance sa GROUP BY sa.student.id")
	Double calculateOverallAttendancePercentage();
	
		    @Query("SELECT AVG(CAST(SUM(CASE WHEN sa.status IN ('PRESENT','OD') THEN 1 ELSE 0 END) AS double) * 100.0 / COUNT(sa)) " +
	       "FROM SessionAttendance sa " +
	       "JOIN sa.timetableSession ts " +
	       "WHERE ts.department = :department AND ts.semester = :semester " +
	       "GROUP BY sa.student.id")
	Double calculateAverageAttendanceByDepartmentAndSemester(
	        @Param("department") String department, 
	        @Param("semester") int semester);

		    @Query("SELECT AVG(CAST(SUM(CASE WHEN sa.status IN ('PRESENT','OD') THEN 1 ELSE 0 END) AS double) * 100.0 / COUNT(sa)) " +
		     "FROM SessionAttendance sa " +
		     "JOIN sa.timetableSession ts " +
		     "WHERE ts.department = :department " +
		     "GROUP BY sa.student.id")
	    Double calculateAverageAttendanceByDepartment(@Param("department") String department);
	    
	    /**
	     * Simple fallback: Get average attendance without complex grouping
	     * Returns simple average across all attendance records for a department-semester
	     */
	    @Query("SELECT AVG(CASE WHEN sa.status IN ('PRESENT','OD') THEN 100.0 ELSE 0.0 END) " +
	           "FROM SessionAttendance sa " +
	           "JOIN sa.timetableSession ts " +
	           "WHERE ts.department = :department AND ts.semester = :semester")
	    Double getSimpleAverageAttendance(
	            @Param("department") String department,
	            @Param("semester") int semester);

	    /**
	     * Check if attendance already marked for a session
	     * Fixed to properly access subject.id through relationship
	     */
	    @Query("SELECT CASE WHEN COUNT(sa) > 0 THEN true ELSE false END " +
	           "FROM SessionAttendance sa " +
	           "WHERE sa.timetableSession.subject.id = :subjectId " +
	           "AND sa.date = :date " +
	           "AND sa.timetableSession.startTime = :sessionTime")
	    boolean existsByTimetableSessionSubjectIdAndDateAndTimetableSessionStartTime(
	            @Param("subjectId") Long subjectId,
	            @Param("date") LocalDate date,
	            @Param("sessionTime") LocalTime sessionTime);

}
