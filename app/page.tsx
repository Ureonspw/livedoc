"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FiArrowRight, FiMail, FiPhone, FiMapPin, FiClock, FiShield, FiUsers, FiHeart, FiActivity, FiCpu, FiFileText, FiTrendingUp } from "react-icons/fi";

import Classes from "@/app/Assets/styles/Acceuil.module.css";
export default function Home() {
  useEffect(() => {
    // Gestionnaire pour le smooth scroll
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        const href = target.getAttribute('href');
        if (href) {
          const element = document.querySelector(href);
          if (element) {
            e.preventDefault();
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
    <div className={Classes.ContainerMain}>
        <div className={Classes.mainmenu}>
          <div className={Classes.title}>LIVEDOC</div>
          <div className={Classes.mainmenuelements}>
            <div className={Classes.mainmenuelement1}>
              <a href="#apropos" className={Classes.contenumenu}>A PROPOS </a>
              <a href="#aide" className={Classes.contenumenu}>AIDE</a>
              <a href="#contact" className={Classes.contenumenu}>CONTACT</a>
            </div>
            <Link href="/login" className={Classes.bouttonlogin}>CONNEXION</Link>
          </div>
        </div>
        <div className={Classes.content}>
          <div className={Classes.content1}>
            Système intelligent de <strong>détection</strong> des<br/>
            maladies <strong>virales</strong> assisté par IA
          </div>
          <div className={Classes.content2}>
            <div>
              {" "}
              Optimisez la gestion des patients et réduisez le temps de pré-diagnostic 
              grâce à l'intelligence artificielle explicable. Un outil d'aide à la décision 
              médicale fiable et transparent.
            </div>
            <div className={Classes.content2button}>
              <samp>commencer dés maintenant</samp>{" "}
              <span>
                <FiArrowRight size={24} />
              </span>
            </div>
          </div>
          <div className={Classes.content3}></div>
        </div>
      </div>

      {/* Section Services */}
      <section id="services" className={Classes.servicesSection}>
        <div className={Classes.servicesContainer}>
          <h2 className={Classes.sectionTitle}>Fonctionnalités Principales</h2>
          <div className={Classes.servicesGrid}>
            <div className={Classes.serviceCard}>
              <FiActivity className={Classes.serviceIcon} />
              <h3>Gestion du Parcours Patient</h3>
              <p>Enregistrement, triage automatique et suivi complet depuis la salle d'attente jusqu'au suivi post-diagnostic</p>
            </div>
            <div className={Classes.serviceCard}>
              <FiCpu className={Classes.serviceIcon} />
              <h3>Diagnostic Assisté par IA</h3>
              <p>Détection intelligente des maladies virales avec calcul de probabilités et résultats interprétables</p>
            </div>
            <div className={Classes.serviceCard}>
              <FiFileText className={Classes.serviceIcon} />
              <h3>Explicabilité des Modèles</h3>
              <p>Visualisation de l'impact des caractéristiques et justification transparente des prédictions IA</p>
            </div>
            <div className={Classes.serviceCard}>
              <FiTrendingUp className={Classes.serviceIcon} />
              <h3>Optimisation des Temps</h3>
              <p>Réduction du temps de pré-diagnostic et amélioration de la fiabilité grâce à l'assistance IA</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section A PROPOS */}
      <section id="apropos" className={Classes.aboutSection}>
        <div className={Classes.aboutContainer}>
          <div className={Classes.aboutContent}>
            <h2 className={Classes.sectionTitle}>À Propos de LIVEDOC</h2>
            <p className={Classes.aboutText}>
              LIVEDOC est un système informatique intelligent multimodal de détection des maladies virales 
              et de gestion des patients. Face à l'augmentation du nombre de patients et à la pression sur 
              le personnel médical, notre solution optimise la gestion du parcours patient et assiste les 
              médecins dans le diagnostic grâce à l'intelligence artificielle explicable.
            </p>
            <p className={Classes.aboutText}>
              Notre système ne se substitue pas au médecin mais l'assiste dans sa prise de décision en 
              fournissant des prédictions fiables, interprétables et transparentes. Nous exploitons des 
              modèles d'IA explicables pour améliorer la rapidité et la fiabilité du diagnostic, tout en 
              centralisant les données médicales dans un environnement sécurisé.
            </p>
            <div className={Classes.statsContainer}>
              <div className={Classes.statItem}>
                <div className={Classes.statNumber}>-50%</div>
                <div className={Classes.statLabel}>Temps de pré-diagnostic</div>
              </div>
              <div className={Classes.statItem}>
                <div className={Classes.statNumber}>95%+</div>
                <div className={Classes.statLabel}>Fiabilité des prédictions</div>
              </div>
              <div className={Classes.statItem}>
                <div className={Classes.statNumber}>100%</div>
                <div className={Classes.statLabel}>Explicabilité garantie</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section AIDE */}
      <section id="aide" className={Classes.helpSection}>
        <div className={Classes.helpContainer}>
          <h2 className={Classes.sectionTitle}>Centre d'Aide</h2>
          <div className={Classes.faqContainer}>
            <div className={Classes.faqItem}>
              <h3 className={Classes.faqQuestion}>Comment fonctionne le système de détection assistée par IA ?</h3>
              <p className={Classes.faqAnswer}>
                Le système analyse les données cliniques et biologiques du patient, puis utilise des modèles 
                d'intelligence artificielle pour prédire les maladies virales possibles. Les résultats incluent 
                des probabilités et des explications sur les facteurs influents, permettant au médecin de 
                prendre une décision éclairée.
              </p>
            </div>
            <div className={Classes.faqItem}>
              <h3 className={Classes.faqQuestion}>Le système remplace-t-il le médecin ?</h3>
              <p className={Classes.faqAnswer}>
                Non, absolument pas. LIVEDOC est un outil d'aide à la décision médicale qui assiste le médecin 
                sans se substituer à lui. Le médecin valide ou rejette toujours le diagnostic proposé et prend 
                la décision finale concernant le traitement.
              </p>
            </div>
            <div className={Classes.faqItem}>
              <h3 className={Classes.faqQuestion}>Comment fonctionne l'explicabilité des modèles IA ?</h3>
              <p className={Classes.faqAnswer}>
                Le système identifie et visualise les variables les plus influentes dans la prédiction, 
                permettant au médecin de comprendre pourquoi une maladie virale a été suggérée. Cette 
                transparence garantit la confiance et la traçabilité des décisions médicales.
              </p>
            </div>
            <div className={Classes.faqItem}>
              <h3 className={Classes.faqQuestion}>Quels sont les rôles disponibles dans le système ?</h3>
              <p className={Classes.faqAnswer}>
                Le système propose trois types d'utilisateurs : Médecin (consultation, validation des diagnostics), 
                Personnel d'accueil/Infirmier (enregistrement, triage, saisie des données), et Administrateur 
                (gestion des comptes et supervision du système).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section CONTACT */}
      <section id="contact" className={Classes.contactSection}>
        <div className={Classes.contactContainer}>
          <h2 className={Classes.sectionTitle}>Contactez-nous</h2>
          <div className={Classes.contactContent}>
            <div className={Classes.contactInfo}>
              <div className={Classes.contactItem}>
                <FiMail className={Classes.contactIcon} />
                <div>
                  <h3>Email</h3>
                  <p>contact@livedoc.fr</p>
                </div>
              </div>
              <div className={Classes.contactItem}>
                <FiPhone className={Classes.contactIcon} />
                <div>
                  <h3>Téléphone</h3>
                  <p>+33 1 23 45 67 89</p>
                </div>
              </div>
              <div className={Classes.contactItem}>
                <FiMapPin className={Classes.contactIcon} />
                <div>
                  <h3>Adresse</h3>
                  <p>123 Rue de la Santé<br/>75001 Paris, France</p>
                </div>
              </div>
              <div className={Classes.contactItem}>
                <FiClock className={Classes.contactIcon} />
                <div>
                  <h3>Horaires</h3>
                  <p>Disponible 24h/24 et 7j/7</p>
                </div>
              </div>
            </div>
            <form className={Classes.contactForm}>
              <div className={Classes.formGroup}>
                <input type="text" placeholder="Votre nom" className={Classes.formInput} />
              </div>
              <div className={Classes.formGroup}>
                <input type="email" placeholder="Votre email" className={Classes.formInput} />
              </div>
              <div className={Classes.formGroup}>
                <input type="text" placeholder="Sujet" className={Classes.formInput} />
              </div>
              <div className={Classes.formGroup}>
                <textarea placeholder="Votre message" rows={5} className={Classes.formTextarea}></textarea>
              </div>
              <button type="submit" className={Classes.formButton}>
                Envoyer le message <FiArrowRight />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={Classes.footer}>
        <div className={Classes.footerContainer}>
          <div className={Classes.footerContent}>
            <div className={Classes.footerSection}>
              <h3 className={Classes.footerTitle}>LIVEDOC</h3>
              <p className={Classes.footerText}>
                Système intelligent multimodal de détection des maladies virales 
                et de gestion des patients. Assistance au diagnostic par IA explicable.
              </p>
            </div>
            <div className={Classes.footerSection}>
              <h4 className={Classes.footerSubtitle}>Navigation</h4>
              <ul className={Classes.footerLinks}>
                <li><a href="#apropos">À Propos</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#aide">Aide</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className={Classes.footerSection}>
              <h4 className={Classes.footerSubtitle}>Légal</h4>
              <ul className={Classes.footerLinks}>
                <li><a href="#">Mentions légales</a></li>
                <li><a href="#">Politique de confidentialité</a></li>
                <li><a href="#">CGU</a></li>
                <li><a href="#">Cookies</a></li>
              </ul>
            </div>
            <div className={Classes.footerSection}>
              <h4 className={Classes.footerSubtitle}>Suivez-nous</h4>
              <div className={Classes.socialLinks}>
                <a href="#" className={Classes.socialLink}>Facebook</a>
                <a href="#" className={Classes.socialLink}>Twitter</a>
                <a href="#" className={Classes.socialLink}>LinkedIn</a>
                <a href="#" className={Classes.socialLink}>Instagram</a>
              </div>
            </div>
          </div>
          <div className={Classes.footerBottom}>
            <p>&copy; 2024 LIVEDOC. Tous droits réservés.</p>
          </div>
    </div>
      </footer>
    </>
  );
}
