'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  createCRMCommentAction,
  getCRMCommentsAction,
  updateCRMCommentAction,
  deleteCRMCommentAction
} from '@/modules/crm/actions/comment.actions';
import { EntityType } from '@prisma/client';
import { format } from 'date-fns';
import { useUser } from '@clerk/nextjs';
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react';

const PAGE_LIMIT = 50;

export function CRMCommentSection({
  entityType,
  entityId
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { user } = useUser();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  // New comment
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Load initial comments
  // ---------------------------------------------------------------------------
  async function loadComments() {
    setLoading(true);
    const res = await getCRMCommentsAction(entityType, entityId, undefined, PAGE_LIMIT);
    if (res.success && res.data) {
      setComments(res.data.data);
      setHasMore(res.data.hasMore);
      setCursor(res.data.nextCursor ?? undefined);
    } else {
      toast.error('Failed to load comments');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadComments();
  }, [entityId]);

  // ---------------------------------------------------------------------------
  // Load more (older comments)
  // ---------------------------------------------------------------------------
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    const res = await getCRMCommentsAction(entityType, entityId, cursor, PAGE_LIMIT);
    if (res.success && res.data) {
      setComments(prev => [...prev, ...res.data.data]);
      setHasMore(res.data.hasMore);
      setCursor(res.data.nextCursor ?? undefined);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, cursor, entityType, entityId]);

  // ---------------------------------------------------------------------------
  // Post new comment
  // ---------------------------------------------------------------------------
  async function handleCreate(parentId?: string) {
    const content = parentId ? replyContent : newContent;
    if (!content.trim()) return;

    setSubmitting(true);
    const res = await createCRMCommentAction(entityType, entityId, content, parentId);
    if (res.success) {
      toast.success(parentId ? 'Reply added' : 'Comment posted');
      setNewContent('');
      setReplyContent('');
      setReplyingTo(null);
      await loadComments(); // Reload to get fresh data with reply counts
    } else {
      toast.error(res.error || 'Failed to post comment');
    }
    setSubmitting(false);
  }

  // ---------------------------------------------------------------------------
  // Edit comment
  // ---------------------------------------------------------------------------
  function startEdit(comment: any) {
    setEditingId(comment.id);
    setEditContent(comment.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
  }

  async function saveEdit(commentId: string) {
    if (!editContent.trim()) return;
    setSaving(true);
    const res = await updateCRMCommentAction(commentId, editContent);
    if (res.success) {
      toast.success('Comment updated');
      // Update in-place
      setComments(prev =>
        prev.map(c => c.id === commentId ? { ...c, content: editContent, updatedAt: new Date().toISOString() } : c)
      );
      cancelEdit();
    } else {
      toast.error(res.error || 'Failed to update comment');
    }
    setSaving(false);
  }

  // ---------------------------------------------------------------------------
  // Delete comment
  // ---------------------------------------------------------------------------
  async function handleDelete(commentId: string) {
    if (!window.confirm('Delete this comment?')) return;
    const res = await deleteCRMCommentAction(commentId);
    if (res.success) {
      toast.success('Comment deleted');
      setComments(prev => prev.filter(c => c.id !== commentId));
    } else {
      toast.error(res.error || 'Failed to delete');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* New Comment Box */}
      <div className="flex gap-2 items-start">
        <Textarea
          placeholder="Add a comment..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="resize-none"
          rows={2}
          disabled={submitting}
        />
        <Button
          onClick={() => handleCreate()}
          disabled={!newContent.trim() || submitting}
          size="sm"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
        </Button>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading comments...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isAuthor = comment.user.email === currentUserEmail;
            const isEditing = editingId === comment.id;

            return (
              <Card key={comment.id} className="bg-card border">
                <CardContent className="p-4 space-y-2">
                  {/* Comment Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-semibold text-sm truncate">{comment.user.email}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(comment.createdAt), 'PP p')}
                        {comment.updatedAt !== comment.createdAt && (
                          <span className="ml-1 italic">(edited)</span>
                        )}
                      </span>
                    </div>
                    {isAuthor && !isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(comment)}
                          title="Edit comment"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(comment.id)}
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Comment Body / Inline Edit */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="resize-none text-sm"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(comment.id)}
                          disabled={!editContent.trim() || saving}
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Save</>}
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelEdit}>
                          <X className="w-3.5 h-3.5 mr-1" />Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
                  )}

                  {/* Reply Toggle */}
                  {!isEditing && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-0 text-xs text-muted-foreground"
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      >
                        {replyingTo === comment.id ? 'Cancel Reply' : `Reply${comment.replies?.length > 0 ? ` (${comment.replies.length})` : ''}`}
                      </Button>
                    </div>
                  )}

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="flex gap-2 mt-2 ml-4 border-l-2 pl-4">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="resize-none text-sm"
                        rows={2}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCreate(comment.id)}
                        disabled={!replyContent.trim() || submitting}
                      >
                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reply'}
                      </Button>
                    </div>
                  )}

                  {/* Replies List */}
                  {comment.replies?.length > 0 && (
                    <div className="ml-4 pl-4 border-l-2 space-y-3 mt-3">
                      {comment.replies.map((reply: any) => {
                        const isReplyAuthor = reply.user.email === currentUserEmail;
                        return (
                          <div key={reply.id} className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-baseline gap-2 min-w-0">
                                <span className="font-semibold text-xs truncate">{reply.user.email}</span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {format(new Date(reply.createdAt), 'PP p')}
                                </span>
                              </div>
                              {isReplyAuthor && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => handleDelete(reply.id)}
                                  title="Delete reply"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <div className="text-xs whitespace-pre-wrap">{reply.content}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading...</>
                ) : (
                  'Load older comments'
                )}
              </Button>
            </div>
          )}

          {comments.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Be the first to comment.
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
