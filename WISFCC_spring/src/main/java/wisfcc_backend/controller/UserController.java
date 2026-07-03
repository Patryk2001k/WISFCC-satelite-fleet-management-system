package wisfcc_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import wisfcc_backend.dto.*;
import wisfcc_backend.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')") 
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    
    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    
    @PostMapping
    public ResponseEntity<UserResponseDTO> registerOperator(@RequestBody UserRegisterRequestDTO request) {
        return ResponseEntity.ok(userService.registerOperator(request));
    }

    
    @PutMapping("/{id}/status")
    public ResponseEntity<UserStatusUpdateResponseDTO> updateStatus(
            @PathVariable String id,
            @RequestBody UserStatusUpdateRequestDTO request) {
        return ResponseEntity.ok(userService.updateStatus(id, request));
    }

    
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ResetPasswordResponseDTO> resetPassword(@PathVariable String id) {
        return ResponseEntity.ok(userService.resetPassword(id));
    }

    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build(); 
    }
}