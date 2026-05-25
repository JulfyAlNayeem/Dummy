import React, { useState } from "react";
import { FaKey, FaCopy, FaCheck } from "react-icons/fa";

const PasswordGenerator = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): JSX.Element => {
    const [inputText, setInputText] = useState<string>('');
    const [generatedPassword, setGeneratedPassword] = useState<string>('');
    const [isCopied, setIsCopied] = useState<boolean>(false);

  // Deterministic password generation function
  const generatePassword = async (text) => {
    if (!text) return "";
    
    // Simple hash function for deterministic output
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use the hash to generate a deterministic but complex password
    const seed = Math.abs(hash);
    const chars = {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lower: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };
    
    // Create a seeded random function
    const seededRandom = (max, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };
    
    let password = '';
    // Ensure at least one of each type
    password += chars.upper[seededRandom(chars.upper.length, 1)];
    password += chars.lower[seededRandom(chars.lower.length, 2)];
    password += chars.numbers[seededRandom(chars.numbers.length, 3)];
    password += chars.special[seededRandom(chars.special.length, 4)];
    
    // Fill the rest (12 more characters for total of 16)
    const allChars = chars.upper + chars.lower + chars.numbers + chars.special;
    for (let i = 4; i < 16; i++) {
      password += allChars[seededRandom(allChars.length, i + 5)];
    }
    
    return password;
  };

  const handleGeneratePassword = async () => {
    if (!inputText.trim()) return;
    const password = await generatePassword(inputText);
    setGeneratedPassword(password);
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setInputText("");
    setGeneratedPassword("");
    setIsCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#001231] to-[#0472a6] rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={handleCloseModal}
          className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
        >
          ×
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <FaKey className="text-[#3da4ca] text-2xl" />
          <h2 className="text-2xl font-bold text-white">Password Generator</h2>
        </div>
        
        <p className="text-white/80 text-sm mb-4">
          Enter a memorable word or phrase. We'll generate a strong password that's always the same for your input.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white/90 text-sm mb-2">Your Memorable Text</label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGeneratePassword()}
              placeholder="e.g., salam"
              className="w-full px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#3da4ca] focus:ring-2 focus:ring-[#3da4ca]/30"
            />
          </div>
          
          <button
            onClick={handleGeneratePassword}
            disabled={!inputText.trim()}
            className="w-full py-2 bg-[#3da4ca] hover:bg-[#0472a6] disabled:bg-white/20 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-all duration-200"
          >
            Generate Password
          </button>
          
          {generatedPassword && (
            <div className="mt-4 space-y-3">
              <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                <label className="block text-white/70 text-xs mb-2">Generated Password</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-white font-mono text-sm break-all">
                    {generatedPassword}
                  </code>
                  <button
                    onClick={handleCopyPassword}
                    className="p-2 bg-[#3da4ca] hover:bg-[#0472a6] rounded-lg transition-colors"
                  >
                    {isCopied ? (
                      <FaCheck className="text-white" />
                    ) : (
                      <FaCopy className="text-white" />
                    )}
                  </button>
                </div>
              </div>
              
              {isCopied && (
                <p className="text-green-400 text-sm text-center">✓ Copied to clipboard!</p>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-white/60 text-xs">
            💡 Tip: The same input always generates the same password. Keep your memorable text secret!
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordGenerator;
