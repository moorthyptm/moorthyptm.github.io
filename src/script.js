document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  const animateHeroSection = () => {
    const tl = gsap.timeline();

    tl.from("#hero-title", {
      duration: 1.2,
      y: 100,
      opacity: 0,
      ease: "power4.out"
    })
      .from("#hero-subtitle", {
        duration: 1,
        y: 50,
        opacity: 0,
        ease: "power3.out"
      }, "-=0.8")
      .from("#hero-illustration", {
        duration: 2,
        xPercent: 100,
        opacity: 0,
        ease: "power3.inOut"
      }, "-=0.8");
  };

  const initNavTracking = () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');

    const updateActiveNav = () => {
      const scrollY = window.scrollY;

      sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          navLinks.forEach(link => {
            link.classList.remove('text-accent');
            if (link.getAttribute('href') === `#${sectionId}`) {
              link.classList.add('text-accent');
            }
          });
        }
      });
    };

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();
  };

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        gsap.to(window, {
          duration: 1,
          scrollTo: {
            y: target,
            offsetY: 80,
            autoKill: false
          },
          ease: "power3.inOut"
        });
      }
    });
  });

  const setupProjectAnimations = () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    gsap.utils.toArray(".project-card").forEach((card) => {
      gsap.set(card, { opacity: 0, y: 40, willChange: 'transform, opacity' });

      ScrollTrigger.create({
        trigger: card,
        start: "top 90%",
        once: true,
        onEnter: () => {
          gsap.to(card, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            clearProps: "willChange"
          });
        }
      });
    });
  };

  const setupParallaxEffects = () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    // Lightweight scrub parallax for data-speed elements
    gsap.utils.toArray("[data-speed]").forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0;
      gsap.to(el, {
        y: () => speed * 100,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.5 // Silk-smooth 0.5s catch-up
        }
      });
    });

    const heroSection = document.getElementById('home');
    if (!heroSection) return;

    const shapes = document.querySelectorAll('.hero-shape');
    const illustration = document.getElementById('hero-illustration');
    const title = document.getElementById('hero-title');

    // RAF-throttled mouse parallax for 60fps
    let mouseX = 0, mouseY = 0, rafId = null;

    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          shapes.forEach((shape, index) => {
            const speed = (index + 1) * 15;
            gsap.to(shape, {
              x: mouseX * speed,
              y: mouseY * speed,
              duration: 0.8,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          });

          if (illustration) {
            gsap.to(illustration, {
              x: -mouseX * 20,
              y: -mouseY * 20,
              duration: 0.8,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }

          if (title) {
            gsap.to(title, {
              x: mouseX * 8,
              y: mouseY * 8,
              duration: 0.8,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }

          rafId = null;
        });
      }
    };

    heroSection.addEventListener('mousemove', onMouseMove, { passive: true });

    // Device orientation (mobile tilt parallax)
    const handleOrientation = (e) => {
      const gamma = Math.min(Math.max(e.gamma, -45), 45);
      const beta = Math.min(Math.max(e.beta, -45), 45);
      mouseX = gamma / 90;
      mouseY = beta / 90;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          shapes.forEach((shape, index) => {
            const speed = (index + 1) * 15;
            gsap.to(shape, { x: mouseX * speed, y: mouseY * speed, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
          });
          if (illustration) gsap.to(illustration, { x: -mouseX * 20, y: -mouseY * 20, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
          if (title) gsap.to(title, { x: mouseX * 8, y: mouseY * 8, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
          rafId = null;
        });
      }
    };

    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const requestPermission = () => {
          DeviceOrientationEvent.requestPermission()
            .then(response => {
              if (response === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation, { passive: true });
              }
            })
            .catch(console.error)
            .finally(() => {
              document.removeEventListener('click', requestPermission);
            });
        };
        document.addEventListener('click', requestPermission);
      } else {
        window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      }
    }
  };

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

  const initMobileNavigation = () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = mobileMenu?.querySelectorAll('a[href^="#"]') || [];

    const toggleMobileMenu = () => {
      const isClosed = mobileMenu.classList.contains('-translate-x-full');

      if (isClosed) {
        // Open menu
        mobileMenu.classList.remove('invisible');
        // Force reflow
        void mobileMenu.offsetWidth;
        mobileMenu.classList.remove('-translate-x-full');
        mobileMenu.setAttribute('aria-hidden', 'false');
        mobileMenuButton.setAttribute('aria-expanded', 'true');
        document.body.classList.add('overflow-hidden');
        mobileMenuClose.focus();
      } else {
        // Close menu
        closeMobileMenu();
      }
    };

    const closeMobileMenu = () => {
      mobileMenu.classList.add('-translate-x-full');
      mobileMenu.setAttribute('aria-hidden', 'true');
      mobileMenuButton.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('overflow-hidden');

      // Wait for transition to finish before hiding visibility
      const handleTransitionEnd = () => {
        if (mobileMenu.classList.contains('-translate-x-full')) {
          mobileMenu.classList.add('invisible');
        }
        mobileMenu.removeEventListener('transitionend', handleTransitionEnd);
      };

      mobileMenu.addEventListener('transitionend', handleTransitionEnd);
      mobileMenuButton.focus();
    };

    mobileMenuButton?.addEventListener('click', toggleMobileMenu);
    mobileMenuClose?.addEventListener('click', closeMobileMenu);

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    mobileMenu?.addEventListener('click', (e) => {
      if (e.target === mobileMenu) {
        closeMobileMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileMenu.classList.contains('-translate-x-full')) {
        closeMobileMenu();
      }
    });
  };

  const initMobileOptimizations = () => {
    const isMobile = window.innerWidth <= 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isMobile || prefersReducedMotion) {
      gsap.globalTimeline.timeScale(2);
    }
  };

  const initTouchOptimizations = () => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      const interactiveElements = document.querySelectorAll('.bg-card\\/50, #connect-btn, nav a');

      interactiveElements.forEach(element => {
        element.addEventListener('touchstart', () => {
          element.style.transform = 'scale(0.95)';
        });

        element.addEventListener('touchend', () => {
          setTimeout(() => {
            element.style.transform = '';
          }, 150);
        });
      });
    }
  };

  animateHeroSection();
  setupProjectAnimations();
  setupParallaxEffects();
  handleScrollIndicator();
  initNavTracking();
  initMobileNavigation();
  initMobileOptimizations();
  initTouchOptimizations();

  const typingAnimation = gsap.to(".typing-hands .fingers rect", {
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

  gsap.to(".cursor-blink", {
    opacity: 0,
    duration: 0.8,
    ease: "steps(1)",
    repeat: -1,
    yoyo: true
  });

  gsap.to(".fan-blades", {
    rotation: 360,
    transformOrigin: "center center",
    transformBox: "fillBox",
    ease: "linear",
    repeat: -1,
    duration: 1
  });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const connectBtn = document.querySelector('#connect-btn');
  const personHead = document.querySelector('.person circle');
  const phoneScreen = document.querySelector('.phone-screen');
  const linkedinContent = document.querySelector('.linkedin-content');
  const originalHeadPosition = { x: 210, cy: 155 };

  if (connectBtn) {
    connectBtn.addEventListener('mouseenter', () => {
      if (!prefersReducedMotion) {
        if (personHead) {
          gsap.to(personHead, {
            attr: { cx: 200 },
            duration: 0.4,
            ease: "power2.out"
          });
        }

        if (phoneScreen) {
          gsap.to(phoneScreen, {
            fill: "#0A66C2",
            duration: 0.4,
            ease: "power2.out"
          });
        }

        if (linkedinContent) {
          gsap.to(linkedinContent, {
            opacity: 1,
            duration: 0.4,
            ease: "power2.out"
          });
        }

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

        typingAnimation.pause();

        browserContentAnimation.pause();
        codeInspectorAnimation.pause();
      }
    });

    connectBtn.addEventListener('mouseleave', () => {
      if (!prefersReducedMotion) {
        if (personHead) {
          gsap.to(personHead, {
            attr: { cx: originalHeadPosition.x },
            duration: 0.4,
            ease: "power2.out"
          });
        }

        if (phoneScreen) {
          gsap.to(phoneScreen, {
            fill: "#000000",
            duration: 0.4,
            ease: "power2.out"
          });
        }

        if (linkedinContent) {
          gsap.to(linkedinContent, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out"
          });
        }

        gsap.to(connectBtn, {
          scale: 1,
          z: 0,
          rotationY: 0,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
          duration: 0.4,
          ease: "power2.out"
        });

        typingAnimation.resume();

        browserContentAnimation.resume();
        codeInspectorAnimation.resume();
      }
    });
  }

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

  gsap.utils.toArray('.bg-card\\/50').forEach((icon) => {
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

  const techCards = document.querySelectorAll('.bg-card\\/50');
  techCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        y: -5,
        scale: 1.05,
        duration: 0.3,
        ease: "power2.out"
      });

      const icon = card.querySelector('.w-10, .w-12');
      if (icon) {
        gsap.to(icon, {
          scale: 1.1,
          rotate: 5,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });

      const icon = card.querySelector('.w-10, .w-12');
      if (icon) {
        gsap.to(icon, {
          scale: 1,
          rotate: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

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
});

