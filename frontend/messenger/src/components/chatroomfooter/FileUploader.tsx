import React from 'react';
import { MdAttachFile } from 'react-icons/md';
import { themeCard } from '@/lib/themeUtils';
import { useUser } from '@/redux/slices/authSlice';

const FileUploader = ({themeIndex, handleFileChange }: { themeIndex: number; handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void }): JSX.Element => {

  return (
       <button className={themeCard(themeIndex, "rounded-full")}>
            <label className="cursor-pointer w-full text-sm flex items-center justify-center py-2">
        <input
          type="file"
          multiple
          accept="audio/*,video/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <span><MdAttachFile className="text-lg" /></span>
      </label>
    </button>
  );
};

export default FileUploader;