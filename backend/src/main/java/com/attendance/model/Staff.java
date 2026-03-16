package com.attendance.model;

import java.util.List;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "staff")
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String staffCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String department;

    @Column(length = 100)
    private String subject;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String qualification;

    private Integer experience;

    // One staff has one login user
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    // One staff can handle multiple subjects
    @ManyToMany
    @JoinTable(
        name = "staff_subjects",
        joinColumns = @JoinColumn(name = "staff_id"),
        inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    @JsonIgnore
    private List<Subject> subjects;

    private boolean active = true;


    public Staff() {
    }

    public Staff(String staffCode, String name, String department, User user) {
        this.staffCode = staffCode;
        this.name = name;
        this.department = department;
        this.user = user;
    }


    public Long getId() {
        return id;
    }

    public String getStaffCode() {
        return staffCode;
    }

    public void setStaffCode(String staffCode) {
        this.staffCode = staffCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getQualification() {
        return qualification;
    }

    public void setQualification(String qualification) {
        this.qualification = qualification;
    }

    public Integer getExperience() {
        return experience;
    }

    public void setExperience(Integer experience) {
        this.experience = experience;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public List<Subject> getSubjects() {
        return subjects;
    }

    public void setSubjects(List<Subject> subjects) {
        this.subjects = subjects;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    // Additional getters for DTO mapping
    public String getEmail() {
        return user != null ? user.getUsername() : null;
    }

    public String getSubject() {
        if (subjects != null && !subjects.isEmpty()) {
            java.util.StringJoiner joiner = new java.util.StringJoiner(", ");
            for (Subject s : subjects) {
                joiner.add(s.getSubjectName());
            }
            return joiner.toString();
        }
        return subject;
    }

    public String getEmployeeCode() {
        return staffCode;
    }

    public String getEmployeeId() {
        return staffCode;
    }

    public String getDesignation() {
        return "Professor"; // Default designation
    }

    public String getAssignedClasses() {
        return department; // Simplified for now
    }
}
