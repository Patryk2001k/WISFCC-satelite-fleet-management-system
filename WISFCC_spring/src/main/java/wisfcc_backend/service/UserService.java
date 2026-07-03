package wisfcc_backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wisfcc_backend.dto.*;
import wisfcc_backend.entity.UserEntity;
import wisfcc_backend.enums.AccountStatus;
import wisfcc_backend.enums.UserRole;
import wisfcc_backend.repository.UserRepository;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponseDTO registerOperator(UserRegisterRequestDTO req) {
        if (userRepository.findByUsername(req.username()).isPresent()) {
            throw new RuntimeException("Operator o nazwie " + req.username() + " jest już zarejestrowany.");
        }

        UserEntity user = UserEntity.builder()
                .username(req.username())
                .password(passwordEncoder.encode(req.tempPassword()))
                .role(UserRole.valueOf(req.role().toUpperCase()))
                .clearance(req.clearance() != null ? req.clearance().toUpperCase() : "LEVEL_1")
                .accountStatus(AccountStatus.ACTIVE)
                .build();

        return mapToResponseDTO(userRepository.save(user));
    }

    @Transactional
    public UserStatusUpdateResponseDTO updateStatus(String strId, UserStatusUpdateRequestDTO req) {
        Long id = parseUserId(strId);
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono użytkownika o ID: " + strId));

        user.setAccountStatus(AccountStatus.valueOf(req.status().toUpperCase()));
        userRepository.save(user);

        return new UserStatusUpdateResponseDTO(formatUserId(user.getId()), user.getAccountStatus().name());
    }

    @Transactional
    public ResetPasswordResponseDTO resetPassword(String strId) {
        Long id = parseUserId(strId);
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono użytkownika o ID: " + strId));

        String tempPassword = generateSecureTempPassword();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        return new ResetPasswordResponseDTO(
                "TEMPORARY PASSWORD GENERATED SUCCESSFULLY.",
                tempPassword
        );
    }
    
    @Transactional
    public void deleteUser(String strId) {
        Long id = parseUserId(strId);
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Nie znaleziono użytkownika o ID: " + strId);
        }
        userRepository.deleteById(id);
    }

    public static String formatUserId(Long id) {
        return "USR-" + String.format("%03d", id);
    }

    public static Long parseUserId(String userStrId) {
        if (userStrId != null && userStrId.toUpperCase().startsWith("USR-")) {
            return Long.parseLong(userStrId.substring(4));
        }
        return Long.parseLong(userStrId);
    }

    private String formatLastLogin(Instant lastLogin) {
        if (lastLogin == null) {
            return "NEVER";
        }
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                .withZone(ZoneId.of("UTC"));
        return formatter.format(lastLogin);
    }

    private String generateSecureTempPassword() {
        String chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789"; 
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return "TEMP_KEY_" + sb.toString();
    }

    private UserResponseDTO mapToResponseDTO(UserEntity entity) {
        return new UserResponseDTO(
                formatUserId(entity.getId()),
                entity.getUsername(),
                entity.getRole().name(),
                entity.getClearance() != null ? entity.getClearance() : "LEVEL_1",
                entity.getAccountStatus().name(),
                formatLastLogin(entity.getLastLoginUtc())
        );
    }


    public UserProfileResponseDTO getMyProfile(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono konta operatora."));

        
        String joinedDate = user.getCreatedAt() != null ?
                user.getCreatedAt().atZone(ZoneId.of("UTC")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "UNKNOWN";

        return new UserProfileResponseDTO(
                user.getUsername(),
                user.getRole().name(),
                user.getClearance() != null ? user.getClearance() : "LEVEL_1",
                joinedDate
        );
    }

    public UserPreferencesDTO getMyPreferences(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono konta operatora."));

        return new UserPreferencesDTO(
                user.getAudioAlertsEnabled() != null ? user.getAudioAlertsEnabled() : true,
                user.getDesktopNotificationsEnabled() != null ? user.getDesktopNotificationsEnabled() : false,
                user.getShowDebrisEnabled() != null ? user.getShowDebrisEnabled() : false // <--- ODCZYT
        );
    }

    @Transactional
    public UserPreferencesDTO updateMyPreferences(String username, UserPreferencesDTO req) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono konta operatora."));

        user.setAudioAlertsEnabled(req.audioAlertsEnabled());
        user.setDesktopNotificationsEnabled(req.desktopNotificationsEnabled());
        user.setShowDebrisEnabled(req.showDebrisEnabled()); // <--- ZAPIS DO BAZY
        
        userRepository.save(user);

        return req;
    }

    @Transactional
    public void changeMyPassword(String username, PasswordChangeRequestDTO req) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Nie znaleziono konta operatora."));

        
        if (!passwordEncoder.matches(req.oldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Błędne aktualne hasło.");
        }

        
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
    }
}