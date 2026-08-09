"use strict";

const navigation = document.querySelector(".site-navigation");
const contact = document.querySelector("#contact");
const journeyCards = Array.from(document.querySelectorAll(".journey-card"));
const selectedWork = document.querySelector(".selected-work");
const selectedWorkStage = document.querySelector(".selected-work-stage");
const selectedWorkGallery = document.querySelector(".selected-work-gallery");
const selectedWorkTrack = document.querySelector(".selected-work-track");
const desktopQuery = window.matchMedia("(min-width: 701px)");
const footerExitDuration = 160;
const selectedWorkDragFactor = 1.28;
const selectedWorkReleaseBuffer = 140;
const selectedWorkEndInset = 20;
const heroModel = document.querySelector(".hero-model");
const heroModelLabel = document.querySelector(".hero-model-label");
let footerExitTimer;
let journeyAnimationFrame;
let selectedWorkMaxOffset = 0;

function updateHeroModelMask() {
  if (!heroModel || !heroModelLabel) return;

  const style = window.getComputedStyle(heroModelLabel);
  const rect = heroModel.getBoundingClientRect();
  const fontSize = Number.parseFloat(style.fontSize);
  const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
  const metricCanvas = document.createElement("canvas");
  const metricContext = metricCanvas.getContext("2d");
  const label = heroModelLabel.textContent.trim();

  if (!metricContext || !rect.width || !rect.height || !fontSize) return;

  metricContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics = metricContext.measureText(label);
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.75;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.25;
  const baseline = (rect.height - ascent - descent) / 2 + ascent;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rect.width} ${rect.height}"><text x="0" y="${baseline}" textLength="${rect.width}" lengthAdjust="spacingAndGlyphs" fill="white" font-family="${style.fontFamily}" font-size="${fontSize}" font-weight="${style.fontWeight}" letter-spacing="${letterSpacing}">${label}</text></svg>`;

  heroModel.style.setProperty("--model-glyph-mask", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}

function isMobileNavigation() {
  return !desktopQuery.matches;
}

function closeMobileNavigation() {
  navigation.classList.remove("is-mobile-expanded");
  navigation.setAttribute("aria-expanded", "false");
}

function openMobileNavigation() {
  if (navigation.classList.contains("is-footer") || navigation.classList.contains("is-footer-exiting")) return;

  navigation.classList.add("is-mobile-expanded");
  navigation.setAttribute("aria-expanded", "true");
}

function toggleMobileNavigation() {
  if (navigation.classList.contains("is-mobile-expanded")) {
    closeMobileNavigation();
    return;
  }

  openMobileNavigation();
}

