package wisfcc_backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import wisfcc_backend.dto.UserRegisterRequestDTO;
import wisfcc_backend.dto.UserResponseDTO;
import wisfcc_backend.entity.UserEntity;
import wisfcc_backend.enums.AccountStatus;
import wisfcc_backend.enums.UserRole;
import wisfcc_backend.repository.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private UserService userService;

    @BeforeEach
    void setUp() {
        // Mocking authenticated user context
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", "secret")
        );
    }

    @Test
    void deleteUser_ShouldThrowException_WhenUserDeletesThemselves() {
        // Arrange
        UserEntity mockUser = new UserEntity();
        mockUser.setId(1L);
        mockUser.setUsername("admin");

        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

        // Act & Assert
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userService.deleteUser("USR-001")
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(userRepository, never()).deleteById(anyLong());
    }

    @Test
    void registerOperator_ShouldHashPasswordAndSaveUser_WhenValidDataProvided() {
        // Arrange
        UserRegisterRequestDTO request = new UserRegisterRequestDTO("new_op", "OPERATOR", "LEVEL_1", "rawPassword");
        
        when(userRepository.findByUsername("new_op")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("rawPassword")).thenReturn("hashedPassword");
        
        UserEntity savedEntity = new UserEntity(2L, "new_op", "hashedPassword", UserRole.OPERATOR, "LEVEL_1", AccountStatus.ACTIVE, false, true, false, null, null);
        when(userRepository.save(any(UserEntity.class))).thenReturn(savedEntity);

        // Act
        UserResponseDTO response = userService.registerOperator(request);

        // Assert
        assertNotNull(response);
        assertEquals("new_op", response.username());
        assertEquals("OPERATOR", response.role());
        verify(passwordEncoder, times(1)).encode("rawPassword");
        verify(userRepository, times(1)).save(any(UserEntity.class));
    }
}