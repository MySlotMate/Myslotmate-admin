import React, { useState, useEffect, useRef } from 'react';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { RichTextEditor, RichTextView } from '../../components/RichTextEditor';
import type { Blog } from '../../types';
import { 
  fetchAdminBlogs, 
  createBlog, 
  updateBlog, 
  deleteBlog, 
  publishBlog, 
  unpublishBlog, 
  uploadBlogCover 
} from '../../api/blogs';
import { ImageCropModal } from '../../components/ImageCropModal';
import { useAuth } from '../../context/AuthContext';

// Helper functions to convert between the frontend's block-based content format (stored as JSON)
// and raw HTML for the editor.
function parseContentToHtml(content: string | null | undefined): string {
  if (!content?.trim()) return '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed
        .map((block) => {
          if (block.type === 'text') {
            return block.content || '';
          } else if (block.type === 'image') {
            const caption = block.caption ? ` alt="${block.caption}"` : '';
            return `<p><img class="rt-image rounded-lg" src="${block.url}"${caption}></p>`;
          }
          return '';
        })
        .join('');
    }
  } catch (e) {
    // Fallback if content is already raw HTML
  }
  return content;
}

function serializeHtmlToContent(html: string): string {
  return JSON.stringify([
    {
      id: Math.random().toString(36).substring(2, 11),
      type: 'text',
      content: html,
    },
  ]);
}

