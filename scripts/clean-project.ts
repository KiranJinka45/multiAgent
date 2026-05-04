import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function cleanProject() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";

    const { data: project } = await supabase
        .from('projects')
        .select('description')
        .eq('id', projectId)
        .single();

    if (project && project.description) {
        const header = "[Architecture Requirements]";
        const cleanDesc = project.description.split(header)[0].trim() + "\n\n" + header + "\nFrontend: nextjs\nStyling: tailwind\nBackend: none\nDatabase: none";

        await supabase
            .from('projects')
            .update({ description: cleanDesc })
            .eq('id', projectId);

        console.log("Project description cleaned.");
    }
}

cleanProject();

