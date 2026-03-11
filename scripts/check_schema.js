import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shvwmatbjvjspijslawl.supabase.co';
const supabaseKey = 'sb_publishable_OL-k6e2JjsPPkKyK6vgVpQ_YPHyDCUL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema...');

    // Try to select the specific columns
    const { data, error } = await supabase
        .from('chats')
        .select('id, title, is_pinned, is_archived')
        .limit(1);

    if (error) {
        console.error('Error selecting columns:', error);
        if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
            console.log('DIAGNOSIS: Columns appear to be missing!');
        }
    } else {
        console.log('Schema check passed. Columns exist.');
        console.log('Sample data:', data);
    }
}

checkSchema();
