package com.bookingapp.classroom;

import com.bookingapp.common.exception.InvalidRequestException;

import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

public final class ClassroomSlotValidator {

    private static final LocalTime BREAK_START = LocalTime.of(13, 0);
    private static final LocalTime BREAK_END = LocalTime.of(14, 30);
    private static final String VALID_WINDOWS =
            "Valid classroom windows are 08:00-09:15, 09:15-10:30, 10:30-11:45, " +
            "11:45-13:00, 14:30-15:45, 15:45-17:00, or two consecutive slots " +
            "08:00-10:30, 09:15-11:45, 10:30-13:00, 14:30-17:00.";

    private ClassroomSlotValidator() {}

    public static void validate(LocalTime start, LocalTime end) {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new InvalidRequestException("startTime must be before endTime. " + VALID_WINDOWS);
        }
        if (isSingleSlot(start, end) || isAllowedDoubleSlot(start, end)) {
            return;
        }
        if (start.isBefore(BREAK_END) && end.isAfter(BREAK_START)) {
            throw new InvalidRequestException(
                    "Classroom bookings may not include or span the 13:00-14:30 lunch/prayer break. " + VALID_WINDOWS);
        }
        throw new InvalidRequestException("Classroom times must align exactly to one or two consecutive slots. "
                + VALID_WINDOWS);
    }

    public static List<ClassroomTimeSlot> coveredSlots(LocalTime start, LocalTime end) {
        return Arrays.stream(ClassroomTimeSlot.values())
                .filter(slot -> slot.getStart().isBefore(end) && slot.getEnd().isAfter(start))
                .toList();
    }

    private static boolean isSingleSlot(LocalTime start, LocalTime end) {
        return Arrays.stream(ClassroomTimeSlot.values())
                .anyMatch(slot -> slot.getStart().equals(start) && slot.getEnd().equals(end));
    }

    private static boolean isAllowedDoubleSlot(LocalTime start, LocalTime end) {
        ClassroomTimeSlot[] slots = ClassroomTimeSlot.values();
        for (int i = 0; i < slots.length - 1; i++) {
            if (slots[i].getEnd().equals(slots[i + 1].getStart())
                    && slots[i].getStart().equals(start)
                    && slots[i + 1].getEnd().equals(end)) {
                return true;
            }
        }
        return false;
    }
}
