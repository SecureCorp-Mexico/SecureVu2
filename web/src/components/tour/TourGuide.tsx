import React, { useState, useEffect, useMemo, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { AuthContext } from "@/context/auth-context";

interface TourStep {
  target: string | null; // CSS selector or null for centered modal
  title: string;
  content: string;
  route: string;
}

export default function TourGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useContext(AuthContext);

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

    const adminNavDesc =
      "La barra lateral te da acceso a todas las secciones: " +
      "Directo (cámaras en vivo), Revisar (grabaciones clasificadas), " +
      "Explorar (búsqueda histórica de eventos), Exportar (descarga de clips), " +
      "Clasificación (entrenamiento de modelos de detección) y la Zona de Pruebas de UI. " +
      "Los íconos inferiores abren Ajustes y la gestión de usuarios.";

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

    const reviewTabsStep: TourStep = {
      target: "#review-severity-tabs",
      title: "Pestañas de Severidad",
      content:
        "Estas tres pestañas te permiten cambiar entre los distintos niveles de evento: " +
        "Alertas (eventos críticos con personas o vehículos detectados), " +
        "Detecciones (actividad identificada de menor urgencia) y " +
        "Movimiento (cambios de píxel que no clasificaron como objeto concreto). " +
        "Haz clic en cada una para filtrar la lista de clips mostrados.",
      route: "/review",
    };

    const reviewFiltersStep: TourStep = {
      target: "#review-filter-group",
      title: "Herramientas de Filtrado",
      content:
        "A la derecha de las pestañas encontrarás los controles de filtro: " +
        "• Todas las cámaras — selecciona una o varias cámaras específicas. " +
        "• Mostrar revisados — alterna entre solo pendientes o todos los clips. " +
        "• Últimas 24 horas — abre el calendario para elegir otra fecha. " +
        "• Filtro — opciones avanzadas por etiqueta de objeto o zona de detección.",
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

    const cameraViewStep: TourStep = {
      target: null,
      title: "Vista Individual de Cámara",
      content:
        "Al hacer clic en cualquier cámara en la cuadrícula de vivo, verás su transmisión en pantalla completa. " +
        "• Atrás — regresa a la vista principal de cámaras en vivo. " +
        "• Historial — abre directamente las grabaciones recientes de esa cámara en la sección Revisar, " +
        "para que puedas consultar los últimos clips sin salir del contexto de la cámara. " +
        "Además encontrarás controles de cámara como pantalla completa, imagen en imagen, audio y más.",
      route: "/",
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

    const classificationStep: TourStep = {
      target: "#pageRoot",
      title: "Clasificación de Objetos",
      content:
        "En Clasificación puedes revisar y corregir las etiquetas de detección del sistema. " +
        "Al confirmar o rechazar predicciones contribuyes al entrenamiento del modelo, " +
        "mejorando progresivamente la precisión de las alertas.",
      route: "/classification",
    };

    const playgroundStep: TourStep = {
      target: "#pageRoot",
      title: "Zona de Pruebas de UI",
      content:
        "Esta sección (solo para administradores) te permite experimentar con componentes de la " +
        "interfaz, verificar que los controles visuales funcionan correctamente y depurar estilos " +
        "antes de aplicar cambios en producción.",
      route: "/playground",
    };

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

    // ── Settings page ───────────────────────────────────────────────────────
    const adminSettings: TourStep = {
      target: "#pageRoot",
      title: "Ajustes de Administración",
      content:
        "En Ajustes tienes el control total: añade o elimina cámaras, delimita zonas de detección, " +
        "configura máscaras de movimiento, activa/desactiva grabación continua y administra " +
        "los usuarios del sistema con sus roles de acceso.",
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

    const done: TourStep = {
      target: null,
      title: "¡Recorrido Finalizado!",
      content:
        "Has completado el tour por SecureVu. Ahora conoces todas las secciones y estás listo para " +
        "comenzar a explorar y configurar el sistema a tu propio ritmo. ¡Disfruta la experiencia!",
      route: "/settings",
    };

    // ── Assemble in order ────────────────────────────────────────────────────
    //  Welcome → Nav → Live → [sections] → Statusbar → Sidebar → Settings → Done
    if (isAdmin) {
      return [
        welcome,
        navStep,
        liveStep,
        cameraViewStep,
        reviewStep,
        reviewTabsStep,
        reviewFiltersStep,
        exploreStep,
        exportStep,
        classificationStep,
        playgroundStep,
        statusbarStep,
        sidebarSettingsStep,
        adminSettings,
        done,
      ];
    }
    return [
      welcome,
      navStep,
      liveStep,
      cameraViewStep,
      reviewStep,
      reviewTabsStep,
      reviewFiltersStep,
      exploreStep,
      exportStep,
      statusbarStep,
      sidebarSettingsStep,
      viewerSettings,
      done,
    ];
  }, [auth?.user?.role]);

  // Handle step transitions and routes
  useEffect(() => {
    if (!shouldShowTour) return;
    const step = tourSteps[currentStep];
    if (step && location.pathname !== step.route) {
      setIsNavigating(true);
      navigate(step.route);
    }
  }, [currentStep, navigate, location.pathname, shouldShowTour, tourSteps]);

  // Reset isNavigating after the page has mounted (triggered by pathname change)
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => setIsNavigating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isNavigating]);

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
        }
      }
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
