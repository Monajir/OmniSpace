package com.bookingapp.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenApiConfigTest {

    @Test
    void exposesApiMetadataAndJwtBearerAuthentication() {
        var openApi = new OpenApiConfig().omniSpaceOpenApi();

        assertThat(openApi.getInfo().getTitle()).isEqualTo("OmniSpace API");
        assertThat(openApi.getComponents().getSecuritySchemes())
                .containsKey(OpenApiConfig.BEARER_AUTH);
        assertThat(openApi.getComponents().getSecuritySchemes().get(OpenApiConfig.BEARER_AUTH).getScheme())
                .isEqualTo("bearer");
        assertThat(openApi.getSecurity().getFirst()).containsKey(OpenApiConfig.BEARER_AUTH);
    }
}
