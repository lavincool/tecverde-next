export const media = {
  picker: {
    label: "Fotos (opcional)",
    hint: (max: number) =>
      `Agrega hasta ${max} fotos. Las comprimimos en tu dispositivo y quitamos la ubicación y otros datos ocultos.`,
    add: "Agregar fotos",
    takePhoto: "Tomar o elegir fotos",
    remove: "Quitar foto",
    removeLabel: (index: number) => `Quitar foto ${index}`,
    photoAlt: (index: number) => `Foto ${index} seleccionada`,
    preparing: "Preparando foto…",
    uploading: (percent: number) => `Subiendo ${percent}%`,
    uploaded: "Foto lista",
    retry: "Reintentar",
    count: (current: number, max: number) => `${current} de ${max} fotos`,
    unavailable: "Por ahora no es posible adjuntar fotos. Puedes enviar el formulario sin ellas.",
  },
  errors: {
    unavailable: "No pudimos preparar la subida de fotos. Inténtalo de nuevo.",
    too_many: "Alcanzaste el máximo de fotos para este formulario.",
    invalid_file: "Solo se aceptan fotos de hasta 2.5 MB.",
    rate_limited: "Has subido muchas fotos seguidas. Espera unos minutos.",
    forbidden: "No tienes permiso para subir fotos aquí.",
    expired: "Tu formulario expiró. Recarga la página para subir fotos.",
    decode:
      "No pudimos leer esta foto. Si es HEIC, cámbiala a JPG en tu teléfono o elige otra imagen.",
    upload: "La foto no se pudo subir. Revisa tu conexión e inténtalo de nuevo.",
  },
  gallery: {
    label: "Fotos",
    previous: "Foto anterior",
    next: "Foto siguiente",
    position: (index: number, total: number) => `Foto ${index} de ${total}`,
    reportPhoto: (index: number) => `Foto ${index} del reporte`,
    afterPhoto: (index: number) => `Foto ${index} después de la reparación`,
    petPhoto: (name: string, index: number) => `${name}, foto ${index}`,
  },
} as const;