export const BlogsDirectory: React.FC = () => {
  const { user } = useAuth();

  const [pendingCoverCrop, setPendingCoverCrop] = useState<File | null>(null);
  const [pendingInlineCrop, setPendingInlineCrop] = useState<File | null>(null);
  const inlineFileInputRef = useRef<HTMLInputElement | null>(null);
  const inlineResolverRef = useRef<((url: string | null) => void) | null>(null);

  const [blogs, setBlogs] = useState<Blog[]>([]);

  // Background auto-signup for static admin email if no user profile exists in database
  useEffect(() => {
    if (user?.email) {
      const prefix = user.email.split('@')[0] || 'admin';
      import('../../api/client').then(({ apiFetch }) => {
        apiFetch('/auth/signup', {
          method: 'POST',
          auth: false,
          body: {
            auth_uid: `admin_static_${prefix}`,
            email: user.email,
            name: user.name || 'Administrator',
            phn_number: '+910000000000',
          },
        }).catch((err: any) => {
          if (err?.status !== 409) {
            console.error('Error auto-creating admin user profile:', err);
          }
        });
      });
    }
  }, [user]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'management' | 'editor' | 'preview'>('management');
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  // Editor states (bound to active editing blog)
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('City Guides');
  const [formDesc, setFormDesc] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formReadTime, setFormReadTime] = useState(5);
  
  // Stats and display metadata for preview/editing
  const [previewAuthor, setPreviewAuthor] = useState('');
  const [previewStatus, setPreviewStatus] = useState<'Draft' | 'Published'>('Draft');

  // Load blogs from API
  const loadBlogs = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminBlogs();
      setBlogs(data);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch blogs from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  // 1. Management Filter Logic
  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All categories' || blog.category === categoryFilter;
    
    const isPublished = !!blog.published_at;
    const status = isPublished ? 'Published' : 'Draft';
    const matchesStatus = statusFilter === 'All statuses' || status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All categories');
    setStatusFilter('All statuses');
  };

  // 2. Editor Load / Save Logic
  const handleCreateNew = () => {
    setEditingBlogId(null);
    setFormTitle('');
    setFormCategory('City Guides');
    setFormDesc('');
    setFormContent('');
    setFormCoverUrl('');
    setFormReadTime(5);
    setPreviewAuthor('Logged-in Admin');
    setPreviewStatus('Draft');
    setActiveTab('editor');
  };

  const handleEditLoad = (blog: Blog) => {
    setEditingBlogId(blog.id);
    setFormTitle(blog.title);
    setFormCategory(blog.category);
    setFormDesc(blog.description || '');
    setFormContent(parseContentToHtml(blog.content));
    setFormCoverUrl(blog.cover_image_url || '');
    setFormReadTime(blog.read_time_minutes || 5);
    setPreviewAuthor(blog.author_name);
    setPreviewStatus(blog.published_at ? 'Published' : 'Draft');
    setActiveTab('editor');
  };

  const handleSave = async (publishState: 'Draft' | 'Published') => {
    if (!formTitle.trim()) {
      alert('Title is required.');
      return;
    }
    if (!formContent.trim()) {
      alert('Blog content is required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formTitle,
        description: formDesc || undefined,
        category: formCategory,
        content: serializeHtmlToContent(formContent),
        cover_image_url: formCoverUrl || null,
        read_time_minutes: formReadTime,
      };

      let savedBlog: Blog;
      if (editingBlogId) {
        // Edit existing
        savedBlog = await updateBlog(editingBlogId, payload);
        
        // If we want to align publishing status with the clicked action button
        const wasPublished = !!savedBlog.published_at;
        if (publishState === 'Published' && !wasPublished) {
          savedBlog = await publishBlog(savedBlog.id);
        } else if (publishState === 'Draft' && wasPublished) {
          savedBlog = await unpublishBlog(savedBlog.id);
        }
      } else {
        // Create new
        savedBlog = await createBlog(payload);
        if (publishState === 'Published') {
          savedBlog = await publishBlog(savedBlog.id);
        }
      }

      alert(`Blog saved successfully as ${publishState}!`);
      await loadBlogs();
      setActiveTab('management');
    } catch (err: any) {
      alert(err?.message || 'Error occurred while saving blog.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      try {
        setLoading(true);
        await deleteBlog(id);
        alert('Blog post deleted successfully.');
        await loadBlogs();
      } catch (err: any) {
        alert(err?.message || 'Error occurred while deleting blog.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTogglePublish = async (id: string, isPublished: boolean) => {
    try {
      setLoading(true);
      if (isPublished) {
        await unpublishBlog(id);
        alert('Blog post unpublished.');
      } else {
        await publishBlog(id);
        alert('Blog post published successfully.');
      }
      await loadBlogs();
    } catch (err: any) {
      alert(err?.message || 'Error occurred during status update.');
    } finally {
      setLoading(false);
    }
  };

  // ── Inline images inserted from inside the rich text editor ──────────
  const requestInlineImage = (): Promise<string | null> => {
    return new Promise((resolve) => {
      inlineResolverRef.current = resolve;
      inlineFileInputRef.current?.click();
    });
  };

  const finishInlineFlow = (url: string | null) => {
    inlineResolverRef.current?.(url);
    inlineResolverRef.current = null;
    setPendingInlineCrop(null);
  };

  const handleInlineFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) {
      finishInlineFlow(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      finishInlineFlow(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10 MB.');
      finishInlineFlow(null);
      return;
    }
    setPendingInlineCrop(file);
  };

  const handleInlineCropConfirm = async (blob: Blob, originalName: string) => {
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const baseName = originalName.replace(/\.[^.]+$/, '') || 'image';
    const cropped = new File([blob], `${baseName}-cropped.${ext}`, { type: blob.type });

    try {
      setLoading(true);
      const url = await uploadBlogCover(cropped);
      if (!url) {
        alert('Image upload failed - no URL returned');
        finishInlineFlow(null);
        return;
      }
      finishInlineFlow(url);
    } catch (error: any) {
      alert(error?.message || 'Image upload failed');
      finishInlineFlow(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Featured cover image handlers ──────────────────────────────────
  const handleCoverFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Cover image must be under 10 MB.');
      return;
    }
    setPendingCoverCrop(file);
  };

  const handleCoverCropConfirm = async (blob: Blob, originalName: string) => {
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const baseName = originalName.replace(/\.[^.]+$/, '') || 'cover';
    const cropped = new File([blob], `${baseName}-cropped.${ext}`, { type: blob.type });

    try {
      setLoading(true);
      const url = await uploadBlogCover(cropped);
      if (url) {
        setFormCoverUrl(url);
        alert('Cover image uploaded successfully!');
      } else {
        alert('Upload succeeded but no URL was returned.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error uploading cover image.');
    } finally {
      setLoading(false);
      setPendingCoverCrop(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not published';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Content operations</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Blog Management
          </h3>
          <p className="mt-2 text-xs text-mist">Manage editorial content that appears on the public website.</p>
        </div>
        <Button variant="primary" onClick={handleCreateNew} disabled={loading}>
          Create New Blog
        </Button>
      </div>

      {/* Local Tab bar switcher */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setActiveTab('management')}
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold cursor-pointer transition hover:border-brand-300 hover:text-brand-700 ${
            activeTab === 'management'
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-brand-100 bg-white text-slate-600'
          }`}
        >
          Management
        </button>
        <button 
          onClick={() => {
            if (activeTab !== 'editor' && !editingBlogId) handleCreateNew();
            else setActiveTab('editor');
          }}
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold cursor-pointer transition hover:border-brand-300 hover:text-brand-700 ${
            activeTab === 'editor'
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-brand-100 bg-white text-slate-600'
          }`}
        >
          Editor {editingBlogId ? `(Edit Mode)` : '(New)'}
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold cursor-pointer transition hover:border-brand-300 hover:text-brand-700 ${
            activeTab === 'preview'
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-brand-100 bg-white text-slate-600'
          }`}
        >
          Preview
        </button>
      </div>

      {/* VIEW 1: MANAGEMENT TAB */}
      {activeTab === 'management' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Filters panel */}
          <div className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md p-5">
            <div className="grid gap-4 lg:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
              <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="M20 20l-3.5-3.5" stroke-linecap="round"></path>
                </svg>
                <input 
                  className="w-full bg-transparent text-sm outline-none" 
                  type="search" 
                  placeholder="Search blogs by title..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option>All categories</option>
                <option>City Guides</option>
                <option>Host Education</option>
                <option>Weekend Plans</option>
                <option>Wellness</option>
                <option>Creative Activities</option>
              </select>

              <select className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All statuses</option>
                <option>Draft</option>
                <option>Published</option>
              </select>

              <Button variant="secondary" onClick={handleResetFilters}>
                Reset filters
              </Button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && blogs.length === 0 ? (
            <Card className="p-10 text-center flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              <p className="text-slate-400 font-medium">Fetching blog list from backend...</p>
            </Card>
          ) : filteredBlogs.length > 0 ? (
            <Table headers={['Blog ID', 'Title', 'Author', 'Category', 'Status', 'Published Date', 'Read Time', 'Actions']}>
              {filteredBlogs.map((blog) => {
                const isPub = !!blog.published_at;
                return (
                  <tr key={blog.id} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
                    <td className="px-6 py-4 align-top font-extrabold text-ink text-xs truncate max-w-[120px]">{blog.id}</td>
                    <td className="px-6 py-4 align-top font-bold text-ink max-w-[200px]">{blog.title}</td>
                    <td className="px-6 py-4 align-top text-slate-700 font-medium">{blog.author_name}</td>
                    <td className="px-6 py-4 align-top text-slate-600">{blog.category}</td>
                    <td className="px-6 py-4 align-top">
                      <Badge color={isPub ? 'green' : 'amber'}>{isPub ? 'Published' : 'Draft'}</Badge>
                    </td>
                    <td className="px-6 py-4 align-top text-slate-500">{formatDate(blog.published_at)}</td>
                    <td className="px-6 py-4 align-top font-semibold text-slate-700">{blog.read_time_minutes} min</td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="action" onClick={() => handleEditLoad(blog)} disabled={loading}>
                          Edit
                        </Button>
                        <Button variant="action" onClick={() => {
                          handleEditLoad(blog);
                          setActiveTab('preview');
                        }} disabled={loading}>
                          Preview
                        </Button>
                        <Button variant="action" onClick={() => handleTogglePublish(blog.id, isPub)} disabled={loading}>
                          {isPub ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button variant="action" onClick={() => handleDelete(blog.id)} className="hover:text-rose-600 hover:border-rose-300" disabled={loading}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <Card className="p-10 text-center">
              <p className="text-slate-400 font-medium">No blog posts found matching your criteria.</p>
            </Card>
          )}
        </div>
      )}

      {/* VIEW 2: EDITOR TAB */}
      {activeTab === 'editor' && (
        <Card className="p-6 bg-white/95 animate-in fade-in duration-200">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogTitle">Blog Title</label>
              <input 
                id="blogTitle" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="text" 
                placeholder="10 Unique Experiences in Guwahati"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogCategory">Category</label>
              <select id="blogCategory" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                <option>City Guides</option>
                <option>Host Education</option>
                <option>Weekend Plans</option>
                <option>Wellness</option>
                <option>Creative Activities</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="readTime">Read Time (minutes)</label>
              <input 
                id="readTime" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="number" 
                value={formReadTime}
                onChange={(e) => setFormReadTime(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogCover">Cover Image (Featured Image)</label>
              <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/50 p-6 space-y-4">
                <input id="blogCover" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" type="file" accept="image/*" onChange={handleCoverFilePicked} disabled={loading} />
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Or enter image URL directly:</span>
                  <input 
                    className="flex-1 rounded-xl border border-brand-100 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-400" 
                    type="text" 
                    placeholder="https://example.com/image.jpg"
                    value={formCoverUrl}
                    onChange={(e) => setFormCoverUrl(e.target.value)}
                  />
                </div>
                
                {formCoverUrl && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-brand-100 max-w-xs shadow-sm bg-white p-1">
                    <img src={formCoverUrl} alt="Cover preview" className="w-full h-32 object-cover rounded-lg" />
                    <button 
                      type="button" 
                      onClick={() => setFormCoverUrl('')}
                      className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700 transition"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500">Recommended: 1600 x 900 cover image. SVG, PNG, JPG accepted.</p>
              </div>
            </div>

            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600">Short Description</label>
              <RichTextEditor
                value={formDesc}
                onChange={setFormDesc}
                placeholder="Enter a brief excerpt summarizing this blog post..."
                className="rounded-2xl"
                disabled={loading}
              />
            </div>

            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600">Blog Content Editor</label>
              <RichTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Draft your editorial content here..."
                className="rounded-2xl min-h-[280px]"
                disabled={loading}
                onRequestImage={requestInlineImage}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
            <Button variant="secondary" onClick={() => handleSave('Draft')} disabled={loading}>
              Save Draft
            </Button>
            <Button variant="secondary" onClick={() => setActiveTab('preview')} disabled={loading}>
              Preview Blog
            </Button>
            <Button variant="primary" onClick={() => handleSave('Published')} disabled={loading}>
              Publish Blog
            </Button>
          </div>
        </Card>
      )}

      {/* VIEW 3: PREVIEW TAB */}
      {activeTab === 'preview' && (
        <Card className="overflow-hidden bg-white/95 animate-in fade-in duration-200">
          <div className="h-72 relative flex items-center justify-center overflow-hidden bg-slate-900">
            {formCoverUrl ? (
              <img src={formCoverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-75" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-brand-700 via-brand-500 to-sky-300" />
            )}
            <p className="relative z-10 text-white font-display text-4xl font-extrabold drop-shadow-md text-center px-4 max-w-3xl">
              {formTitle || 'Untitled Blog Post'}
            </p>
          </div>
          <div className="p-6 lg:p-10">
            <div className="mx-auto max-w-4xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Website preview</p>
              <h4 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                {formTitle || '10 Unique Experiences in Guwahati'}
              </h4>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="font-bold text-ink">By {previewAuthor || 'Admin'}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                <span>Category: <strong className="text-brand-600 font-bold">{formCategory}</strong></span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                <span>Read Time: <strong className="text-brand-600 font-bold">{formReadTime} min</strong></span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                <span>Status: <Badge color={previewStatus === 'Published' ? 'green' : 'amber'}>{previewStatus}</Badge></span>
              </div>
              
              <div className="mt-6 border-l-4 border-brand-300 bg-brand-50/50 p-4 rounded-r-2xl italic text-slate-700">
                {formDesc ? (
                  <RichTextView html={formDesc} />
                ) : (
                  'Short description/excerpt text will appear here as the summary block.'
                )}
              </div>

              <div className="mt-8">
                {formContent ? (
                  <RichTextView html={formContent} className="text-sm leading-8 text-slate-700" />
                ) : (
                  <p className="text-sm leading-8 text-slate-700">Main body contents of the blog post. Use the rich text editor to format your content.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
      {/* Hidden file input for inline images */}
      <input 
        ref={inlineFileInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleInlineFilePicked} 
      />

      {/* Crop Modals */}
      <ImageCropModal 
        file={pendingInlineCrop} 
        onClose={() => finishInlineFlow(null)} 
        onConfirm={handleInlineCropConfirm} 
      />

      <ImageCropModal 
        file={pendingCoverCrop} 
        aspect={16 / 9} 
        onClose={() => setPendingCoverCrop(null)} 
        onConfirm={handleCoverCropConfirm} 
      />
    </div>
  );
};
