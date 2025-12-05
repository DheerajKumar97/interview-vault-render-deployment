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

async function checkData() {
    try {
        // 1. Get one row to check keys
        const { data: oneRow, error: rowError } = await supabase
            .from('applications')
            .select('*')
            .limit(1);

        if (rowError) throw rowError;
        if (oneRow.length > 0) {
            console.log('Table Columns:', Object.keys(oneRow[0]));
            console.log('Sample Row:', oneRow[0]);
        } else {
            console.log('Table is empty');
            return;
        }

        // 2. Get status distribution
        const { data: statusData, error: statusError } = await supabase
            .from('applications')
            .select('current_status');

        if (statusError) throw statusError;

        const distribution = {};

        statusData.forEach(app => {
            const status = app.current_status || 'NULL';
            distribution[status] = (distribution[status] || 0) + 1;
        });

        console.log('\nStatus Distribution (current_status):');
        console.table(distribution);

        // 3. Check "Selected" specifically
        const { data: selectedData, error: selectedError } = await supabase
            .from('applications')
            .select('company, current_status')
            .eq('current_status', 'Selected');

        if (selectedError) throw selectedError;
        console.log('\nApplications with current_status = "Selected":');
        console.table(selectedData);

    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
