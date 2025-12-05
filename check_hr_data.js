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

async function checkHRData() {
    try {
        // Search for Altair Engineering in applications
        const { data: altairApps, error: altairError } = await supabase
            .from('applications')
            .select(`
                *,
                companies (
                    name,
                    company_size,
                    industry,
                    location,
                    company_website
                )
            `)
            .ilike('name', '%altair%');

        if (altairError) throw altairError;

        console.log('\n========================================');
        console.log('ALTAIR ENGINEERING APPLICATIONS:');
        console.log('========================================');
        console.log('Total count:', altairApps.length);

        if (altairApps.length > 0) {
            altairApps.forEach((app, index) => {
                console.log(`\n--- Application #${index + 1} ---`);
                console.log('Company:', app.name);
                console.log('Position:', app.position);
                console.log('Status:', app.current_status);
                console.log('\n📞 HR Details from applications table:');
                console.log('  hr_name:', app.hr_name || 'NULL');
                console.log('  hr_phone:', app.hr_phone || 'NULL');
                console.log('  hr_email:', app.hr_email || 'NULL');
                console.log('\n🏢 HR Details from companies table (joined):');
                console.log('  hr_name:', app.companies?.hr_name || 'NULL');
                console.log('  hr_phone:', app.companies?.hr_phone || 'NULL');
                console.log('  hr_email:', app.companies?.hr_email || 'NULL');
                console.log('\n📋 Full application object:');
                console.log(JSON.stringify(app, null, 2));
            });
        } else {
            console.log('No Altair Engineering applications found.');
        }

        // Also check all applications with HR data
        console.log('\n========================================');
        console.log('ALL APPLICATIONS WITH HR DATA:');
        console.log('========================================');

        const { data: allApps, error: allError } = await supabase
            .from('applications')
            .select('name, position, hr_name, hr_phone, hr_email')
            .or('hr_name.not.is.null,hr_phone.not.is.null,hr_email.not.is.null');

        if (allError) throw allError;

        console.log('Total applications with HR data:', allApps.length);
        console.table(allApps);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkHRData();
