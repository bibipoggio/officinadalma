import { useEffect, useRef, useCallback } from "react";

export interface LessonDraft {
  title: string;
  access_level: string;
  content_type: string;
  media_url: string;
  audio_url: string;
  body_markdown: string;
  duration_minutes: string;
  audio_duration_minutes: string;
  released_at: string | null;
  is_published: boolean;
  summary: string;
  module_id: string;
  files: { url: string; name: string }[];
  // Legacy fields for backward compatibility
  pdf_url?: string;
  text_files?: { url: string; name: string }[];
}

const STORAGE_KEY_PREFIX = "lesson_draft_";
const DEBOUNCE_MS = 2000;

export function useAutoSaveLessonDraft(
  lessonForm: LessonDraft,
  isEditing: boolean,
  editingLessonId: string | null,
  isCreating: boolean,
  creatingForModuleId: string | null
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // Generate a unique key for the draft
  const getDraftKey = useCallback(() => {
    if (editingLessonId) {
      return `${STORAGE_KEY_PREFIX}edit_${editingLessonId}`;
    }
    if (creatingForModuleId) {
      return `${STORAGE_KEY_PREFIX}new_${creatingForModuleId}`;
    }
    return null;
  }, [editingLessonId, creatingForModuleId]);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    const key = getDraftKey();
    if (!key) return;

    const dataToSave: LessonDraft = {
      ...lessonForm,
      released_at: lessonForm.released_at ? lessonForm.released_at : null,
    };

    const jsonString = JSON.stringify(dataToSave);
    
    // Only save if content has changed
    if (jsonString !== lastSavedRef.current) {
      try {
        localStorage.setItem(key, jsonString);
        lastSavedRef.current = jsonString;
        console.log("[AutoSave] Draft saved:", key);
      } catch (error) {
        console.error("[AutoSave] Error saving draft:", error);
      }
    }
  }, [lessonForm, getDraftKey]);

  // Load draft from localStorage
  const loadDraft = useCallback((): LessonDraft | null => {
    const key = getDraftKey();
    if (!key) return null;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as LessonDraft;
        console.log("[AutoSave] Draft loaded:", key);
        return parsed;
      }
    } catch (error) {
      console.error("[AutoSave] Error loading draft:", error);
    }
    return null;
  }, [getDraftKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    const key = getDraftKey();
    if (!key) return;

    try {
      localStorage.removeItem(key);
      lastSavedRef.current = "";
      console.log("[AutoSave] Draft cleared:", key);
    } catch (error) {
      console.error("[AutoSave] Error clearing draft:", error);
    }
  }, [getDraftKey]);

  // Check if draft exists
  const hasDraft = useCallback((): boolean => {
    const key = getDraftKey();
    if (!key) return false;
    return localStorage.getItem(key) !== null;
  }, [getDraftKey]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isEditing && !isCreating) return;

    // Skip auto-save if the form is empty (initial state)
    const hasContent = lessonForm.title.trim() || 
                       lessonForm.body_markdown.trim() || 
                       lessonForm.media_url.trim() ||
                       lessonForm.summary.trim();
    
    if (!hasContent) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lessonForm, isEditing, isCreating, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
  };
}

// Utility to clear all lesson drafts (useful for cleanup)
export function clearAllLessonDrafts() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
