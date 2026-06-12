console.log('[DEBUG] Loading project-service.ts...');
import { db } from '@packages/db';
import type { Project, ProjectFile } from '@packages/contracts';

/**
 * PROJECT SERVICE
 * Handles persistence for missions (projects) and their associated files
 * using the centralized Prisma database.
 */
export const projectService = {
    async getProjects(tenantId: string) {
        try {
            const data = await db.project.findMany({
                where: { tenantId },
                orderBy: { updatedAt: 'desc' }
            });
            return data as any as Project[];
        } catch (error) {
            console.error('[ProjectService] Error fetching projects:', error);
            return null;
        }
    },

    async getPublicProjects(limit = 20) {
        try {
            const data = await db.project.findMany({
                where: { status: 'active' }, // Assuming 'active' projects can be public
                orderBy: { updatedAt: 'desc' },
                take: limit
            });
            return data as any as Project[];
        } catch (error) {
            console.error('[ProjectService] Error fetching public projects:', error);
            return null;
        }
    },

    async getProject(id: string, tenantId: string) {
        try {
            const data = await db.project.findFirst({
                where: { id, tenantId }
            });
            return data as any as Project;
        } catch (error) {
            console.error('[ProjectService] Error fetching project:', error);
            return null;
        }
    },

    async createProject(name: string, tenantId: string, description?: string, _type?: string) {
        try {
            const data = await db.project.create({
                data: {
                    tenantId,
                    name,
                    description,
                    status: 'draft'
                }
            });
            return { data: data as any as Project, error: null };
        } catch (error) {
            console.error('[ProjectService] Error creating project:', error);
            return { data: null, error };
        }
    },

    async getProjectFiles(projectId: string, tenantId: string) {
        try {
            // Scope lookup: Use parent relation to enforce tenancy in a single query
            const data = await db.projectFile.findMany({
                where: { 
                    projectId,
                    project: { tenantId }
                },
                orderBy: { path: 'asc' }
            });
            return data as any as ProjectFile[];
        } catch (error) {
            console.error('[ProjectService] Error fetching project files:', error);
            return null;
        }
    },

    async updateFile(id: string, content: string, tenantId: string) {
        try {
            // Verify that the file belongs to a project owned by this tenant
            const file = await db.projectFile.findFirst({
                where: {
                    id,
                    project: { tenantId }
                }
            });
            if (!file) {
                throw new Error('Unauthorized or file not found');
            }

            const data = await db.projectFile.update({
                where: { id },
                data: { content, updatedAt: new Date() }
            });
            return data as any as ProjectFile;
        } catch (error) {
            console.error('[ProjectService] Error updating file:', error);
            throw error;
        }
    },

    async updateProject(id: string, tenantId: string, project: Partial<Project>) {
        try {
            const data = await db.project.updateMany({
                where: { id, tenantId },
                data: {
                    ...project,
                    updatedAt: new Date()
                } as any
            });
            if (data.count === 0) throw new Error('Project not found or tenant mismatch');
            return { data: project as any as Project, error: null };
        } catch (error) {
            console.error('[ProjectService] Error updating project:', error);
            return { data: null, error };
        }
    },

    async deleteProject(id: string, tenantId: string) {
        try {
            const result = await db.project.deleteMany({
                where: { id, tenantId }
            });
            return result.count > 0;
        } catch (error) {
            console.error('[ProjectService] Error deleting project:', error);
            return false;
        }
    },

    async verifyProjectOwnership(projectId: string, tenantId: string) {
        try {
            const data = await db.project.findUnique({
                where: { id: projectId },
                select: { tenantId: true }
            });
            return data?.tenantId === tenantId;
        } catch (_error) {
            return false;
        }
    },

    async saveProjectFiles(projectId: string, files: { path: string, content: string, language?: string }[], tenantId: string) {
        try {
            // Verify project ownership first
            const isOwner = await this.verifyProjectOwnership(projectId, tenantId);
            if (!isOwner) {
                throw new Error('Unauthorized or project not found');
            }

            // 1. Deduplicate files by path
            const uniqueFilesMap = new Map<string, any>();
            files.forEach(f => {
                if (f.path) {
                    let normPath = f.path.replace(/\\/g, '/');
                    if (!normPath.startsWith('/')) normPath = '/' + normPath;
                    uniqueFilesMap.set(normPath, { ...f, path: normPath });
                }
            });
            const uniqueFiles = Array.from(uniqueFilesMap.values());

            // 2. Transactional Upsert: Delete existing, Insert new
            // Verified: Enforce tenancy on the primary delete operation
            await db.$transaction([
                db.projectFile.deleteMany({ 
                    where: { 
                        projectId,
                        project: { tenantId } // Safely enforce parent relation tenancy
                    } 
                }),
                db.projectFile.createMany({
                    data: uniqueFiles.map(f => ({
                        projectId,
                        path: f.path,
                        content: f.content,
                        language: f.language || f.path.split('.').pop()
                    }))
                })
            ]);

            return true;
        } catch (error) {
            console.error('[ProjectService] Error saving project files:', error);
            throw error;
        }
    }
};
