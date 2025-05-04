// Register GSAP plugins required for animations
gsap.registerPlugin(ScrollTrigger);

/**
 * Animates the hero section elements with a staggered entrance
 * Uses GSAP timeline for coordinated animations of title, subtitle and illustration
 */
const animateHeroSection = () => {
  const tl = gsap.timeline();
  
  tl.from(".hero-title", {
    duration: 1.2,
    y: 100,
    opacity: 0,
    ease: "power4.out"
  })
  .from(".hero-subtitle", {
    duration: 1,
    y: 50,
    opacity: 0,
    ease: "power3.out"
  }, "-=0.8") // Overlap with previous animation
  .from(".illustration-container", {
    duration: 2,
    xPercent: 100,
    opacity: 0,
    ease: "power3.inOut"
  }, "-=0.8");
};

/**
 * Initializes navigation section tracking
 * Updates active nav item based on current scroll position
 */
const initNavTracking = () => {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');

  const updateActiveNav = () => {
    const scrollY = window.scrollY;
    
    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100; // Offset for fixed header
      const sectionId = section.getAttribute('id');
      
      if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('text-accent');
          if(link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('text-accent');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', updateActiveNav);
  updateActiveNav(); // Initial check
};

/**
 * Implements smooth scroll navigation with header offset
 * Uses GSAP's ScrollToPlugin for smooth animation
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      gsap.to(window, {
        duration: 1,
        scrollTo: {
          y: target,
          offsetY: 80 // Offset for fixed header
        },
        ease: "power3.inOut"
      });
    }
  });
});

/**
 * Animates project cards with staggered reveal on scroll
 * Uses ScrollTrigger for scroll-based animations
 */
const setupProjectAnimations = () => {
  gsap.utils.toArray(".project-card").forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: "top bottom-=50",
        toggleActions: "play none none reverse"
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      delay: i * 0.2,
      ease: "power3.out"
    });
  });
};

/**
 * Sets up parallax effect for background elements
 * Elements with data-speed attribute will move at different speeds while scrolling
 */
const setupParallaxEffects = () => {
  gsap.utils.toArray("[data-speed]").forEach(el => {
    gsap.to(el, {
      y: (i, target) => (ScrollTrigger.maxScroll(window) - target.offsetTop) * target.dataset.speed,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  });
};

/**
 * Manages scroll indicator visibility
 * Fades out the scroll indicator when user has scrolled past the hero section
 */
const handleScrollIndicator = () => {
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (!scrollIndicator) return;

  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    
    if (scrollPosition > windowHeight * 0.3) {
      scrollIndicator.style.opacity = '0';
    } else {
      scrollIndicator.style.opacity = '1';
    }
  });
};

// Initialize all animations and functionality on DOM load
document.addEventListener("DOMContentLoaded", () => {
  animateHeroSection();
  setupProjectAnimations();
  setupParallaxEffects();
  handleScrollIndicator();
  initNavTracking();
});

// Store animation timelines for performance optimization
const typingAnimation = gsap.to(".left-hand .fingers rect", {
    y: 2,
    duration: 0.1,
    ease: "power2.inOut",
    yoyo: true,
    repeat: -1,
    repeatDelay: 0.2,
    stagger: {
        amount: 0.3,
        from: "random"
    }
});

/**
 * Mouse movement animation for the illustration
 * Creates a natural-looking mouse tracking motion
 */
const mouseMovement = gsap.to([".right-hand", ".mouse-element"], {
    x: 5,
    duration: 2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
});

/**
 * Browser content animation
 * Simulates dynamic content loading in the illustration
 */
const browserContentAnimation = gsap.to(".browser-content rect", {
    width: "random(10, 17)",
    duration: "random(0.5, 1.5)",
    ease: "power1.inOut",
    yoyo: true,
    repeat: -1,
    stagger: {
        amount: 1,
        from: "start"
    }
});

/**
 * Code inspector animation
 * Creates a typing effect in the code panel
 */
const codeInspectorAnimation = gsap.to(".code-inspector rect", {
    width: "random(14, 17)",
    duration: 0.3,
    ease: "none",
    repeat: -1,
    repeatDelay: 0.1,
    stagger: {
        amount: 0.5,
        from: "random"
    }
});

// Add cursor blink animation for code editor effect
gsap.to(".cursor-blink", {
    opacity: 0,
    duration: 0.8,
    ease: "steps(1)",
    repeat: -1,
    yoyo: true
});

// Add continuous CPU fan rotation animation
gsap.to(".fan-blades", {
    rotation: 360,
    transformOrigin: "center center",
    transformBox: "fillBox",
    ease: "linear",
    repeat: -1,
    duration: 1
});

