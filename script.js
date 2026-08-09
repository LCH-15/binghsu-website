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
let footerExitTimer;
let journeyAnimationFrame;
let selectedWorkMaxOffset = 0;

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
      navigation.classList.remove("is-footer-exiting");
      navigation.classList.add("is-footer");
      return;
    }

    if (navigation.classList.contains("is-footer")) {
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

navigationObserver.observe(contact);
updateNavigationScale();
updateJourneyOffsets();
updateSelectedWorkMetrics();
updateSelectedWorkProgress();
window.addEventListener("load", updateNavigationScale);
window.addEventListener("load", updateJourneyOffsets);
window.addEventListener("load", updateSelectedWorkMetrics);
window.addEventListener("load", updateSelectedWorkProgress);
window.addEventListener("resize", updateNavigationScale);
window.addEventListener("resize", updateJourneyOffsets);
window.addEventListener("resize", updateSelectedWorkMetrics);
window.addEventListener("resize", updateSelectedWorkProgress);
window.addEventListener("scroll", requestJourneyOffsetUpdate, { passive: true });
window.addEventListener("scroll", updateSelectedWorkProgress, { passive: true });
