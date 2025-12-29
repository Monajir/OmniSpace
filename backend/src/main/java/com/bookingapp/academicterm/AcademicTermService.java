package com.bookingapp.academicterm;

import com.bookingapp.academicterm.dto.AcademicTermDtos.AcademicTermResponse;
import com.bookingapp.academicterm.dto.AcademicTermDtos.SaveAcademicTermRequest;
import com.bookingapp.common.exception.InvalidRequestException;
import com.bookingapp.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AcademicTermService {

    private final AcademicTermRepository academicTermRepository;

    @Value("${app.academic.current-academic-year}")
    private String fallbackAcademicYear;

    @Value("${app.academic.current-semester}")
    private String fallbackSemester;

    @Transactional(readOnly = true)
    public List<AcademicTermResponse> findAll() {
        return academicTermRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(AcademicTerm::getStartDate).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AcademicTermResponse create(SaveAcademicTermRequest request) {
        validateUniqueName(request.academicYear(), request.semester(), null);
        validateNoDateOverlap(request.startDate(), request.endDate(), null);
        AcademicTerm term = AcademicTerm.builder()
                .academicYear(clean(request.academicYear()))
                .semester(clean(request.semester()))
                .startDate(request.startDate())
                .endDate(request.endDate())
                .build();
        return toResponse(academicTermRepository.save(term));
    }

    @Transactional
    public AcademicTermResponse update(Long id, SaveAcademicTermRequest request) {
        AcademicTerm term = getEntity(id);
        boolean changingName = !term.getAcademicYear().equals(clean(request.academicYear()))
                || !term.getSemester().equalsIgnoreCase(clean(request.semester()));
        if (changingName && academicTermRepository.countRoutinesForTerm(
                term.getAcademicYear(), term.getSemester()) > 0) {
            throw new InvalidRequestException(
                    "Academic year and semester cannot be renamed while routines use this term");
        }
        validateUniqueName(request.academicYear(), request.semester(), id);
        validateNoDateOverlap(request.startDate(), request.endDate(), id);
        term.setAcademicYear(clean(request.academicYear()));
        term.setSemester(clean(request.semester()));
        term.setStartDate(request.startDate());
        term.setEndDate(request.endDate());
        return toResponse(term);
    }

    @Transactional
    public void delete(Long id) {
        AcademicTerm term = getEntity(id);
        if (academicTermRepository.countRoutinesForTerm(term.getAcademicYear(), term.getSemester()) > 0) {
            throw new InvalidRequestException("Delete or move this term's routines before removing the term");
        }
        academicTermRepository.delete(term);
    }

    /**
     * Resolves the term that owns a booking date. Existing installations with
     * no term rows retain their configured current-term behavior until an
     * administrator creates the first explicit date range.
     */
    @Transactional(readOnly = true)
    public AcademicTermKey resolveForDate(LocalDate date) {
        List<AcademicTerm> matches = academicTermRepository.findContaining(date);
        if (matches.size() > 1) {
            throw new IllegalStateException("Academic term date ranges overlap for " + date);
        }
        if (matches.size() == 1) {
            AcademicTerm term = matches.getFirst();
            return new AcademicTermKey(term.getAcademicYear(), term.getSemester(),
                    term.getStartDate(), term.getEndDate());
        }
        if (academicTermRepository.count() == 0) {
            return new AcademicTermKey(fallbackAcademicYear, fallbackSemester, null, null);
        }
        throw new InvalidRequestException("No academic term is configured for " + date);
    }

    /** Returns null for calendar dates outside configured terms. */
    @Transactional(readOnly = true)
    public AcademicTermKey resolveForAvailabilityDate(LocalDate date) {
        List<AcademicTerm> matches = academicTermRepository.findContaining(date);
        if (matches.size() > 1) {
            throw new IllegalStateException("Academic term date ranges overlap for " + date);
        }
        if (matches.size() == 1) {
            AcademicTerm term = matches.getFirst();
            return new AcademicTermKey(term.getAcademicYear(), term.getSemester(),
                    term.getStartDate(), term.getEndDate());
        }
        if (academicTermRepository.count() == 0) {
            return new AcademicTermKey(fallbackAcademicYear, fallbackSemester, null, null);
        }
        return null;
    }

    @Transactional(readOnly = true)
    public AcademicTermKey requireConfigured(String academicYear, String semester) {
        if (academicTermRepository.count() == 0) {
            return new AcademicTermKey(clean(academicYear), clean(semester), null, null);
        }
        AcademicTerm term = academicTermRepository
                .findByAcademicYearAndSemesterIgnoreCase(clean(academicYear), clean(semester))
                .orElseThrow(() -> new InvalidRequestException(
                        "No academic term is configured for " + academicYear + " · " + semester));
        return new AcademicTermKey(term.getAcademicYear(), term.getSemester(),
                term.getStartDate(), term.getEndDate());
    }

    private AcademicTerm getEntity(Long id) {
        return academicTermRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("AcademicTerm", id));
    }

    private void validateUniqueName(String academicYear, String semester, Long excludeId) {
        academicTermRepository.findByAcademicYearAndSemesterIgnoreCase(clean(academicYear), clean(semester))
                .filter(existing -> !existing.getId().equals(excludeId))
                .ifPresent(existing -> {
                    throw new InvalidRequestException("That academic year and semester already exists");
                });
    }

    private void validateNoDateOverlap(LocalDate start, LocalDate end, Long excludeId) {
        if (academicTermRepository.countDateOverlaps(start, end, excludeId) > 0) {
            throw new InvalidRequestException("Academic term date ranges may not overlap");
        }
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private AcademicTermResponse toResponse(AcademicTerm term) {
        return new AcademicTermResponse(term.getId(), term.getAcademicYear(), term.getSemester(),
                term.getStartDate(), term.getEndDate(), term.getCreatedAt(), term.getUpdatedAt());
    }

    public record AcademicTermKey(
            String academicYear,
            String semester,
            LocalDate startDate,
            LocalDate endDate
    ) {}
}
