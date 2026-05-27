import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * ─── Storage Reality Validator ──────────────────────────────────────────────
 * Active host storage validation checking for OverlayFS, WSL2 NTFS, NFS, 
 * and network-mounted storage paths to enforce database WAL write durability.
 * ────────────────────────────────────────────────────────────────────────────
 */

const BANNED_FILESYSTEM_PATTERNS = [
    'overlay',       // Docker OverlayFS storage drivers
    'wslfs',         // Windows Subsystem for Linux NTFS mount
    'nfs',           // Network File System (unstable write serialization)
    'cifs',          // Common Internet File System (Windows share)
    'smbfs',         // SMB share
    'tmpfs',         // Ephemeral in-memory RAM disk (breaks persistence)
    'vboxsf',        // VirtualBox shared folders
    'gvfs'           // GNOME Virtual File System
];

export interface StorageValidationResult {
    success: boolean;
    filesystemType: string;
    errors: string[];
}

export function validateStorageEnvironment(targetDirectory: string): StorageValidationResult {
    const errors: string[] = [];
    let detectedFilesystem = 'unknown';

    const absolutePath = path.resolve(targetDirectory);
    if (!fs.existsSync(absolutePath)) {
        errors.push(`[STORAGE_VALIDATION_ERROR] target directory does not exist: ${absolutePath}`);
        return { success: false, filesystemType: 'missing', errors };
    }

    const platform = process.platform;

    try {
        if (platform === 'linux' || platform === 'darwin') {
            // Linux/Darwin: Inspect active mount point type via /proc/mounts or df -T
            try {
                const stdout = execSync(`df -T "${absolutePath}"`).toString();
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    const columns = lines[1].trim().split(/\s+/);
                    if (columns.length > 1) {
                        detectedFilesystem = columns[1].toLowerCase(); // e.g. ext4, nfs, overlay
                    }
                }
            } catch (cmdError) {
                // Fallback: Read /proc/mounts directly on Linux
                if (fs.existsSync('/proc/mounts')) {
                    const mountsContent = fs.readFileSync('/proc/mounts', 'utf-8');
                    // Find the matching mount path entries
                    const lines = mountsContent.split('\n');
                    for (const line of lines) {
                        const parts = line.split(' ');
                        if (parts.length >= 3 && absolutePath.startsWith(parts[1])) {
                            detectedFilesystem = parts[2].toLowerCase();
                        }
                    }
                }
            }
        } else if (platform === 'win32') {
            // Windows: Detect WSL2 execution context or network mount paths
            const isWsl = process.env.WSL_DISTRO_NAME !== undefined || absolutePath.includes('\\\\wsl$');
            if (isWsl) {
                detectedFilesystem = 'wslfs';
            } else {
                // Inspect logical disk type via wmic
                try {
                    const driveLetter = absolutePath.substring(0, 2);
                    const stdout = execSync(`wmic logicaldisk where DeviceID="${driveLetter}" get FileSystem`).toString();
                    const lines = stdout.trim().split('\n');
                    if (lines.length > 1) {
                        detectedFilesystem = lines[1].trim().toLowerCase(); // e.g. ntfs, fat32
                    }
                } catch (winError) {
                    detectedFilesystem = 'win32-fs';
                }
            }
        }

        // 3. Enforce the banned filesystem constraints
        for (const pattern of BANNED_FILESYSTEM_PATTERNS) {
            if (detectedFilesystem.includes(pattern)) {
                errors.push(`[STORAGE_VALIDATION_ERROR] Write path is located on unsupported filesystem type: "${detectedFilesystem}" (Banned pattern: "${pattern}"). Risk: Broken durability locks.`);
            }
        }
    } catch (e: any) {
        errors.push(`[STORAGE_VALIDATION_ERROR] Failed to audit host storage filesystem: ${e.message}`);
    }

    return {
        success: errors.length === 0,
        filesystemType: detectedFilesystem,
        errors
    };
}
