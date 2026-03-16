package com.attendance.controller;

import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.attendance.model.SessionAttendance;
import com.attendance.service.AttendanceReportService;
import com.attendance.service.ReportService;
import com.attendance.dto.ApiResponse;
import com.attendance.dto.AttendanceReportDTO;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3003", "http://localhost:3007", "http://localhost:5173"})
public class AttendanceReportController {

    private final AttendanceReportService service;
    private final ReportService reportService;

    public AttendanceReportController(AttendanceReportService service, ReportService reportService) {
        this.service = service;
        this.reportService = reportService;
    }

    @GetMapping("/daily")
    public ResponseEntity<?> daily(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer year) {
        
        // If it's a single date query (legacy format)
        if (date != null && department == null && year == null) {
            List<SessionAttendance> result = service.daily(LocalDate.parse(date));
            return ResponseEntity.ok(ApiResponse.success(result));
        }
        
        // If date is provided with filters or new format
        if (date != null) {
            LocalDate targetDate = LocalDate.parse(date);
            List<AttendanceReportDTO> report = reportService.getDailyReport(targetDate, department, year);
            return ResponseEntity.ok(ApiResponse.success(report));
        }
        
        return ResponseEntity.badRequest().body(ApiResponse.error("Date parameter is required"));
    }

    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<List<SessionAttendance>>> monthly(
            @RequestParam int year,
            @RequestParam int month) {
        List<SessionAttendance> result = service.monthly(year, month);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/semester")
    public ResponseEntity<ApiResponse<List<SessionAttendance>>> semester(
            @RequestParam String from,
            @RequestParam String to) {
        List<SessionAttendance> result = service.semester(
                LocalDate.parse(from),
                LocalDate.parse(to));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<ApiResponse<List<SessionAttendance>>> subject(@PathVariable Long subjectId) {
        List<SessionAttendance> result = service.subject(subjectId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<ApiResponse<List<SessionAttendance>>> session(@PathVariable Long sessionId) {
        List<SessionAttendance> result = service.session(sessionId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    @GetMapping("/percentage/subject")
    public ResponseEntity<ApiResponse<Double>> subjectPercentage(
            @RequestParam Long studentId,
            @RequestParam Long subjectId) {
        double result = service.subjectPercentage(studentId, subjectId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/percentage/semester")
    public ResponseEntity<ApiResponse<Double>> semesterPercentage(
            @RequestParam Long studentId,
            @RequestParam String from,
            @RequestParam String to) {
        double result = service.semesterPercentage(
            studentId,
            LocalDate.parse(from),
            LocalDate.parse(to)
        );
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * GET /api/reports/periodic
     * Generate periodic (date range) attendance report
     * 
     * @param fromDate Start date (YYYY-MM-DD format)
     * @param toDate End date (YYYY-MM-DD format)
     * @param department Optional department filter
     * @param year Optional year filter (1, 2, or 3)
     */
    @GetMapping("/periodic")
    public ResponseEntity<ApiResponse<List<AttendanceReportDTO>>> getPeriodicReport(
            @RequestParam String fromDate,
            @RequestParam String toDate,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer year) {
        
        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to = LocalDate.parse(toDate);
        List<AttendanceReportDTO> report = reportService.getPeriodicReport(from, to, department, year);
        
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    /**
     * GET /api/reports/semester-wise
     * Generate semester-wise attendance report
     * 
     * @param department Optional department filter
     * @param year Optional year filter (1, 2, or 3)
     * @param semester Optional semester filter (1-6)
     */
    @GetMapping("/semester-wise")
    public ResponseEntity<ApiResponse<List<AttendanceReportDTO>>> getSemesterReport(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer semester) {
        
        List<AttendanceReportDTO> report = reportService.getSemesterReport(department, year, semester);
        
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    /**
     * GET /api/reports/student/{rollNumber}
     * Generate attendance report for a specific student
     * 
     * @param rollNumber Student roll number
     * @param fromDate Optional start date filter
     * @param toDate Optional end date filter
     */
    @GetMapping("/student/{rollNumber}")
    @SuppressWarnings("unchecked")
    public ResponseEntity getStudentReport(
            @PathVariable String rollNumber,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        try {
            LocalDate from = fromDate != null ? LocalDate.parse(fromDate) : null;
            LocalDate to = toDate != null ? LocalDate.parse(toDate) : null;
            AttendanceReportDTO report = reportService.getStudentReport(rollNumber, from, to);
            
            if (report == null) {
                return ResponseEntity.status(404).body(ApiResponse.error("Student not found: " + rollNumber));
            }
            
            return ResponseEntity.ok(ApiResponse.success(report));
        } catch (Exception e) {
            String msg = e.getClass().getSimpleName() + ": " + e.getMessage();
            System.err.println("\uD83D\uDD34 Student report error for '" + rollNumber + "': " + msg);
            e.printStackTrace();
            return ResponseEntity.status(500).body(ApiResponse.error("Report error: " + msg));
        }
    }

}