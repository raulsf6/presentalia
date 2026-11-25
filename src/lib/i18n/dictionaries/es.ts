import type { MessageKey } from "@/lib/i18n/dictionaries/en";

/** Spanish mirror of the English dictionary. Missing keys fail type-check. */
export const es: Record<MessageKey, string> = {
  "locale.label": "Idioma",

  "app.allTalks": "Presentalia — todas las charlas",
  "nav.main": "Principal",
  "nav.talks": "Charlas",
  "nav.users": "Usuarios",
  "nav.accountMenu": "Menú de cuenta",
  "nav.signOut": "Cerrar sesión",
  "nav.overview": "Resumen",
  "nav.activities": "Actividades",
  "nav.roster": "Asistentes",
  "nav.slides": "Diapositivas",
  "nav.talkSections": "Secciones de la charla",
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.delete": "Eliminar",
  "common.remove": "Quitar",
  "common.retry": "Reintentar",
  "common.back": "Atrás",
  "common.next": "Siguiente",
  "common.loading": "Cargando…",
  "common.noEmail": "Sin correo electrónico",
  "common.more": "+{count} más",
  "common.you": "(tú)",

  "roles.admin": "Administrador",
  "roles.presenter": "Presentador",
  "roles.attendee": "Asistente",
  "roles.adminPlural": "Administradores",
  "roles.presenterPlural": "Presentadores",
  "roles.attendeePlural": "Asistentes",

  "status.live": "EN VIVO",
  "status.closed": "FINALIZADA",
  "status.ranking": "CLASIFICANDO",

  "login.title": "Inicia sesión en Presentalia",
  "login.subtitle":
    "Escribe el correo con el que estás en la lista o con el que eres presentador. Te enviaremos un enlace de acceso de un solo uso, sin contraseña.",
  "login.linkExpired":
    "Ese enlace de acceso ya no es válido. Solicita uno nuevo.",
  "login.accessDenied":
    "Este correo todavía no tiene acceso. Pide a un presentador que lo añada a la lista de una charla o a un administrador que lo añada como presentador.",
  "login.emailLabel": "Correo electrónico",
  "login.emailPlaceholder": "tu@empresa.com",
  "login.send": "Enviar enlace de acceso →",
  "login.sending": "Enviando…",
  "login.sentTitle":
    "Revisa tu bandeja de entrada: el enlace de acceso está en camino.",
  "login.sentDetail":
    "El enlace te da acceso a las charlas en las que está registrado tu correo.",

  "join.nameLabel": "Tu nombre en esta charla",
  "join.namePlaceholder": "p. ej., Sam",
  "join.nameHint":
    "Así aparecerás en los resultados. Los nombres son únicos en cada charla y no se pueden cambiar después.",
  "join.join": "Unirse a la charla",
  "join.joining": "Uniéndose…",
  "join.closedTitle": "Las inscripciones están cerradas",
  "join.closedDetail":
    "El presentador no está admitiendo nuevos asistentes anónimos en esta charla ahora mismo.",

  "talks.title.all": "Todas las charlas",
  "talks.title.yours": "Tus charlas",
  "talks.subtitle.admin":
    "Crea y gestiona charlas, asistentes, diapositivas y actividades.",
  "talks.subtitle.presenter":
    "Charlas que has creado y charlas a las que te han invitado.",
  "talks.subtitle.attendee":
    "Charlas en las que está registrado tu correo electrónico.",
  "talks.new": "+ Nueva charla",
  "talks.empty.admin":
    "Aún no hay charlas. Crea tu primera charla para empezar.",
  "talks.empty.presenter":
    "Aún no hay charlas. Crea tu primera charla o pide a un presentador que te añada a una.",
  "talks.empty.attendee":
    "Todavía no tienes acceso a ninguna charla. Pide a un administrador o presentador que te añada a una.",
  "talks.owner": "Propietario:",
  "talks.slidesAvailable": "📄 Diapositivas disponibles",

  "talk.joinQr": "QR de acceso",
  "talk.joinedAs": "Te has unido como {name}",
  "talk.liveNow": "En vivo ahora",
  "talk.noActive": "No hay ninguna actividad activa ahora mismo.",
  "talk.readyActivities": "Actividades listas",
  "talk.materials": "Materiales",
  "talk.downloadSlides": "📄 Descargar las diapositivas (PDF)",
  "talk.slidesUploaded": "Subidas el {date}",
  "talk.noSlides": "Todavía no se han subido diapositivas.",
  "talk.pastActivities": "Actividades anteriores ({count})",
  "talk.results": "Resultados →",
  "talk.dangerZone": "Zona de peligro",
  "talk.launchBlockedRanking":
    "Se están preparando los resultados de la actividad actual. Espera a que se cierre antes de lanzar otra.",
  "talk.launchBlockedLive": "Cierra la actividad en vivo antes de lanzar otra.",
  "talk.activityOpen": "{type} está en marcha: {question}",
  "talk.activityRanking": "Clasificando {type}: {question}",
  "talk.tapAnswer": "Toca para responder →",
  "talk.tapIdea": "Toca para enviar una idea →",
  "talk.tapVote": "Toca para votar y ver los resultados →",
  "talk.tapOpen": "Toca para abrir la actividad en vivo →",
  "talk.resultsPreparing": "Se están preparando los resultados →",
  "talk.deleteButton": "Eliminar charla…",
  "talk.deleteAria": "Eliminar charla",
  "talk.deleteConfirm":
    "¿Eliminar {name}? Se borrarán su lista de asistentes, sus encuestas y votos y las diapositivas subidas, y se revocará el acceso de todos los asistentes. Esta acción no se puede deshacer.",
  "talk.deleting": "Eliminando…",
  "talk.deleteYes": "Sí, eliminar esta charla",

  "activity.type.poll": "Encuesta",
  "activity.type.quiz": "Cuestionario",
  "activity.type.text": "Pregunta abierta",
  "activity.type.cloud": "Nube de ideas",
  "activity.launch.button": "Lanzar {type}…",
  "activity.close.button": "Cerrar {type}…",
  "activity.launching": "Lanzando…",
  "activity.closing": "Cerrando…",
  "activity.launchYes": "Sí, lanzar {type} 🎉",
  "activity.closeYes.poll": "Sí, cerrar la votación",
  "activity.closeYes.quiz": "Sí, cerrar el cuestionario",
  "activity.closeYes.text": "Sí, cerrar la pregunta abierta",
  "activity.closeYes.cloud": "Sí, cerrar la nube de ideas",
  "activity.closed.poll":
    "Esta encuesta está cerrada. Su pregunta, sus opciones y la configuración de resultados son de solo lectura.",
  "activity.closed.quiz":
    "Este cuestionario está cerrado. Su pregunta, sus opciones y la configuración de resultados son de solo lectura. La respuesta correcta ya es visible.",
  "activity.closed.text":
    "Esta pregunta abierta está cerrada. Su enunciado y la configuración de resultados son de solo lectura. Su clasificación es definitiva.",
  "activity.closed.cloud":
    "Esta nube de ideas está cerrada. Su pregunta es de solo lectura y sus ideas son definitivas.",
  "activity.launchPrompt.poll":
    "¿Lanzar esta encuesta ahora? Los asistentes podrán votar, y la pregunta, las opciones y la configuración de identidad de los resultados quedarán bloqueadas.",
  "activity.launchPrompt.quiz":
    "¿Lanzar este cuestionario ahora? Los asistentes podrán votar, y la pregunta, las opciones y la configuración de identidad de los resultados quedarán bloqueadas.",
  "activity.launchPrompt.text":
    "¿Lanzar esta pregunta abierta ahora? Los asistentes podrán enviar una respuesta cada uno, y el enunciado y el criterio quedarán bloqueados.",
  "activity.launchPrompt.cloud":
    "¿Lanzar esta nube de ideas ahora? Los asistentes podrán enviar una palabra o una frase corta cada uno, y la pregunta quedará bloqueada.",
  "activity.closePrompt.poll":
    "¿Cerrar la votación ahora? Los asistentes ya no podrán votar, pero todos los autorizados seguirán viendo los resultados finales.",
  "activity.closePrompt.quiz":
    "¿Cerrar este cuestionario ahora? Los asistentes ya no podrán votar y la respuesta correcta se mostrará a todos los que tengan acceso.",
  "activity.closePrompt.text":
    "¿Cerrar esta pregunta abierta ahora? Los asistentes ya no podrán enviar respuestas y todas se publicarán sin clasificar.",
  "activity.closePrompt.cloud":
    "¿Cerrar esta nube de ideas ahora? Los asistentes ya no podrán enviar ideas y la nube final será visible para todos los que tengan acceso.",

  "createTalk.nameLabel": "Nombre de la charla",
  "createTalk.namePlaceholder": "Agentes de IA en producción",
  "createTalk.dateLabel": "Fecha",
  "createTalk.optional": "(opcional)",
  "createTalk.descriptionLabel": "Descripción",
  "createTalk.descriptionPlaceholder": "De qué trata esta charla",
  "createTalk.publicTitle": "Charla pública (acceso anónimo)",
  "createTalk.publicDetail":
    "Cualquier persona con el QR de acceso puede escribir un nombre de usuario y participar. Puedes cerrar las inscripciones cuando quieras desde la página de acceso de la charla.",
  "createTalk.creating": "Creando…",
  "createTalk.create": "Crear charla",

  "activities.title": "Actividades",
  "activities.new": "+ Nueva actividad",
  "activities.empty":
    "Aún no hay actividades. Crea tu primera actividad para empezar.",
  "activities.section.active": "Activas",
  "activities.section.ranking": "Clasificando",
  "activities.section.ready": "Listas",
  "activities.section.closed": "Cerradas",
  "activities.manage": "Gestionar →",
  "activities.results": "Resultados →",
  "activities.chooseSubtitle": "{name}: elige qué crear.",
  "activities.types": "Tipos de actividad",
  "activities.create": "Crear →",
  "activities.detail.poll":
    "Haz una pregunta de opción múltiple y muestra los resultados en vivo.",
  "activities.detail.quiz":
    "Haz una pregunta con una respuesta correcta y revélala al final.",
  "activities.detail.text":
    "Recoge respuestas escritas breves y clasifícalas con IA según tu criterio.",
  "activities.detail.cloud":
    "Recoge una palabra o frase corta por persona y haz crecer las ideas repetidas en la pantalla grande.",
  "activities.newPoll": "Nueva encuesta",
  "activities.newQuiz": "Nuevo cuestionario",
  "activities.newText": "Nueva pregunta abierta",
  "activities.newCloud": "Nueva nube de ideas",
  "activities.back": "← Nueva actividad",

  "form.creating": "Creando…",
  "form.remove": "Quitar",
  "poll.questionLabel": "Pregunta de la encuesta",
  "poll.questionPlaceholder":
    "¿Qué framework de agentes de IA te apetece más usar?",
  "poll.optionsLegend": "Opciones de respuesta",
  "poll.optionsHint": "(2–8)",
  "poll.optionAria": "Opción de respuesta {number}",
  "poll.optionPlaceholder": "Opción {number}",
  "poll.removeOptionAria": "Quitar la opción {number}",
  "poll.addOption": "+ Añadir una opción",
  "poll.identifiableTitle":
    "Mostrar los nombres de los votantes en los resultados",
  "poll.identifiableDetail":
    "Desactivado por defecto. Esta elección no se puede cambiar después de lanzar la encuesta.",
  "poll.create": "Crear encuesta",
  "quiz.questionLabel": "Pregunta del cuestionario",
  "quiz.questionPlaceholder": "¿Qué framework usa un grafo de estados?",
  "quiz.optionsLegend": "Opciones de respuesta",
  "quiz.optionsHint": "(2–8)",
  "quiz.correctHint": "Marca la respuesta correcta con el botón de opción.",
  "quiz.correctAria": "Marcar la opción {number} como respuesta correcta",
  "quiz.optionAria": "Opción de respuesta {number}",
  "quiz.optionPlaceholder": "Opción {number}",
  "quiz.removeOptionAria": "Quitar la opción {number}",
  "quiz.addOption": "+ Añadir una opción",
  "quiz.identifiableTitle":
    "Mostrar los nombres de los votantes en los resultados",
  "quiz.identifiableDetail":
    "Desactivado por defecto. Esta elección no se puede cambiar después de lanzar el cuestionario.",
  "quiz.create": "Crear cuestionario",
  "text.promptLabel": "Enunciado",
  "text.promptPlaceholder":
    "¿Cuál es el siguiente paso más accionable para tu agente de IA?",
  "text.criteriaLabel": "Criterio de clasificación",
  "text.criteriaPlaceholder":
    "Lo más accionable: concreto, pequeño y posible esta semana.",
  "text.criteriaHint":
    "La IA juzga cada respuesta solo con este criterio. Se bloquea al lanzar la actividad.",
  "text.aiNotice":
    "Las respuestas se envían a un modelo de IA a través de Vercel AI Gateway para clasificarlas. Pide ideas, no información personal sensible.",
  "text.identifiableTitle":
    "Mostrar los nombres de los asistentes con sus respuestas",
  "text.identifiableDetail":
    "Desactivado por defecto. Esta elección no se puede cambiar después de lanzar la actividad.",
  "text.create": "Crear pregunta abierta",
  "cloud.questionLabel": "Pregunta",
  "cloud.questionPlaceholder":
    "¿Qué haría que tu agente de IA fuera más útil la próxima semana?",
  "cloud.how":
    "Los asistentes envían una palabra o una frase corta. Las ideas idénticas crecen en la pantalla grande a medida que más gente las envía. No se muestran nombres.",
  "cloud.create": "Crear nube de ideas",

  "activity.answerOptions": "Opciones de respuesta",
  "activity.correctAnswer": "✓ Respuesta correcta",
  "activity.resultsIdentifiable":
    "Los resultados son identificables: los nombres de los votantes se mostrarán a todos los que los vean.",
  "activity.resultsAnonymous":
    "Los resultados son anónimos: la identidad de los votantes no aparecerá en los resultados.",
  "activity.textResultsIdentifiable":
    "Los resultados son identificables: los nombres de los asistentes aparecerán junto a sus respuestas.",
  "activity.textResultsAnonymous":
    "Los resultados son anónimos: la identidad de los asistentes no aparecerá en los resultados.",
  "activity.correctHidden":
    "La respuesta correcta está oculta para todos hasta que cierres el cuestionario.",
  "activity.notOpen.poll":
    "La encuesta todavía no está abierta. Vuelve cuando el ponente la lance.",
  "activity.notOpen.quiz":
    "El cuestionario todavía no está abierto. Vuelve cuando el ponente lo lance.",
  "activity.notOpen.text":
    "Esta pregunta todavía no está abierta. Vuelve cuando el ponente la lance.",
  "activity.notOpen.cloud":
    "La nube de ideas todavía no está abierta. Vuelve cuando el ponente la lance.",
  "activity.rankedFor": "Clasificadas según: {criteria}",
  "activity.howItWorks": "Cómo funciona",
  "activity.textHow":
    "Los asistentes envían una respuesta breve cada uno. Al cerrar, la IA clasifica todas las respuestas según el criterio y la sala ve el resultado al instante. También puedes cerrar sin clasificar y publicar todas las respuestas en el orden en que se enviaron.",
  "activity.textNoIdentity":
    "Las respuestas se envían al modelo de IA sin la identidad de los asistentes.",
  "activity.cloudHow":
    "Los asistentes envían una palabra o una frase corta cada uno. Cuando varias personas envían la misma idea, crece en la pantalla del presentador y en la presentación proyectada.",
  "activity.cloudAnonymous":
    "La nube es anónima: nunca se muestran los nombres de los asistentes. Cierra la actividad cuando la sala haya terminado; la nube final seguirá disponible para todos los que tengan acceso.",

  "vote.legend": "Elige una respuesta",
  "vote.final": "Tu voto es definitivo y no se puede cambiar.",
  "vote.submitting": "Enviando…",
  "vote.submit": "Enviar mi voto",
  "text.answerLabel": "Tu respuesta",
  "text.answerPlaceholder": "Escribe una respuesta concreta…",
  "text.charactersLeft": "Quedan {count} caracteres",
  "text.answerFinal": "Tu respuesta es definitiva y no se puede cambiar.",
  "text.submitting": "Enviando…",
  "text.submit": "Enviar mi respuesta",
  "cloud.answerLabel": "Tu idea",
  "cloud.answerPlaceholder": "Una idea corta, p. ej., incorporación más rápida",
  "cloud.limits": "Una palabra o frase corta · hasta {count} palabras",
  "cloud.final": "Tu idea es definitiva y anónima. No se muestran nombres.",
  "cloud.send": "Enviar mi idea",
  "cloud.sending": "Enviando…",

  "results.attendeeView": "Vista del asistente",
  "results.projectorView": "Vista del proyector",
  "results.accessRevoked": "Ya no tienes acceso a estos resultados.",
  "results.unavailable":
    "Los resultados no están disponibles temporalmente. Actualiza para volver a intentarlo.",
  "results.response.one": "{count} respuesta",
  "results.response.other": "{count} respuestas",
  "results.answeredCount.one":
    "{answered}/{attendees} asistentes han respondido",
  "results.answeredCount.other":
    "{answered}/{attendees} asistentes han respondido",
  "results.resultsAnonymous": "Los resultados son anónimos.",
  "results.autoUpdate":
    "Los resultados se actualizan automáticamente a medida que llegan los votos.",
  "results.quizVoteFirst":
    "Vota primero en el cuestionario. Los resultados se revelan cuando respondes.",
  "results.votingOpen": "La votación está abierta.",
  "results.quizWaiting":
    "Los porcentajes, el número de respuestas y la respuesta correcta se revelarán cuando se cierre el cuestionario.",
  "results.noResponses": "Todavía no hay respuestas.",
  "results.correctCount": "{correct} de {total} acertaron ({percent}%)",
  "results.yourPick": "Tu elección",
  "results.youGotItRight": "Has acertado.",
  "results.yourPickWrong":
    "Tu elección no era la correcta. La respuesta correcta es {answer}.",
  "results.highlightedOption": "la opción resaltada",
  "results.lastRankingFailed": "El último intento de clasificación falló.",
  "results.answersComing": "Todavía están llegando respuestas.",
  "results.retryOrPublish":
    "El presentador puede reintentar o publicar todas las respuestas.",
  "results.appearWhenClosed":
    "Los resultados aparecerán aquí cuando el presentador cierre la actividad.",
  "results.rankingAnswers": "Clasificando las respuestas…",
  "results.appearWhenModel":
    "Los resultados aparecerán en cuanto termine el modelo.",
  "results.publishedUnranked": "Publicado sin clasificación de IA.",
  "results.allFiltered":
    "Todas las respuestas se descartaron por no venir al caso o por ser spam.",
  "results.omitted.one": "Se omitió {count} respuesta fuera de tema.",
  "results.omitted.other": "Se omitieron {count} respuestas fuera de tema.",
  "results.omittedTitle": "Respuestas omitidas (solo presentador)",
  "results.identifiableProjector":
    "Los resultados son identificables. Los nombres están ocultos en el proyector.",
  "results.identifiable":
    "Los resultados son identificables. Los nombres de los asistentes aparecen junto a sus respuestas.",
  "results.rankedWith": "Clasificación hecha con {model}.",
  "results.configuredModel": "el modelo configurado",
  "results.ideas": "{total} ideas · {unique} únicas",
  "results.ideaOne": "{total} idea · {unique} única",
  "results.ideaIn": "Tu idea está dentro.",
  "results.watchBigScreen":
    "Mira la pantalla grande mientras llegan más ideas. La nube final aparecerá aquí cuando el presentador cierre la actividad.",
  "results.noIdeas": "No se envió ninguna idea.",
  "results.waitingFirstIdea":
    "Esperando la primera idea. Aparecerá aquí en cuanto alguien la envíe.",
  "results.cloudAria":
    "Nube de ideas. Las ideas repetidas aparecen más grandes.",
  "results.mentions.one": "— {count} mención",
  "results.mentions.other": "— {count} menciones",
  "results.moreIdeas": "+{count} ideas más sin mostrar.",
  "results.oneMoreIdea": "+{count} idea más sin mostrar.",
  "results.repeatedBigger":
    "Las ideas repetidas aparecen más grandes. Las ideas son anónimas: no se muestran nombres.",
  "text.answerRemoved": "[respuesta eliminada]",
  "text.controls.retryRanking": "Reintentar clasificación",
  "text.controls.rankClose": "Clasificar y cerrar",
  "text.controls.ranking": "Clasificando…",
  "text.controls.closeNoRank": "Cerrar sin clasificar…",
  "text.controls.closing": "Cerrando…",
  "text.controls.answerCount.one": "{count} respuesta",
  "text.controls.answerCount.other": "{count} respuestas",
  "text.controls.overCap":
    "{count} respuestas superan el límite de {limit} respuestas para clasificar con IA. Cierra sin clasificar para publicarlas todas.",
  "text.controls.noAnswers":
    "Todavía no hay respuestas. La clasificación empieza cuando al menos un asistente responde.",
  "text.controls.rankingProgress":
    "La clasificación está en marcha. Puedes publicar todas las respuestas si falla o se agota el tiempo.",
  "text.controls.retryPrompt":
    "¿Reintentar la clasificación de las {count} respuestas? La sala verá el resultado en cuanto termine el modelo.",
  "text.controls.rankPrompt":
    "¿Clasificar las {count} respuestas y cerrar? No se aceptarán más respuestas y la sala verá el resultado en cuanto termine el modelo.",
  "text.controls.unrankedPrompt":
    "¿Cerrar sin clasificar? Las {count} respuestas se publicarán en el orden en que se enviaron, sin clasificación de IA.",
  "text.controls.yesRank": "Sí, clasificar y cerrar",
  "text.controls.yesUnranked": "Sí, cerrar sin clasificar",
  "text.controls.failed": "No se pudo actualizar la actividad.",

  "roster.title": "Asistentes y acceso",
  "roster.subtitle":
    "{name}: los usuarios invitados siempre tienen acceso; una charla pública también puede admitir invitados anónimos.",
  "roster.publicOpen": "Charla pública · inscripciones abiertas",
  "roster.publicClosed": "Charla pública · inscripciones cerradas",
  "roster.private": "Charla privada · solo usuarios invitados",
  "roster.addAttendees": "Añadir asistentes",
  "roster.privacySettings": "Privacidad",
  "roster.noAccess": "Ya no tienes acceso a esta charla.",
  "roster.filter": "Filtrar asistentes",
  "roster.filter.all": "Todos",
  "roster.filter.attendee": "Asistentes",
  "roster.filter.guest": "Invitados",
  "roster.showing.one": "Mostrando {visible} de {total} persona",
  "roster.showing.other": "Mostrando {visible} de {total} personas",
  "roster.empty.all":
    "Todavía no tiene acceso nadie. Añade asistentes invitados con el icono de añadir usuario o haz pública la charla para que puedan entrar invitados.",
  "roster.empty.attendee":
    "Todavía no hay asistentes invitados. Añádelos con el icono de añadir usuario.",
  "roster.empty.guest":
    "No se ha unido ningún invitado. Los invitados aparecen aquí mientras la charla es pública y las inscripciones están abiertas.",
  "roster.chip.attendee": "Asistente",
  "roster.chip.guest": "Invitado",
  "roster.added": "añadido el {date}",
  "roster.joined": "se unió el {date}",
  "roster.emailVerified": " · correo verificado",
  "roster.emailNotVerified": " · correo sin verificar",
  "roster.removing": "Quitando…",
  "roster.removeGuestAria": "Quitar a {name}",
  "roster.removeGuestConfirm":
    "¿Quitar a {name} de esta charla? Se borrarán sus votos y respuestas y su navegador dejará de funcionar para esta charla. Si las inscripciones anónimas siguen abiertas, podría volver con otro nombre. Esta acción no se puede deshacer.",
  "roster.yesRemoveGuest": "Sí, quitar al invitado",
  "roster.addDialog": "Añadir asistentes",
  "roster.privacyDialog": "Privacidad y acceso",
  "roster.inviteTitle": "Invitar por correo",
  "roster.inviteDetail":
    "Los usuarios invitados siempre tienen acceso a esta charla, aunque sea privada.",
  "roster.emailsPlaceholder":
    "uno@correo.com, otro@correo.com\ntambién vale uno por línea",
  "roster.emailsAria": "Direcciones de correo",
  "roster.previewValid.one": "Se añadirá {count} dirección válida",
  "roster.previewValid.other": "Se añadirán {count} direcciones válidas",
  "roster.previewDuplicates.one": ", se ignorará {count} duplicada",
  "roster.previewDuplicates.other": ", se ignorarán {count} duplicadas",
  "roster.couldntRead": "No se pudieron leer: {list}",
  "roster.addAddresses": "Añadir direcciones",
  "roster.adding": "Añadiendo…",
  "roster.importCsv": "Importar CSV",
  "roster.importHint":
    'Se usa la primera columna o la columna titulada "email". Límite de 1 MB.',
  "roster.csvAria": "Archivo CSV",
  "roster.importing": "Importando…",
  "roster.csvTooLarge": "Ese CSV es demasiado grande (límite de 1 MB).",
  "roster.preview":
    "Vista previa: se añadirán {valid} direcciones válidas{duplicates}.",
  "roster.duplicateAddresses": "Direcciones duplicadas: {list}",
  "roster.summary.added.one": "Se añadió {count} dirección.",
  "roster.summary.added.other": "Se añadieron {count} direcciones.",
  "roster.summary.inviteFailed":
    "Se añadió a la lista, pero no se pudo enviar una invitación a: {list}",
  "roster.summary.alreadyPresent": "Ya estaban en la lista: {list}",
  "roster.summary.duplicates": "Duplicadas ignoradas: {list}",

  "qr.presenterView": "Vista del presentador",
  "qr.projectorView": "Vista del proyector",
  "qr.scan": "Escanea para unirte a la charla",
  "qr.closedDetail": "Ahora mismo no se admiten nuevos asistentes anónimos.",
  "qr.guestJoined.one": "Se ha unido 1 invitado.",
  "qr.guestJoined.other": "Se han unido {count} invitados.",

  "slides.title": "Diapositivas",
  "slides.subtitle":
    "{name}: un PDF por charla, privado para los asistentes de su lista.",
  "slides.currentPdf": "PDF actual subido el {date}.",
  "slides.noPdf": "Todavía no hay ningún PDF subido.",
  "slides.deckPlan": "Plan de la presentación",
  "slides.deckPlanHint":
    "Coloca una actividad entre dos páginas. La presentación se detiene en ella al presentar y la lanzas desde ahí.",
  "slides.uploadHint":
    "Sube la presentación con el icono de subir de arriba y después planifica las actividades que van entre sus diapositivas.",
  "slides.upload": "Subir diapositivas",
  "slides.present": "Presentar",
  "slides.remote": "Control remoto",
  "slides.slidesPdf": "PDF de diapositivas",
  "slides.presentIntro":
    "Abre Presentar en el portátil conectado a la pantalla grande y usa el control remoto del móvil.",
  "slides.openPresent": "Abrir Presentar ↗",
  "slides.openRemoteInstead": "Abrir el control remoto",
  "slides.remoteIntro":
    "Abre esto en el móvil que tienes en la mano, con la misma cuenta. El control remoto mueve la presentación y lanza o cierra la actividad en la que está parada.",
  "slides.openRemote": "Abrir control remoto",
  "slides.uploadFirst":
    "Sube primero el PDF de la charla. La presentación es lo que proyecta Presentar y lo que mueve el control remoto.",
  "slides.currentSlides":
    "Diapositivas actuales subidas el {date}. Si vuelves a subir, se reemplaza el archivo que descargan los asistentes y se borran todas las actividades colocadas en el plan de la presentación.",
  "slides.noneUploaded":
    "Todavía no se han subido diapositivas. Los asistentes verán un botón de descarga cuando haya un PDF.",
  "slides.preparing": "Preparando…",
  "slides.uploading": "Subiendo…",
  "slides.finishing": "Finalizando…",
  "slides.replace": "Reemplazar diapositivas",
  "slides.pdfLimit": "Solo PDF, hasta {max} MB.",
  "slides.uploaded":
    "Diapositivas subidas. Los asistentes de la lista ya pueden descargarlas.",
  "slides.choosePdf": "Elige un archivo PDF para subir.",
  "slides.removeConfirm":
    "¿Quitar el PDF, borrar el plan de la presentación y detener la descarga para los asistentes?",
  "slides.removing": "Quitando…",
  "slides.yesRemove": "Sí, quitar",
  "slides.removeSlides": "Quitar diapositivas",
  "slides.removed": "Diapositivas quitadas.",
  "deck.loadFailed":
    "No se pudo cargar la presentación, así que no se puede planificar ahora mismo.",
  "deck.loading": "Cargando la presentación…",
  "deck.readyToPlace": "Listas para colocar",
  "deck.noReady":
    "No hay ninguna actividad lista para colocar. Las actividades nuevas empiezan listas; una en vivo o cerrada no se puede añadir.",
  "deck.dropHere": "Suelta aquí para quitarla",
  "deck.slideAria": "Diapositiva {number}",
  "deck.save": "Guardar plan",
  "deck.saving": "Guardando…",
  "deck.nonePlaced": "No hay actividades colocadas.",
  "deck.placed.one": "{count} colocada.",
  "deck.placed.other": "{count} colocadas.",
  "deck.saved": "Guardado.",
  "deck.dragHint":
    "Arrastra una actividad a un hueco o tócala y luego toca un hueco.",

  "present.signInTitle": "Vuelve a iniciar sesión",
  "present.signInDetail":
    "Tu sesión terminó, así que la presentación dejó de seguir la charla.",
  "present.signIn": "Iniciar sesión",
  "present.noAccessTitle": "Ya no tienes acceso",
  "present.noAccessDetail":
    "Esta charla cambió de manos o tu rol cambió mientras estaba abierta.",
  "present.backToTalks": "Volver a las charlas",
  "present.missingTitle": "Esta charla ya no existe",
  "present.missingDetail":
    "Puede que se eliminara mientras la presentación estaba abierta.",
  "present.noSlidesTitle": "Todavía no se han subido diapositivas",
  "present.noSlidesDetail":
    "Sube el PDF de la charla en la pestaña Diapositivas y vuelve a abrir Presentar.",
  "present.openSlides": "Abrir diapositivas",
  "present.loadingSlides": "Cargando diapositivas…",
  "present.slidesError": "No se pudieron cargar las diapositivas; reintentando",
  "present.fullscreen": "Pantalla completa",
  "present.exitFullscreen": "Salir de pantalla completa",
  "present.slidesUnavailable": "Diapositivas no disponibles",
  "present.reconnecting": "Reconectando",
  "remote.position": "Actividad después de la diapositiva {slide}",
  "remote.sessionEnded": "Tu sesión terminó. Vuelve a iniciar sesión.",
  "remote.noAccess": "Ya no tienes acceso a esta charla.",
  "remote.missing": "Esta charla ya no existe.",
  "remote.reconnecting": "Reconectando",
  "remote.previousSlide": "Diapositiva anterior",
  "remote.nextSlide": "Diapositiva siguiente",
  "remote.back": "Atrás",
  "remote.forward": "Siguiente",
  "remote.launching": "Lanzando…",
  "remote.ranking": "Clasificando…",
  "remote.closing": "Cerrando…",
  "remote.rankingProgress":
    "Clasificación en marcha: reinténtalo desde la pantalla grande si falla.",
  "remote.rankingInProgress": "Clasificación en marcha",
  "remote.isLive": "{type} está en vivo",
  "remote.noSlides": "Todavía no se han subido diapositivas",
  "remote.backToTalk": "Volver a la charla",
  "remote.close.poll": "Cerrar la votación",
  "remote.close.quiz": "Cerrar el cuestionario",
  "remote.close.text": "Clasificar y cerrar",
  "remote.close.cloud": "Cerrar la nube de ideas",
  "activityStep.stillLoading":
    "La actividad todavía se está cargando. Se reintentará sola.",
  "activityStep.loading": "Cargando la actividad…",
  "activityStep.waitingLaunch": "Esperando para lanzar",
  "activityStep.cloudWaiting":
    "Los asistentes enviarán una palabra o una frase corta cada uno. Las ideas repetidas crecen en la pantalla.",
  "activityStep.next": "Siguiente →",
  "activityStep.retryRanking": "Reintentar clasificación",
  "activityStep.retrying": "Reintentando…",

  "admin.title": "Gestionar usuarios",
  "admin.subtitle":
    "Busca y filtra usuarios, asigna roles y elimina cuentas que ya no necesitan acceso.",
  "users.title": "Usuarios",
  "users.count.one": "{count} usuario",
  "users.count.other": "{count} usuarios",
  "users.add": "+ Añadir usuario",
  "users.filterEmail": "Filtrar por correo",
  "users.filterRole": "Filtrar por rol",
  "users.showing.one": "Mostrando {visible} de {total} usuario",
  "users.showing.other": "Mostrando {visible} de {total} usuarios",
  "users.showingFiltered": " que coinciden con los filtros",
  "users.clearFilters": "Borrar filtros",
  "users.none": "Todavía no hay usuarios provisionados.",
  "users.noneMatch": "Ningún usuario coincide con estos filtros.",
  "users.table.user": "Usuario",
  "users.table.role": "Rol",
  "users.table.delete": "Eliminar",
  "users.emailVerified": "✓ Correo verificado",
  "users.emailNotVerified": "⌛ Correo sin verificar",
  "users.roleLabel": "Rol",
  "users.yourRole": "Tu rol",
  "users.roleAria": "Rol de {email}",
  "users.saving": "Guardando…",
  "users.deleteAria": "Eliminar a {email}",
  "users.deleteConfirm":
    "¿Eliminar a {email}? Perderá el acceso inmediatamente, se quitará de las listas de las charlas y se borrarán sus votos de encuestas y cuestionarios. Sus respuestas de texto se conservan pero se sustituyen por un aviso de eliminación, para que las clasificaciones publicadas no cambien. Las charlas que creó siguen en la biblioteca, sin propietario. Esta acción no se puede deshacer.",
  "users.deleting": "Eliminando…",
  "users.yesDelete": "Sí, eliminar usuario",
  "users.addTitle": "Añadir un usuario",
  "users.addDetail": "Recibirá un enlace de acceso por correo.",
  "users.email": "Correo",
  "users.emailPlaceholder": "nombre@ejemplo.com",
  "users.adminNotice":
    "Los administradores pueden gestionar todos los usuarios y charlas.",
  "users.adding": "Añadiendo…",
  "users.addUser": "Añadir usuario",
  "users.addedNotice":
    "Usuario añadido. Ya puede iniciar sesión con este correo.",
  "users.clearEmailFilter": "Borrar el filtro de correo",
  "users.thisUser": "este usuario",

  "privacy.publicTitle": "Charla pública",
  "privacy.publicDetailOn":
    "Cualquier persona con el enlace de acceso puede escribir un nombre de usuario y participar.",
  "privacy.publicDetailOff":
    "Solo los usuarios invitados pueden acceder a esta charla.",
  "privacy.makePrivate": "Hacer privada",
  "privacy.makePublic": "Hacer pública",
  "privacy.anonymousTitle": "Acceso anónimo",
  "privacy.anonymousOpen":
    "Pueden entrar nuevos invitados. Quien ya está en la sala se queda.",
  "privacy.anonymousClosed":
    "No se admiten nuevos invitados. Quien ya está en la sala se queda.",
  "privacy.closeJoining": "Cerrar inscripciones",
  "privacy.openJoining": "Abrir inscripciones",
  "privacy.joinLink": "Enlace de acceso",

  "errors.auth.invalidEmail": "Escribe un correo electrónico válido.",
  "errors.auth.signedOut": "Tienes que iniciar sesión.",
  "errors.auth.adminOnly": "Solo el administrador puede hacer esto.",
  "errors.auth.presenterOnly":
    "Solo un presentador o un administrador puede hacer esto.",
  "errors.auth.invalidRole": "Elige un rol válido.",
  "errors.talk.notAvailable": "Esta charla no está disponible.",
  "errors.talk.joinClosed":
    "Las inscripciones para esta charla están cerradas.",
  "errors.talk.usernameTaken":
    "Ese nombre de usuario ya está ocupado en esta charla.",
  "errors.talk.noAccess": "No tienes acceso a esta charla.",
  "errors.talk.cannotManage": "No puedes gestionar esta charla.",
  "errors.talk.publicRequired": "Primero haz pública la charla.",
  "errors.talk.guestGone": "Ese invitado ya no está en esta charla.",
  "errors.talk.notFound": "No se encontró la charla.",
  "errors.talk.nameLength": "Ponle un nombre a la charla (1–200 caracteres).",
  "errors.talk.invalidDate": "No se pudo leer esa fecha.",
  "errors.guest.nameLength":
    "Elige un nombre de entre {min} y {max} caracteres.",
  "errors.guest.nameCharacters":
    "Usa letras, números, espacios, puntos, guiones bajos o guiones, empezando y terminando con una letra o un número.",
  "errors.activity.notFound": "No se encontró la actividad o no tienes acceso.",
  "errors.activity.alreadyLaunched":
    "Esta actividad ya se ha lanzado o cerrado.",
  "errors.activity.anotherLive":
    "Ya hay otra actividad en vivo en esta charla.",
  "errors.activity.notActive": "Esta actividad no está activa.",
  "errors.activity.updateFailed": "No se pudo actualizar la actividad.",
  "errors.poll.noAccess": "No tienes acceso a esta encuesta.",
  "errors.poll.notOpen": "Esta encuesta no está abierta para votar.",
  "errors.poll.voteRejected": "No se aceptó tu voto.",
  "errors.poll.alreadyVoted": "Ya has votado en esta encuesta.",
  "errors.poll.questionRequired": "Una encuesta necesita una pregunta.",
  "errors.poll.minOptions":
    "Una encuesta necesita al menos 2 opciones de respuesta.",
  "errors.poll.maxOptions":
    "Una encuesta puede tener como máximo 8 opciones de respuesta.",
  "errors.poll.emptyOption":
    "Las opciones de respuesta no pueden estar vacías.",
  "errors.quiz.noAccess": "No tienes acceso a este cuestionario.",
  "errors.quiz.notOpen": "Este cuestionario no está abierto para votar.",
  "errors.quiz.voteRejected": "No se aceptó tu voto.",
  "errors.quiz.alreadyVoted": "Ya has votado en este cuestionario.",
  "errors.quiz.questionRequired": "Un cuestionario necesita una pregunta.",
  "errors.quiz.minOptions":
    "Un cuestionario necesita al menos 2 opciones de respuesta.",
  "errors.quiz.maxOptions":
    "Un cuestionario puede tener como máximo 8 opciones de respuesta.",
  "errors.quiz.emptyOption":
    "Las opciones de respuesta no pueden estar vacías.",
  "errors.quiz.duplicateOption": "Las opciones de respuesta deben ser únicas.",
  "errors.quiz.correctRequired": "Elige la respuesta correcta.",
  "errors.text.noAccess": "No tienes acceso a esta actividad.",
  "errors.text.notAccepting": "Esta actividad no está aceptando respuestas.",
  "errors.text.alreadyAnswered": "Ya has respondido a esta actividad.",
  "errors.text.notFound": "No se encontró la actividad o no tienes acceso.",
  "errors.text.cannotRank": "Esta actividad ya no se puede clasificar.",
  "errors.text.noAnswers": "No hay respuestas que clasificar.",
  "errors.text.tooManyAnswers":
    "Hay demasiadas respuestas para clasificar ({count}). Publica todas las respuestas en su lugar.",
  "errors.text.rankingRunning": "La clasificación ya está en marcha.",
  "errors.text.rankingFailed":
    "La clasificación falló. Reinténtala o publica todas las respuestas.",
  "errors.text.rankingNotStored": "No se pudo guardar la clasificación.",
  "errors.text.rankingNotSaved":
    "No se pudo guardar la clasificación. Reinténtala o publica todas las respuestas.",
  "errors.text.cannotClose": "Esta actividad ya no se puede cerrar.",
  "errors.text.rankingStillRunning":
    "La clasificación sigue en marcha. Espera a que termine o se agote el tiempo.",
  "errors.text.rankingTimedOut": "Se agotó el tiempo de clasificación.",
  "errors.text.promptRequired": "Una pregunta abierta necesita un enunciado.",
  "errors.text.criterionRequired":
    "Añade un criterio para clasificar las respuestas.",
  "errors.text.answerRequired": "Escribe una respuesta primero.",
  "errors.text.answerTooLong":
    "Las respuestas pueden tener como máximo {max} caracteres.",
  "errors.cloud.noAccess": "No tienes acceso a esta actividad.",
  "errors.cloud.notAccepting": "Esta nube de ideas no está aceptando ideas.",
  "errors.cloud.alreadySubmitted": "Ya has enviado una idea.",
  "errors.cloud.promptRequired": "Una nube de ideas necesita una pregunta.",
  "errors.cloud.ideaRequired": "Escribe una idea primero.",
  "errors.cloud.ideaTooLong":
    "Las ideas pueden tener como máximo {max} caracteres.",
  "errors.cloud.ideaTooManyWords":
    "Cada idea debe tener {max} palabras o menos.",
  "errors.slides.choosePdf": "Elige un archivo PDF para subir.",
  "errors.slides.verifyFailed":
    "No se pudieron verificar las diapositivas subidas.",
  "errors.slides.uploadIncomplete":
    "La subida no se completó. Inténtalo de nuevo.",
  "errors.slides.removeFailed":
    "No se pudieron quitar las diapositivas. Inténtalo de nuevo.",
  "errors.slides.invalidPdf": "Las diapositivas deben ser un archivo PDF.",
  "errors.slides.tooLarge": "El archivo de diapositivas supera los {maxMb} MB.",
  "errors.slides.empty": "El archivo de diapositivas está vacío.",
  "errors.slides.invalidFile": "Las diapositivas deben ser un PDF válido.",
  "errors.slides.prepareFailed":
    "No se pudo preparar la subida. Inténtalo de nuevo.",
  "errors.slides.uploadFailed":
    "La subida falló. Comprueba tu conexión e inténtalo de nuevo.",
  "errors.slides.uploadFailedRetry": "La subida falló. Inténtalo de nuevo.",
  "errors.slides.notAvailable":
    "Las diapositivas no están disponibles ahora mismo.",
  "errors.deck.pageCountInvalid":
    "El número de páginas de la presentación no es válido.",
  "errors.deck.duplicateActivity":
    "Cada actividad solo se puede colocar una vez.",
  "errors.deck.betweenPages":
    "Cada actividad debe situarse entre dos páginas de la presentación.",
  "errors.deck.activityNotInTalk":
    "Esa actividad no forma parte de esta charla.",
  "errors.deck.notReady":
    "Solo se pueden colocar actividades listas en la presentación.",
  "errors.roster.chooseCsv": "Elige un archivo CSV.",
  "errors.roster.csvTooLarge": "Ese CSV es demasiado grande (límite de 1 MB).",
  "errors.roster.accountCreateFailed":
    "No se pudo crear una cuenta para {email}.",
  "errors.roster.removeFailed": "No se pudo quitar la dirección.",
  "errors.roster.removeGuestFailed": "No se pudo quitar a ese invitado.",
  "errors.users.createFailed":
    "No se pudo crear o encontrar la cuenta para ese correo.",
  "errors.users.alreadyPrivileged":
    "Ese correo ya tiene rol de presentador o administrador.",
  "errors.users.notFound": "No se encontró ese usuario.",
  "errors.users.cannotDeleteSelf": "No puedes eliminar tu propia cuenta.",
  "errors.users.lastAdmin":
    "Debe quedar al menos un administrador. Asciende antes a otro usuario.",
  "errors.users.deleteFailed": "No se pudo eliminar ese usuario.",
  "errors.users.roleUpdateFailed":
    "No se pudo actualizar el rol de ese usuario.",
  "errors.slides.signInToControl": "Inicia sesión para controlar esta charla.",
  "errors.slides.cannotControl": "No puedes controlar esta charla.",
  "errors.generic.save": "No se pudo guardar el cambio.",
  "errors.generic.retry": "No funcionó. Inténtalo de nuevo.",
  "errors.generic.update": "No se pudo actualizar la actividad.",
  "errors.generic.delete": "No se pudo eliminar la charla.",
  "warnings.user.inviteFailed":
    "Usuario añadido, pero no se pudo enviar la invitación de verificación.",

  "notFound.title": "Página no encontrada",
  "notFound.detail": "La página que buscas no existe.",
  "notFound.back": "Volver a las charlas",
  "errorPage.title": "Algo salió mal",
  "errorPage.detail": "No se pudo cargar la página. Inténtalo de nuevo.",
  "errorPage.retry": "Reintentar",
};
