// Fichier main.js - Animations GSAP pour SyncThink

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Enregistrer les plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Configuration globale de GSAP
gsap.config({
  nullTargetWarn: false, // Désactiver les avertissements pour les éléments non trouvés
});

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeAnimations();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des animations:', error);
  }
});

function initializeAnimations() {
  // Animation d'entrée initiale pour la section d'accueil
  const tlHome = gsap.timeline({
    onError: (element, message) => {
      console.warn('Erreur animation:', message, element);
    }
  });
  
  // Animation du titre et sous-titre
  if (document.querySelector('.title')) {
    tlHome.from('.title', {
      y: -50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    })
    .from('.subtitle', {
      y: -30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.5');
  }
  
  // Animation des yeux
  if (document.querySelector('.pink-eyes')) {
    tlHome.from('.pink-eyes', {
      scale: 0,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.7)',
      rotation: -180
    }, '-=0.8');
  }
  
  // Animation de l'image principale
  if (document.querySelector('.mainImg')) {
    tlHome.from('.mainImg', {
      x: -100,
      opacity: 0,
      duration: 1.2,
      ease: 'power2.out'
    }, '-=0.5');
  }
  
  // Animation des boutons avec stagger pour effet d'escalier
  if (document.querySelector('.button')) {
    tlHome.from('.button', {
      x: 100,
      opacity: 0,
      stagger: 0.2,
      duration: 0.8,
      ease: 'back.out(1.2)'
    }, '-=0.8');
  }
  
  // Animation au survol des boutons
  const buttons = document.querySelectorAll('.button, .back-button');
  buttons.forEach(button => {
    const enterAnimation = gsap.to(button, {
      scale: 1.05,
      duration: 0.3,
      ease: 'power1.out',
      boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
      paused: true
    });

    const leaveAnimation = gsap.to(button, {
      scale: 1,
      duration: 0.3,
      ease: 'power1.out',
      boxShadow: 'none',
      paused: true
    });

    button.addEventListener('mouseenter', () => enterAnimation.play());
    button.addEventListener('mouseleave', () => leaveAnimation.play());
  });
  
  // Animations pour la section "How to Play"
  const howtoSection = document.querySelector('.section-howto');
  if (howtoSection) {
    // Animation du titre et sous-titre de la section How to Play
    ScrollTrigger.create({
      trigger: '.howto-header',
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo('.howto-title', 
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
        gsap.fromTo('.howto-subtitle', 
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 }
        );
      },
      once: true
    });
    
    // Animation pour l'image de la section How to Play
    if (document.querySelector('.howto-img')) {
      ScrollTrigger.create({
        trigger: '.howto-right',
        start: 'top 80%',
        onEnter: () => {
          gsap.fromTo('.howto-img', 
            { x: 100, opacity: 0 },
            { x: 0, opacity: 1, duration: 1, ease: 'power2.out' }
          );
        },
        once: true
      });
    }
    
    // Animation pour les étapes de la section How to Play
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 80%',
        onEnter: () => {
          gsap.fromTo(step, 
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: index * 0.15 }
          );
        },
        once: true
      });
    });

    // Animation pour le bouton "Back to top"
    if (document.querySelector('.back-button')) {
      ScrollTrigger.create({
        trigger: '.back-to-top',
        start: 'top 90%',
        onEnter: () => {
          gsap.fromTo('.back-button', 
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
          );
        },
        once: true
      });
    }
  }
  
  // Animation subtile de flottement pour l'image principale
  if (document.querySelector('.mainImg')) {
    gsap.to('.mainImg', {
      y: 15,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }
  
  // Animation subtile pour les yeux
  if (document.querySelector('.pink-eyes')) {
    gsap.to('.pink-eyes', {
      scale: 1.05,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }
  
  // Animation subtile pour l'image de la section How to Play
  if (document.querySelector('.howto-img')) {
    gsap.to('.howto-img', {
      y: 10,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1
    });
  }
  
  // Utiliser GSAP pour le défilement fluide
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        gsap.to(window, {
          duration: 1,
          scrollTo: {
            y: targetElement,
            offsetY: 50
          },
          ease: 'power2.inOut'
        });
      }
    });
  });

  // Nettoyage lors du démontage
  return () => {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.globalTimeline.clear();
  };
}