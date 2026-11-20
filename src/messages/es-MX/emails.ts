export const emails = {
  footer: "TecVerde · Tec campus Matamoros",
  automated: "Este mensaje se envió automáticamente. No respondas a este correo.",
  ignore: "Si no solicitaste este mensaje, puedes ignorarlo.",
  reportConfirm: {
    subject: (number: number) => `Confirma tu correo para el reporte #${number}`,
    preview: "Confirma tu correo para recibir actualizaciones de tu reporte.",
    heading: "Confirma tu correo",
    body: (number: number) =>
      `Recibimos tu reporte #${number}. Confirma tu correo para recibir avisos cuando cambie su estado.`,
    confirm: "Confirmar mi correo",
    trackingIntro:
      "También puedes consultar el avance en cualquier momento con este enlace privado:",
    tracking: "Ver seguimiento",
    expires: "El enlace de confirmación vence en 48 horas.",
  },
  reportStatus: {
    subject: (number: number, status: string) => `Reporte #${number}: ${status}`,
    preview: (status: string) => `Tu reporte cambió a ${status}.`,
    heading: (number: number) => `Actualización del reporte #${number}`,
    body: (status: string) => `El estado de tu reporte cambió a «${status}».`,
    note: "Nota del personal:",
    duplicate: (target: number) =>
      `El personal identificó que tu reporte describe el mismo problema que el reporte #${target}. Se atenderá en ese reporte.`,
    tracking:
      "Usa el enlace privado de seguimiento que recibiste al enviar el reporte para ver el historial.",
    unsubscribe:
      "Si ya no quieres recibir estos avisos, responde al personal del campus para darte de baja.",
  },
  petConfirm: {
    subject: (name: string) => `Confirma tu publicación de ${name}`,
    preview: "Confirma tu correo para enviar la publicación a revisión.",
    heading: "Confirma tu publicación",
    body: (name: string) =>
      `Recibimos la publicación de ${name}. Confirma tu correo para que el equipo de moderación la revise.`,
    confirm: "Confirmar mi correo",
    manageIntro:
      "Guarda este enlace privado. Con él verás las solicitudes de adopción, actualizarás el estado y compartirás la historia cuando encuentre hogar:",
    manage: "Administrar publicación",
    expires: "El enlace de confirmación vence en 48 horas. El enlace de administración no vence.",
  },
  petModeration: {
    approvedSubject: (name: string) => `${name} ya está publicado en TecVerde`,
    approvedHeading: "Tu publicación fue aprobada",
    approvedBody: (name: string) =>
      `El perfil de ${name} ya es visible en la galería de adopción. Te avisaremos cuando alguien envíe una solicitud.`,
    view: "Ver publicación",
    rejectedSubject: (name: string) => `Tu publicación de ${name} no fue aprobada`,
    rejectedHeading: "Tu publicación no fue aprobada",
    rejectedBody: (name: string) =>
      `El equipo de moderación revisó la publicación de ${name} y no pudo aprobarla.`,
    reason: "Motivo:",
    retry: "Puedes enviar una nueva publicación corrigiendo lo indicado.",
  },
  requestConfirm: {
    subject: (name: string) => `Confirma tu solicitud para adoptar a ${name}`,
    preview: "Confirma tu correo para enviar tu solicitud de adopción.",
    heading: "Confirma tu solicitud",
    body: (name: string) =>
      `Recibimos tu solicitud para adoptar a ${name}. Confírmala para enviarla a la persona que lo publicó.`,
    confirm: "Confirmar solicitud",
    expires: "El enlace vence en 48 horas.",
  },
  requestReceived: {
    subject: (name: string) => `Nueva solicitud de adopción para ${name}`,
    preview: "Alguien quiere adoptar a un animal que publicaste.",
    heading: "Nueva solicitud de adopción",
    posterBody: (name: string) =>
      `Alguien confirmó una solicitud para adoptar a ${name}. Ábrela con el enlace privado de administración que recibiste al publicar.`,
    staffBody: (name: string) => `Hay una nueva solicitud de adopción confirmada para ${name}.`,
    open: "Abrir solicitudes",
  },
  moderationQueue: {
    subject: "TecVerde: nueva publicación por revisar",
    preview: "Hay una publicación de adopción pendiente de revisión.",
    heading: "Publicación pendiente",
    body: (name: string) => `La publicación de ${name} confirmó su correo y espera revisión.`,
    open: "Abrir moderación",
  },
  staffDigest: {
    subject: (count: number) =>
      count === 1 ? "TecVerde: 1 reporte nuevo" : `TecVerde: ${count} reportes nuevos`,
    preview: "Resumen diario de reportes del campus.",
    heading: "Resumen diario",
    newReports: (count: number) =>
      count === 1
        ? "1 reporte nuevo en las últimas 24 horas."
        : `${count} reportes nuevos en las últimas 24 horas.`,
    backlog: (count: number) =>
      count === 1 ? "1 reporte sigue pendiente." : `${count} reportes siguen pendientes.`,
    open: "Abrir bandeja",
  },
} as const;
