import { useState, useEffect, useRef } from "react";
import { isSameWeek, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';

export function isEmptyObject<T extends object>(obj: T): boolean {
  // Check for null or undefined (technically not empty objects)
  if (obj == null) return false;

  // Check for entries with null, undefined, or empty string values
  return Object.values(obj).every(
    (value) =>
      !value || // Check for null or undefined
      (typeof value === "string" && value.trim() === "") || // Check for empty string
      (Array.isArray(value) && isEmptyObject(value)) // Recursively check inner arrays
  );
};

let hasHydrated = false;
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(hasHydrated);
  useEffect(() => {
    hasHydrated = true;
    setIsHydrated(true);
  }, [])
  return isHydrated;
};


interface WindowSize {
  width: number | undefined;
  height: number | undefined;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    window.addEventListener("resize", handleResize);
    handleResize();
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export function convertObjectToFormData(object: { [key: string]: any}) {
  const formData = new FormData();
  for (const key in object ) {
    formData.append(key, object[key]);
  }
  return formData;
}

export function workoutFormDataToObject(formData: FormData): { [key: string]: any } {
  let formDataObject: { [key: string]: any } = {};

  for (const [key, value] of formData.entries()) {
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
    // const subArrayMatch = key.match(/^(\w+)\[(\d+)\]\[(\d+)\]\.(\w+)$/)

    if (arrayMatch) {
      const arrayName = arrayMatch[1];
      const arrayMatchIndex = parseInt(arrayMatch[2], 10);
      const property = arrayMatch[3];

      if (!formDataObject[arrayName]) {
        formDataObject[arrayName] = [];
      }

      if (!formDataObject[arrayName][arrayMatchIndex]) {
        formDataObject[arrayName][arrayMatchIndex] = {};
      }

      if (formDataObject[arrayName][arrayMatchIndex][property]) {
        const currentObjects = formDataObject[arrayName]
        const lastObject = currentObjects[currentObjects.length - 1];

        if (lastObject.hasOwnProperty(property)) {
          const newObject = { [property]: value };
          formDataObject[arrayName].push(newObject);
        } else {
          formDataObject[arrayName][currentObjects.length-1][property] = value;
        }
      } else {
        formDataObject[arrayName][arrayMatchIndex][property] = value;
      }
    } /*else if (subArrayMatch) {
      const arrayName = subArrayMatch[1];
      const arrayMatchIndex = parseInt(subArrayMatch[2], 10);
      const subArrayMatchIndex = parseInt(subArrayMatch[3], 10);
      const property = subArrayMatch[4];

      if (!formDataObject[arrayName]) {
        formDataObject[arrayName] = [];
      }

      if (!formDataObject[arrayName][arrayMatchIndex+subArrayMatchIndex]) {
        formDataObject[arrayName][arrayMatchIndex+subArrayMatchIndex] = {};
      }

      if (formDataObject[arrayName][arrayMatchIndex+subArrayMatchIndex][property]) {
        const currentObjects = formDataObject[arrayName]
        const lastObject = currentObjects[currentObjects.length - 1];

        if (lastObject.hasOwnProperty(property)) {
          const newObject = { [property]: value };
          formDataObject[arrayName].push(newObject);
        } else {
          formDataObject[arrayName][currentObjects.length-1][property] = value;
        }
      } else {
        formDataObject[arrayName][arrayMatchIndex+subArrayMatchIndex][property] = value;
      }
      formDataObject[arrayName][arrayMatchIndex+subArrayMatchIndex][property] = value;
    }*/ else {
      formDataObject[key] = value;
    }
  }

  return formDataObject;
}

export function flattenArraysInObject(obj: { [key: string]: any }): { [key: string]: any } {
  const result: { [key: string]: any } = {};

  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      result[key] = obj[key].flat();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = flattenArraysInObject(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }

  return result;
}

export function workoutLogFormDataToObject(formData: FormData): { [key: string]: any } {
  let formDataObject: { [key: string]: any } = {};

  for (const [key, value] of formData.entries()) {
    const keys = key.match(/([^\[\].]+)/g);

    if (!keys) {
      formDataObject[key] = value;
      continue;
    }

    let current = formDataObject;
    for (let i = 0; i < keys.length; i++) {
      const prop = keys[i];
      const nextProp = keys[i + 1];

      if (nextProp !== undefined) {
        if (!current[prop]) {
          current[prop] = /^\d+$/.test(nextProp) ? [] : {};
        }
        current = current[prop];
      } else {
        current[prop] = value;
      }
    }
  }

  return formDataObject;
}

export function programLogFormDataToObject(formData: FormData): { [key: string]: any } {
  let formDataObject: { [key: string]: any } = {};

  for (const [key, value] of formData.entries()) {
    const keys = key.match(/([^\[\].]+)/g);

    if (!keys) {
      formDataObject[key] = value;
      continue;
    }

    let current = formDataObject;
    for (let i = 0; i < keys.length; i++) {
      const prop = keys[i];
      const nextProp = keys[i + 1];

      if (nextProp !== undefined) {
        if (!current[prop]) {
          current[prop] = /^\d+$/.test(nextProp) ? [] : {};
        }
        current = current[prop];
      } else {
        current[prop] = value;
      }
    }
  }

  return formDataObject;
}

export function useDebouncedFunction<T extends Array<any>>(
  fn: (...args: T) => unknown,
  time: number,
) {
  const timeoutId = useRef<number>();
  const debouncedFn = (...args: T) => {
    window.clearTimeout(timeoutId.current);
    timeoutId.current = window.setTimeout(() => fn(...args), time);
  };
  return debouncedFn;
}

type DateEntry = {
  date: string;
}

export function calculateWeeklyStreak(entries: DateEntry[], currentDate: Date = new Date()): number {
  if (entries.length === 0) {
    return 0;
  }

  // Parse and sort the entry dates in ascending order
  const sortedEntries = entries
    .map(entry => new Date(entry.date))
    .sort((a, b) => a.getTime() - b.getTime());

  // Get the earliest and latest dates in the dataset
  const earliestDate = sortedEntries[0];
  const latestDate = currentDate;

  // Generate all the weeks in the range from the earliest to the current date
  const weeks = eachWeekOfInterval({
    start: startOfWeek(earliestDate),
    end: endOfWeek(latestDate),
  });

  // Track streak
  let currentStreak = 0;
  let maxStreak = 0;

  weeks.forEach(week => {
    const hasEntryThisWeek = sortedEntries.some(entryDate => isSameWeek(entryDate, week));
    if (hasEntryThisWeek) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0; // Reset streak if no entry for the week
    }
  });

