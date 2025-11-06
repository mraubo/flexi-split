/**
 * Shared validation functions
 * Centralized validators for common patterns across the application
 */

/**
 * Validates a nickname
 * Rules: 3-30 chars, lowercase letters, numbers, underscores, hyphens
 */
export const validateNickname = (value: string): { valid: boolean; error?: string } => {
  if (!value || value.trim() === "") {
    return { valid: false, error: "Nazwa jest wymagana" };
  }

  if (value.length < 3) {
    return { valid: false, error: "Nazwa musi mieć co najmniej 3 znaki" };
  }

  if (value.length > 30) {
    return { valid: false, error: "Nazwa może mieć maksymalnie 30 znaków" };
  }

  const pattern = /^[a-z0-9_-]+$/;
  if (!pattern.test(value)) {
    return {
      valid: false,
      error: "Nazwa może zawierać tylko małe litery, cyfry, podkreślenia i myślniki",
    };
  }

  return { valid: true };
};

/**
 * Validates uniqueness of a nickname
 * Case-insensitive comparison
 */
export const validateNicknameUniqueness = (
  value: string,
  existingNicknames: string[],
  currentNickname?: string
): { unique: boolean; suggestion?: string } => {
  const isUnique = !existingNicknames.some(
    (existing) =>
      existing.toLowerCase() === value.toLowerCase() && existing.toLowerCase() !== currentNickname?.toLowerCase()
  );

  if (isUnique) {
    return { unique: true };
  }

  // Generate suggestion
  const suggestion = generateNicknameSuggestion(value, existingNicknames);

  return { unique: false, suggestion };
};

/**
 * Generates a unique nickname suggestion based on an existing one
 * Appends numeric suffix until unique
 */
export const generateNicknameSuggestion = (base: string, existingNicknames: string[]): string => {
  const normalizedBase = base.toLowerCase();
  let suffix = 1;
  let suggestion = `${normalizedBase}${suffix}`;

  while (existingNicknames.some((existing) => existing.toLowerCase() === suggestion.toLowerCase())) {
    suffix++;
    suggestion = `${normalizedBase}${suffix}`;
  }

  return suggestion;
};

/**
 * Validates expense amount
 * Must be positive number (in cents)
 */
export const validateAmount = (amount?: number): { valid: boolean; error?: string } => {
  if (!amount && amount !== 0) {
    return { valid: false, error: "Kwota jest wymagana" };
  }

  if (amount <= 0) {
    return { valid: false, error: "Kwota musi być większa od 0" };
  }

  if (amount < 1) {
    return { valid: false, error: "Minimalna kwota to 0,01 PLN" };
  }

  return { valid: true };
};

/**
 * Validates expense date
 * Must be valid ISO date string (YYYY-MM-DD)
 */
export const validateDate = (date?: string): { valid: boolean; error?: string } => {
  if (!date) {
    return { valid: false, error: "Data jest wymagana" };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: "Nieprawidłowy format daty (YYYY-MM-DD)" };
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: "Nieprawidłowa data" };
  }

  return { valid: true };
};

/**
 * Validates expense description
 * Optional, but max 140 characters if provided
 */
export const validateDescription = (description?: string | null): { valid: boolean; error?: string } => {
  if (!description) {
    return { valid: true };
  }

  if (description.length > 140) {
    return { valid: false, error: "Opis może mieć maksymalnie 140 znaków" };
  }

  return { valid: true };
};

/**
 * Validates that a participant is selected
 */
export const validateParticipant = (participantId?: string): { valid: boolean; error?: string } => {
  if (!participantId) {
    return { valid: false, error: "Wybór uczestnika jest wymagany" };
  }

  return { valid: true };
};

/**
 * Validates that a payer is selected and exists in participants list
 */
export const validatePayer = (
  payerId?: string,
  participants?: { id: string }[]
): { valid: boolean; error?: string } => {
  if (!payerId) {
    return { valid: false, error: "Wybór płacącego jest wymagany" };
  }

  if (participants && !participants.some((p) => p.id === payerId)) {
    return { valid: false, error: "Wybrany płacący nie istnieje w rozliczeniu" };
  }

  return { valid: true };
};

/**
 * Validates that at least one participant is selected
 */
export const validateParticipants = (participantIds?: string[]): { valid: boolean; error?: string } => {
  if (!participantIds || participantIds.length === 0) {
    return { valid: false, error: "Wybierz co najmniej jednego uczestnika" };
  }

  return { valid: true };
};

/**
 * Validates settlement title
 * Required, 1-100 characters
 */
export const validateSettlementTitle = (title?: string): { valid: boolean; error?: string } => {
  if (!title || title.trim() === "") {
    return { valid: false, error: "Nazwa rozliczenia jest wymagana" };
  }

  if (title.length > 100) {
    return { valid: false, error: "Nazwa rozliczenia może mieć maksymalnie 100 znaków" };
  }

  return { valid: true };
};

/**
 * Validates email format
 */
export const validateEmail = (email?: string): { valid: boolean; error?: string } => {
  if (!email || email.trim() === "") {
    return { valid: false, error: "Adres e-mail jest wymagany" };
  }

  // Simple email regex - more comprehensive validation happens on backend
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Nieprawidłowy adres e-mail" };
  }

  return { valid: true };
};

/**
 * Validates password
 * Minimum 8 characters, must contain letter and number
 */
export const validatePassword = (password?: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: "Hasło jest wymagane" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Hasło musi mieć co najmniej 8 znaków" };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: "Hasło musi zawierać litery i cyfry" };
  }

  return { valid: true };
};

/**
 * Validates that two passwords match
 */
export const validatePasswordsMatch = (
  password?: string,
  confirmPassword?: string
): { valid: boolean; error?: string } => {
  if (password !== confirmPassword) {
    return { valid: false, error: "Hasła nie są identyczne" };
  }

  return { valid: true };
};
