package com.bookingapp.classroom;

import com.bookingapp.common.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

class ClassroomSlotValidatorTest {

    @Test
    void acceptsSingleAndConsecutiveSameSideSlots() {
        assertThatCode(() -> ClassroomSlotValidator.validate(
                LocalTime.of(8, 0), LocalTime.of(9, 15))).doesNotThrowAnyException();
        assertThatCode(() -> ClassroomSlotValidator.validate(
                LocalTime.of(9, 15), LocalTime.of(11, 45))).doesNotThrowAnyException();
        assertThatCode(() -> ClassroomSlotValidator.validate(
                LocalTime.of(14, 30), LocalTime.of(17, 0))).doesNotThrowAnyException();
    }

    @Test
    void rejectsLunchSpansWithClearMessage() {
        assertThatThrownBy(() -> ClassroomSlotValidator.validate(
                LocalTime.of(11, 45), LocalTime.of(15, 45)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("lunch/prayer break");
    }

    @Test
    void rejectsPartialAndThreeSlotWindows() {
        assertThatThrownBy(() -> ClassroomSlotValidator.validate(
                LocalTime.of(8, 30), LocalTime.of(9, 15)))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("align exactly");
        assertThatThrownBy(() -> ClassroomSlotValidator.validate(
                LocalTime.of(8, 0), LocalTime.of(11, 45)))
                .isInstanceOf(InvalidRequestException.class);
    }
}
