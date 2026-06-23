interface FileIconProps {
  name: string;
  isDir: boolean;
  className?: string;
}

export function FileIcon({ name, isDir, className = "text-base" }: FileIconProps) {
  if (isDir) {
    return <span className={`i-ri-folder-5-fill text-amber-500 ${className}`} />;
  }

  const ext = name.split(".").pop()?.toLowerCase() || "";

  // Categorize extension
  const imageExts = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"];
  const videoExts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v"];
  const audioExts = ["mp3", "wav", "flac", "ogg", "m4a", "wma", "aac"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
  const docExts = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "md", "csv"];
  const codeExts = ["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "go", "java", "c", "cpp", "sh", "yml", "yaml"];

  if (imageExts.includes(ext)) {
    return <span className={`i-ri-image-2-fill text-sky-500 ${className}`} />;
  }
  if (videoExts.includes(ext)) {
    return <span className={`i-ri-video-fill text-rose-500 ${className}`} />;
  }
  if (audioExts.includes(ext)) {
    return <span className={`i-ri-music-2-fill text-emerald-500 ${className}`} />;
  }
  if (archiveExts.includes(ext)) {
    return <span className={`i-ri-file-zip-fill text-orange-500 ${className}`} />;
  }
  if (docExts.includes(ext)) {
    return <span className={`i-ri-file-text-fill text-blue-500 ${className}`} />;
  }
  if (codeExts.includes(ext)) {
    return <span className={`i-ri-file-code-fill text-indigo-400 ${className}`} />;
  }

  return <span className={`i-ri-file-3-line text-slate-400 ${className}`} />;
}
