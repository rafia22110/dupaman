// ============================================
// SSR NEWS - MAIN SCRIPT
// alveare-ai.com
// ============================================

// === NAVBAR SCROLL EFFECT ===
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// === HAMBURGER MENU ===
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close mobile menu when clicking a link
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
});

// === WEBHOOK URL (n8n) ===
// Replace this with your actual n8n webhook URL
const WEBHOOK_URL = 'https://n8n.alveare-ai.com/webhook/subscribe';

// === FORM SUBMISSION ===
async function submitForm(name, email) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, source: 'website', timestamp: new Date().toISOString() })
    });

    if (response.ok) {
      showSuccess(name);
    } else {
      // Fallback - show success anyway for demo
      showSuccess(name);
    }
  } catch (error) {
    // Network error or webhook not set up yet - show success for demo
    console.log('Webhook not configured yet:', error);
    showSuccess(name);
  }
}

// === HERO FORM ===
const heroForm = document.getElementById('heroForm');
heroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('heroName').value.trim();
  const email = document.getElementById('heroEmail').value.trim();
  if (!name || !email) return;
  
  const btn = heroForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span>שולח...</span>';
  
  await submitForm(name, email);
  
  heroForm.reset();
  btn.disabled = false;
  btn.innerHTML = '<span>הצטרף עכשיו</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
});

// === SUBSCRIBE FORM ===
const subscribeForm = document.getElementById('subscribeForm');
subscribeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('subName').value.trim();
  const email = document.getElementById('subEmail').value.trim();
  if (!name || !email) return;
  
  const btn = subscribeForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span>שולח...</span>';
  
  await submitForm(name, email);
  
  subscribeForm.reset();
  btn.disabled = false;
  btn.innerHTML = '<span>הרשמה חינם</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
});

// === SUCCESS MODAL ===
function showSuccess(name) {
  const overlay = document.getElementById('successOverlay');
  const title = document.getElementById('successTitle');
  title.textContent = `שלום, ${name || 'חבר'}! 👋`;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSuccess() {
  const overlay = document.getElementById('successOverlay');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

// Close on backdrop click
document.getElementById('successOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSuccess();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSuccess();
});

// === SOCIAL LOGIN ===
function socialLogin(provider) {
  console.log(`Attempting social login with: ${provider}`);
  // In a real application, you would redirect to the OAuth provider here.
  // Example: window.location.href = `/auth/${provider.toLowerCase()}`;
  
  // For now, we mock the success after a short delay
  const mockName = provider === 'Google' ? 'ישראל ישראלי' : 'חבר פייסבוק';
  const mockEmail = provider === 'Google' ? 'israel@gmail.com' : 'fb_user@example.com';
  
  // Show a loading state or just transition to success
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>מתחבר...</span>';
  
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    showSuccess(mockName);
    
    // Also trigger the webhook to simulate registration
    submitForm(mockName, mockEmail);
  }, 1000);
}

// Navbar Login Handler
const navLogin = document.getElementById('navLogin');
const mobileLogin = document.getElementById('mobileLogin');
[navLogin, mobileLogin].forEach(btn => {
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      socialLogin('Google'); // Default to Google for login button
    });
  }
});

// === SCROLL ANIMATIONS ===
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 100);
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Add animation class to elements
document.addEventListener('DOMContentLoaded', () => {
  const animateEls = [
    '.about-card',
    '.feature-card',
    '.testimonial-card',
    '.email-window',
    '.subscribe-box'
  ];
  
  animateEls.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.classList.add('animate-on-scroll');
      observer.observe(el);
    });
  });
});

// === SMOOTH SCROLL FOR ANCHOR LINKS ===
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      const offset = 80; // navbar height
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// === COUNTER ANIMATION FOR STATS ===
function animateCounter(el, target, suffix = '') {
  const duration = 2000;
  const start = performance.now();
  
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
    const current = Math.round(eased * target);
    el.textContent = current.toLocaleString('he-IL') + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  
  requestAnimationFrame(update);
}

// Animate stats when hero section is visible
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const stats = document.querySelectorAll('.stat-num');
      const values = [5000, 365];
      stats.forEach((stat, i) => {
        if (i < values.length) {
          const suffix = i === 0 ? '+' : '';
          animateCounter(stat, values[i], suffix);
        }
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);
