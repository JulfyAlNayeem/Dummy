import { useCreateSiteSecurityMessageMutation, useGetSiteSecurityMessageQuery } from '@/redux/api/securityApi';
import React, { useState } from 'react';

const SiteSecurityMessages = () => {
  // State for form inputs
  const [createForm, setCreateForm] = useState({ goodMessage: '', badMessage: '' });

  // RTK Query hooks
  const [createSiteSecurityMessage, { isLoading: isCreating, error: createError }] = useCreateSiteSecurityMessageMutation();
  const { data: messages, isLoading: isFetching, error: fetchError } = useGetSiteSecurityMessageQuery();

  // Handle form input changes
  const handleCreateChange = (e) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  // Handle form submissions
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await createSiteSecurityMessage(createForm).unwrap();
      alert('Messages created successfully');
      setCreateForm({ goodMessage: '', badMessage: '' });
    } catch (err) {
      alert('Failed to create messages: ' + (createError?.data?.message || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-base font-bold mb-6">Site Security Messages</h1>

      {/* Create Message Form */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Create Security Messages</h2>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label htmlFor="goodMessage" className="block text-sm font-medium ">
              Good Message
            </label>
            <input
              type="text"
              name="goodMessage"
              value={createForm.goodMessage}
              onChange={handleCreateChange}
              className="mt-1 block w-full border border-gray-300 rounded-md text-black shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter good message"
              required
            />
          </div>
          <div>
            <label htmlFor="badMessage" className="block text-sm font-medium ">
              Bad Message
            </label>
            <input
              type="text"
              name="badMessage"
              value={createForm.badMessage}
              onChange={handleCreateChange}
              className="mt-1 block w-full border border-gray-300 rounded-md text-black shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter bad message"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="bg-indigo-600 text-sm text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isCreating ? 'Creating...' : 'Create Messages'}
          </button>
          {createError && <p className="text-red-500">{createError.data?.message || 'Error creating messages'}</p>}
        </form>
      </div>

      {/* Display Messages */}
      <div>
        <h2 className="text-sm font-semibold mb-4">Stored Security Messages</h2>
        {isFetching ? (
          <p>Loading...</p>
        ) : fetchError ? (
          <p className="text-red-500">{fetchError.data?.message || 'Error fetching messages'}</p>
        ) : messages && messages.data?.length > 0 ? (
          <ul className="space-y-4">
            {messages.data.map((msg) => (
              <li key={msg.id} className=" p-4 rounded-md text-sm">
                <p><strong>Good Message:</strong> {msg.goodMessage}</p>
                <p><strong>Bad Message:</strong> {msg.badMessage}</p>
                <p><strong>Created At:</strong> {new Date(msg.createdAt).toLocaleString()}</p>
                <p><strong>Updated At:</strong> {new Date(msg.updatedAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No messages found</p>
        )}
      </div>
    </div>
  );
};

export default SiteSecurityMessages;