package com.bookingapp.config;

import com.bookingapp.classroom.ClassroomRepository;
import com.bookingapp.booking.BookingRepository;
import com.bookingapp.resource.ResourceRepository;
import com.bookingapp.auth.RefreshTokenRepository;
import com.bookingapp.issue.IssueReportRepository;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

import static org.assertj.core.api.Assertions.assertThat;

class PessimisticLockMappingTest {

    @Test
    void mutableSharedResourcesUsePessimisticWriteLocks() throws Exception {
        assertWriteLock(ClassroomRepository.class);
        assertWriteLock(ResourceRepository.class);
        assertWriteLock(BookingRepository.class);
        Lock tokenLock = RefreshTokenRepository.class
                .getMethod("findByTokenHashForUpdate", String.class).getAnnotation(Lock.class);
        assertThat(tokenLock).isNotNull();
        assertThat(tokenLock.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);
        Lock issueLock = IssueReportRepository.class
                .getMethod("findByIdForUpdate", Long.class).getAnnotation(Lock.class);
        assertThat(issueLock).isNotNull();
        assertThat(issueLock.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);
    }

    private void assertWriteLock(Class<?> repository) throws Exception {
        Lock annotation = repository.getMethod("findByIdForUpdate", Long.class).getAnnotation(Lock.class);
        assertThat(annotation).isNotNull();
        assertThat(annotation.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);
    }
}
