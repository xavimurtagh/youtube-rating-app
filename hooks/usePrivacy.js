import { useState, useEffect } from 'react';
import { savePrivacyPreferences, loadPrivacyPreferences } from '../utils/localStorage';

export function usePrivacy() {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    personalization: false,
    marketing: false
  });

  useEffect(() => {
    // Load saved privacy preferences
    const savedPreferences = loadPrivacyPreferences();
    setPreferences(savedPreferences);
  }, []);

  const updatePreference = (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    };
    setPreferences(newPreferences);
    savePrivacyPreferences(newPreferences);
  };

  const updateMultiplePreferences = (updates) => {
    const newPreferences = {
      ...preferences,
      ...updates
    };
    setPreferences(newPreferences);
    savePrivacyPreferences(newPreferences);
  };

  const resetToDefaults = () => {
    const defaults = {
      essential: true,
      analytics: false,
      personalization: false,
      marketing: false
    };
    setPreferences(defaults);
    savePrivacyPreferences(defaults);
  };

  return {
    preferences,
    updatePreference,
    updateMultiplePreferences,
    resetToDefaults
  };
}
