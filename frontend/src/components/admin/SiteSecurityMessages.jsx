import { useCreateSiteSecurityMessageMutation, useGetSiteSecurityMessageQuery } from '@/redux/api/securityApi';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-6">
      {/* Create Message Form */}
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardHeader>
          <CardTitle className="text-[#eff0f3] dark:text-[#1a2332]">Create Security Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label htmlFor="goodMessage" className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                Good Message
              </label>
              <Input
                type="text"
                name="goodMessage"
                value={createForm.goodMessage}
                onChange={handleCreateChange}
                className="w-full bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332] placeholder-gray-400 dark:placeholder-gray-600"
                placeholder="Enter good message"
                required
              />
            </div>
            <div>
              <label htmlFor="badMessage" className="block text-sm font-medium text-[#eff0f3] dark:text-[#1a2332] mb-2">
                Bad Message
              </label>
              <Input
                type="text"
                name="badMessage"
                value={createForm.badMessage}
                onChange={handleCreateChange}
                className="w-full bg-gray-700 dark:bg-white border-gray-600 dark:border-gray-300 text-[#eff0f3] dark:text-[#1a2332] placeholder-gray-400 dark:placeholder-gray-600"
                placeholder="Enter bad message"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:text-white"
            >
              {isCreating ? 'Creating...' : 'Create Messages'}
            </Button>
            {createError && <p className="text-red-500 mt-2">{createError.data?.message || 'Error creating messages'}</p>}
          </form>
        </CardContent>
      </Card>

      {/* Display Messages */}
      <Card className="bg-[#1a2332] dark:bg-[#eff0f3] border-gray-600 dark:border-gray-300">
        <CardHeader>
          <CardTitle className="text-[#eff0f3] dark:text-[#1a2332]">Stored Security Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <p className="text-[#eff0f3] dark:text-[#1a2332]">Loading...</p>
          ) : fetchError ? (
            <p className="text-red-500">{fetchError.data?.message || 'Error fetching messages'}</p>
          ) : messages && messages.data?.length > 0 ? (
            <div className="space-y-4">
              {messages.data.map((msg) => (
                <div key={msg.id} className="border border-gray-600 dark:border-gray-300 bg-gray-700 dark:bg-white p-4 rounded-md">
                  <p className="text-[#eff0f3] dark:text-[#1a2332] mb-2"><strong>Good Message:</strong> {msg.goodMessage}</p>
                  <p className="text-[#eff0f3] dark:text-[#1a2332] mb-2"><strong>Bad Message:</strong> {msg.badMessage}</p>
                  <p className="text-[#eff0f3] dark:text-[#1a2332] opacity-70 text-sm"><strong>Created At:</strong> {new Date(msg.createdAt).toLocaleString()}</p>
                  <p className="text-[#eff0f3] dark:text-[#1a2332] opacity-70 text-sm"><strong>Updated At:</strong> {new Date(msg.updatedAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#eff0f3] dark:text-[#1a2332] opacity-70">No messages found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSecurityMessages;