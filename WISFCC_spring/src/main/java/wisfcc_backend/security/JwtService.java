package wisfcc_backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {

    @Value("${wisfcc.jwt.user-secret}")
    private String userSecret;

    @Value("${wisfcc.jwt.internal-secret}")
    private String internalSecret;

    
    public String generateUserToken(String username, String role) {
        return Jwts.builder()
                .subject(username)
                .claim("role", role) 
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 86400000)) 
                .signWith(getSecretKey(userSecret))
                .compact();
    }

    
    public String generateInternalToken() {
        return Jwts.builder()
                .subject("wisfcc-java-backend") 
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 600000)) 
                .signWith(getSecretKey(internalSecret))
                .compact();
    }

    public boolean validateUserToken(String token) {
        try {
            Jwts.parser().verifyWith(getSecretKey(userSecret)).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSecretKey(userSecret))
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public String getRoleFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSecretKey(userSecret))
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class); 
    }

    private SecretKey getSecretKey(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }
}