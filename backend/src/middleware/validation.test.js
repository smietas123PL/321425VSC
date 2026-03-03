import { describe, it, expect } from 'vitest';
import { validateProjectPayload, sanitizeString, validateEmail } from './validation.js';

describe('Validation Middleware', () => {
    describe('validateEmail', () => {
        it('should return true for valid emails', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('test.name+alias@domain.co.uk')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('missing@domain')).toBe(false);
            expect(validateEmail('@missingusername.com')).toBe(false);
        });
    });

    describe('sanitizeString', () => {
        it('should remove HTML tags', () => {
            expect(sanitizeString('<h1>Title</h1>')).toBe('Title');
            expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
        });

        it('should collapse multiple spaces and trim', () => {
            expect(sanitizeString('  hello   world  ')).toBe('hello world');
        });

        it('should handle non-strings gracefully', () => {
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
            expect(sanitizeString(123)).toBe('');
        });
    });

    describe('validateProjectPayload', () => {
        it('should return empty array for valid payload', () => {
            const validPayload = {
                topic: 'AI Agents',
                level: 'intermediate',
                agents: ['Agent 1', 'Agent 2']
            };
            const errors = validateProjectPayload(validPayload);
            expect(errors).toHaveLength(0);
        });

        it('should return errors for missing fields', () => {
            const invalidPayload = {};
            const errors = validateProjectPayload(invalidPayload);
            expect(errors).toContain('topic is required and must be a string');
            expect(errors).toContain('level must be beginner, intermediate, or advanced');
            expect(errors).toContain('agents must be a non-empty array');
        });
    });
});
