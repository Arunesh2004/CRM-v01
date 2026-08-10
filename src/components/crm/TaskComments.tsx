'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { User, Send, Trash2, Loader2 } from 'lucide-react';
import { createTaskCommentAction, deleteTaskCommentAction } from '@/modules/crm/actions/task.actions';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

export function TaskComments({ taskId, initialComments }: { taskId: string, initialComments: any[] }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await createTaskCommentAction(taskId, content.trim());
      if (res.success) {
        setContent('');
        router.refresh();
      } else {
        alert(res.error || 'Failed to add comment');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    setDeletingId(id);
    try {
      const res = await deleteTaskCommentAction(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete comment');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {initialComments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/10">
            No comments yet. Start the discussion!
          </div>
        ) : (
          initialComments.map((comment) => (
            <div key={comment.id} className="flex gap-4 group">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                {comment.user?.email ? comment.user.email.charAt(0) : 'U'}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {comment.user?.firstName ? `${comment.user.firstName} ${comment.user.lastName}` : comment.user?.email || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    title="Delete Comment"
                  >
                    {deletingId === comment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-sm text-foreground bg-muted/20 p-3 rounded-lg border inline-block min-w-[200px]">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-start gap-3 pt-4 border-t">
        <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <User className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment or update..."
            className="w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={!content.trim() || isSubmitting}
              className="flex items-center gap-2"
              size="sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
