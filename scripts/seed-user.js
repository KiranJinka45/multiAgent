const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seed() {
    const email = 'ai_test@example.com';
    const password = 'Password123!';

    // First, see if user exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing users', listError);
        return;
    }

    let user = users.users.find(u => u.email === email);

    if (!user) {
        console.log('Creating new user...');
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (error) {
            console.error('Error creating user:', error);
            return;
        }
        user = data.user;
        console.log('User created:', user.id);
    } else {
        console.log('User already exists, updating password and confirming...');
        await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
        console.log('User updated');
    }
}

seed().catch(console.error);
