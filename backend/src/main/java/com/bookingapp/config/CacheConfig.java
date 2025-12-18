package com.bookingapp.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.databind.ObjectMapper.DefaultTyping;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * Configures Spring Cache (backed by Redis) with a uniform 60s TTL for all
 * caches, as used by @Cacheable on the resource/classroom/routine read
 * endpoints. Cache eviction on writes is done explicitly with @CacheEvict in
 * the relevant services (see resource/classroom/routine/issue services).
 */
@Configuration
public class CacheConfig {

    @Bean
    public GenericJackson2JsonRedisSerializer redisCacheValueSerializer() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        // Cached service methods commonly return Stream.toList(), whose runtime
        // implementation is final. EVERYTHING preserves its type metadata so
        // an empty or populated list can be reconstructed on a cache hit.
        mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, DefaultTyping.EVERYTHING);
        return new GenericJackson2JsonRedisSerializer(mapper);
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer(
            GenericJackson2JsonRedisSerializer redisCacheValueSerializer) {
        RedisCacheConfiguration cacheConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofSeconds(60))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(redisCacheValueSerializer));

        return builder -> builder.cacheDefaults(cacheConfig);
    }
}
