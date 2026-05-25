import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetPagesQuery, useCreatePageMutation } from '@/redux/api/socialApi';
import { Plus, FileText } from 'lucide-react';

export default function PagesListPage() {
  const { data, isLoading } = useGetPagesQuery({});
  const [createPage] = useCreatePageMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const pages = data?.pages ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createPage({ name, description, category }).unwrap();
    setShowCreate(false);
    setName(''); setDescription(''); setCategory('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pages</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Create Page
        </button>
      </div>

      {isLoading && <div className="text-center py-12 text-gray-400">Loading…</div>}

      {!isLoading && pages.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No pages yet</p>
        </div>
      )}

      <div className="grid gap-3">
        {pages.map((page: any) => (
          <Link
            key={page.id}
            to={`/pages/${page.id}`}
            className="flex items-center gap-3 bg-gray-900 rounded-2xl p-4 border border-gray-800 hover:bg-gray-800 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {page.name[0]}
            </div>
            <div>
              <p className="font-semibold">{page.name}</p>
              {page.category && <p className="text-xs text-gray-400">{page.category}</p>}
              {page.description && <p className="text-sm text-gray-300 mt-0.5 line-clamp-1">{page.description}</p>}
              <p className="text-xs text-gray-500 mt-1">{page._count?.likes ?? 0} followers</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Create Page</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Page name *"
                className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (optional)"
                className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-700 rounded-xl text-sm hover:bg-gray-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
