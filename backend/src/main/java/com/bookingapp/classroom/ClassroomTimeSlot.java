package com.bookingapp.classroom;

import java.time.LocalTime;

public enum ClassroomTimeSlot {
    SLOT_1(LocalTime.of(8, 0), LocalTime.of(9, 15), "8:00-9:15"),
    SLOT_2(LocalTime.of(9, 15), LocalTime.of(10, 30), "9:15-10:30"),
    SLOT_3(LocalTime.of(10, 30), LocalTime.of(11, 45), "10:30-11:45"),
    SLOT_4(LocalTime.of(11, 45), LocalTime.of(13, 0), "11:45-13:00"),
    SLOT_5(LocalTime.of(14, 30), LocalTime.of(15, 45), "14:30-15:45"),
    SLOT_6(LocalTime.of(15, 45), LocalTime.of(17, 0), "15:45-17:00");

    private final LocalTime start;
    private final LocalTime end;
    private final String label;

    ClassroomTimeSlot(LocalTime start, LocalTime end, String label) {
        this.start = start;
        this.end = end;
        this.label = label;
    }

    public LocalTime getStart() {
        return start;
    }

    public LocalTime getEnd() {
        return end;
    }

    public String getLabel() {
        return label;
    }
}
