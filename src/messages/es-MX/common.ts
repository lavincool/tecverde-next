export const common = {
  appName: "TecVerde",
  campus: "Tec campus Matamoros",
  skipLink: "Saltar al contenido",
  goHome: "Volver al inicio",
  retry: "Intentar de nuevo",
  loading: "Cargando",
  separator: " · ",
  home: {
    title: "Cuidemos nuestro campus",
    description:
      "Reporta problemas en el campus o ayuda a encontrarles hogar a los animales que viven aquí.",
    actions: "¿Qué quieres hacer?",
  },
  verify: {
    title: "Confirma tu correo",
    description: "Confirma que este correo te pertenece para recibir avisos de TecVerde.",
    confirm: "Confirmar mi correo",
    pending: "Confirmando…",
    invalidTitle: "Este enlace ya no es válido",
    invalid: "El enlace venció o ya se usó. Si necesitas otro, vuelve a enviar el formulario.",
    unavailable: "No pudimos confirmar tu correo en este momento. Inténtalo de nuevo.",
    done: {
      verify_report_email: "Listo. Te avisaremos por correo cuando cambie el estado de tu reporte.",
      verify_pet_post:
        "Listo. Tu publicación pasó a revisión del equipo de moderación. Te avisaremos por correo cuando se publique.",
      verify_adoption_request:
        "Listo. Enviamos tu solicitud a la persona que publicó al animal y al equipo de moderación.",
    },
  },
  ui: {
    title: "Galería de componentes",
    description: "Estados y componentes de TecVerde.",
    reports: "Estados de reportes",
    pets: "Estados de adopción",
    empty: "Estado vacío",
    loading: "Estado de carga",
  },
} as const;
