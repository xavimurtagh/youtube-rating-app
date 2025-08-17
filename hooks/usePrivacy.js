import { useState, useEffect } from 'react';
import { loadPrivacyPreferences, savePrivacyPreferences } from '../utils/localStorage';

export function usePrivacy() {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    personalization: false,
    marketing: false
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load preferences from localStorage on mount
    try {
      const savedPreferences = loadPrivacyPreferences();
      if (savedPreferences) {
        setPreferences(savedPreferences);
      }
    } catch (error) {
      console.warn('Failed to load privacy preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreference = (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    };
    setPreferences(newPreferences);
    
    // Save to localStorage
    try {
      savePrivacyPreferences(newPreferences);
    } catch (error) {
      console.warn('Failed to save privacy preferences:', error);
    }
  };

  const resetToDefaults = () => {
    const defaultPreferences = {
      essential: true,
      analytics: false,
      personalization: false,
      marketing: false
    };
    setPreferences(defaultPreferences);
    
    try {
      savePrivacyPreferences(defaultPreferences);
    } catch (error) {
      console.warn('Failed to reset privacy preferences:', error);
    }
  };

  return {
    preferences,
    loading,
    updatePreference,
    resetToDefaults
  };
}
