import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function grantBetaAccess() {
    const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_beta_user: true })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all users

    if (error) {
        console.error('Error updating users:', error);
    } else {
        console.log('Successfully granted beta access to all users.');
    }
}

grantBetaAccess();