function updateNavigationScale() {
  // Scale the Figma component as one unit while preserving a 12px mobile gutter.
  const scale = desktopQuery.matches
    ? Math.min(1, window.innerWidth / 1736)
    : Math.max(0.5, (window.innerWidth - 24) / 579);
  navigation.style.setProperty("--nav-scale", scale);
  navigation.style.setProperty("--nav-left", `${(window.innerWidth - 579 * scale) / 2}px`);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateJourneyOffsets() {
  const start = window.innerHeight;
  const end = window.innerHeight * 0.61;

  journeyCards.forEach((card, index) => {
    const progress = clamp((start - card.getBoundingClientRect().top) / (start - end), 0, 1);
    const maxOffset = card.getBoundingClientRect().width * 0.39;
    const offset = index === 0 ? 0 : (1 - progress) * maxOffset;
    card.style.setProperty("--journey-entry-offset", `${offset.toFixed(2)}px`);
  });
}

function requestJourneyOffsetUpdate() {
  if (journeyAnimationFrame) return;

  journeyAnimationFrame = window.requestAnimationFrame(() => {
    journeyAnimationFrame = 0;
    updateJourneyOffsets();
  });
}

function updateSelectedWorkMetrics() {
  if (!selectedWork || !selectedWorkStage || !selectedWorkGallery || !selectedWorkTrack) return;

  const galleryStyles = window.getComputedStyle(selectedWorkGallery);
  const galleryLeftInset = Number.parseFloat(galleryStyles.paddingLeft || "0");
  const galleryRightInset = Number.parseFloat(galleryStyles.paddingRight || "0");

  selectedWorkMaxOffset = Math.max(
    0,
    selectedWorkTrack.scrollWidth - selectedWorkGallery.clientWidth + galleryLeftInset + galleryRightInset - selectedWorkEndInset
  );
  const stageHeight = selectedWorkStage.offsetHeight;
  const totalScrollDistance = selectedWorkMaxOffset * selectedWorkDragFactor + selectedWorkReleaseBuffer;
  selectedWork.style.height = `${Math.max(stageHeight + totalScrollDistance, window.innerHeight)}px`;
  updateSelectedWorkProgress();
}

function updateSelectedWorkProgress() {
  if (!selectedWork) return;

  const rect = selectedWork.getBoundingClientRect();
  const scrollDistance = clamp(-rect.top, 0, Infinity);
  const activeDistance = Math.max(1, selectedWorkMaxOffset * selectedWorkDragFactor);
  const rawProgress = clamp(scrollDistance / activeDistance, 0, 1);
  const easedProgress = Math.pow(rawProgress, 1.08);
  const progress = selectedWorkMaxOffset * easedProgress;
  const fadeProgress = clamp((scrollDistance - activeDistance) / selectedWorkReleaseBuffer, 0, 1);
  const totalDistance = activeDistance + selectedWorkReleaseBuffer;
  const exitProgress = clamp((scrollDistance - totalDistance) / window.innerHeight, 0, 1);
  const opacity = Math.max(0, 1 - fadeProgress * 0.5 - exitProgress * 0.5);

  selectedWork.style.setProperty("--selected-work-progress", `${progress.toFixed(2)}px`);
  selectedWork.style.setProperty("--selected-work-gallery-opacity", opacity.toFixed(3));
}

const navigationObserver = new IntersectionObserver(
  ([entry]) => {
    window.clearTimeout(footerExitTimer);

    if (entry.isIntersecting) {
      closeMobileNavigation();
      navigation.classList.remove("is-footer-exiting");
      navigation.classList.add("is-footer");
      return;
    }

    if (navigation.classList.contains("is-footer")) {
      closeMobileNavigation();
      navigation.classList.add("is-footer-exiting");
      navigation.classList.remove("is-footer");
      footerExitTimer = window.setTimeout(() => {
        navigation.classList.remove("is-footer-exiting");
      }, footerExitDuration);
      return;
    }

    navigation.classList.remove("is-footer", "is-footer-exiting");
  },
  { threshold: 0.55 }
);

navigation.addEventListener("click", (event) => {
  if (!isMobileNavigation()) return;
  if (navigation.classList.contains("is-footer") || navigation.classList.contains("is-footer-exiting")) return;

  const target = event.target.closest("a");
  const topLevelLink = target?.classList.contains("nav-work") || target?.classList.contains("nav-brand") || target?.parentElement?.classList.contains("nav-links");

  if (!navigation.classList.contains("is-mobile-expanded")) {
    event.preventDefault();
    openMobileNavigation();
    return;
  }

  if (!target) {
    toggleMobileNavigation();
    return;
  }

  if (topLevelLink) {
    closeMobileNavigation();
  }
});

document.addEventListener("click", (event) => {
  if (!isMobileNavigation()) return;
  if (navigation.contains(event.target)) return;

  closeMobileNavigation();
});

window.addEventListener("scroll", () => {
  if (!isMobileNavigation()) return;
  if (navigation.classList.contains("is-footer") || navigation.classList.contains("is-footer-exiting")) return;

  closeMobileNavigation();
}, { passive: true });

desktopQuery.addEventListener("change", () => {
  closeMobileNavigation();
  updateNavigationScale();
});

navigationObserver.observe(contact);
updateNavigationScale();
updateHeroModelMask();
updateJourneyOffsets();
updateSelectedWorkMetrics();
updateSelectedWorkProgress();
closeMobileNavigation();
window.addEventListener("load", updateNavigationScale);
window.addEventListener("load", updateHeroModelMask);
window.addEventListener("load", updateJourneyOffsets);
window.addEventListener("load", updateSelectedWorkMetrics);
window.addEventListener("load", updateSelectedWorkProgress);
window.addEventListener("resize", updateNavigationScale);
window.addEventListener("resize", updateHeroModelMask);
window.addEventListener("resize", updateJourneyOffsets);
window.addEventListener("resize", updateSelectedWorkMetrics);
window.addEventListener("resize", updateSelectedWorkProgress);
window.addEventListener("scroll", requestJourneyOffsetUpdate, { passive: true });
window.addEventListener("scroll", updateSelectedWorkProgress, { passive: true });

if (document.fonts) {
  document.fonts.ready.then(updateHeroModelMask);
}
