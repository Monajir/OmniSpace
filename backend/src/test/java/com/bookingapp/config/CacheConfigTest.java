package com.bookingapp.config;

import com.bookingapp.classroom.ClassroomStatus;
import com.bookingapp.classroom.dto.ClassroomDtos.ClassroomResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CacheConfigTest {

    private final CacheConfig config = new CacheConfig();

    @Test
    void roundTripsEmptyImmutableList() {
        var serializer = config.redisCacheValueSerializer();

        Object restored = serializer.deserialize(serializer.serialize(List.of()));

        assertThat(restored).isInstanceOf(List.class);
        assertThat((List<?>) restored).isEmpty();
    }

    @Test
    void roundTripsImmutableListContainingRecordAndInstant() {
        var serializer = config.redisCacheValueSerializer();
        ClassroomResponse classroom = new ClassroomResponse(4L, "AB-201", "Lab", "AB", 2,
                30, true, true, true, "CSE", ClassroomStatus.AVAILABLE,
                Instant.parse("2026-08-21T10:00:00Z"));

        Object restored = serializer.deserialize(serializer.serialize(List.of(classroom)));

        assertThat(restored).isInstanceOf(List.class);
        assertThat((List<?>) restored).hasSize(1);
        assertThat(((List<?>) restored).getFirst()).isEqualTo(classroom);
    }
}