  return currentStreak;
}

export function calculateAverageEntriesPerWeek(entries: DateEntry[], currentDate: Date = new Date()): number {
  if (entries.length === 0) {
    return 0;
  }
  // Parse and sort the entry dates
  const sortedEntries = entries
  .map(entry => new Date(entry.date))
  .sort((a, b) => a.getTime() - b.getTime());
  
  // Get the earliest and latest dates in the dataset
  const earliestDate = sortedEntries[0];
  const latestDate = currentDate;

  // Generate all the weeks in the range from the earliest to the current date
  const weeks = eachWeekOfInterval({
    start: startOfWeek(earliestDate),
    end: endOfWeek(latestDate),
  });

  // Create a map to count entries for each week
  const weeklyEntryCounts: Map<string, number> = new Map();

  weeks.forEach(week => {
    const weekKey = startOfWeek(week).toISOString(); // Use ISO string for consistent keys
    weeklyEntryCounts.set(weekKey, 0);
  });

  // Count entries for each week
  sortedEntries.forEach(entryDate => {
    weeks.forEach(week => {
      if (
        entryDate >= startOfWeek(week) &&
        entryDate <= endOfWeek(week)
      ) {
        const weekKey = startOfWeek(week).toISOString();
        weeklyEntryCounts.set(weekKey, (weeklyEntryCounts.get(weekKey) || 0) + 1);
      }
    });
  });

  // Calculate the average
  const totalEntries = Array.from(weeklyEntryCounts.values()).reduce((sum, count) => sum + count, 0);
  const averageEntries = totalEntries / weeks.length;

  return averageEntries;
}
