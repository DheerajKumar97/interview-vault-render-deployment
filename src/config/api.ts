// config/api.ts or config/api.js
// API Configuration for both local development and Netlify deployment

// Detect environment
const isLocalhost = window.location.hostname === 'localhost';
const isNetlifyDev = window.location.port === '8888';

// Base URLs for different environments
// 1. If VITE_API_URL is set (e.g. by Netlify Dev or .env), use it
// 2. If running on localhost:8888 (Netlify Dev), use relative path to functions
// 3. If running on localhost (but not 8888), default to local Express server
// 4. Otherwise (Production), use Netlify Functions default path
export const API_BASE_URL = import.meta.env.VITE_API_URL || (
    (isLocalhost && !isNetlifyDev)
        ? 'http://localhost:3001/api'      // Local Express server (npm run dev)
        : '/api'                           // Default to /api for Render/Production (Netlify uses VITE_API_URL)
);

// Helper to get full endpoint URL
export const getApiEndpoint = (functionName: string): string => {
    return `${API_BASE_URL}/${functionName}`;
};

// Log configuration on module load
console.log('🔧 API Configuration:');
console.log('   Environment:', isNetlifyDev ? 'Netlify Dev (Local)' : (isLocalhost ? 'Development (Local)' : 'Production'));
console.log('   Base URL:', API_BASE_URL);
console.log('   Interview Questions Endpoint:', getApiEndpoint('generate-interview-questions'));

export default API_BASE_URL;