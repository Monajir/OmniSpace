package com.bookingapp.config;

import com.bookingapp.booking.Booking;
import com.bookingapp.issue.IssueReport;
import com.bookingapp.profile.Profile;
import com.bookingapp.resource.Resource;
import com.bookingapp.routine.Routine;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;

class EntityRelationshipMappingTest {

    @Test
    void mapsRequiredToOneRelationshipsToFlywayColumns() throws Exception {
        assertManyToOne(Booking.class, "user", "user_id", false);
        assertManyToOne(Routine.class, "classroom", "classroom_id", false);
        assertManyToOne(Routine.class, "faculty", "faculty_id", false);

        Field profileUser = Profile.class.getDeclaredField("user");
        OneToOne oneToOne = profileUser.getAnnotation(OneToOne.class);
        JoinColumn joinColumn = profileUser.getAnnotation(JoinColumn.class);
        assertThat(oneToOne).isNotNull();
        assertThat(oneToOne.fetch()).isEqualTo(FetchType.LAZY);
        assertThat(oneToOne.optional()).isFalse();
        assertThat(oneToOne.cascade()).isEmpty();
        assertThat(joinColumn.name()).isEqualTo("user_id");
        assertThat(joinColumn.nullable()).isFalse();
        assertThat(joinColumn.unique()).isTrue();
    }

    @Test
    void mapsOptionalToOneRelationshipsWithoutCascades() throws Exception {
        assertManyToOne(Booking.class, "resource", "resource_id", true);
        assertManyToOne(Booking.class, "classroom", "classroom_id", true);
        assertManyToOne(Booking.class, "approvedBy", "approved_by", true);
        assertManyToOne(Resource.class, "managedBy", "managed_by_user_id", true);
        assertManyToOne(IssueReport.class, "resource", "resource_id", true);
        assertManyToOne(IssueReport.class, "classroom", "classroom_id", true);
        assertManyToOne(IssueReport.class, "resolvedBy", "resolved_by", true);
        assertManyToOne(IssueReport.class, "reviewedBy", "reviewed_by", true);
        assertManyToOne(IssueReport.class, "reporter", "reporter_id", false);
    }

    private void assertManyToOne(Class<?> entityType, String fieldName, String columnName,
                                 boolean optional) throws Exception {
        Field field = entityType.getDeclaredField(fieldName);
        ManyToOne relationship = field.getAnnotation(ManyToOne.class);
        JoinColumn joinColumn = field.getAnnotation(JoinColumn.class);

        assertThat(relationship).isNotNull();
        assertThat(relationship.fetch()).isEqualTo(FetchType.LAZY);
        assertThat(relationship.optional()).isEqualTo(optional);
        assertThat(relationship.cascade()).isEmpty();
        assertThat(joinColumn).isNotNull();
        assertThat(joinColumn.name()).isEqualTo(columnName);
        assertThat(joinColumn.nullable()).isEqualTo(optional);
    }
}
