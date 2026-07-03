package wisfcc_backend.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import wisfcc_backend.entity.UserEntity;
import wisfcc_backend.repository.UserRepository;
import wisfcc_backend.security.JwtService;
import wisfcc_backend.enums.UserRole;
import wisfcc_backend.enums.AccountStatus;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(JwtService jwtService, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public record RegisterRequest(String username, String password, String role) {}

    @PostMapping("/register")
    public Map<String, String> register(@RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new RuntimeException("Użytkownik o takim loginie już istnieje!");
        }

        UserEntity newUser = new UserEntity();
        newUser.setUsername(request.username());
        newUser.setPassword(passwordEncoder.encode(request.password()));

        
        newUser.setAccountStatus(AccountStatus.ACTIVE);

        
        String roleStr = (request.role() != null && !request.role().isBlank()) ? request.role().toUpperCase() : "OPERATOR";
        if (roleStr.startsWith("ROLE_")) {
            roleStr = roleStr.substring(5); 
        }
        newUser.setRole(UserRole.valueOf(roleStr));

        userRepository.save(newUser);

        return Map.of(
                "message", "Użytkownik zarejestrowany pomyślnie!",
                "username", newUser.getUsername(),
                
                "role", newUser.getRole().name()
        );
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        System.out.println("Próba logowania dla: " + username);

        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Użytkownik nie istnieje w bazie"));

        if (passwordEncoder.matches(password, user.getPassword())) {
            String token = jwtService.generateUserToken(username, user.getRole().name());
            return Map.of(
                    "token", token,
                    "role", user.getRole().name(), 
                    "message", "Zalogowano pomyślnie!"
            );
        }

        throw new RuntimeException("Błędne hasło");
    }
}