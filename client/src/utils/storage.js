export const RECOMMENDATION_CACHE_VERSION = 'v1';

const safeParseJson = (raw, fallback) => {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

export const getRecommendationKey = (kind, userId) => {
    const scope = userId && String(userId).trim();
    if (!scope) return null;
    return `calpolice:${RECOMMENDATION_CACHE_VERSION}:${kind}:${scope}`;
};

export const readFoodRecommendationCache = (userId) => {
    const storageKey = getRecommendationKey('food', userId);
    if (!storageKey) return { suggestions: [], wellnessAdvice: '' };
    try {
        const payload = safeParseJson(localStorage.getItem(storageKey), null);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { suggestions: [], wellnessAdvice: '' };
        const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
        const deduped = dedupeRecommendations(suggestions);
        return {
            suggestions: deduped,
            wellnessAdvice: typeof payload.wellnessAdvice === 'string' ? payload.wellnessAdvice : '',
        };
    } catch {
        return { suggestions: [], wellnessAdvice: '' };
    }
};

export const readExerciseRecommendationCache = (userId) => {
    const storageKey = getRecommendationKey('exercise', userId);
    if (!storageKey) return [];
    try {
        const payload = safeParseJson(localStorage.getItem(storageKey), []);
        const suggestions = Array.isArray(payload) ? payload : [];
        return dedupeRecommendations(suggestions);
    } catch {
        return [];
    }
};

export const saveFoodRecommendationCache = (userId, suggestions, wellnessAdvice = '') => {
    const storageKey = getRecommendationKey('food', userId);
    if (!storageKey) return;
    const normalizedSuggestions = dedupeRecommendations(Array.isArray(suggestions) ? suggestions : []);
    if (!normalizedSuggestions.length) return;

    const existing = readFoodRecommendationCache(userId);
    const payload = {
        suggestions: mergeRecommendations(existing.suggestions, normalizedSuggestions),
        wellnessAdvice: typeof wellnessAdvice === 'string' && wellnessAdvice.trim()
            ? wellnessAdvice
            : existing.wellnessAdvice,
    };
    try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
        // Ignore quota/storage write failures.
    }
};

export const saveExerciseRecommendationCache = (userId, suggestions) => {
    const storageKey = getRecommendationKey('exercise', userId);
    if (!storageKey) return;
    const normalizedSuggestions = dedupeRecommendations(Array.isArray(suggestions) ? suggestions : []);
    if (!normalizedSuggestions.length) return;
    try {
        const existing = readExerciseRecommendationCache(userId);
        localStorage.setItem(storageKey, JSON.stringify(mergeRecommendations(existing, normalizedSuggestions)));
    } catch {
        // Ignore quota/storage write failures.
    }
};

export const clearRecommendationCaches = (userId) => {
    const keysToRemove = [
        getRecommendationKey('food', userId),
        getRecommendationKey('exercise', userId),
        'cp_ai_foods',
        'cp_ai_advice',
        'cp_ai_exercises',
    ].filter(Boolean);
    keysToRemove.forEach((key) => {
        try {
            localStorage.removeItem(key);
        } catch {
            // no-op
        }
    });
};

export const dedupeRecommendations = (items = []) => {
    const seen = new Set();
    return items.filter((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const name = String(item?.name || '').trim().toLowerCase();
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
    });
};

const mergeRecommendations = (existing = [], incoming = []) => {
    const merged = [];
    const indices = new Map();

    [...dedupeRecommendations(existing), ...dedupeRecommendations(incoming)].forEach((item) => {
        const key = String(item.name).trim().toLowerCase();
        const existingIndex = indices.get(key);
        if (existingIndex === undefined) {
            indices.set(key, merged.length);
            merged.push(item);
        } else {
            merged[existingIndex] = mergeRecommendationObjects(merged[existingIndex], item);
        }
    });

    return merged;
};

export const mergeRecommendationObjects = (existing, incoming) => {
    const merged = { ...existing };
    Object.entries(incoming).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            merged[key] = value;
        }
    });
    return merged;
};
