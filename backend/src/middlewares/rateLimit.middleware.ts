import rateLimit from 'express-rate-limit';

const TOO_MANY = {
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message: 'Demasiadas solicitudes. Espera unos minutos e intenta nuevamente.',
  },
};

// Limite general de la API por IP.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: TOO_MANY,
});

// Login y registro: frena fuerza bruta y creacion masiva de cuentas.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: TOO_MANY,
});

// Chatbot: protege la cuota de Gemini.
export const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: TOO_MANY,
});
