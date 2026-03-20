// app/projects/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // In a real app, this would be GET /projects
        // const response = await axios.get(`${GATEWAY_URL}/projects`);
        // setProjects(response.data);
        
        // Mock data for now
        setProjects([
          { id: "1", name: "E-commerce Site", status: "READY", createdAt: "2024-03-01" },
          { id: "2", name: "AI Chatbot", status: "BUILDING", createdAt: "2024-03-15" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Your Projects</h1>
          <p className="text-gray-500 mt-1">Manage and edit your generated applications.</p>
        </div>
        <Link href="/projects/new">
          <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-black/20">
            <Plus size={20} />
            New Project
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Link key={project.id} href={`/editor?projectId=${project.id}`}>
              <div className="p-6 border rounded-2xl bg-white hover:border-black transition-all group cursor-pointer h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold group-hover:text-black transition-colors">{project.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${project.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-auto">Created on {project.createdAt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

