// Theme handling
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateIcons(newTheme);
}

function updateIcons(theme) {
    const sunIcon = document.querySelector('.sun');
    const moonIcon = document.querySelector('.moon');
    
    if (theme === 'dark') {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

// Initialize theme and icons
const theme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
updateIcons(theme);

// GSAP Animations
gsap.from(".gsap-title", {
    duration: 1,
    y: -50,
    opacity: 0,
    ease: "power2.out"
});

gsap.from(".gsap-text", {
    duration: 1,
    y: 50,
    opacity: 0,
    delay: 0.5,
    ease: "power2.out"
});

// Store timeline references for pausing/resuming
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

const mouseMovement = gsap.to([".right-hand", ".mouse-element"], {
    x: 5,
    duration: 2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
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

// Add cursor blink animation
gsap.to(".cursor-blink", {
    opacity: 0,
    duration: 0.8,
    ease: "steps(1)",
    repeat: -1,
    yoyo: true
});

// Add CPU fan spin animation
gsap.to(".fan-blades", {
    rotation: 360,
    transformOrigin: "center center",
    transformBox: "fillBox",
    ease: "linear",
    repeat: -1,
    duration: 1
});

// LinkedIn content animation
gsap.to(".linkedin-content rect", {
    width: "random(10, 12)",
    duration: "random(0.8, 1.2)",
    ease: "power1.inOut",
    yoyo: true,
    repeat: -1,
    stagger: {
        amount: 0.5,
        from: "start"
    }
});

// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Connect button animation with head turning and phone screen
const connectBtn = document.querySelector('.connect-btn');
const personHead = document.querySelector('.person circle');
const phoneScreen = document.querySelector('.phone-screen');
const linkedinContent = document.querySelector('.linkedin-content');
const originalHeadPosition = { x: 210, cy: 155 };

connectBtn.addEventListener('mouseenter', () => {
    if (!prefersReducedMotion) {
        // Turn head
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

        // Button effect
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

        // Pause all laptop screen and interaction animations
        typingAnimation.pause();
        mouseMovement.pause();
        browserContentAnimation.pause();
        codeInspectorAnimation.pause();
    }
});

connectBtn.addEventListener('mouseleave', () => {
    if (!prefersReducedMotion) {
        // Return head position
        gsap.to(personHead, {
            attr: { cx: originalHeadPosition.x },
            duration: 0.4,
            ease: "power2.out"
        });

        // Hide LinkedIn interface
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

        // Reset button
        gsap.to(connectBtn, {
            scale: 1,
            z: 0,
            rotationY: 0,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
            duration: 0.4,
            ease: "power2.out"
        });

        // Resume all laptop screen and interaction animations
        typingAnimation.resume();
        mouseMovement.resume();
        browserContentAnimation.resume();
        codeInspectorAnimation.resume();
    }
});