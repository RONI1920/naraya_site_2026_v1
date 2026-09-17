/**
 * hero-slider.js — auto-rotate hero background photos every 5s.
 * Reuses the existing .hero__bg / .is-loaded classes (no new CSS needed):
 * each <img class="hero__bg"> in the hero already fades in via
 * `.hero__bg.is-loaded { opacity: 1; }` in style.css. This script just
 * moves the `.is-loaded` class from one .hero__bg image to the next.
 * If there's only one (or zero) .hero__bg images, it does nothing —
 * the first image's own onload="this.classList.add('is-loaded')" still
 * handles the original single-photo behavior untouched.
 */
(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        var slides = document.querySelectorAll(".hero .hero__bg");
        if (slides.length <= 1) return;

        var current = 0;
        var INTERVAL_MS = 5000;

        setInterval(function () {
            slides[current].classList.remove("is-loaded");
            current = (current + 1) % slides.length;
            slides[current].classList.add("is-loaded");
        }, INTERVAL_MS);
    });
})();