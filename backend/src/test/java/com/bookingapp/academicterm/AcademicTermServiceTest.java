package com.bookingapp.academicterm;

import com.bookingapp.academicterm.dto.AcademicTermDtos.SaveAcademicTermRequest;
import com.bookingapp.common.exception.InvalidRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AcademicTermServiceTest {

    @Mock AcademicTermRepository repository;
    private AcademicTermService service;

    @BeforeEach
    void setUp() {
        service = new AcademicTermService(repository);
        ReflectionTestUtils.setField(service, "fallbackAcademicYear", "2025-2026");
        ReflectionTestUtils.setField(service, "fallbackSemester", "Fall");
    }

    @Test
    void resolvesBookingDateToExplicitTerm() {
        LocalDate date = LocalDate.parse("2026-09-10");
        AcademicTerm term = AcademicTerm.builder().academicYear("2026-2027").semester("Fall")
                .startDate(LocalDate.parse("2026-07-01"))
                .endDate(LocalDate.parse("2026-12-31")).build();
        when(repository.findContaining(date)).thenReturn(List.of(term));

        var result = service.resolveForDate(date);

        assertThat(result.academicYear()).isEqualTo("2026-2027");
        assertThat(result.semester()).isEqualTo("Fall");
    }

    @Test
    void rejectsDateOutsideConfiguredTerms() {
        LocalDate date = LocalDate.parse("2027-01-15");
        when(repository.findContaining(date)).thenReturn(List.of());
        when(repository.count()).thenReturn(1L);

        assertThatThrownBy(() -> service.resolveForDate(date))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("No academic term is configured for 2027-01-15");
    }

    @Test
    void rejectsOverlappingTermDateRange() {
        var request = new SaveAcademicTermRequest("2026-2027", "Spring",
                LocalDate.parse("2027-01-01"), LocalDate.parse("2027-06-30"));
        when(repository.findByAcademicYearAndSemesterIgnoreCase("2026-2027", "Spring"))
                .thenReturn(Optional.empty());
        when(repository.countDateOverlaps(request.startDate(), request.endDate(), null)).thenReturn(1L);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessage("Academic term date ranges may not overlap");
    }
}
