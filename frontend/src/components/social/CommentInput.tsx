import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Image as ImageIcon, Video, X } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import { DEFAULT_AVATAR } from '../common';

interface CommentInputProps {
  readonly onSubmit: (
    content: string,
    imageFile: File | null,
    videoFile: File | null
  ) => Promise<void>;
  readonly replyTo?: { id: string; username: string } | null;
  readonly onCancelReply?: () => void;
  readonly isExpanded?: boolean;
  readonly onToggleExpand?: (expanded: boolean) => void;
}

export default function CommentInput({
  onSubmit,
  replyTo,
  onCancelReply,
  isExpanded: controlledExpanded,
  onToggleExpand,
}: CommentInputProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [localExpanded, setLocalExpanded] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isExpanded = controlledExpanded ?? localExpanded;

  useEffect(() => {
    if (replyTo) {
      setNewComment(`@${replyTo.username} `);
      if (inputRef.current) inputRef.current.focus();
    }
  }, [replyTo]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setVideoFile(null);
      setVideoPreview(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle video selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert(t('comments.videoTooLarge', 'Video must be under 50MB'));
        return;
      }
      setVideoFile(file);
      setImageFile(null);
      setImagePreview(null);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const removeMedia = () => {
    setImageFile(null);
    setImagePreview(null);
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user?.id || (!newComment.trim() && !imageFile && !videoFile) || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(newComment, imageFile, videoFile);
      setNewComment('');
      removeMedia();
      if (onToggleExpand) onToggleExpand(false);
      else setLocalExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = () => {
    const next = true;
    if (onToggleExpand) onToggleExpand(next);
    else setLocalExpanded(next);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    if (!newComment.trim() && !imageFile && !videoFile) {
      if (onCancelReply) onCancelReply();
      if (onToggleExpand) onToggleExpand(false);
      else setLocalExpanded(false);
    }
  };

  if (!user) return null;

  return (
    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
      {isExpanded ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img
                src={user.user_metadata?.avatar_url || DEFAULT_AVATAR}
                alt="You"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="font-semibold text-sm text-black dark:text-white">
                {user.user_metadata?.username || user.email?.split('@')[0]}
              </span>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={20} />
            </button>
          </div>

          {replyTo && (
            <div className="flex items-center justify-between mb-2 text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/30 rounded px-2 py-1">
              <span>
                {t('comments.replyingTo', 'Replying to')}{' '}
                <span className="font-semibold text-blue-500">@{replyTo.username}</span>
              </span>
              <button onClick={onCancelReply} className="text-blue-500 ml-2">
                <X size={14} />
              </button>
            </div>
          )}

          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.writeComment', 'Write your comment...')}
            rows={4}
            className="w-full bg-white dark:bg-gray-800 text-sm text-black dark:text-white placeholder-gray-400 outline-none resize-none rounded-lg p-3 border border-gray-200 dark:border-gray-700 focus:border-blue-500"
          />

          {(imagePreview || videoPreview) && (
            <div className="relative mt-2 inline-block">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg" />
              )}
              {videoPreview && (
                <video controls className="max-h-40 rounded-lg">
                  <source src={videoPreview} />
                  <track kind="captions" />
                </video>
              )}
              <button
                onClick={removeMedia}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                title={t('comments.attachImage', 'Attach image')}
              >
                <ImageIcon size={20} />
              </button>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
              <button
                onClick={() => videoInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition"
                title={t('comments.attachVideo', 'Attach video')}
              >
                <Video size={20} />
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={(!newComment.trim() && !imageFile && !videoFile) || submitting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition ${
                (!newComment.trim() && !imageFile && !videoFile) || submitting
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {t('comments.post', 'Post')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleToggle}
          className="w-full flex items-center gap-3 py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <img
            src={user.user_metadata?.avatar_url || DEFAULT_AVATAR}
            alt="You"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm text-gray-400">
            {t('comments.addComment', 'Add a comment...')}
          </span>
        </button>
      )}
    </div>
  );
}
