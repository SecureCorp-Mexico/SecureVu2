import React, { useState, useEffect, useMemo, useCallback, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { AuthContext } from "@/context/auth-context";
import useSWR from "swr";
import { SecureVuConfig } from "@/types/securevuConfig";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";

interface TourStep {
  target: string | null; // CSS selector or null for centered modal
  title: string;
  content: string;
  route: string;
  hash?: string; // URL hash for camera navigation (without the '#' prefix)
}

export default function TourGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useContext(AuthContext);
  const { data: config } = useSWR<SecureVuConfig>("config");
  const allowedCameras = useAllowedCameras();

  const [tourCompleted, setTourCompleted, tourPersistenceLoaded] =
    useUserPersistence<boolean>("tour-completed", false);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [spotlightVisible, setSpotlightVisible] = useState<boolean>(false);

  // Wait for IndexedDB to load before deciding to show the tour.
  // This prevents the tour from flashing on refresh when the user has
  // already completed it (default false → persisted true race condition).
  const shouldShowTour = useMemo(() => {
    return (
      auth?.user &&
      auth?.user?.username !== "anonymous" &&
      !auth.isLoading &&
      tourPersistenceLoaded &&
      !tourCompleted
    );
  }, [auth, tourCompleted, tourPersistenceLoaded]);

  // Build tour steps dynamically depending on user's role.
  const tourSteps = useMemo<TourStep[]>(() => {
    const isAdmin = auth?.user?.role === "admin";

    // Resolve the first camera name so the tour can navigate directly to it.
    const firstCamera = config
      ? Object.values(config.cameras)
          .filter((c) => c.enabled_in_config && c.ui.dashboard && allowedCameras.includes(c.name))
          .sort((a, b) => a.ui.order - b.ui.order)[0]?.name
      : undefined;

    const adminNavDesc =
      "La barra lateral te da acceso a todas las secciones del administrador: " +
      "Directo (cámaras en vivo), Revisar (grabaciones clasificadas), " +
      "Explorar (búsqueda histórica de eventos), Exportar (descarga de clips), " +
      "Clasificación (modelos de detección), Biblioteca de Rostros (reconocimiento facial) " +
      "y Ajustes completos de la plataforma. " +
      "Los íconos inferiores abren la configuración global y la gestión de cuentas.";

    const viewerNavDesc =
      "La barra lateral te da acceso a las secciones disponibles para tu rol: " +
      "Directo (cámaras en tiempo real), Revisar (grabaciones clasificadas), " +
      "Explorar (búsqueda histórica de eventos) y Exportar (descarga de clips). " +
      "El ícono inferior abre tus preferencias personales.";

    // Steps present for ALL roles
    const welcome: TourStep = {
      target: null,
      title: "¡Bienvenido a SecureVu!",
      content:
        "Te damos la bienvenida al panel de control de tu sistema de seguridad de cámaras. " +
        "Vamos a realizar un breve recorrido interactivo por las principales secciones y funciones " +
        "del sistema para que puedas familiarizarte con él.",
      route: "/",
    };

    const navStep: TourStep = {
      target: "aside",
      title: "Menú de Navegación",
      content: isAdmin ? adminNavDesc : viewerNavDesc,
      route: "/",
    };

    const liveStep: TourStep = {
      target: "#liveCamerasGrid",
      title: "Monitoreo en Vivo",
      content:
        "En esta cuadrícula se muestran las transmisiones en tiempo real de todas tus cámaras. " +
        "Puedes hacer clic en cualquier celda para ampliarla, ver su nombre y consultar " +
        "el estado de detección en el momento.",
      route: "/",
    };

    // ── Camera view sub-steps (navigate to the first camera) ──────────────────
    const cameraNavStep: TourStep = {
      target: "#camera-nav-buttons",
      title: "Vista Individual de Cámara — Navegación",
      content:
        "Al hacer clic en cualquier cámara de la cuadrícula entras a su vista individual. " +
        "Aquí encontrarás dos botones a la izquierda: " +
        "• Atrás — regresa a la cuadrícula principal de cámaras en vivo. " +
        "• Historial — abre las grabaciones recientes de esta cámara directamente en la sección Revisar.",
      route: "/",
      hash: firstCamera,
    };

    const cameraControlsStep: TourStep = {
      target: "#camera-feature-controls",
      title: "Vista Individual de Cámara — Controles",
      content:
        "En la parte superior derecha están los controles de la cámara: " +
        "• Pantalla completa — expande la transmisión a todo el monitor. " +
        "• Imagen en imagen — reproduce en una ventana flotante mientras navegas. " +
        "• Audio — activa/desactiva el sonido de la cámara. " +
        "• Configuración — opciones avanzadas de calidad de stream y estadísticas.",
      route: "/",
      hash: firstCamera,
    };

    // ── Sections that navigate away from / ──────────────────────────────────
    const reviewStep: TourStep = {
      target: "#pageRoot",
      title: "Revisión de Eventos",
      content:
        "Aquí el sistema agrupa los clips grabados cuando se detecta actividad (personas, vehículos, etc.). " +
        "Puedes filtrar por gravedad (Alerta, Detección, Movimiento), marcar elementos como revisados " +
        "y abrir el reproductor interactivo para ver el clip completo con su línea de tiempo.",
      route: "/review",
    };

    // ── Severity tabs — one step per tab ─────────────────────────────────────
    const reviewAlertTabStep: TourStep = {
      target: "#review-tab-alert",
      title: "Pestaña: Alertas",
      content:
        "La pestaña Alertas muestra los eventos de mayor prioridad: " +
        "detecciones de personas, vehículos u objetos configurados como críticos. " +
        "Cada clip incluye un contador de cuántos quedan sin revisar. " +
        "Haz clic aquí para ver únicamente estos eventos.",
      route: "/review",
    };

    const reviewDetectionTabStep: TourStep = {
      target: "#review-tab-detection",
      title: "Pestaña: Detecciones",
      content:
        "La pestaña Detecciones agrupa actividad identificada de menor urgencia que las alertas: " +
        "objetos reconocidos por el modelo que no alcanzaron el umbral de alerta. " +
        "Son útiles para revisar eventos sin perder tiempo en los más críticos.",
      route: "/review",
    };

    const reviewMotionTabStep: TourStep = {
      target: "#review-tab-motion",
      title: "Pestaña: Movimiento",
      content:
        "La pestaña Movimiento registra cambios de píxeles en la imagen que el sistema " +
        "detectó pero no pudo clasificar como un objeto específico. " +
        "Es útil para encontrar actividad sutil o calibrar zonas de detección.",
      route: "/review",
    };

    // ── Filter buttons — one step per button ─────────────────────────────────
    const reviewFilterCamerasStep: TourStep = {
      target: "#review-filter-cameras",
      title: "Filtro: Todas las Cámaras",
      content:
        "Con este botón puedes seleccionar una o varias cámaras específicas. " +
        "Por defecto se muestran eventos de todas las cámaras a las que tienes acceso. " +
        "Filtra por cámara para revisar únicamente la actividad de un punto vigilado.",
      route: "/review",
    };

    const reviewFilterReviewedStep: TourStep = {
      target: "#review-filter-reviewed",
      title: "Filtro: Mostrar Revisados",
      content:
        "El interruptor 'Mostrar revisados' alterna entre dos modos: " +
        "• Desactivado (por defecto) — muestra solo los clips pendientes de revisión. " +
        "• Activado — incluye también los clips que ya fueron marcados como revisados. " +
        "Útil para auditar eventos pasados sin perder el registro.",
      route: "/review",
    };

    const reviewFilterDateStep: TourStep = {
      target: "#review-filter-date",
      title: "Filtro: Fecha",
      content:
        "El selector de fecha te permite navegar más allá de las últimas 24 horas. " +
        "Haz clic para abrir el calendario y selecciona cualquier día con grabaciones. " +
        "Los días resaltados indican que existen eventos registrados en esa fecha.",
      route: "/review",
    };

    const reviewFilterGeneralStep: TourStep = {
      target: "#review-filter-general",
      title: "Filtro: Opciones Avanzadas",
      content:
        "El botón de filtro avanzado abre opciones adicionales de búsqueda: " +
        "• Por etiqueta — filtra por tipo de objeto (persona, vehículo, animal, etc.). " +
        "• Por zona — muestra solo eventos que ocurrieron en una zona de detección específica. " +
        "• Mostrar todo — incluye eventos de menor confianza en el listado.",
      route: "/review",
    };

    const exploreStep: TourStep = {
      target: "#pageRoot",
      title: "Explorar Grabaciones",
      content:
        "La vista de Explorar te permite navegar por todas las grabaciones sin importar si generaron " +
        "un evento de alerta. Filtra por cámara, fecha y hora, y reproduce cualquier segmento directamente " +
        "desde la línea de tiempo.",
      route: "/explore",
    };

    const exportStep: TourStep = {
      target: "#pageRoot",
      title: "Exportaciones",
      content:
        "Desde aquí puedes exportar clips de grabación en formato de video. Define el rango horario, " +
        "selecciona las cámaras y genera el archivo para compartirlo o archivarlo " +
        "fuera del sistema.",
      route: "/export",
    };

    // ── Explore sub-steps ────────────────────────────────────────────────────
    const exploreFilterCamerasStep: TourStep = {
      target: "#explore-filter-cameras",
      title: "Todas las cámaras",
      content:
        "Filtra la búsqueda histórica seleccionando una o varias cámaras. " +
        "Por defecto se muestran resultados de todas las cámaras activas a las que tienes acceso.",
      route: "/explore",
    };

    const exploreFilterLabelsStep: TourStep = {
      target: "#explore-filter-labels",
      title: "Todas las etiquetas",
      content:
        "Filtra los eventos según el tipo de objeto detectado (personas, vehículos, etc.) " +
        "para enfocar tu búsqueda en lo que realmente te interesa.",
      route: "/explore",
    };

    const exploreFilterDatesStep: TourStep = {
      target: "#explore-filter-dates",
      title: "Todas las fechas",
      content:
        "Selecciona un rango de fechas o un día específico para explorar grabaciones pasadas. " +
        "El calendario te mostrará los días que contienen grabaciones registradas.",
      route: "/explore",
    };

    const exploreFilterMoreStep: TourStep = {
      target: "#explore-filter-more",
      title: "Más filtros",
      content:
        "El botón de más filtros abre opciones avanzadas para buscar por rango de horas, " +
        "zonas de detección específicas, velocidad estimada, puntuación de confianza y más.",
      route: "/explore",
    };

    const exploreFilterSettingsStep: TourStep = {
      target: "#explore-filter-settings",
      title: "Configuración",
      content:
        "Configura la visualización de la cuadrícula de búsqueda, cambia el tamaño " +
        "de las columnas y ajusta las fuentes de búsqueda preferidas (imágenes o descripciones).",
      route: "/explore",
    };

    // ── Faces (Biblioteca de Rostros) sub-steps ─────────────────────────────
    const facesStep: TourStep = {
      target: "#pageRoot",
      title: "Biblioteca de Rostros",
      content:
        "La Biblioteca de Rostros te permite entrenar al sistema para reconocer personas específicas. " +
        "Una vez entrenado, el sistema puede identificar y etiquetar automáticamente a esas personas " +
        "en las grabaciones y alertas, mejorando la calidad de las notificaciones.",
      route: "/faces",
    };

    const facesLibrarySelectorStep: TourStep = {
      target: "#faces-library-selector",
      title: "Reconocimientos recientes",
      content:
        "En la parte superior izquierda verás el selector de personas. " +
        "Aquí se listan todos los nombres registrados en el sistema. " +
        "Selecciona un nombre para ver sus imágenes de referencia, " +
        "o selecciona 'Entrenamiento' para ver las imágenes pendientes de clasificar.",
      route: "/faces",
    };

    const facesToolbarStep: TourStep = {
      target: "#faces-toolbar",
      title: "Agregar Rostro",
      content:
        "Los botones de acción te permiten gestionar la biblioteca: " +
        "• Agregar Rostro — registra una nueva persona con sus imágenes de referencia. " +
        "• Subir Imagen — añade fotos adicionales para mejorar el reconocimiento de una persona existente. " +
        "Cuantas más imágenes de referencia tenga cada persona, mayor será la precisión del sistema.",
      route: "/faces",
    };

    // ── Classification (Clasificación) sub-steps ─────────────────────────────
    const classificationStep: TourStep = {
      target: "#pageRoot",
      title: "Clasificación de Modelos",
      content:
        "En Clasificación puedes crear y gestionar modelos de detección personalizados. " +
        "Estos modelos extienden las capacidades del sistema para reconocer objetos o estados " +
        "específicos de tu entorno: uniformes, vehículos de empresa, situaciones de riesgo, etc.",
      route: "/classification",
    };

    const classificationTypeTabsStep: TourStep = {
      target: "#classification-type-tabs",
      title: "Clasificación — Tipo de Modelo",
      content:
        "Selecciona el tipo de modelo que deseas gestionar: " +
        "• Objetos — para detectar tipos específicos de elementos (casco, chaleco, herramienta). " +
        "• Estados — para detectar situaciones o condiciones (zona llena, área despejada, postura incorrecta). " +
        "Cada tipo tiene su propio conjunto de modelos entrenados.",
      route: "/classification",
    };

    const classificationAddBtnStep: TourStep = {
      target: "#classification-add-btn",
      title: "Añadir Clasificación",
      content:
        "Usa este botón para crear un nuevo modelo de clasificación personalizado. " +
        "Podrás definir su nombre, tipo (objeto o estado) y empezar a registrar " +
        "categorías y cargar imágenes para entrenarlo.",
      route: "/classification",
    };

    // (removed playgroundStep — section does not exist in production)

    // ── Back on / — status bar and sidebar buttons ─────────────────────────
    const statusbarStep: TourStep = {
      target: "#statusbar",
      title: "Barra de Estado",
      content:
        "Al pie de la página encontrarás la salud general de la plataforma: uso de CPU/memoria, " +
        "estado de los detectores y alertas activas. Si algo va mal, este panel te lo hará saber " +
        "antes que nada.",
      route: "/",
    };

    const sidebarSettingsStep: TourStep = {
      target: ".sidebar-settings",
      title: isAdmin ? "Gestión y Cuentas" : "Ajustes y Perfil",
      content: isAdmin
        ? "En la parte inferior de la barra lateral tienes acceso directo a Ajustes generales, " +
          "gestión de usuarios (crear, editar roles, revocar acceso) y la opción de cerrar sesión."
        : "En la parte inferior de la barra lateral puedes acceder a tus preferencias de visualización, " +
          "cambiar tu contraseña y cerrar sesión.",
      route: "/",
    };

    // ── System Metrics sub-steps ─────────────────────────────────────────────
    const systemMetricsStep: TourStep = {
      target: "#pageRoot",
      title: "Métricas del Sistema",
      content:
        "La sección de Métricas del Sistema muestra el estado de salud de toda la plataforma en tiempo real. " +
        "Monitorea el uso de CPU, memoria, almacenamiento disponible, estado de las cámaras y " +
        "rendimiento de los modelos de IA. Ideal para diagnóstico rápido de problemas.",
      route: "/system",
    };

    const systemMetricsTabsStep: TourStep = {
      target: "#system-metrics-tabs",
      title: "Métricas del Sistema — Pestañas",
      content:
        "Navega entre las diferentes vistas de métricas usando estas pestañas: " +
        "• General — resumen de CPU, memoria y uptime del servicio. " +
        "• Almacenamiento — espacio usado por grabaciones y configuración por cámara. " +
        "• Cámaras — estado individual de cada cámara: FPS activos, estado de detección y calidad de stream. " +
        "• Enrichments — métricas de los modelos de IA activos (si están habilitados).",
      route: "/system",
    };

    // ── Logs sub-steps ───────────────────────────────────────────────────────
    const logsStep: TourStep = {
      target: "#pageRoot",
      title: "Registros del Sistema",
      content:
        "Los Registros del Sistema muestran el historial de eventos internos de la plataforma: " +
        "arranques, errores, detecciones, conexiones de cámaras y mensajes del servicio. " +
        "Son esenciales para diagnosticar problemas y auditar el comportamiento del sistema.",
      route: "/logs",
    };

    const logsServiceTabsStep: TourStep = {
      target: "#logs-service-tabs",
      title: "Registros — Servicio y Filtros",
      content:
        "En la barra superior puedes seleccionar el servicio cuyos logs quieres ver " +
        "(SecureVu, Go2RTC, etc.) y aplicar filtros de severidad para mostrar solo " +
        "Errores, Advertencias o mensajes Informativos. " +
        "Los botones de la derecha te permiten copiar o descargar el log completo.",
      route: "/logs",
    };

    // ── Admin Settings sub-steps ─────────────────────────────────────────────
    const adminSettingsStep: TourStep = {
      target: "#settingsPage",
      title: "Ajustes — Panel de Administración",
      content:
        "El panel de Ajustes es el centro de control de la plataforma. " +
        "Desde aquí puedes gestionar cámaras, zonas de detección, usuarios, notificaciones " +
        "y la configuración completa del sistema. " +
        "La barra lateral izquierda lista todas las secciones disponibles.",
      route: "/settings",
    };

    const viewerSettings: TourStep = {
      target: "#pageRoot",
      title: "Ajustes de Espectador",
      content:
        "En Ajustes puedes personalizar la apariencia de la interfaz, configurar notificaciones " +
        "de alertas para recibir avisos cuando se detecta actividad, y ajustar parámetros " +
        "básicos de tu visualización.",
      route: "/settings",
    };

    // ── Config Editor and Restart ─────────────────────────────────────────────
    const configEditorStep: TourStep = {
      target: "#pageRoot",
      title: "Editor de Configuración",
      content:
        "El Editor de Configuración permite modificar directamente el archivo YAML de SecureVu. " +
        "Es una herramienta avanzada para ajustes finos que no están disponibles en la interfaz gráfica: " +
        "parámetros de detección, umbrales de confianza, configuración de integraciones y más. " +
        "¡Úsalo con precaución, ya que cambios incorrectos pueden afectar el sistema!",
      route: "/config",
    };

    const restartStep: TourStep = {
      target: "#settings-restart-btn",
      title: "Reiniciar SecureVu",
      content:
        "El botón 'Reiniciar SecureVu' reinicia el servicio principal de la plataforma. " +
        "Esto es necesario cuando realizas cambios en la configuración que requieren que el sistema " +
        "se reinicie para aplicarse, como cambios en cámaras o modelos de IA. " +
        "Durante el reinicio (unos segundos) la interfaz estará temporalmente no disponible.",
      route: "/",
    };

    const done: TourStep = {
      target: null,
      title: "¡Recorrido Finalizado!",
      content:
        "Has completado el tour por SecureVu. Ahora conoces todas las secciones y estás listo para " +
        "comenzar a explorar y configurar el sistema a tu propio ritmo. " +
        "Puedes volver a ver esta guía en cualquier momento desde el menú de Cuenta → Guía interactiva.",
      route: "/",
    };

    // ── Assemble in order ────────────────────────────────────────────────────
    if (isAdmin) {
      return [
        welcome,
        navStep,
        liveStep,
        cameraNavStep,
        cameraControlsStep,
        reviewStep,
        reviewAlertTabStep,
        reviewDetectionTabStep,
        reviewMotionTabStep,
        reviewFilterCamerasStep,
        reviewFilterReviewedStep,
        reviewFilterDateStep,
        reviewFilterGeneralStep,
        // Explore
        exploreStep,
        exploreFilterCamerasStep,
        exploreFilterLabelsStep,
        exploreFilterDatesStep,
        exploreFilterMoreStep,
        exploreFilterSettingsStep,
        // Export
        exportStep,
        // Faces
        facesStep,
        facesLibrarySelectorStep,
        facesToolbarStep,
        // Classification
        classificationStep,
        classificationTypeTabsStep,
        classificationAddBtnStep,
        // System
        statusbarStep,
        sidebarSettingsStep,
        // System Metrics
        systemMetricsStep,
        systemMetricsTabsStep,
        // Logs
        logsStep,
        logsServiceTabsStep,
        // Settings
        adminSettingsStep,
        // Config
        configEditorStep,
        // Restart
        restartStep,
        done,
      ];
    }
    return [
      welcome,
      navStep,
      liveStep,
      cameraNavStep,
      cameraControlsStep,
      reviewStep,
      reviewAlertTabStep,
      reviewDetectionTabStep,
      reviewMotionTabStep,
      reviewFilterCamerasStep,
      reviewFilterReviewedStep,
      reviewFilterDateStep,
      reviewFilterGeneralStep,
      // Explore
      exploreStep,
      exploreFilterCamerasStep,
      exploreFilterLabelsStep,
      exploreFilterDatesStep,
      exploreFilterMoreStep,
      exploreFilterSettingsStep,
      // Export
      exportStep,
      statusbarStep,
      sidebarSettingsStep,
      viewerSettings,
      done,
    ];
  }, [auth?.user?.role, config, allowedCameras]);

  // Listen for the restart-tour custom event dispatched by AccountSettings
  const handleRestartTour = useCallback(() => {
    setTourCompleted(false);
    setCurrentStep(0);
    navigate("/");
  }, [setTourCompleted, navigate]);

  useEffect(() => {
    window.addEventListener("securevu:restart-tour", handleRestartTour);
    return () => window.removeEventListener("securevu:restart-tour", handleRestartTour);
  }, [handleRestartTour]);

  // Handle step transitions and routes (including URL hash for camera view)
  useEffect(() => {
    if (!shouldShowTour) return;
    const step = tourSteps[currentStep];
    if (!step) return;

    const targetHash = step.hash ? `#${step.hash}` : "";
    const pathMatches = location.pathname === step.route;
    const hashMatches = location.hash === targetHash;

    if (!pathMatches || !hashMatches) {
      setIsNavigating(true);
      if (step.hash) {
        navigate({ pathname: step.route, hash: `#${step.hash}` });
      } else {
        navigate(step.route);
      }
    }
  }, [currentStep, navigate, location.pathname, location.hash, shouldShowTour, tourSteps]);

  // Reset isNavigating after the page has mounted (triggered by pathname OR hash change)
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => setIsNavigating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash, isNavigating]);

  // Calculate bounding rect of the target element.
  // During navigation, keep the last known spotlight position so there's no
  // flash — the polling will update it once the new element is mounted.
  useEffect(() => {
    if (!shouldShowTour) {
      setRect(null);
      setSpotlightVisible(false);
      return;
    }

    const step = tourSteps[currentStep];
    if (!step || !step.target) {
      setRect(null);
      setSpotlightVisible(false);
      return;
    }

    // Keep current spotlight visible while navigating; polling will update it.
    if (isNavigating) return;

    const updateRect = () => {
      const element = document.querySelector(step.target!);
      if (element) {
        const bounds = element.getBoundingClientRect();
        if (bounds.width > 0 && bounds.height > 0) {
          setRect(bounds);
          setSpotlightVisible(true);
          return;
        }
      }
      setRect(null);
      setSpotlightVisible(false);
    };

    updateRect();
    const interval = setInterval(updateRect, 300);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [currentStep, shouldShowTour, isNavigating, tourSteps]);

  // Constrain highlight box to viewport so blue border stays visible
  const highlightBox = useMemo(() => {
    if (!rect) return null;
    const margin = 8;
    let x = rect.x - 6;
    let y = rect.y - 6;
    let width = rect.width + 12;
    let height = rect.height + 12;
    if (x < margin) { width -= (margin - x); x = margin; }
    if (y < margin) { height -= (margin - y); y = margin; }
    if (x + width > window.innerWidth - margin) width = window.innerWidth - margin - x;
    if (y + height > window.innerHeight - margin) height = window.innerHeight - margin - y;
    return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
  }, [rect]);

  // MotionValues kept alive — no remounting = no flash
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const mvWidth = useMotionValue(0);
  const mvHeight = useMotionValue(0);
  const mvOpacity = useMotionValue(0);
  const springCfg = { stiffness: 320, damping: 30, mass: 0.8 };
  const springX = useSpring(mvX, springCfg);
  const springY = useSpring(mvY, springCfg);
  const springWidth = useSpring(mvWidth, springCfg);
  const springHeight = useSpring(mvHeight, springCfg);
  const springOpacity = useSpring(mvOpacity, { stiffness: 260, damping: 28 });

  useEffect(() => {
    if (highlightBox && spotlightVisible) {
      mvX.set(highlightBox.x);
      mvY.set(highlightBox.y);
      mvWidth.set(highlightBox.width);
      mvHeight.set(highlightBox.height);
      mvOpacity.set(1);
    } else {
      mvOpacity.set(0);
    }
  }, [highlightBox, spotlightVisible, mvX, mvY, mvWidth, mvHeight, mvOpacity]);

  if (!shouldShowTour) return null;

  const step = tourSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((p) => p + 1);
    } else {
      setTourCompleted(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  };

  const handleSkip = () => setTourCompleted(true);

  // ── Card content ────────────────────────────────────────────────────────────
  const cardContent = (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
            Guía de Inicio ({currentStep + 1} / {tourSteps.length})
          </span>
          <button
            onClick={handleSkip}
            className="text-xs text-secondary-foreground hover:text-foreground hover:underline"
          >
            Omitir
          </button>
        </div>
        <h4 className="text-lg font-bold text-foreground leading-tight">
          {step.title}
        </h4>
      </div>
      <p className="text-sm text-secondary-foreground leading-relaxed">
        {step.content}
      </p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-secondary-highlight">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Atrás
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
        >
          {currentStep === tourSteps.length - 1 ? "Comenzar" : "Siguiente"}
        </button>
      </div>
    </>
  );

  // ── Popover positioning when there IS a target element ──────────────────────
  const popoverStyle: React.CSSProperties = { position: "fixed" };
  if (rect) {
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceTop = rect.top;
    const isLarge =
      rect.width > window.innerWidth * 0.7 &&
      rect.height > window.innerHeight * 0.7;

    if (isLarge) {
      popoverStyle.left = "50%";
      popoverStyle.bottom = "40px";
      popoverStyle.transform = "translateX(-50%)";
    } else if (spaceRight > 350) {
      popoverStyle.left = rect.right + 16;
      popoverStyle.top = Math.max(16, Math.min(window.innerHeight - 260, rect.top + rect.height / 2 - 120));
    } else if (spaceLeft > 350) {
      popoverStyle.right = window.innerWidth - rect.left + 16;
      popoverStyle.top = Math.max(16, Math.min(window.innerHeight - 260, rect.top + rect.height / 2 - 120));
    } else if (spaceBottom > 290) {
      popoverStyle.left = Math.max(16, Math.min(window.innerWidth - 380, rect.left + rect.width / 2 - 175));
      popoverStyle.top = rect.bottom + 16;
    } else if (spaceTop > 290) {
      popoverStyle.left = Math.max(16, Math.min(window.innerWidth - 380, rect.left + rect.width / 2 - 175));
      popoverStyle.bottom = window.innerHeight - rect.top + 16;
    } else {
      popoverStyle.left = "50%";
      popoverStyle.bottom = "40px";
      popoverStyle.transform = "translateX(-50%)";
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const cardClasses =
    "z-[99999] w-[340px] md:w-[380px] rounded-xl border border-secondary-highlight " +
    "bg-background_alt/90 backdrop-blur-md p-6 shadow-2xl text-foreground flex flex-col gap-4";

  return (
    <div className="fixed inset-0 z-[99998] overflow-hidden pointer-events-none">
      {/* Dim backdrop — only when no target cutout */}
      {!rect && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] pointer-events-auto" />
      )}

      {/* Spotlight — always mounted for smooth spring transitions */}
      <motion.div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          x: springX,
          y: springY,
          width: springWidth,
          height: springHeight,
          opacity: springOpacity,
          zIndex: 99998,
          borderRadius: "10px",
          boxShadow: "0 0 0 99999px rgba(0, 0, 0, 0.65)",
          border: "2px solid #3b82f6",
          pointerEvents: "none",
          backgroundColor: "transparent",
        }}
      />

      {/* ── Card: centered (no target) vs positioned (has target) ── */}
      {!rect ? (
        // Centered card — use flex so Framer y-animation doesn't break centering
        <div className="fixed inset-0 flex items-center justify-center z-[99999] pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={`${cardClasses} pointer-events-auto`}
            >
              {cardContent}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        // Positioned card near the highlighted element
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={popoverStyle}
            className={`${cardClasses} pointer-events-auto`}
          >
            {cardContent}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
