export const errors = {
  notFound: {
    title: "Página no encontrada",
    description: "Revisa la dirección o vuelve al inicio.",
  },
  unexpected: {
    title: "Algo salió mal",
    description: "Intenta cargar la página de nuevo.",
  },
  submissions: {
    disabled:
      "Los envíos públicos están pausados temporalmente. Inténtalo más tarde o contacta al personal del campus.",
    challenge_failed:
      "No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.",
    invalid_draft: "Tu formulario expiró. Recarga la página para comenzar de nuevo.",
    rate_limited: "Has hecho varios intentos seguidos. Espera unos minutos e inténtalo de nuevo.",
    unavailable: "El servicio no está disponible en este momento. Inténtalo de nuevo.",
    verifying: "Verificando que eres una persona…",
    verification: "Verificación de seguridad",
  },
} as const;
