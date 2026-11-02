import { useMutation } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { errorMessage, uploadImage, type UploadFolder } from '../../api/client';
import { SmartImage } from '../../components/SmartImage';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

function fileProblem(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return `"${file.name}" isn't supported. Use a JPG, PNG or WebP image.`;
  if (file.size > MAX_BYTES) return `"${file.name}" is larger than 5 MB. Choose a smaller image.`;
  return null;
}

function DropArea({
  multiple,
  busy,
  onFiles,
  children,
}: {
  multiple: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
  children: (dragging: boolean) => ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      aria-busy={busy}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        // Moving over a child also fires this, so only react on really leaving the area.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles([...event.dataTransfer.files]);
      }}
      className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition focus-within:ring-2 focus-within:ring-brand/40 ${dragging ? 'border-brand bg-brand-soft' : 'border-neutral-300 bg-neutral-50 hover:border-brand hover:bg-brand-soft/50'}`}
    >
      {children(dragging)}
      <span className="text-xs text-neutral-600">JPG, PNG or WebP, up to 5 MB</span>
      <input
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple={multiple}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </label>
  );
}

function UploadIcon({ busy }: { busy: boolean }) {
  return (
    <span className={`flex size-14 items-center justify-center rounded-full bg-white text-brand shadow-sm ${busy ? 'animate-pulse' : ''}`}>
      <ImagePlus className="size-7" />
    </span>
  );
}

/** One image. Drag it in, or click or press Enter to browse. Previews and uploads straight away. */
export function ImageDropzone({
  value,
  onChange,
  folder,
  fit = 'contain',
}: {
  value: string;
  onChange: (url: string) => void;
  folder: UploadFolder;
  fit?: 'cover' | 'contain';
}) {
  const [problem, setProblem] = useState<string>();
  const upload = useMutation({
    mutationFn: (file: File) => uploadImage(file, folder),
    onSuccess: onChange,
    onError: (error) => setProblem(errorMessage(error)),
  });

  const accept = (files: File[]) => {
    const [file] = files;
    if (!file) return;
    const issue = fileProblem(file);
    setProblem(issue ?? undefined);
    if (!issue) upload.mutate(file);
  };

  return (
    <div>
      <DropArea multiple={false} busy={upload.isPending} onFiles={accept}>
        {(dragging) => (
          <>
            {value && !upload.isPending ? (
              <SmartImage src={value} alt="Selected image" fit={fit} tone="none" className="size-28 rounded-lg" />
            ) : (
              <UploadIcon busy={upload.isPending} />
            )}
            <span className="text-sm font-medium">
              {upload.isPending
                ? 'Uploading…'
                : dragging
                  ? 'Drop the image here'
                  : value
                    ? 'Drag a new image here, or click to replace'
                    : 'Drag and drop an image here, or click to browse'}
            </span>
          </>
        )}
      </DropArea>
      {problem && <p className="mt-2 text-xs font-medium text-red-600" role="alert">{problem}</p>}
    </div>
  );
}

/** Several images at once. Bad files are reported and skipped, and the rest still upload. */
export function ImagesDropzone({ onAdded, room, folder }: { onAdded: (url: string) => void; room: number; folder: UploadFolder }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const accept = async (files: File[]) => {
    if (files.length === 0) return;
    const issues = files.map(fileProblem).filter((issue): issue is string => Boolean(issue));
    const valid = files.filter((file) => !fileProblem(file));
    const allowed = valid.slice(0, room);
    if (valid.length > allowed.length) issues.push(`A product can have 10 images, so ${valid.length - allowed.length} were skipped.`);

    setProgress({ done: 0, total: allowed.length });
    // One at a time, so the images keep the order they were chosen in.
    for (const [index, file] of allowed.entries()) {
      try {
        onAdded(await uploadImage(file, folder));
      } catch (error) {
        issues.push(`"${file.name}": ${errorMessage(error)}`);
      }
      setProgress({ done: index + 1, total: allowed.length });
    }
    setProgress(null);
    setProblems(issues);
  };

  return (
    <div>
      <DropArea multiple busy={progress !== null} onFiles={accept}>
        {(dragging) => (
          <>
            <UploadIcon busy={progress !== null} />
            <span className="text-sm font-medium">
              {progress
                ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                : dragging
                  ? 'Drop the images here'
                  : 'Drag and drop images here, or click to browse'}
            </span>
          </>
        )}
      </DropArea>
      {problems.map((problem) => <p key={problem} className="mt-2 text-xs font-medium text-red-600" role="alert">{problem}</p>)}
    </div>
  );
}
