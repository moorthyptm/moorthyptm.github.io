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

// Add typing tap animation for left hand only
gsap.to(".left-hand", {
    y: 5,
    duration: 0.15,
    ease: "power1.inOut",
    yoyo: true,
    repeat: -1,
    repeatDelay: 0.2
});

// Add mouse-move animation for right hand and mouse
gsap.to([".right-hand", ".mouse"], {
    x: 20,
    duration: 1,
    ease: "power1.inOut",
    yoyo: true,
    repeat: -1,
    stagger: 0.1
});

// Add cursor blink animation
gsap.to(".cursor-blink", {
    opacity: 0,
    duration: 0.5,
    ease: "power2.out",
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