import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAltairHR() {
    try {
        // Search for Altair Engineering in applications
        const { data: altairApps, error } = await supabase
            .from('applications')
            .select('*')
            .ilike('name', '%altair%');

        if (error) throw error;

        console.log('\n========================================');
        console.log('ALTAIR ENGINEERING - HR DATA CHECK');
        console.log('========================================');
        console.log('Total applications found:', altairApps.length);

        if (altairApps.length > 0) {
            altairApps.forEach((app, index) => {
                console.log(`\n--- Application #${index + 1} ---`);
                console.log('Company Name (name):', app.name);
                console.log('HR Name (hr_name):', app.hr_name || 'NULL');
                console.log('HR Phone (hr_phone):', app.hr_phone || 'NULL');
                console.log('HR Email (hr_email):', app.hr_email || 'NULL');
                console.log('Status:', app.current_status);
                console.log('Date Applied:', app.date_applied || app.created_at?.split('T')[0]);
            });
        } else {
            console.log('No Altair Engineering applications found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkAltairHR();
