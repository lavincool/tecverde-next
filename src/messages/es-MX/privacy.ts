/**
 * Draft privacy notice. Campus legal must review it before launch; it is not legal advice.
 */
export const privacy = {
  title: "Aviso de privacidad",
  description: "Cómo TecVerde usa y protege tus datos personales.",
  draft: "Versión preliminar sujeta a revisión del área jurídica del campus antes del lanzamiento.",
  sections: [
    {
      heading: "Responsable",
      body: "El Tec campus Matamoros es responsable del tratamiento de los datos personales que recabamos en TecVerde.",
    },
    {
      heading: "Datos que recabamos",
      body: "Reportes: nombre y correo, solo si decides dejarlos. Adopción: nombre, correo y teléfono opcional de quien publica o solicita adoptar, y las respuestas del formulario. Para prevenir abusos guardamos valores cifrados de tu dispositivo y dirección IP, nunca los valores originales.",
    },
    {
      heading: "Para qué los usamos",
      body: "Confirmar tu correo, avisarte sobre el avance de tu reporte o publicación, poner en contacto a quien publica un animal con quien desea adoptarlo y proteger el servicio contra el uso indebido. No vendemos ni compartimos tus datos con terceros con fines comerciales.",
    },
    {
      heading: "Fotos",
      body: "Las fotos se comprimen en tu dispositivo y se eliminan sus metadatos, incluida la ubicación. Las fotos de reportes solo las ve el personal y quien tenga el enlace de seguimiento. Las fotos de adopción se publican después de la revisión del equipo de moderación.",
    },
    {
      heading: "Conservación",
      body: "Los datos de contacto de reportes y solicitudes de adopción se eliminan 180 días después de cerrarse. Los reportes y publicaciones eliminados se borran definitivamente, con sus fotos, 30 días después.",
    },
    {
      heading: "Derechos ARCO",
      body: "Puedes solicitar el acceso, rectificación, cancelación u oposición al tratamiento de tus datos acudiendo a la administración del campus. Responderemos en los plazos que marca la ley.",
    },
  ],
} as const;
