import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useLibrary } from '../contexts/LibraryContext';
import { useToast } from './Toast';

/**
 * Save for later, from anywhere: a quiet text toggle. Hidden for videos
 * you've already rated (rating moves a video out of Saved), unless it's
 * somehow still saved, and for visitors who aren't signed in.
 */
export default function SaveButton({ video, source = 'card', label = 'Save', className = '' }) {
  const { status } = useSession();
  const lib = useLibrary();
  const toast = useToast();
  const router = useRouter();

  if (status !== 'authenticated' || !video?.id) return null;
  const saved = lib.isSaved(video.id);
  if (!saved && lib.ratingOf(video.id) != null) return null;

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (saved) {
        await lib.unsave(video.id);
        toast('Taken out of Saved.', { action: { label: 'Undo', onClick: () => lib.save(video, source).catch(() => {}) } });
      } else {
        await lib.save(video, source);
        toast('Saved for later.', router.pathname === '/saved' ? {} : { action: { label: 'See Saved', onClick: () => router.push('/saved') } });
      }
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  return (
    <button
      type="button"
      className={`save${saved ? ' save--on' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Saved: ${video.title || 'this video'}. Take it out of Saved` : `Save ${video.title || 'this video'} for later`}
      onClick={toggle}
    >
      <span className="save__mark" aria-hidden="true" />
      {saved ? 'Saved' : label}
    </button>
  );
}
