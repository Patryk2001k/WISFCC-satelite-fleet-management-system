package wisfcc_backend.dto;
import java.util.List;
public record ConjunctionRequestDTO(List<TleItemDTO> fleet, List<TleItemDTO> debris) {}