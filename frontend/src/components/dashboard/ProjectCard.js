'use client';
export default function ProjectCard({ project, onOpen, onDelete }) {
  return (
    <div
      className="bg-brand-base p-6 hover:bg-brand-surface1 transition-colors cursor-pointer group"
      onClick={() => onOpen(project)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold group-hover:text-brand-accent transition-colors">
          {project.name}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
          className="text-xs text-brand-text3 hover:text-brand-error transition-colors opacity-0 group-hover:opacity-100"
        >
          ×
        </button>
      </div>
      {project.description && (
        <p className="text-xs text-brand-text2 mb-3 line-clamp-2">{project.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-brand-text3 font-mono">
        <span>{project.language}</span>
        <span>·</span>
        <span>{project.file_count || 0} files</span>
      </div>
    </div>
  );
}
