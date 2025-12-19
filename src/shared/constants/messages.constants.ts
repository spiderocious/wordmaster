// Supported Languages
export const SUPPORTED_LANGUAGES = {
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
} as const;

export type Language = typeof SUPPORTED_LANGUAGES[keyof typeof SUPPORTED_LANGUAGES];

// Message Keys for type-safe references
export const MESSAGE_KEYS = {
  // Success
  SUCCESS: 'SUCCESS',
  USER_CREATED: 'USER_CREATED',
  USER_REGISTERED: 'USER_REGISTERED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  RESOURCE_CREATED: 'RESOURCE_CREATED',
  RESOURCE_UPDATED: 'RESOURCE_UPDATED',
  RESOURCE_DELETED: 'RESOURCE_DELETED',

  // Errors
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

  // User-specific
  USERNAME_EXISTS: 'USERNAME_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SIGNUP_FAILED: 'SIGNUP_FAILED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  USERNAME_CHECK_FAILED: 'USERNAME_CHECK_FAILED',
  FAILED_TO_GET_USER: 'FAILED_TO_GET_USER',
  FAILED_TO_GET_USERS: 'FAILED_TO_GET_USERS',
  FAILED_TO_CREATE_USER: 'FAILED_TO_CREATE_USER',

  // Rate limiting
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  TOO_MANY_AUTH_ATTEMPTS: 'TOO_MANY_AUTH_ATTEMPTS',
} as const;

export type MessageKey = keyof typeof MESSAGE_KEYS;

export const MESSAGES = {
  // Success messages
  SUCCESS: {
    en: 'Request successful',
    es: 'Solicitud exitosa',
    fr: 'Demande réussie',
  },
  USER_CREATED: {
    en: 'User created successfully',
    es: 'Usuario creado exitosamente',
    fr: 'Utilisateur créé avec succès',
  },
  USER_REGISTERED: {
    en: 'User registered successfully',
    es: 'Usuario registrado exitosamente',
    fr: 'Utilisateur enregistré avec succès',
  },
  LOGIN_SUCCESS: {
    en: 'Login successful',
    es: 'Inicio de sesión exitoso',
    fr: 'Connexion réussie',
  },
  RESOURCE_CREATED: {
    en: 'Resource created successfully',
    es: 'Recurso creado exitosamente',
    fr: 'Ressource créée avec succès',
  },
  RESOURCE_UPDATED: {
    en: 'Resource updated successfully',
    es: 'Recurso actualizado exitosamente',
    fr: 'Ressource mise à jour avec succès',
  },
  RESOURCE_DELETED: {
    en: 'Resource deleted successfully',
    es: 'Recurso eliminado exitosamente',
    fr: 'Ressource supprimée avec succès',
  },

  // Error messages
  BAD_REQUEST: {
    en: 'Bad request',
    es: 'Solicitud incorrecta',
    fr: 'Mauvaise demande',
  },
  VALIDATION_FAILED: {
    en: 'Validation failed',
    es: 'Validación fallida',
    fr: 'Échec de la validation',
  },
  UNAUTHORIZED: {
    en: 'Unauthorized',
    es: 'No autorizado',
    fr: 'Non autorisé',
  },
  FORBIDDEN: {
    en: 'Forbidden',
    es: 'Prohibido',
    fr: 'Interdit',
  },
  NOT_FOUND: {
    en: 'Resource not found',
    es: 'Recurso no encontrado',
    fr: 'Ressource non trouvée',
  },
  USER_NOT_FOUND: {
    en: 'User not found',
    es: 'Usuario no encontrado',
    fr: 'Utilisateur non trouvé',
  },
  INTERNAL_SERVER_ERROR: {
    en: 'Internal server error',
    es: 'Error interno del servidor',
    fr: 'Erreur interne du serveur',
  },

  // User-specific messages
  USERNAME_EXISTS: {
    en: 'Username already exists',
    es: 'El nombre de usuario ya existe',
    fr: "Le nom d'utilisateur existe déjà",
  },
  INVALID_CREDENTIALS: {
    en: 'Invalid username or password',
    es: 'Usuario o contraseña inválidos',
    fr: "Nom d'utilisateur ou mot de passe invalide",
  },
  SIGNUP_FAILED: {
    en: 'Signup failed',
    es: 'Registro fallido',
    fr: "Échec de l'inscription",
  },
  LOGIN_FAILED: {
    en: 'Login failed',
    es: 'Inicio de sesión fallido',
    fr: 'Échec de la connexion',
  },
  USERNAME_CHECK_FAILED: {
    en: 'Failed to check username',
    es: 'Error al verificar el nombre de usuario',
    fr: "Échec de la vérification du nom d'utilisateur",
  },
  FAILED_TO_GET_USER: {
    en: 'Failed to get user',
    es: 'Error al obtener usuario',
    fr: "Échec de la récupération de l'utilisateur",
  },
  FAILED_TO_GET_USERS: {
    en: 'Failed to get users',
    es: 'Error al obtener usuarios',
    fr: 'Échec de la récupération des utilisateurs',
  },
  FAILED_TO_CREATE_USER: {
    en: 'Failed to create user',
    es: 'Error al crear usuario',
    fr: "Échec de la création de l'utilisateur",
  },

  // Rate limiting
  TOO_MANY_REQUESTS: {
    en: 'Too many requests from this IP, please try again later',
    es: 'Demasiadas solicitudes desde esta IP, inténtelo más tarde',
    fr: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard',
  },
  TOO_MANY_AUTH_ATTEMPTS: {
    en: 'Too many authentication attempts, please try again later',
    es: 'Demasiados intentos de autenticación, inténtelo más tarde',
    fr: "Trop de tentatives d'authentification, veuillez réessayer plus tard",
  },
} as const;

export const getMessage = (key: MessageKey, lang: Language = 'en'): string => {
  return MESSAGES[key][lang] || MESSAGES[key].en;
};
