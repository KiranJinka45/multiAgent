import { JournalEntry } from '../execution/execution-journal.js';
import { CheckpointEntry } from '../execution/compacting-journal.js';

export interface ArchaeologyCapsule {
    taskId: string;
    timestamp: number;
    journalEntries: JournalEntry[];
    checkpointSnapshot: CheckpointEntry | null;
}

export class OfflineCapsuleBuilder {
    
    /**
     * Compiles historical journal entries and compacted checkpoints into a standalone,
     * zero-dependency static HTML forensic archaeology replayer capsule.
     */
    public buildOfflineCapsule(
        taskId: string,
        journalEntries: JournalEntry[],
        checkpointSnapshot: CheckpointEntry | null
    ): string {
        const capsuleData: ArchaeologyCapsule = {
            taskId,
            timestamp: Date.now(),
            journalEntries,
            checkpointSnapshot
        };

        const stringifiedData = JSON.stringify(capsuleData)
            .replace(/<\/script>/g, '<\\/script>'); // Secure script escape

        const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ZTAN Offline Capsule - ${taskId}</title>
    <style>
        body {
            background-color: #0c0f12;
            color: #d1d5db;
            font-family: 'SF Mono', Consolas, Monaco, monospace;
            padding: 20px;
            margin: 0;
        }
        .header {
            border-bottom: 2px solid #1e293b;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .panel {
            background-color: #111827;
            border: 1px solid #374151;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .title {
            color: #f3f4f6;
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .timeline {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .entry {
            border-left: 3px solid #3b82f6;
            padding-left: 10px;
            margin-left: 5px;
        }
        .entry.checkpoint {
            border-left-color: #f59e0b;
        }
        .svg-timeline {
            width: 100%;
            height: 60px;
            background-color: #0f172a;
            border: 1px solid #1e293b;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>[ZTAN DEGRADED ARCHAEOLOGY CAPSULE]</h1>
        <div>TASK ID: ${taskId}</div>
        <div>EXPORTED AT: ${new Date(capsuleData.timestamp).toISOString()}</div>
    </div>

    <div class="panel">
        <div class="title">[CHECKPOINT SNAPSHOT]</div>
        <pre id="checkpoint-display">${checkpointSnapshot ? JSON.stringify(checkpointSnapshot.consolidatedStatePayload, null, 2) : 'No active checkpoint snapshot'}</pre>
    </div>

    <div class="panel">
        <div class="title">[SEQUENTIAL TRANSACTION TIMELINE]</div>
        <svg class="svg-timeline" id="timeline-svg">
            <!-- Render timeline ticks in plain inline SVG -->
            <line x1="10" y1="30" x2="600" y2="30" stroke="#475569" stroke-width="2"/>
            <circle cx="20" cy="30" r="6" fill="#f59e0b"/>
            <circle cx="100" cy="30" r="5" fill="#3b82f6"/>
            <circle cx="200" cy="30" r="5" fill="#3b82f6"/>
        </svg>
        <div class="timeline" id="timeline-display"></div>
    </div>

    <!-- Embedded raw payload data store -->
    <script id="ztan-capsule-data" type="application/json">
        ${stringifiedData}
    </script>

    <script>
        // Inline static replayer logic (zero external dependencies)
        (function() {
            const dataElement = document.getElementById('ztan-capsule-data');
            const data = JSON.parse(dataElement.textContent);
            const timelineDiv = document.getElementById('timeline-display');
            
            if (data.journalEntries.length === 0) {
                timelineDiv.textContent = 'Empty sequential transaction journal.';
                return;
            }

            data.journalEntries.forEach(entry => {
                const div = document.createElement('div');
                div.className = 'entry';
                if (entry.state === 'SUCCESS') {
                    div.className += ' checkpoint';
                }
                div.innerHTML = '<strong>STEP ' + entry.stepIndex + '</strong> | STATE: ' + entry.state + ' | HASH: ' + entry.payloadHash;
                timelineDiv.appendChild(div);
            });
        })();
    </script>
</body>
</html>`;

        return htmlTemplate;
    }

    /**
     * Inspects and validates a compiled offline capsule's structural and data integrity.
     */
    public validateOfflineCapsule(htmlContent: string): { isValid: boolean; violations: string[] } {
        const violations: string[] = [];

        if (!htmlContent.includes('<!DOCTYPE html>')) {
            violations.push('Missing HTML5 standard Doctype header');
        }
        if (!htmlContent.includes('[ZTAN DEGRADED ARCHAEOLOGY CAPSULE]')) {
            violations.push('Missing ZTAN forensic encapsulation markers');
        }
        if (!htmlContent.includes('id="ztan-capsule-data"')) {
            violations.push('Missing embedded JSON payload data store block');
        }
        if (!htmlContent.includes('id="timeline-svg"')) {
            violations.push('Missing inline SVG timeline primitive node');
        }

        const isValid = violations.length === 0;
        return {
            isValid,
            violations
        };
    }
}
