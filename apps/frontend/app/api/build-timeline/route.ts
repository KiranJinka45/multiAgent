import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '@/services/event-bus';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
        return NextResponse.json({ error: 'executionId is required' }, { status: 400 });
    }

    try {
        // Read all events from the beginning of the stream
        const events = await eventBus.readBuildEvents(executionId, '0');
        
        if (!events) {
            return NextResponse.json({ 
                executionId,
                timeline: [],
                message: 'No events found for this execution' 
            });
        }

        // Format into a clean, chronological timeline
        const timeline = events.map(([id, event]) => ({
            id,
            ...event,
            formattedTime: new Date(event.timestamp).toLocaleTimeString()
        }));

        // Sort by timestamp just in case (though Redis Stream IDs are already chronological)
        timeline.sort((a, b) => a.timestamp - b.timestamp);

        return NextResponse.json({
            executionId,
            eventCount: timeline.length,
            timeline
        });

    } catch (error) {
        console.error('[TimelineAPI] Failed to fetch build timeline:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch timeline', 
            details: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
    }
}
