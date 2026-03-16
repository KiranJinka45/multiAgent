import logger from '@config/logger';
import { supabaseAdmin } from '@queue/supabase-admin';

export async function sendBuildSuccessEmail(userId: string, projectId: string, executionId: string, previewUrl: string) {
    try {
        // Fetch user email using admin client
        const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (error || !user?.email) {
            logger.error({ error, userId }, 'Failed to fetch user email for notification');
            return false;
        }

        const email = user.email;

        // In a real production app, integrate Resend, SendGrid, or AWS SES here
        // e.g. await resend.emails.send({ ... })

        logger.info(
            { email, projectId, executionId, previewUrl },
            '📧 MOCK EMAIL DISPATCHED: "Your MultiAgent Build is Complete!"'
        );

        return true;
    } catch (err) {
        logger.error({ err, userId }, 'Unhandled error sending build success email');
        return false;
    }
}