// Check for user's motion preferences
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * LinkedIn connection button interaction
 * Manages animations for head turning and phone screen state
 */
const connectBtn = document.querySelector('.connect-btn');
const personHead = document.querySelector('.person circle');
const phoneScreen = document.querySelector('.phone-screen');
const linkedinContent = document.querySelector('.linkedin-content');
const originalHeadPosition = { x: 210, cy: 155 };

// Handle hover interactions for LinkedIn button
connectBtn.addEventListener('mouseenter', () => {
    if (!prefersReducedMotion) {
        // Animate head turn
        gsap.to(personHead, {
            attr: { cx: 200 },
            duration: 0.4,
            ease: "power2.out"
        });

        // Show LinkedIn interface
        gsap.to(phoneScreen, {
            fill: "#0A66C2",
            duration: 0.4,
            ease: "power2.out"
        });

        gsap.to(linkedinContent, {
            opacity: 1,
            duration: 0.4,
            ease: "power2.out"
        });

        // Button hover effect
        gsap.to(connectBtn, {
            scale: 1.05,
            z: 20,
            rotationY: 5,
            transformPerspective: 1000,
            transformOrigin: "center center",
            boxShadow: "0 20px 30px rgba(0,0,0,0.2)",
            duration: 0.4,
            ease: "power2.out"
        });

        // Pause laptop animations during interaction
        typingAnimation.pause();
        mouseMovement.pause();
        browserContentAnimation.pause();
        codeInspectorAnimation.pause();
    }
});

// Reset animations on hover out
connectBtn.addEventListener('mouseleave', () => {
    if (!prefersReducedMotion) {
        // Reset head position
        gsap.to(personHead, {
            attr: { cx: originalHeadPosition.x },
            duration: 0.4,
            ease: "power2.out"
        });

        // Reset phone screen
        gsap.to(phoneScreen, {
            fill: "#000000",
            duration: 0.4,
            ease: "power2.out"
        });

        gsap.to(linkedinContent, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out"
        });

        // Reset button state
        gsap.to(connectBtn, {
            scale: 1,
            z: 0,
            rotationY: 0,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
            duration: 0.4,
            ease: "power2.out"
        });

        // Resume laptop animations
        typingAnimation.resume();
        mouseMovement.resume();
        browserContentAnimation.resume();
        codeInspectorAnimation.resume();
    }
});

/**
 * About section card animations
 * Adds entrance animations for about section elements
 */
gsap.utils.toArray('#about .bg-card\\/70').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: {
      trigger: card,
      start: "top bottom-=100",
      toggleActions: "play none none reverse"
    },
    y: 50,
    opacity: 0,
    duration: 1,
    delay: i * 0.2,
    ease: "power3.out"
  });
});

/**
 * Tech stack icon animations
 * Adds rotating entrance animation for technology icons
 */
gsap.utils.toArray('#about .w-12').forEach((icon) => {
  gsap.from(icon, {
    scrollTrigger: {
      trigger: icon,
      start: "top bottom-=50",
      toggleActions: "play none none reverse"
    },
    scale: 0,
    rotation: -180,
    opacity: 0,
    duration: 0.8,
    ease: "back.out(1.7)"
  });
});

/**
 * Tech stack tag animations
 * Adds scale-in animation for technology tags
 */
gsap.from('#about .flex-wrap .px-4', {
  scrollTrigger: {
    trigger: '#about .flex-wrap',
    start: "top bottom-=50",
    toggleActions: "play none none reverse"
  },
  scale: 0,
  opacity: 0,
  duration: 0.5,
  stagger: 0.1,
  ease: "back.out(1.7)"
});

/**
 * Tech stack card interactions
 * Manages hover and click animations for technology cards
 */
const techCards = document.querySelectorAll('#about .grid-cols-2 > div');
techCards.forEach(card => {
  // Hover animation
  card.addEventListener('mouseenter', () => {
    gsap.to(card, {
      y: -5,
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out"
    });
    
    // Icon animation
    const icon = card.querySelector('.w-12');
    gsap.to(icon, {
      scale: 1.1,
      rotate: 5,
      duration: 0.3,
      ease: "power2.out"
    });
  });

  // Reset on mouse leave
  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    });
    
    // Reset icon
    const icon = card.querySelector('.w-12');
    gsap.to(icon, {
      scale: 1,
      rotate: 0,
      duration: 0.3,
      ease: "power2.out"
    });
  });

  // Click feedback animation
  card.addEventListener('click', () => {
    gsap.to(card, {
      scale: 0.95,
      duration: 0.1,
      ease: "power2.out",
      yoyo: true,
      repeat: 1
    });
  });
});