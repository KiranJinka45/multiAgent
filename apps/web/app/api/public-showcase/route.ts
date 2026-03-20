import { NextResponse } from 'next/server';
import { projectService } from '@libs/utils';

export async function GET() {
    try {
        const projects = await projectService.getPublicProjects(24);
        
        if (!projects) {
            return NextResponse.json({ projects: [] });
        }

        return NextResponse.json({ projects });
    } catch (error) {
        console.error('Error in public-showcase route:', error);
        return NextResponse.json({ error: 'Failed to fetch showcase' }, { status: 500 });
    }
}
