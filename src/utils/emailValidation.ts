import { getApiEndpoint } from '@/config/api';

/**
 * Email validation utility for frontend
 * Validates email format and provides real-time feedback
 */

export interface EmailValidationResult {
    valid: boolean;
    email: string;
    step: 'format' | 'checking' | 'verified' | 'error';
    reason: string;
    mailboxExists?: boolean;
}

/**
 * Validates email format using regex
 */
export function isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates email via backend API
 * This calls a backend endpoint that performs DNS and SMTP validation
 */
export async function validateEmailComplete(email: string): Promise<EmailValidationResult> {
    try {
        // Step 1: Format validation (instant)
        if (!isValidEmailFormat(email)) {
            return {
                valid: false,
                email,
                step: 'format',
                reason: 'Invalid email format',
            };
        }

        // Step 2: Call backend API for DNS and SMTP validation
        const apiUrl = getApiEndpoint('validate-email');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            // If API returns error, still validate format
            console.warn('Email validation API error:', response.status);
            return {
                valid: true, // Format is valid
                email,
                step: 'format',
                reason: 'Format valid (DNS check unavailable)',
            };
        }

        const result = await response.json();

        return {
            valid: result.valid,
            email,
            step: result.valid ? 'verified' : 'error',
            reason: result.reason || 'Email validation complete',
            mailboxExists: result.mailboxExists,
        };
    } catch (error) {
        // If backend validation fails completely, accept format validation
        console.warn('Email validation error:', error);
        return {
            valid: true, // Format is valid, accept it
            email,
            step: 'format',
            reason: 'Format valid',
        };
    }
}

/**
 * Quick email validation for real-time feedback (format only)
 * Use this for instant validation as user types
 */
export function validateEmailFormat(email: string): EmailValidationResult {
    const isValid = isValidEmailFormat(email);

    return {
        valid: isValid,
        email,
        step: 'format',
        reason: isValid ? 'Valid format' : 'Invalid email format',
    };
}
