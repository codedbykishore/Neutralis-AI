import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// Key Rotation System (Simple Round-Robin)
// ============================================

interface KeyState {
    key: string;
    instance: GoogleGenerativeAI;
    totalUses: number;
    totalFailures: number;
}

const keyStates: KeyState[] = [];
let currentKeyIndex = 0;

/**
 * Initialize Gemini with multiple API keys for rotation
 * @param apiKeys - Single key string or comma-separated keys
 */
export function initializeGemini(apiKeys: string): void {
    if (!apiKeys) {
        throw new Error('Gemini API key(s) required');
    }

    // Split by comma and clean up
    const keys = apiKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (keys.length === 0) {
        throw new Error('No valid API keys provided');
    }

    // Reject placeholder/test values
    const invalidKeys = ['your_actual_gemini_api_key_here', 'your_gemini_api_key_here', 'test_key', 'REPLACE_WITH_YOUR_ACTUAL_GEMINI_API_KEY'];
    
    const validKeys = keys.filter(key => !invalidKeys.includes(key));
    
    if (validKeys.length === 0) {
        throw new Error('Please set valid Gemini API key(s) in your .env file');
    }

    // Clear existing states
    keyStates.length = 0;
    currentKeyIndex = 0;

    // Initialize each key
    for (const key of validKeys) {
        keyStates.push({
            key,
            instance: new GoogleGenerativeAI(key),
            totalUses: 0,
            totalFailures: 0
        });
    }

    console.error(`🔑 Initialized ${keyStates.length} API key(s) for rotation`);
}

/**
 * Get the next key in rotation (simple round-robin)
 */
function getNextKey(): KeyState {
    const keyState = keyStates[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % keyStates.length;
    return keyState;
}

/**
 * Get key rotation stats for monitoring
 */
export function getKeyRotationStats(): { totalKeys: number; keyStats: Array<{ preview: string; uses: number; failures: number }> } {
    return {
        totalKeys: keyStates.length,
        keyStats: keyStates.map(k => ({
            preview: k.key.substring(0, 10) + '...',
            uses: k.totalUses,
            failures: k.totalFailures
        }))
    };
}

export function getGeminiModel() {
    if (keyStates.length === 0) {
        throw new Error('Gemini not initialized. Call initializeGemini first.');
    }
    
    const keyState = getNextKey();
    return keyState.instance.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

/**
 * Clean Gemini response by removing markdown code block formatting
 * Gemini 2.0-flash often wraps JSON responses in ```json``` blocks
 */
export function cleanGeminiJsonResponse(response: string): string {
    let cleanResponse = response.trim();

    // Remove markdown code block formatting if present
    if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    return cleanResponse.trim();
}

export async function generateEthicsResponse(prompt: string): Promise<string> {
    const estimatedTokens = Math.ceil(prompt.length / 4);
    console.error(`📊 Estimated prompt tokens: ${estimatedTokens}`);

    // Try each key until one succeeds
    const maxAttempts = keyStates.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const keyState = getNextKey();
        const keyPreview = keyState.key.substring(0, 10) + '...';
        const keyIndex = keyStates.indexOf(keyState) + 1;
        
        try {
            console.error(`🔑 Using key #${keyIndex}/${keyStates.length}: ${keyPreview}`);
            
            const model = keyState.instance.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const responseTokens = Math.ceil(text.length / 4);
            console.error(`📊 Response tokens: ${responseTokens}, Total: ~${estimatedTokens + responseTokens}`);
            console.error(`✅ SUCCESS with key #${keyIndex}: ${keyPreview}`);
            
            keyState.totalUses++;
            return text;
            
        } catch (error) {
            keyState.totalFailures++;
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // LOUD FAILURE LOGGING
            console.error(`\n${'='.repeat(60)}`);
            console.error(`🚨🚨🚨 API KEY FAILED 🚨🚨🚨`);
            console.error(`${'='.repeat(60)}`);
            console.error(`Key #${keyIndex}: ${keyPreview}`);
            console.error(`Error: ${lastError.message}`);
            console.error(`Total failures for this key: ${keyState.totalFailures}`);
            console.error(`${'='.repeat(60)}\n`);

            // Check if we should try next key
            const errorMessage = lastError.message;
            const isRetryable = 
                errorMessage.includes('429') || 
                errorMessage.includes('Too Many Requests') || 
                errorMessage.includes('quota') ||
                errorMessage.includes('rate limit') ||
                errorMessage.includes('RATE_LIMIT_EXCEEDED') ||
                errorMessage.includes('503') ||
                errorMessage.includes('Service Unavailable') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('TIMEOUT') ||
                errorMessage.includes('API_KEY_INVALID') || 
                errorMessage.includes('401') || 
                errorMessage.includes('PERMISSION_DENIED') ||
                errorMessage.includes('403');

            if (isRetryable && attempt < maxAttempts - 1) {
                console.error(`🔄 Trying next key...\n`);
                continue;
            }

            // Non-retryable error or last attempt
            break;
        }
    }

    // All attempts failed - print final summary
    console.error(`\n${'='.repeat(60)}`);
    console.error(`💀💀💀 ALL ${keyStates.length} KEYS FAILED 💀💀💀`);
    console.error(`${'='.repeat(60)}`);
    keyStates.forEach((k, i) => {
        console.error(`  Key #${i + 1} (${k.key.substring(0, 10)}...): ${k.totalUses} uses, ${k.totalFailures} failures`);
    });
    console.error(`${'='.repeat(60)}\n`);

    throw new Error(`All ${keyStates.length} API keys failed. Last error: ${lastError?.message ?? 'Unknown'}`);
} 
