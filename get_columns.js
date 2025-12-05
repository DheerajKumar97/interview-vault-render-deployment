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

async function getColumns() {
    try {
        // Get one row to see all columns
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            console.log('\n========================================');
            console.log('APPLICATIONS TABLE COLUMNS:');
            console.log('========================================');
            console.log(Object.keys(data[0]).join(', '));
            console.log('\n========================================');
            console.log('SAMPLE ROW:');
            console.log('========================================');
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('No data in applications table');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

getColumns();
