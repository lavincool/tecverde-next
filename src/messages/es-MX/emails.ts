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
