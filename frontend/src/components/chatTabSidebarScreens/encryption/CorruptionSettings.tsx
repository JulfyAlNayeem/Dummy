// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Settings, Save, RotateCcw, HelpCircle } from "lucide-react";
import { getCorruptionSettings, saveCorruptionSettings } from '@/utils/corruptionUtils';
import toast from "react-hot-toast";

const CorruptionSettings = ({ conversationId }: { conversationId: string }): JSX.Element => {
  const [position1, setPosition1] = useState<number>(5);
  const [position2, setPosition2] = useState<number>(9);
  const [position3, setPosition3] = useState<number>(15);
  const [position4, setPosition4] = useState<number>(20);
  const [position5, setPosition5] = useState<number>(30);
  const [keyLength, setKeyLength] = useState<number>(4);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    if (conversationId) {
      const settings = getCorruptionSettings(conversationId);
      if (settings.positions.length >= 5) {
        setPosition1(settings.positions[0] || 5);
        setPosition2(settings.positions[1] || 9);
        setPosition3(settings.positions[2] || 15);
        setPosition4(settings.positions[3] || 20);
        setPosition5(settings.positions[4] || 30);
      }
      setKeyLength(settings.keyLength || 4);
    }
  }, [conversationId]);

  const handleSaveSettings = (): void => {
    setIsSaving(true);
    try {
      const positions = [
        parseInt(position1) || 0,
        parseInt(position2) || 0,
        parseInt(position3) || 0,
        parseInt(position4) || 0,
        parseInt(position5) || 0
      ].filter(p => p > 0);

      if (positions.length === 0) {
        toast.error('Please enter at least one valid position', { duration: 5000 });
        return;
      }

      const length = parseInt(keyLength) || 4;
      if (length < 1 || length > 20) {
        toast.error('Corruption key length must be between 1 and 20', { duration: 5000 });
        return;
      }

      saveCorruptionSettings(conversationId, positions, length);
      toast.success('Corruption settings saved! All participants must use the same settings.', { duration: 5000 });
    } catch (error: any) {
      console.error('Failed to save corruption settings:', error);
      toast.error('Failed to save settings: ' + error.message, { duration: 5000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = (): void => {
    setPosition1(5);
    setPosition2(9);
    setPosition3(15);
    setPosition4(20);
    setPosition5(30);
    setKeyLength(4);
    saveCorruptionSettings(conversationId, [5, 9, 15, 20, 30], 4);
    toast.success('Reset to default settings', { duration: 3000 });
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-400" />
              Corruption Settings
            </CardTitle>
            <CardDescription className="text-gray-300">
              Customize obfuscation layer positions and key length
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-blue-400"
          >
            {showSettings ? 'Hide' : 'Show'}
          </Button>
        </div>
      </CardHeader>

      {showSettings && (
        <CardContent className="space-y-4">
          <Alert className="bg-blue-900/20 border-blue-500/30">
            <HelpCircle className="h-4 w-4" style={{ color: '#60a5fa' }} />
            <AlertTitle className="text-white">How It Works</AlertTitle>
            <AlertDescription className="text-sm text-gray-300">
              Random keys will be inserted at these positions in encrypted text. 
              All participants must use the same settings to decrypt messages correctly.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label className="text-white">Corruption Positions (1-5 values)</Label>
            <div className="grid grid-cols-5 gap-2">
              <input
                type="number"
                value={position1}
                onChange={(e) => setPosition1(e.target.value)}
                placeholder="Pos 1"
                min="1"
                className="p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <input
                type="number"
                value={position2}
                onChange={(e) => setPosition2(e.target.value)}
                placeholder="Pos 2"
                min="1"
                className="p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <input
                type="number"
                value={position3}
                onChange={(e) => setPosition3(e.target.value)}
                placeholder="Pos 3"
                min="1"
                className="p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <input
                type="number"
                value={position4}
                onChange={(e) => setPosition4(e.target.value)}
                placeholder="Pos 4"
                min="1"
                className="p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
              <input
                type="number"
                value={position5}
                onChange={(e) => setPosition5(e.target.value)}
                placeholder="Pos 5"
                min="1"
                className="p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              />
            </div>
            <p className="text-xs text-gray-400">
              Example: 2, 7, 9, 20, 30 (positions where random keys will be inserted)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Corruption Key Length (1-20)</Label>
            <input
              type="number"
              value={keyLength}
              onChange={(e) => setKeyLength(e.target.value)}
              placeholder="Key Length"
              min="1"
              max="20"
              className="w-full p-2 bg-gray-900 text-gray-100 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">
              Length of random text added at each position (default: 4)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-gray-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          <Alert className="bg-yellow-900/20 border-yellow-500/30">
            <AlertTitle className="text-yellow-400">⚠️ Important</AlertTitle>
            <AlertDescription className="text-yellow-200 text-xs">
              All participants in this conversation must use the exact same corruption settings.
              Share these values with others or messages won't decrypt correctly!
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
};

export default CorruptionSettings;
