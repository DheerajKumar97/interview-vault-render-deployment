// Create .env file from environment variables for Vite build
import fs from 'fs';

console.log('🔍 Environment variables available:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING');
console.log('VITE_SUPABASE_PUBLISHABLE_KEY:', process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SET (length: ' + process.env.VITE_SUPABASE_PUBLISHABLE_KEY.length + ')' : 'MISSING');
console.log('VITE_SUPABASE_PROJECT_ID:', process.env.VITE_SUPABASE_PROJECT_ID ? 'SET' : 'MISSING');
console.log('VITE_API_URL:', process.env.VITE_API_URL || 'USING DEFAULT');

const envContent = `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL || ''}
VITE_SUPABASE_PUBLISHABLE_KEY=${process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''}
VITE_SUPABASE_PROJECT_ID=${process.env.VITE_SUPABASE_PROJECT_ID || ''}
VITE_API_URL=${process.env.VITE_API_URL || '/api'}
`;

fs.writeFileSync('.env', envContent);
console.log('✅ Created .env file for Vite build');
console.log('📄 .env file contents:');
console.log(envContent);
