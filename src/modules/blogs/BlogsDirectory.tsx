import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Blog } from '../../types';

export const BlogsDirectory: React.FC = () => {
  const { blogs, setBlogs } = useMockData();
  const [activeTab, setActiveTab] = useState<'management' | 'editor' | 'preview'>('management');
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  // Editor states (bound to active editing blog)
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formCategory, setFormCategory] = useState('City Guides');
  const [formDesc, setFormDesc] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formSeoTitle, setFormSeoTitle] = useState('');
  const [formSeoDesc, setFormSeoDesc] = useState('');

  // 1. Management Filter Logic
  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All categories' || blog.category === categoryFilter;
    const matchesStatus = statusFilter === 'All statuses' || blog.status === statusFilter;
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
    setFormSlug('');
    setFormAuthor('Aarav Sharma');
    setFormCategory('City Guides');
    setFormDesc('');
    setFormContent('');
    setFormTags('');
    setFormSeoTitle('');
    setFormSeoDesc('');
    setActiveTab('editor');
  };

  const handleEditLoad = (blog: Blog) => {
    setEditingBlogId(blog.blogId);
    setFormTitle(blog.title);
    setFormSlug(blog.slug);
    setFormAuthor(blog.author);
    setFormCategory(blog.category);
    setFormDesc(blog.description);
    setFormContent(blog.content);
    setFormTags(blog.tags);
    setFormSeoTitle(blog.seoTitle);
    setFormSeoDesc(blog.seoDescription);
    setActiveTab('editor');
  };

  const handleSave = (publishState: 'Draft' | 'Published') => {
    if (!formTitle || !formAuthor) {
      alert('Title and Author Name are required.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    if (editingBlogId) {
      // Edit existing
      setBlogs(prev => prev.map(b => {
        if (b.blogId === editingBlogId) {
          return {
            ...b,
            title: formTitle,
            slug: formSlug || formTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
            author: formAuthor,
            category: formCategory,
            status: publishState,
            publishedDate: publishState === 'Published' ? todayStr : 'Not published',
            description: formDesc,
            content: formContent,
            tags: formTags,
            seoTitle: formSeoTitle || `${formTitle} | MySlotMate Blog`,
            seoDescription: formSeoDesc || formDesc,
          };
        }
        return b;
      }));
      alert(`Blog saved successfully as ${publishState}!`);
    } else {
      // Create new
      const newId = `BLG-${300 + blogs.length + 1}`;
      const newBlogItem: Blog = {
        blogId: newId,
        title: formTitle,
        slug: formSlug || formTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        author: formAuthor,
        category: formCategory,
        status: publishState,
        publishedDate: publishState === 'Published' ? todayStr : 'Not published',
        views: 0,
        description: formDesc,
        content: formContent,
        tags: formTags,
        seoTitle: formSeoTitle || `${formTitle} | MySlotMate Blog`,
        seoDescription: formSeoDesc || formDesc,
      };
      setBlogs(prev => [...prev, newBlogItem]);
      alert(`New blog created as ${publishState}!`);
      setEditingBlogId(newId);
    }
    setActiveTab('management');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      setBlogs(prev => prev.filter(b => b.blogId !== id));
    }
  };

  const handleTogglePublish = (id: string, currentStatus: string) => {
    const todayStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    setBlogs(prev => prev.map(b => {
      if (b.blogId === id) {
        const nextStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
        return {
          ...b,
          status: nextStatus,
          publishedDate: nextStatus === 'Published' ? todayStr : 'Not published'
        };
      }
      return b;
    }));
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
        <Button variant="primary" onClick={handleCreateNew}>
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
          Editor {editingBlogId ? `(Editing ${editingBlogId})` : '(New)'}
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
          {/* Filters panel */}
          <div className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md p-5">
            <div className="grid gap-4 lg:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
              <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
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

          {/* Blogs Table */}
          {filteredBlogs.length > 0 ? (
            <Table headers={['Blog ID', 'Title', 'Author', 'Category', 'Status', 'Published Date', 'Views', 'Actions']}>
              {filteredBlogs.map((blog) => (
                <tr key={blog.blogId} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
                  <td className="px-6 py-4 align-top font-extrabold text-ink">{blog.blogId}</td>
                  <td className="px-6 py-4 align-top font-bold text-ink max-w-[200px]">{blog.title}</td>
                  <td className="px-6 py-4 align-top text-slate-700 font-medium">{blog.author}</td>
                  <td className="px-6 py-4 align-top text-slate-600">{blog.category}</td>
                  <td className="px-6 py-4 align-top">
                    <Badge color={blog.status === 'Published' ? 'green' : 'amber'}>{blog.status}</Badge>
                  </td>
                  <td className="px-6 py-4 align-top text-slate-500">{blog.publishedDate}</td>
                  <td className="px-6 py-4 align-top font-extrabold text-ink">{blog.views.toLocaleString()}</td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="action" onClick={() => handleEditLoad(blog)}>
                        Edit
                      </Button>
                      <Button variant="action" onClick={() => {
                        handleEditLoad(blog);
                        setActiveTab('preview');
                      }}>
                        Preview
                      </Button>
                      <Button variant="action" onClick={() => handleTogglePublish(blog.blogId, blog.status)}>
                        {blog.status === 'Published' ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="action" onClick={() => handleDelete(blog.blogId)} className="hover:text-rose-600 hover:border-rose-300">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
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
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogTitle">Blog Title</label>
              <input 
                id="blogTitle" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="text" 
                placeholder="10 Unique Experiences in Guwahati"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  // Auto-generate slug
                  setFormSlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''));
                }}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogSlug">Slug</label>
              <input 
                id="blogSlug" 
                className="w-full rounded-2xl border border-brand-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="text" 
                placeholder="10-unique-experiences"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogAuthor">Author Name</label>
              <input 
                id="blogAuthor" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="text" 
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
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
            
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogCover">Featured Image Upload</label>
              <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/50 p-6">
                <input id="blogCover" className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" type="file" onChange={() => alert('Mock image upload triggers...')} />
                <p className="mt-3 text-xs text-slate-500">Recommended: 1600 x 900 cover image with strong editorial crop.</p>
              </div>
            </div>

            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogDesc">Short Description</label>
              <textarea 
                id="blogDesc" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 min-h-[80px]" 
                placeholder="Enter a brief excerpt summarizing this blog post..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogContentArea">Blog Content Editor Area</label>
              <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                  {['Heading', 'Bold', 'List', 'Quote', 'Link', 'Image'].map((fmt) => (
                    <Button 
                      key={fmt} 
                      variant="action" 
                      onClick={() => {
                        if (fmt === 'Bold') setFormContent(prev => prev + ' **bold text**');
                        else if (fmt === 'Heading') setFormContent(prev => prev + '\n## Heading Level 2\n');
                        else setFormContent(prev => prev + ` [Inserted ${fmt}]`);
                      }}
                    >
                      {fmt}
                    </Button>
                  ))}
                </div>
                <textarea 
                  id="blogContentArea"
                  className="w-full min-h-[220px] rounded-2xl bg-slate-50/80 p-4 text-sm leading-7 text-slate-700 outline-none border border-slate-100"
                  placeholder="Draft your editorial content here..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogTags">Tags</label>
              <input 
                id="blogTags" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="text" 
                placeholder="guwahati, guide, weekend"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogSeoTitle">SEO Meta Title</label>
              <input 
                id="blogSeoTitle" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" 
                type="text" 
                placeholder="SEO meta title for Google..."
                value={formSeoTitle}
                onChange={(e) => setFormSeoTitle(e.target.value)}
              />
            </div>
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold text-slate-600" htmlFor="blogSeoDesc">SEO Meta Description</label>
              <textarea 
                id="blogSeoDesc" 
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 min-h-[80px]" 
                placeholder="Meta description for search engines..."
                value={formSeoDesc}
                onChange={(e) => setFormSeoDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
            <Button variant="secondary" onClick={() => handleSave('Draft')}>
              Save Draft
            </Button>
            <Button variant="secondary" onClick={() => setActiveTab('preview')}>
              Preview Blog
            </Button>
            <Button variant="primary" onClick={() => handleSave('Published')}>
              Publish Blog
            </Button>
          </div>
        </Card>
      )}

      {/* VIEW 3: PREVIEW TAB */}
      {activeTab === 'preview' && (
        <Card className="overflow-hidden bg-white/95 animate-in fade-in duration-200">
          <div className="h-72 bg-gradient-to-r from-brand-700 via-brand-500 to-sky-300 flex items-center justify-center">
            <p className="text-white font-display text-4xl font-extrabold drop-shadow-md">
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
                <span className="font-bold text-ink">By {formAuthor || 'Meera Dutta'}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                <span>Category: <strong className="text-brand-600 font-bold">{formCategory}</strong></span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                <span>Status: <Badge color={editingBlogId ? 'green' : 'amber'}>Draft Preview</Badge></span>
              </div>
              
              <div className="mt-6 border-l-4 border-brand-300 bg-brand-50/50 p-4 rounded-r-2xl italic text-slate-700">
                {formDesc || 'Short description/excerpt text will appear here as the summary block.'}
              </div>

              <div className="mt-8 space-y-5 text-sm leading-8 text-slate-700 whitespace-pre-wrap">
                {formContent || 'Main body contents of the blog post. Click heading/bold styles in editor to layout formatting.'}
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(formTags || 'guwahati, guide').split(',').map((t, idx) => (
                    <span key={idx} className="inline-flex items-center rounded-full border border-brand-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer transition hover:border-brand-300 hover:text-brand-700 select-none">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
