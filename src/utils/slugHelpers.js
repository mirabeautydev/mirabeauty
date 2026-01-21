// Utility functions for generating URL-friendly slugs from Arabic and English names

/**
 * Converts Arabic text to Latin transliteration for URL-friendly slugs
 */
const transliterateArabic = (text) => {
  const arabicToLatin = {
    ا: "a",
    أ: "a",
    إ: "a",
    آ: "a",
    ب: "b",
    ت: "t",
    ث: "th",
    ج: "j",
    ح: "h",
    خ: "kh",
    د: "d",
    ذ: "d",
    ر: "r",
    ز: "z",
    س: "s",
    ش: "sh",
    ص: "s",
    ض: "d",
    ط: "t",
    ظ: "z",
    ع: "a",
    غ: "gh",
    ف: "f",
    ق: "q",
    ك: "k",
    ل: "l",
    م: "m",
    ن: "n",
    ه: "h",
    و: "w",
    ي: "e",
    ى: "a",
    ة: "h",
    ئ: "e",
    ء: "a",
    ؤ: "o",
  };

  let result = "";
  for (let char of text) {
    result += arabicToLatin[char] || char;
  }
  return result;
};

/**
 * Generates a URL-friendly slug from a name (Arabic or English)
 */
export const generateSlug = (name) => {
  if (!name) return "";

  let slug = name.trim().toLowerCase();
  slug = transliterateArabic(slug);
  slug = slug
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return slug;
};

/**
 * Generates a unique slug by checking against existing slugs
 * If slug exists, appends a number (1, 2, 3, etc.)
 */
export const generateUniqueSlug = (baseSlug, existingSlugs = []) => {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

/**
 * Generates a unique slug from a name, checking against existing items
 */
export const createUniqueSlug = (
  name,
  existingItems = [],
  currentId = null
) => {
  const baseSlug = generateSlug(name);

  const existingSlugs = existingItems
    .filter((item) => item.id !== currentId)
    .map((item) => item.slug)
    .filter(Boolean);

  return generateUniqueSlug(baseSlug, existingSlugs);
};
