package com.attendance.security;

import com.attendance.model.Student;
import com.attendance.model.User;
import com.attendance.repository.StudentRepository;
import com.attendance.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initUsers(
            UserRepository userRepository,
            StudentRepository studentRepository,
            PasswordEncoder encoder) {

        return args -> {

            // Seed baseline users if the user table is empty
            if (userRepository.count() == 0) {

                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(encoder.encode("admin123"));
                admin.setRole("ROLE_ADMIN");

                User staff = new User();
                staff.setUsername("staff");
                staff.setPassword(encoder.encode("staff123"));
                staff.setRole("ROLE_STAFF");

                User student = new User();
                student.setUsername("student");
                student.setPassword(encoder.encode("student123"));
                student.setRole("ROLE_STUDENT");

                userRepository.save(admin);
                userRepository.save(staff);
                userRepository.save(student);

                createDefaultStudentProfile(studentRepository, student);
            }

            // If user already exists but no student profile exists, create a basic profile.
            userRepository.findByUsername("student").ifPresent(studentUser -> {
                boolean hasProfile = studentRepository.findByUserId(studentUser.getId()).isPresent();
                if (!hasProfile) {
                    createDefaultStudentProfile(studentRepository, studentUser);
                }
            });
        };
    }

    private void createDefaultStudentProfile(StudentRepository studentRepository, User studentUser) {
        Student studentProfile = new Student();
        studentProfile.setRollNo("CS2024001");
        studentProfile.setName("Student User");
        studentProfile.setDepartment("Computer Science");
        studentProfile.setSemester(1);
        studentProfile.setEmail("student@attendx.edu");
        studentProfile.setPhone("0000000000");
        studentProfile.setSection("A");
        studentProfile.setUser(studentUser);

        studentRepository.save(studentProfile);
    }
}
