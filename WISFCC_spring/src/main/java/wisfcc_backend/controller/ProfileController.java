package wisfcc_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import wisfcc_backend.dto.PasswordChangeRequestDTO;
import wisfcc_backend.dto.UserPreferencesDTO;
import wisfcc_backend.dto.UserProfileResponseDTO;
import wisfcc_backend.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/api/users/me")
public class ProfileController {

    private final UserService userService;

    public ProfileController(UserService userService) {
        this.userService = userService;
    }

    
    @GetMapping
    public ResponseEntity<UserProfileResponseDTO> getMyProfile(Authentication auth) {
        
        return ResponseEntity.ok(userService.getMyProfile(auth.getName()));
    }

    
    @GetMapping("/preferences")
    public ResponseEntity<UserPreferencesDTO> getMyPreferences(Authentication auth) {
        return ResponseEntity.ok(userService.getMyPreferences(auth.getName()));
    }

    
    @PutMapping("/preferences")
    public ResponseEntity<UserPreferencesDTO> updateMyPreferences(
            Authentication auth,
            @RequestBody UserPreferencesDTO request) {
        return ResponseEntity.ok(userService.updateMyPreferences(auth.getName(), request));
    }

    
    @PutMapping("/password")
    public ResponseEntity<?> changePassword(
            Authentication auth,
            @RequestBody PasswordChangeRequestDTO request) {
        try {
            userService.changeMyPassword(auth.getName(), request);
            return ResponseEntity.ok(Map.of("message", "Hasło zostało pomyślnie zmienione."));
        } catch (IllegalArgumentException e) {
            
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}