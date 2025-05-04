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

// Add typing animation for left hand only
gsap.to(".left-hand .fingers rect", {
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

// Add mouse movement and right hand animation
gsap.to([".right-hand", ".mouse-element"], {
    x: 5,
    duration: 2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1
});

// Add subtle mouse click animation
gsap.to(".mouse-grip path", {
    y: 0.5,
    duration: 0.2,
    ease: "power2.inOut",
    yoyo: true,
    repeat: -1,
    repeatDelay: 1,
    stagger: {
        amount: 0.1,
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

// Add browser content loading animation
gsap.to(".browser-content rect", {
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

// Add code inspector typing effect
gsap.to(".code-inspector rect", {
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

// Add CPU fan spin animation
gsap.to(".fan-blades", {
    rotation: 360,
    transformOrigin: "center center",
    transformBox: "fillBox",
    ease: "linear",
    repeat: -1,
    duration: 1
});