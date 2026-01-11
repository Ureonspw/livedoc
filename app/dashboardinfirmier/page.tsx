"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome, FiUsers, FiClock, FiActivity, FiFileText, FiSettings,
  FiMenu, FiUser, FiLogOut, FiPlus, FiSearch, FiEdit, FiTrash2,
  FiCheck, FiX, FiAlertCircle, FiTrendingUp, FiAlertTriangle,
  FiThermometer, FiHeart, FiDroplet, FiPackage, FiMaximize2,
  FiArrowUp, FiArrowDown, FiStar, FiSave, FiImage
} from "react-icons/fi";
import Classes from "@/app/Assets/styles/DashboardInfirmier.module.css";

interface Patient {
  id_patient: number;
  nom: string;
  prenom: string;
  sexe: string;
  date_naissance: string;
  telephone?: string;
  adresse?: string;
}

interface SalleAttenteItem {
  id_salle_attente: number;
  id_patient: number;
  date_arrivee: string;
  statut: 'EN_ATTENTE' | 'EN_CONSULTATION' | 'TERMINE';
  priorite: 'NORMAL' | 'URGENT' | 'CRITIQUE';
  patient: Patient;
}

interface Stats {
  en_attente: number;
  en_consultation: number;
  termine: number;
  total_patients: number;
}

interface ChartData {
  consultationsParJour: { jour: string; count: number }[];
  patientsParJour: { jour: string; count: number }[];
  repartitionStatut: {
    EN_ATTENTE: number;
    EN_CONSULTATION: number;
    TERMINE: number;
  };
  constantesMoyennes: {
    temperature: number;
    frequence_cardiaque: number;
    saturation_oxygene: number;
    poids: number;
    taille: number;
  };
  totalPatients?: number;
}

export default function DashboardInfirmierPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [user, setUser] = useState<any>(null);
  
  // États pour les différentes sections
  const [patients, setPatients] = useState<Patient[]>([]);
  const [salleAttente, setSalleAttente] = useState<SalleAttenteItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    en_attente: 0,
    en_consultation: 0,
    termine: 0,
    total_patients: 0,
  });
  const [chartData, setChartData] = useState<ChartData | null>(null);
  
  // États pour les formulaires
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showConstantesForm, setShowConstantesForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedVisite, setSelectedVisite] = useState<number | null>(null);
  const [selectedMedecin, setSelectedMedecin] = useState<number | null>(null);
  const [showMedecinSelector, setShowMedecinSelector] = useState(false);
  const [pendingAppel, setPendingAppel] = useState<{id: number, id_patient: number} | null>(null);
  const [medecins, setMedecins] = useState<Array<{id_utilisateur: number, nom: string, prenom: string, email: string}>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPrioriteSelector, setShowPrioriteSelector] = useState(false);
  const [pendingPriorite, setPendingPriorite] = useState<{id: number, id_patient: number} | null>(null);
  const [selectedPriorite, setSelectedPriorite] = useState<'NORMAL' | 'URGENT' | 'CRITIQUE'>('NORMAL');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [showResultatForm, setShowResultatForm] = useState(false);
  const [resultatForm, setResultatForm] = useState<any>({});
  const [photosFiles, setPhotosFiles] = useState<File[]>([]);
  
  // Formulaire nouveau patient
  const [patientForm, setPatientForm] = useState({
    nom: "",
    prenom: "",
    sexe: "HOMME",
    date_naissance: "",
    telephone: "",
    adresse: "",
  });
  
  // Formulaire constantes vitales
  const [constantesForm, setConstantesForm] = useState({
    temperature: "",
    frequence_cardiaque: "",
    saturation_oxygene: "",
    poids: "",
    taille: "",
  });

  // Charger la session utilisateur
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          if (data.user.role !== 'INFIRMIER') {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      });
  }, [router]);

  // Charger les médecins au démarrage
  useEffect(() => {
    loadMedecins();
  }, []);

  const loadMedecins = async () => {
    try {
      const response = await fetch('/api/medecins');
      const data = await response.json();
      setMedecins(data.medecins || []);
    } catch (error) {
      console.error('Erreur lors du chargement des médecins:', error);
    }
  };

  // Charger les données
  useEffect(() => {
    if (activeSection === "dashboard" || activeSection === "salle-attente") {
      loadSalleAttente();
      loadChartData();
      
      // Rafraîchir automatiquement toutes les 30 secondes
      const interval = setInterval(() => {
        loadSalleAttente();
        loadChartData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
    if (activeSection === "patients") {
      loadPatients();
    }
    if (activeSection === "resultats-examens") {
      loadPrescriptions();
      // Rafraîchir automatiquement toutes les 30 secondes
      const interval = setInterval(() => {
        loadPrescriptions();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeSection]);

  const loadChartData = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setChartData(data);
      // Mettre à jour le total des patients depuis les stats
      if (data.totalPatients !== undefined) {
        setStats(prev => ({ ...prev, total_patients: data.totalPatients }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const loadPatients = async () => {
    try {
      const response = await fetch(`/api/patients?search=${searchTerm}`);
      const data = await response.json();
      setPatients(data.patients || []);
      setStats(prev => ({ ...prev, total_patients: data.total || 0 }));
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
    }
  };

  const loadSalleAttente = async () => {
    try {
      const response = await fetch('/api/salle-attente');
      const data = await response.json();
      setSalleAttente(data.salleAttente || []);
      setStats(prev => ({
        ...prev,
        en_attente: data.stats?.en_attente || 0,
        en_consultation: data.stats?.en_consultation || 0,
        termine: data.stats?.termine || 0,
      }));
    } catch (error) {
      console.error('Erreur lors du chargement de la salle d\'attente:', error);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientForm),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ajouter automatiquement à la salle d'attente avec priorité normale
        await fetch('/api/salle-attente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_patient: data.patient.id_patient, priorite: 'NORMAL' }),
        });
        
        setShowPatientForm(false);
        setPatientForm({
          nom: "",
          prenom: "",
          sexe: "HOMME",
          date_naissance: "",
          telephone: "",
          adresse: "",
        });
        loadPatients();
        loadSalleAttente();
        setActiveSection("salle-attente");
      }
    } catch (error) {
      console.error('Erreur lors de la création du patient:', error);
      alert('Erreur lors de la création du patient');
    }
  };

  const handleAddToSalleAttente = async (id_patient: number, priorite: 'NORMAL' | 'URGENT' | 'CRITIQUE' = 'NORMAL') => {
    try {
      const response = await fetch('/api/salle-attente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_patient, priorite }),
      });
      
      if (response.ok) {
        loadSalleAttente();
        setShowPrioriteSelector(false);
        setPendingPriorite(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'ajout à la salle d\'attente');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout à la salle d\'attente');
    }
  };

  const handleShowPrioriteSelector = (id: number, id_patient: number) => {
    setPendingPriorite({ id, id_patient });
    setShowPrioriteSelector(true);
  };

  const handleUpdatePriorite = async (id: number, priorite: 'NORMAL' | 'URGENT' | 'CRITIQUE') => {
    try {
      const response = await fetch(`/api/salle-attente/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorite }),
      });
      
      if (response.ok) {
        loadSalleAttente();
        setShowPrioriteSelector(false);
        setPendingPriorite(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la mise à jour de la priorité');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour de la priorité');
    }
  };

  const handleAppelerPatient = (id: number, id_patient: number) => {
    // Vérifier qu'il y a des médecins disponibles
    if (medecins.length === 0) {
      alert('Aucun médecin disponible. Veuillez créer un compte médecin d\'abord.');
      return;
    }

    // Si un seul médecin, l'assigner directement
    if (medecins.length === 1) {
      handleUpdateStatut(id, 'EN_CONSULTATION', id_patient, medecins[0].id_utilisateur);
      return;
    }

    // Sinon, ouvrir le sélecteur de médecin
    setPendingAppel({ id, id_patient });
    setShowMedecinSelector(true);
  };

  const handleUpdateStatut = async (id: number, statut: string, id_patient: number, id_medecin?: number) => {
    try {
      // Si on passe à EN_CONSULTATION, créer une consultation et une visite
      if (statut === 'EN_CONSULTATION') {
        if (!id_medecin) {
          alert('Veuillez sélectionner un médecin');
          return;
        }

        // D'abord créer la consultation et la visite
        const consultationResponse = await fetch('/api/consultations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id_patient,
            id_medecin,
          }),
        });

        if (!consultationResponse.ok) {
          const errorData = await consultationResponse.json();
          const errorMessage = errorData.error || 'Erreur lors de la création de la consultation';
          alert(errorMessage + (errorData.details ? '\n\nDétails: ' + errorData.details : ''));
          console.error('Erreur consultation:', errorData);
          return;
        }

        const consultationData = await consultationResponse.json();
        setSelectedVisite(consultationData.visite.id_visite);
        setSelectedPatient(salleAttente.find(s => s.id_patient === id_patient)?.patient || null);
      }

      // Ensuite mettre à jour le statut
      const response = await fetch(`/api/salle-attente/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Erreur lors de la mise à jour du statut';
        alert(errorMessage + (errorData.details ? '\n\nDétails: ' + errorData.details : ''));
        console.error('Erreur API:', errorData);
        return;
      }

      const data = await response.json();
      loadSalleAttente();
      
      if (statut === 'EN_CONSULTATION') {
        // Fermer le sélecteur de médecin si ouvert
        setShowMedecinSelector(false);
        setPendingAppel(null);
        // Ouvrir automatiquement le formulaire de constantes vitales
        setShowConstantesForm(true);
        // Rediriger vers la section constantes vitales
        setTimeout(() => {
          setActiveSection("constantes");
        }, 500);
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      alert('Erreur lors de la mise à jour du statut: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const loadPrescriptions = async () => {
    try {
      // Charger toutes les prescriptions (l'infirmier voit toutes les prescriptions)
      const response = await fetch('/api/prescriptions');
      if (response.ok) {
        const data = await response.json();
        console.log('Prescriptions chargées:', data.prescriptions);
        // Filtrer pour ne garder que celles en attente ou en cours SANS résultats
        // Une fois qu'un résultat est enregistré, l'examen ne doit plus apparaître pour l'infirmier
        const prescriptionsFiltered = (data.prescriptions || []).filter((p: any) => {
          // Garder uniquement les prescriptions qui n'ont pas encore de résultats
          const hasNoResults = !p.resultats || p.resultats.length === 0;
          // Et qui sont en attente ou en cours
          const isPendingOrInProgress = p.statut === 'EN_ATTENTE' || p.statut === 'EN_COURS';
          return hasNoResults && isPendingOrInProgress;
        });
        setPrescriptions(prescriptionsFiltered);
      } else {
        const errorData = await response.json();
        console.error('Erreur API prescriptions:', errorData);
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des prescriptions:', error);
      setPrescriptions([]);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: FiHome },
    { id: "patients", label: "Patients", icon: FiUsers },
    { id: "salle-attente", label: "Salle d'attente", icon: FiClock },
    { id: "constantes", label: "Constantes vitales", icon: FiActivity },
    { id: "resultats-examens", label: "Résultats d'examens", icon: FiFileText },
  ];

  // Composant graphique en barres amélioré
  const BarChart = ({ data, title, color = '#3b82f6' }: { data: { jour: string; count: number }[], title: string, color?: string }) => {
    const maxValue = Math.max(...data.map(d => d.count), 1);
    const barHeight = 180;

  return (
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)';
      }}
      >
        <h3 style={{ 
          marginBottom: '24px', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <FiTrendingUp style={{ color: color }} />
          {title}
        </h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: '12px', 
          height: `${barHeight}px`, 
          paddingBottom: '40px',
          paddingTop: '20px',
        }}>
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.count / maxValue) * (barHeight - 20) : 4;
              return (
              <div 
                key={index} 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${height}px`,
                    background: `linear-gradient(180deg, ${color} 0%, ${color}cc 50%, ${color}99 100%)`,
                    borderRadius: '6px 6px 0 0',
                    minHeight: '4px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: `0 2px 4px ${color}40`,
                  }}
                  title={`${item.jour}: ${item.count}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scaleY(1.05)';
                    e.currentTarget.style.boxShadow = `0 4px 8px ${color}60`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scaleY(1)';
                    e.currentTarget.style.boxShadow = `0 2px 4px ${color}40`;
                  }}
                >
                  {item.count > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#374151',
                      background: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}>
                      {item.count}
                    </span>
                  )}
                </div>
                <span style={{ 
                  marginTop: '12px', 
                  fontSize: '12px', 
                  color: '#64748b', 
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {item.jour}
                </span>
              </div>
              );
            })}
          </div>
        </div>
    );
  };

  // Composant graphique circulaire (donut) amélioré
  const DonutChart = ({ data, title }: { data: { EN_ATTENTE: number; EN_CONSULTATION: number; TERMINE: number }, title: string }) => {
    const total = data.EN_ATTENTE + data.EN_CONSULTATION + data.TERMINE;
    const enAttentePercent = total > 0 ? (data.EN_ATTENTE / total) * 100 : 0;
    const enConsultationPercent = total > 0 ? (data.EN_CONSULTATION / total) * 100 : 0;
    const terminePercent = total > 0 ? (data.TERMINE / total) * 100 : 0;
    
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeWidth = 24;
    
    const enAttenteDash = (enAttentePercent / 100) * circumference;
    const enConsultationDash = (enConsultationPercent / 100) * circumference;
    const termineDash = (terminePercent / 100) * circumference;
    
    const enAttenteOffset = circumference - enAttenteDash;
    const enConsultationOffset = circumference - enConsultationDash - enAttenteDash;
    const termineOffset = circumference - termineDash - enConsultationDash - enAttenteDash;
    
    return (
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)';
      }}
      >
        <h3 style={{ 
          marginBottom: '24px', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#1e293b',
        }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px', height: '220px', flexShrink: 0 }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              {/* Cercle de fond */}
                    <circle
                      cx="100"
                      cy="100"
                r={radius}
                      fill="none"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
                    />
              {/* Segment En attente */}
              {total > 0 && enAttentePercent > 0 && (
                    <circle
                      cx="100"
                      cy="100"
                  r={radius}
                      fill="none"
                  stroke="#3b82f6"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${enAttenteDash} ${circumference}`}
                  strokeDashoffset={enAttenteOffset}
                  strokeLinecap="round"
                  style={{ transition: 'all 0.6s ease' }}
                />
              )}
              {/* Segment En consultation */}
              {total > 0 && enConsultationPercent > 0 && (
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${enConsultationDash} ${circumference}`}
                  strokeDashoffset={enConsultationOffset}
                  strokeLinecap="round"
                  style={{ transition: 'all 0.6s ease' }}
                />
              )}
              {/* Segment Terminé */}
              {total > 0 && terminePercent > 0 && (
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${termineDash} ${circumference}`}
                  strokeDashoffset={termineOffset}
                  strokeLinecap="round"
                  style={{ transition: 'all 0.6s ease' }}
                />
              )}
                  </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', lineHeight: '1' }}>{total}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>Total</div>
                </div>
              </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', padding: '8px', borderRadius: '8px', background: '#f8fafc' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                borderRadius: '6px', 
                marginRight: '12px',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
              }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>En attente</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{data.EN_ATTENTE} patients • {enAttentePercent.toFixed(1)}%</div>
            </div>
              </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', padding: '8px', borderRadius: '8px', background: '#f0fdf4' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                borderRadius: '6px', 
                marginRight: '12px',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
              }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>En consultation</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{data.EN_CONSULTATION} patients • {enConsultationPercent.toFixed(1)}%</div>
                  </div>
                  </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px', background: '#faf5ff' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                borderRadius: '6px', 
                marginRight: '12px',
                boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
              }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>Terminé</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{data.TERMINE} patients • {terminePercent.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
      </div>
    );
  };

  // Composant graphique linéaire amélioré
  const LineChart = ({ data, title, color = '#3b82f6' }: { data: { jour: string; count: number }[], title: string, color?: string }) => {
    const maxValue = Math.max(...data.map(d => d.count), 1);
    const padding = 40;
    const width = 400;
    const height = 150;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = data.map((item, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding + chartHeight - (item.count / maxValue) * chartHeight;
      return { x, y, value: item.count, label: item.jour };
    });
    
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;
    
    return (
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)';
      }}
      >
        <h3 style={{ 
          marginBottom: '24px', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <FiActivity style={{ color: color }} />
          {title}
        </h3>
        <div style={{ height: '220px', position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id={`lineGradient-${title.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.4 }} />
                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.05 }} />
              </linearGradient>
              <filter id={`glow-${title.replace(/\s/g, '')}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Zone remplie sous la ligne */}
            <path
              d={areaPath}
              fill={`url(#lineGradient-${title.replace(/\s/g, '')})`}
            />
            {/* Ligne principale */}
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-${title.replace(/\s/g, '')})`}
              style={{ transition: 'all 0.3s ease' }}
            />
            {/* Points sur la ligne */}
            {points.map((point, index) => (
              <g key={index}>
                <circle 
                  cx={point.x} 
                  cy={point.y} 
                  r="5" 
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.setAttribute('r', '7');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.setAttribute('r', '5');
                  }}
                />
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#374151"
                  style={{ pointerEvents: 'none' }}
                >
                  {point.value}
                </text>
              </g>
            ))}
          </svg>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#64748b',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {data.map((item, index) => (
              <span key={index}>{item.jour}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Composant graphique pour constantes vitales
  const ConstantesChart = ({ data }: { data: { temperature: number; frequence_cardiaque: number; saturation_oxygene: number; poids: number; taille: number } }) => {
    const constantes = [
      { label: 'Température', value: data.temperature, unit: '°C', color: '#ef4444', Icon: FiThermometer, max: 42, min: 35 },
      { label: 'Fréquence cardiaque', value: data.frequence_cardiaque, unit: 'bpm', color: '#3b82f6', Icon: FiHeart, max: 120, min: 60 },
      { label: 'Saturation O₂', value: data.saturation_oxygene, unit: '%', color: '#10b981', Icon: FiDroplet, max: 100, min: 90 },
      { label: 'Poids', value: data.poids, unit: 'kg', color: '#f59e0b', Icon: FiPackage, max: 150, min: 40 },
      { label: 'Taille', value: data.taille, unit: 'cm', color: '#8b5cf6', Icon: FiMaximize2, max: 200, min: 100 },
    ];

    return (
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
      }}>
        <h3 style={{ 
          marginBottom: '24px', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#1e293b',
        }}>
          Constantes vitales moyennes (7 derniers jours)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
          {constantes.map((constante, index) => {
            const value = Number(constante.value) || 0;
            const percent = constante.max > constante.min 
              ? ((value - constante.min) / (constante.max - constante.min)) * 100 
              : 0;
            const normalizedPercent = Math.max(0, Math.min(100, percent));
            
            return (
              <div 
                key={index}
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                  padding: '20px',
                  borderRadius: '10px',
                  border: `2px solid ${constante.color}20`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 16px ${constante.color}30`;
                  e.currentTarget.style.borderColor = `${constante.color}60`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = `${constante.color}20`;
                }}
              >
                <div style={{ 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <constante.Icon 
                    size={32} 
                    style={{ 
                      color: constante.color,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    }} 
                  />
                </div>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  color: constante.color,
                  marginBottom: '4px',
                  lineHeight: '1.2',
                }}>
                  {value > 0 ? value.toFixed(constante.unit === 'kg' || constante.unit === 'cm' ? 1 : 1) : '0'}{constante.unit}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#64748b',
                  fontWeight: '500',
                  marginBottom: '12px',
                }}>
                  {constante.label}
                </div>
                <div style={{
                  height: '6px',
                  background: '#e5e7eb',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginTop: '8px',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${normalizedPercent}%`,
                    background: `linear-gradient(90deg, ${constante.color} 0%, ${constante.color}cc 100%)`,
                    borderRadius: '3px',
                    transition: 'width 0.6s ease',
                    boxShadow: `0 0 8px ${constante.color}40`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className={Classes.dashboardContent}>
      {/* Statistiques principales améliorées */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px',
        marginBottom: '30px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2), 0 1px 3px rgba(59, 130, 246, 0.1)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 12px rgba(59, 130, 246, 0.3), 0 2px 6px rgba(59, 130, 246, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.2), 0 1px 3px rgba(59, 130, 246, 0.1)';
        }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Patients en attente</div>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '4px', lineHeight: '1' }}>{stats.en_attente}</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>En attente de consultation</div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2), 0 1px 3px rgba(16, 185, 129, 0.1)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 12px rgba(16, 185, 129, 0.3), 0 2px 6px rgba(16, 185, 129, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.2), 0 1px 3px rgba(16, 185, 129, 0.1)';
        }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>En consultation</div>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '4px', lineHeight: '1' }}>{stats.en_consultation}</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Actuellement en consultation</div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2), 0 1px 3px rgba(139, 92, 246, 0.1)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 12px rgba(139, 92, 246, 0.3), 0 2px 6px rgba(139, 92, 246, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.2), 0 1px 3px rgba(139, 92, 246, 0.1)';
        }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Total patients</div>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '4px', lineHeight: '1' }}>{stats.total_patients}</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Enregistrés dans le système</div>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2), 0 1px 3px rgba(245, 158, 11, 0.1)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 12px rgba(245, 158, 11, 0.3), 0 2px 6px rgba(245, 158, 11, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(245, 158, 11, 0.2), 0 1px 3px rgba(245, 158, 11, 0.1)';
        }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>Terminés</div>
            <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '4px', lineHeight: '1' }}>{stats.termine}</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Consultations terminées</div>
          </div>
        </div>
      </div>

      {/* Actions rapides améliorées */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
        marginTop: '30px',
      }}>
        <h3 style={{ 
          marginBottom: '20px', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#1e293b',
        }}>
          Actions rapides
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button 
            onClick={() => {
              setShowPatientForm(true);
              setActiveSection("patients");
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.2)';
            }}
          >
            <FiPlus size={20} />
            Nouveau patient
          </button>
          <button 
            onClick={() => setActiveSection("salle-attente")}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.2)';
            }}
          >
            <FiClock size={20} />
            Salle d'attente
          </button>
          <button 
            onClick={() => setActiveSection("constantes")}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(139, 92, 246, 0.2)';
            }}
          >
            <FiActivity size={20} />
            Constantes vitales
          </button>
        </div>
      </div>

      {/* Graphiques améliorés */}
      {chartData && (
        <>
          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
            <BarChart 
              data={chartData.consultationsParJour} 
              title="Consultations par jour (7 derniers jours)"
              color="#3b82f6"
            />
            <BarChart 
              data={chartData.patientsParJour} 
              title="Patients enregistrés par jour (7 derniers jours)"
              color="#10b981"
            />
          </div>

          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
            <DonutChart 
              data={chartData.repartitionStatut} 
              title="Répartition des statuts"
            />
            <LineChart 
              data={chartData.consultationsParJour} 
              title="Évolution des consultations"
              color="#8b5cf6"
            />
          </div>
        </>
      )}

      {/* Constantes vitales moyennes avec graphique amélioré */}
      {chartData && chartData.constantesMoyennes.temperature > 0 && (
        <div style={{ marginTop: '30px' }}>
          <ConstantesChart data={chartData.constantesMoyennes} />
        </div>
      )}
    </div>
  );

  const renderPatients = () => (
    <div className={Classes.dashboardContent}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setTimeout(loadPatients, 300);
            }}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>
        <button
          className={Classes.btnPrimary}
          onClick={() => setShowPatientForm(true)}
        >
          <FiPlus style={{ marginRight: '8px' }} />
          Nouveau patient
        </button>
      </div>

      {showPatientForm && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ marginBottom: '20px' }}>Enregistrer un nouveau patient</h3>
          <form onSubmit={handleCreatePatient}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nom *</label>
                <input
                  type="text"
                  required
                  value={patientForm.nom}
                  onChange={(e) => setPatientForm({ ...patientForm, nom: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Prénom *</label>
                <input
                  type="text"
                  required
                  value={patientForm.prenom}
                  onChange={(e) => setPatientForm({ ...patientForm, prenom: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Sexe *</label>
                <select
                  required
                  value={patientForm.sexe}
                  onChange={(e) => setPatientForm({ ...patientForm, sexe: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                >
                  <option value="HOMME">Homme</option>
                  <option value="FEMME">Femme</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Date de naissance *</label>
                <input
                  type="date"
                  required
                  value={patientForm.date_naissance}
                  onChange={(e) => setPatientForm({ ...patientForm, date_naissance: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Téléphone</label>
                <input
                  type="tel"
                  value={patientForm.telephone}
                  onChange={(e) => setPatientForm({ ...patientForm, telephone: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Adresse</label>
                <input
                  type="text"
                  value={patientForm.adresse}
                  onChange={(e) => setPatientForm({ ...patientForm, adresse: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className={Classes.btnPrimary}>
                Enregistrer et ajouter à la salle d'attente
              </button>
              <button
                type="button"
                onClick={() => setShowPatientForm(false)}
                className={Classes.btnSecondary}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
      }}>
        {patients.map((patient) => {
          const age = patient.date_naissance 
            ? Math.floor((new Date().getTime() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null;
          
          return (
            <div
              key={patient.id_patient}
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #e5e7eb',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(60, 79, 138, 0.15), 0 4px 8px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#3c4f8a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              {/* Décoration en arrière-plan */}
              <div style={{ 
                position: 'absolute', 
                top: '-30px', 
                right: '-30px', 
                width: '120px', 
                height: '120px', 
                background: patient.sexe === 'HOMME' 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)' 
                  : 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
                borderRadius: '50%',
                zIndex: 0,
              }}></div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* En-tête avec nom et badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: patient.sexe === 'HOMME' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '18px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}>
                    {patient.prenom?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#1e293b',
                      lineHeight: '1.2',
                      marginBottom: '4px',
                    }}>
                      {patient.prenom} {patient.nom}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: patient.sexe === 'HOMME' 
                          ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                          : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                        color: patient.sexe === 'HOMME' ? '#1e40af' : '#be185d',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}>
                        {patient.sexe}
                      </span>
                      {age !== null && (
                        <span style={{
                          padding: '4px 10px',
                          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                          color: '#4b5563',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}>
                          {age} ans
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informations du patient */}
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.6)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {patient.telephone && (
                      <div style={{ 
                        color: '#4b5563', 
                        fontSize: '13px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontWeight: '500',
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1e40af',
                        }}>
                          <FiUser size={14} />
                        </div>
                        <span>{patient.telephone}</span>
                      </div>
                    )}
                    {patient.adresse && (
                      <div style={{ 
                        color: '#4b5563', 
                        fontSize: '13px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontWeight: '500',
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#065f46',
                        }}>
                          <FiActivity size={14} />
                        </div>
                        <span style={{ wordBreak: 'break-word' }}>{patient.adresse}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton d'action */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb',
                }}>
                  <button
                    onClick={() => {
                      setPendingPriorite({ id: 0, id_patient: patient.id_patient });
                      setShowPrioriteSelector(true);
                    }}
                    style={{
                      padding: '10px 18px',
                      background: 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 6px rgba(60, 79, 138, 0.2)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(60, 79, 138, 0.3)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(60, 79, 138, 0.2)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <FiPlus size={16} />
                    Ajouter à l'attente
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {patients.length === 0 && (
          <div style={{ 
            padding: '60px', 
            textAlign: 'center', 
            color: '#6b7280',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            gridColumn: '1 / -1',
          }}>
            <FiUsers size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
              {searchTerm ? 'Aucun patient trouvé' : 'Aucun patient'}
            </div>
            <div style={{ fontSize: '14px' }}>
              {searchTerm ? 'Essayez une autre recherche' : 'Aucun patient n\'a été enregistré pour le moment'}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSalleAttente = () => {
    const enAttente = salleAttente.filter(item => item.statut === 'EN_ATTENTE');
    
    return (
      <div className={Classes.dashboardContent}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Salle d'attente</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ padding: '8px 16px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px' }}>
              En attente: {stats.en_attente}
            </span>
            <span style={{ padding: '8px 16px', background: '#d1fae5', color: '#065f46', borderRadius: '4px' }}>
              En consultation: {stats.en_consultation}
            </span>
          </div>
        </div>

        {/* Explication du workflow */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <h3 style={{ margin: 0, marginBottom: '15px', color: '#1e40af', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiFileText />
            Comment fonctionne la salle d'attente ?
          </h3>
          <div style={{ color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>Workflow étape par étape :</p>
            <ol style={{ margin: '0 0 0 20px', padding: 0 }}>
              <li><strong>Enregistrement</strong> : Le patient est enregistré et ajouté automatiquement à la salle d'attente (statut : EN_ATTENTE). Vous pouvez définir une priorité (NORMAL, URGENT, CRITIQUE) pour les cas graves.</li>
              <li><strong>Priorité</strong> : Les patients sont triés automatiquement par priorité (CRITIQUE → URGENT → NORMAL) puis par ordre d'arrivée. Vous pouvez modifier la priorité à tout moment.</li>
              <li><strong>Appeler le patient</strong> : Cliquez sur "Appeler le patient" → Sélectionnez le médecin qui va consulter → Le statut passe à EN_CONSULTATION et une consultation est créée avec le médecin assigné</li>
              <li><strong>Constantes vitales</strong> : Allez dans "Constantes vitales" pour saisir température, tension, poids, taille, etc.</li>
              <li><strong>Le médecin</strong> : Le médecin assigné voit le patient EN_CONSULTATION dans son dashboard et peut commencer la consultation</li>
            </ol>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ 
            marginBottom: '20px', 
            fontSize: '20px', 
            fontWeight: '700', 
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <FiUsers size={20} />
            </div>
            Patients en attente
          </h3>
          {enAttente.length === 0 ? (
            <div style={{ 
              padding: '60px', 
              textAlign: 'center', 
              color: '#6b7280',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '12px',
              border: '1px dashed #e5e7eb',
            }}>
              <FiUsers size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                Aucun patient en attente
              </div>
              <div style={{ fontSize: '14px' }}>
                Les patients ajoutés apparaîtront ici
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {enAttente.map((item, index) => {
                const dateArrivee = new Date(item.date_arrivee);
                const tempsAttente = Math.floor((Date.now() - dateArrivee.getTime()) / 60000); // en minutes
                
                const prioriteConfig = {
                  NORMAL: { color: '#3b82f6', bg: '#dbeafe', label: 'Normal', icon: FiClock },
                  URGENT: { color: '#f59e0b', bg: '#fef3c7', label: 'Urgent', icon: FiAlertTriangle },
                  CRITIQUE: { color: '#ef4444', bg: '#fee2e2', label: 'Critique', icon: FiAlertCircle },
                };
                
                const config = prioriteConfig[item.priorite || 'NORMAL'];
                const PrioriteIcon = config.icon;
                
                return (
                  <div
                    key={item.id_salle_attente}
                    style={{
                      padding: '24px',
                      border: `2px solid ${config.color}40`,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(60, 79, 138, 0.15), 0 4px 8px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = config.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = `${config.color}40`;
                    }}
                  >
                    {/* Décoration en arrière-plan */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '-30px', 
                      right: '-30px', 
                      width: '120px', 
                      height: '120px', 
                      background: `linear-gradient(135deg, ${config.color}20 0%, ${config.color}10 100%)`,
                      borderRadius: '50%',
                      zIndex: 0,
                    }}></div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '20px',
                        flexShrink: 0,
                        boxShadow: `0 4px 6px ${config.color}40`,
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>
                            {item.patient.prenom} {item.patient.nom}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            background: `linear-gradient(135deg, ${config.bg} 0%, ${config.bg}dd 100%)`,
                            color: config.color,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          }}
                          onClick={() => handleShowPrioriteSelector(item.id_salle_attente, item.id_patient)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = config.color;
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `linear-gradient(135deg, ${config.bg} 0%, ${config.bg}dd 100%)`;
                            e.currentTarget.style.color = config.color;
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          >
                            <PrioriteIcon size={14} />
                            {config.label}
                          </div>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#92400e',
                          }}>
                            <FiClock size={12} />
                          </div>
                          Arrivé il y a {tempsAttente} minute{tempsAttente > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 1 }}>
                      <button
                        onClick={() => handleShowPrioriteSelector(item.id_salle_attente, item.id_patient)}
                        style={{
                          padding: '10px 16px',
                          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                          color: '#64748b',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
                          e.currentTarget.style.color = '#374151';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                          e.currentTarget.style.color = '#64748b';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <FiEdit size={14} />
                        Priorité
                      </button>
                      <button
                        onClick={() => handleAppelerPatient(item.id_salle_attente, item.id_patient)}
                        style={{
                          padding: '10px 20px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 6px 12px rgba(16, 185, 129, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.2)';
                        }}
                      >
                        <FiCheck size={16} />
                        Appeler
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleSaveConstantesVitales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisite) {
      alert('Aucune visite sélectionnée');
      return;
    }

    try {
      const response = await fetch('/api/constantes-vitales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_visite: selectedVisite,
          ...constantesForm,
        }),
      });

      if (response.ok) {
        alert('Constantes vitales enregistrées avec succès !');
        setShowConstantesForm(false);
        setConstantesForm({
          temperature: "",
          frequence_cardiaque: "",
          saturation_oxygene: "",
          poids: "",
          taille: "",
        });
        setSelectedVisite(null);
        setSelectedPatient(null);
        loadSalleAttente();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement des constantes vitales');
    }
  };

  const renderResultatsExamens = () => {
    return (
      <div className={Classes.dashboardContent}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>
            Saisie des résultats d'examens
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Saisissez les résultats des examens prescrits par les médecins et prenez des photos des documents
          </p>
        </div>

        {prescriptions.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px',
          }}>
            {prescriptions.map((prescription: any) => (
              <div
                key={prescription.id_prescription}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(60, 79, 138, 0.15), 0 4px 8px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#3c4f8a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                {/* Décoration en arrière-plan */}
                <div style={{ 
                  position: 'absolute', 
                  top: '-30px', 
                  right: '-30px', 
                  width: '120px', 
                  height: '120px', 
                  background: 'linear-gradient(135deg, rgba(60, 79, 138, 0.1) 0%, rgba(56, 133, 176, 0.05) 100%)',
                  borderRadius: '50%',
                  zIndex: 0,
                }}></div>
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '18px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}>
                          {prescription.consultation?.patient?.prenom?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                            {prescription.consultation?.patient?.prenom} {prescription.consultation?.patient?.nom}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiClock size={12} />
                            Prescrit le {new Date(prescription.date_prescription).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })} par Dr. {prescription.medecin?.prenom} {prescription.medecin?.nom}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {prescription.maladies_ciblees.map((maladie: string) => (
                          <span
                            key={maladie}
                            style={{
                              padding: '5px 12px',
                              background: maladie === 'DIABETE' 
                                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                                : maladie === 'MALADIE_RENALE' 
                                ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                                : maladie === 'CARDIOVASCULAIRE' 
                                ? 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' 
                                : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                              color: maladie === 'DIABETE' ? '#d97706' : maladie === 'MALADIE_RENALE' ? '#2563eb' : maladie === 'CARDIOVASCULAIRE' ? '#be185d' : '#dc2626',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '600',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {maladie.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                      {prescription.commentaire && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#6b7280', 
                          marginTop: '8px', 
                          padding: '12px', 
                          background: 'rgba(248, 250, 252, 0.8)',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}>
                          <strong>Note du médecin:</strong> {prescription.commentaire}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb',
                  }}>
                    <button
                      onClick={() => {
                        setSelectedPrescription(prescription);
                        setShowResultatForm(true);
                        // Initialiser le formulaire avec les champs selon les maladies
                        const initialForm: any = {};
                        if (prescription.maladies_ciblees.includes('DIABETE')) {
                          initialForm.taux_glucose = '';
                          initialForm.taux_insuline = '';
                          initialForm.imc = '';
                          initialForm.age = '';
                          initialForm.nombre_grossesses = '';
                          initialForm.pression_arterielle = '';
                          initialForm.epaisseur_pli_cutane = '';
                          initialForm.fonction_pedigree_diabete = '';
                        }
                        if (prescription.maladies_ciblees.includes('MALADIE_RENALE')) {
                          initialForm.uree_sanguine = '';
                          initialForm.creatinine_serique = '';
                          initialForm.albumine = '';
                          initialForm.sodium = '';
                          initialForm.potassium = '';
                          initialForm.hemoglobine = '';
                          initialForm.volume_cellulaire_packe = '';
                          initialForm.globules_blancs = '';
                          initialForm.globules_rouges = '';
                          initialForm.gravite_specifique = '';
                          initialForm.sucre = '';
                          initialForm.globules_rouges_urine = '';
                          initialForm.pus_cells = '';
                          initialForm.pus_cells_clumps = '';
                          initialForm.bacteries = '';
                        initialForm.glucose_sang = '';
                        initialForm.hypertension = false;
                        initialForm.diabete_mellitus = false;
                        initialForm.maladie_coronaire = false;
                        initialForm.appetit = '';
                        initialForm.oedeme_pieds = false;
                        initialForm.anemie = false;
                      }
                      if (prescription.maladies_ciblees.includes('CARDIOVASCULAIRE')) {
                        initialForm.cholesterol = '';
                        initialForm.pression_systolique = '';
                        initialForm.pression_diastolique = '';
                        initialForm.fumeur = false;
                        initialForm.consommation_alcool = false;
                        initialForm.activite_physique = false;
                        initialForm.genre = '';
                        initialForm.taille_cm = '';
                        initialForm.poids_kg = '';
                        initialForm.glucose_cardio = '';
                      }
                      setResultatForm(initialForm);
                      setPhotosFiles([]);
                    }}
                      style={{
                        padding: '10px 18px',
                        background: 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 6px rgba(60, 79, 138, 0.2)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(60, 79, 138, 0.3)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(60, 79, 138, 0.2)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <FiEdit size={16} />
                      Saisir les résultats
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            color: '#6b7280',
          }}>
            <FiFileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>Aucune prescription en attente</div>
            <div style={{ fontSize: '14px' }}>Les prescriptions apparaîtront ici lorsqu'un médecin prescrira des examens</div>
          </div>
        )}
      </div>
    );
  };

  const renderConstantesVitales = () => {
    // Si un formulaire est ouvert, l'afficher
    if (showConstantesForm && selectedPatient && selectedVisite) {
      return (
        <div className={Classes.dashboardContent}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}>
                <FiActivity size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                  Saisie des constantes vitales
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                  Patient : <strong style={{ color: '#1e293b' }}>{selectedPatient.prenom} {selectedPatient.nom}</strong>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveConstantesVitales} style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
              padding: '20px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '1px solid #bfdbfe',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
            }}>
              <h3 style={{ 
                margin: 0, 
                color: '#1e40af', 
                fontSize: '16px', 
                marginBottom: '10px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <FiFileText size={18} />
                Qu'est-ce que les constantes vitales ?
              </h3>
              <p style={{ margin: 0, color: '#1e40af', fontSize: '14px', lineHeight: '1.6' }}>
                Les constantes vitales sont les mesures de base prises par l'infirmière avant la consultation : 
                température, tension artérielle, fréquence cardiaque, saturation en oxygène, poids et taille.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600', 
                  color: '#374151',
                  fontSize: '14px',
                }}>
                  Température (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  required
                  value={constantesForm.temperature}
                  onChange={(e) => setConstantesForm({ ...constantesForm, temperature: e.target.value })}
                  placeholder="Ex: 37.2"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    background: 'white',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3c4f8a';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(60, 79, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Fréquence cardiaque (bpm)
                </label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={constantesForm.frequence_cardiaque}
                  onChange={(e) => setConstantesForm({ ...constantesForm, frequence_cardiaque: e.target.value })}
                  placeholder="Ex: 72"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Saturation en oxygène (%)
                </label>
                <input
                  type="number"
                  min="70"
                  max="100"
                  value={constantesForm.saturation_oxygene}
                  onChange={(e) => setConstantesForm({ ...constantesForm, saturation_oxygene: e.target.value })}
                  placeholder="Ex: 98"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Poids (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="300"
                  value={constantesForm.poids}
                  onChange={(e) => setConstantesForm({ ...constantesForm, poids: e.target.value })}
                  placeholder="Ex: 70.5"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                  Taille (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="250"
                  value={constantesForm.taille}
                  onChange={(e) => setConstantesForm({ ...constantesForm, taille: e.target.value })}
                  placeholder="Ex: 175"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <button 
                type="submit" 
                style={{ 
                  flex: 1,
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px rgba(60, 79, 138, 0.2)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(60, 79, 138, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(60, 79, 138, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FiSave size={18} />
                Enregistrer les constantes vitales
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConstantesForm(false);
                  setSelectedVisite(null);
                  setSelectedPatient(null);
                }}
                style={{
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      );
    }

    // Sinon, afficher la liste des patients en consultation qui n'ont pas encore de constantes vitales
    const patientsEnConsultation = salleAttente.filter(item => item.statut === 'EN_CONSULTATION');
    
    return (
      <div className={Classes.dashboardContent}>
        <div style={{ marginBottom: '20px' }}>
          <h2>Saisie des constantes vitales</h2>
          <div style={{ 
            background: '#eff6ff', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #3b82f6',
          }}>
            <h3 style={{ margin: 0, color: '#1e40af', fontSize: '16px', marginBottom: '10px' }}>
              📋 Qu'est-ce que les constantes vitales ?
            </h3>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '14px', lineHeight: '1.6' }}>
              Les <strong>constantes vitales</strong> sont les mesures de base que l'infirmière prend avant chaque consultation :
            </p>
            <ul style={{ margin: '10px 0 0 20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
              <li><strong>Température</strong> : Mesure de la température corporelle (normale : 36.5-37.5°C)</li>
              <li><strong>Fréquence cardiaque</strong> : Nombre de battements par minute (normale : 60-100 bpm)</li>
              <li><strong>Saturation en oxygène</strong> : Pourcentage d'oxygène dans le sang (normale : 95-100%)</li>
              <li><strong>Poids et Taille</strong> : Pour calculer l'IMC et suivre l'évolution</li>
                </ul>
            <p style={{ margin: '10px 0 0 0', color: '#1e40af', fontSize: '14px', fontStyle: 'italic' }}>
              💡 <strong>Workflow :</strong> Enregistrer le patient → Prendre les constantes vitales → Appeler le patient → Le médecin peut consulter
                </p>
              </div>
            </div>

        {patientsEnConsultation.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '20px' }}>
              Aucun patient en consultation pour le moment.
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              Les constantes vitales sont saisies après avoir "appelé" un patient depuis la salle d'attente.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ marginBottom: '15px' }}>Patients en consultation - À saisir</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {patientsEnConsultation.map((item) => (
                <div
                  key={item.id_salle_attente}
                  style={{
                    padding: '15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '5px' }}>
                      {item.patient.prenom} {item.patient.nom}
        </div>
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                      En consultation - Constantes vitales à saisir
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      // Trouver la visite associée
                      try {
                        const consultationResponse = await fetch(`/api/consultations?patient_id=${item.id_patient}`);
                        if (consultationResponse.ok) {
                          const data = await consultationResponse.json();
                          const consultations = data.consultations || [];
                          const lastConsultation = consultations[0];
                          if (lastConsultation?.visites?.[0]) {
                            setSelectedVisite(lastConsultation.visites[0].id_visite);
                            setSelectedPatient(item.patient);
                            setShowConstantesForm(true);
                          } else {
                            alert('Consultation non trouvée. Veuillez réessayer d\'appeler le patient.');
                          }
                        }
                      } catch (error) {
                        console.error('Erreur:', error);
                        alert('Erreur lors de la récupération de la consultation');
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Saisir constantes vitales
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className={Classes.dashboardContainer}>
      {/* Sidebar */}
      <aside className={`${Classes.sidebar} ${sidebarOpen ? Classes.sidebarOpen : ''}`}>
        <div className={Classes.sidebarHeader}>
          <button 
            className={Classes.menuButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FiMenu />
          </button>
          <Link href="/" className={Classes.logoText}>LIVEDOC</Link>
        </div>

        <div className={Classes.userPanel}>
          <div className={Classes.userAvatarCircle}>
            <FiUser size={48} />
          </div>
          <div className={Classes.userPanelLabel}>INFIRMIER</div>
          {user && (
            <div style={{ color: '#ffffff', fontSize: '12px', marginTop: '5px' }}>
              {user.prenom} {user.nom}
            </div>
          )}
        </div>

        <nav className={Classes.navigation}>
          <ul className={Classes.navMenu}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className={`${Classes.navItem} ${activeSection === item.id ? Classes.active : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <a href="#">
                    <Icon className={Classes.navIcon} />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={Classes.sidebarFooter}>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px',
              width: '100%',
            }}
          >
            <FiLogOut />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={Classes.mainContent}>
        <header className={Classes.topHeader}>
          <div className={Classes.headerLeft}>
            <span className={Classes.headerLogo}>LIVEDOC</span>
          </div>
          <div className={Classes.headerRight}>
            <span>Infirmier / Personnel d'accueil</span>
            {user && (
              <>
            <span className={Classes.separator}>|</span>
                <span>{user.prenom} {user.nom}</span>
              </>
            )}
          </div>
        </header>

        {activeSection === "dashboard" && renderDashboard()}
        {activeSection === "patients" && renderPatients()}
        {activeSection === "salle-attente" && renderSalleAttente()}
        {activeSection === "constantes" && renderConstantesVitales()}
        {activeSection === "resultats-examens" && renderResultatsExamens()}
      </main>

      {/* Modal de sélection de médecin */}
      {showMedecinSelector && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowMedecinSelector(false);
            setPendingAppel(null);
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '550px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Décoration en arrière-plan */}
            <div style={{ 
              position: 'absolute', 
              top: '-50px', 
              right: '-50px', 
              width: '200px', 
              height: '200px', 
              background: 'linear-gradient(135deg, rgba(60, 79, 138, 0.1) 0%, rgba(56, 133, 176, 0.05) 100%)',
              borderRadius: '50%',
              zIndex: 0,
            }}></div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}>
                      <FiUser size={24} />
                </div>
                    Attribuer le patient
                  </h2>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                    Sélectionnez le médecin qui va prendre en charge ce patient
                </p>
              </div>
                <button
                  onClick={() => {
                    setShowMedecinSelector(false);
                    setPendingAppel(null);
                  }}
                  style={{
                    padding: '8px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                >
                  <FiX size={20} />
                </button>
            </div>
              {pendingAppel && (
                <div style={{ 
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  border: '1px solid #bfdbfe',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Patient à attribuer
                  </div>
                  <div style={{ fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
                    {salleAttente.find(s => s.id_patient === pendingAppel.id_patient)?.patient.prenom}{' '}
                    {salleAttente.find(s => s.id_patient === pendingAppel.id_patient)?.patient.nom}
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: '24px' }}>
                {medecins.length === 0 ? (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '12px',
                    border: '1px dashed #e5e7eb',
                  }}>
                    <FiUser size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <div style={{ fontSize: '14px' }}>Aucun médecin disponible</div>
              </div>
                ) : (
                  medecins.map((medecin) => (
                    <button
                      key={medecin.id_utilisateur}
                      onClick={() => {
                        if (pendingAppel) {
                          handleUpdateStatut(
                            pendingAppel.id,
                            'EN_CONSULTATION',
                            pendingAppel.id_patient,
                            medecin.id_utilisateur
                          );
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '18px',
                        marginBottom: '12px',
                        background: selectedMedecin === medecin.id_utilisateur 
                          ? 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)' 
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        color: selectedMedecin === medecin.id_utilisateur ? 'white' : '#1e293b',
                        border: '2px solid',
                        borderColor: selectedMedecin === medecin.id_utilisateur ? '#3c4f8a' : '#e5e7eb',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: '600',
                        textAlign: 'left',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: selectedMedecin === medecin.id_utilisateur 
                          ? '0 4px 12px rgba(60, 79, 138, 0.3)' 
                          : '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedMedecin !== medecin.id_utilisateur) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                          e.currentTarget.style.borderColor = '#3c4f8a';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedMedecin !== medecin.id_utilisateur) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: selectedMedecin === medecin.id_utilisateur 
                            ? 'rgba(255, 255, 255, 0.2)' 
                            : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: selectedMedecin === medecin.id_utilisateur ? 'white' : '#3b82f6',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}>
                          <FiUser size={22} />
                  </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                            Dr. {medecin.prenom} {medecin.nom}
                  </div>
                          <div style={{ fontSize: '13px', opacity: selectedMedecin === medecin.id_utilisateur ? 0.9 : 0.7 }}>
                            {medecin.email}
                  </div>
                </div>
                        {selectedMedecin === medecin.id_utilisateur && (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3c4f8a',
                          }}>
                            <FiCheck size={16} />
              </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
            </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    setShowMedecinSelector(false);
                    setPendingAppel(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Annuler
                </button>
              </div>
                </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de priorité */}
      {showPrioriteSelector && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowPrioriteSelector(false);
            setPendingPriorite({ id: 0, id_patient: 0 });
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Décoration en arrière-plan */}
            <div style={{ 
              position: 'absolute', 
              top: '-50px', 
              right: '-50px', 
              width: '200px', 
              height: '200px', 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
              borderRadius: '50%',
              zIndex: 0,
            }}></div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}>
                      <FiAlertTriangle size={24} />
                    </div>
                    Définir la priorité
                  </h2>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                    Sélectionnez la priorité du patient dans la file d'attente
                </p>
              </div>
                <button
                  onClick={() => {
                    setShowPrioriteSelector(false);
                    setPendingPriorite({ id: 0, id_patient: 0 });
                  }}
                  style={{
                    padding: '8px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                >
                  <FiX size={20} />
                </button>
            </div>

              <div style={{ marginBottom: '24px' }}>
                {[
                  { value: 'NORMAL' as const, label: 'Normal', color: '#3b82f6', bg: '#dbeafe', icon: FiClock, desc: 'Cas standard, pas d\'urgence' },
                  { value: 'URGENT' as const, label: 'Urgent', color: '#f59e0b', bg: '#fef3c7', icon: FiAlertTriangle, desc: 'Cas nécessitant une attention rapide' },
                  { value: 'CRITIQUE' as const, label: 'Critique', color: '#ef4444', bg: '#fee2e2', icon: FiAlertCircle, desc: 'Cas grave, priorité absolue' },
                ].map((priorite) => {
                  const PrioriteIcon = priorite.icon;
                  return (
                    <button
                      key={priorite.value}
                      onClick={() => {
                        if (pendingPriorite) {
                          if (pendingPriorite.id === 0) {
                            // Nouveau patient
                            handleAddToSalleAttente(pendingPriorite.id_patient, priorite.value);
                          } else {
                            // Mise à jour priorité
                            handleUpdatePriorite(pendingPriorite.id, priorite.value);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '18px',
                        marginBottom: '12px',
                        background: selectedPriorite === priorite.value 
                          ? `linear-gradient(135deg, ${priorite.color} 0%, ${priorite.color}dd 100%)` 
                          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        color: selectedPriorite === priorite.value ? 'white' : '#374151',
                        border: `2px solid ${selectedPriorite === priorite.value ? priorite.color : '#e5e7eb'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: '600',
                        textAlign: 'left',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: selectedPriorite === priorite.value 
                          ? `0 4px 12px ${priorite.color}40` 
                          : '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPriorite !== priorite.value) {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${priorite.bg} 0%, ${priorite.bg}dd 100%)`;
                          e.currentTarget.style.borderColor = priorite.color;
                          e.currentTarget.style.color = priorite.color;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = `0 4px 8px ${priorite.color}30`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPriorite !== priorite.value) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.color = '#374151';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                        }
                      }}
                    >
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: selectedPriorite === priorite.value 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : `linear-gradient(135deg, ${priorite.bg} 0%, ${priorite.bg}dd 100%)`,
                        color: selectedPriorite === priorite.value ? 'white' : priorite.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      }}>
                        <PrioriteIcon size={24} />
              </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {priorite.label}
                </div>
                        <div style={{ fontSize: '13px', opacity: 0.7, fontWeight: '400' }}>
                          {priorite.desc}
              </div>
                      </div>
                    </button>
                );
              })}
            </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    setShowPrioriteSelector(false);
                    setPendingPriorite({ id: 0, id_patient: 0 });
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Annuler
                </button>
              </div>
                </div>
              </div>
            </div>
      )}

      {/* Modal de saisie des résultats d'examens */}
      {showResultatForm && selectedPrescription && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>
                Saisir les résultats d'examens
              </h2>
              <button
                onClick={() => {
                  setShowResultatForm(false);
                  setSelectedPrescription(null);
                  setResultatForm({});
                  setPhotosFiles([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                }}
              >
                <FiX />
              </button>
              </div>

            <div style={{ marginBottom: '20px', padding: '16px', background: '#eff6ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
                Patient: {selectedPrescription.consultation.patient.prenom} {selectedPrescription.consultation.patient.nom}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Maladies à examiner: {selectedPrescription.maladies_ciblees.map((m: string) => m.replace('_', ' ')).join(', ')}
            </div>
          </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user) return;

                try {
                  const formData = new FormData();
                  formData.append('prescription_id', selectedPrescription.id_prescription.toString());
                  formData.append('id_consultation', selectedPrescription.id_consultation.toString());
                  formData.append('id_patient', selectedPrescription.consultation.patient.id_patient.toString());
                  formData.append('id_infirmier', user.id_utilisateur.toString());
                  formData.append('maladies_ciblees', JSON.stringify(selectedPrescription.maladies_ciblees));

                  // Ajouter tous les champs du formulaire
                  Object.keys(resultatForm).forEach((key) => {
                    if (resultatForm[key] !== '' && resultatForm[key] !== null && resultatForm[key] !== undefined) {
                      formData.append(key, resultatForm[key].toString());
                    }
                  });

                  // Ajouter les photos
                  photosFiles.forEach((photo) => {
                    formData.append('photos', photo);
                  });

                  const response = await fetch('/api/resultats-examen', {
                    method: 'POST',
                    body: formData,
                  });

                  if (response.ok) {
                    alert('Résultats enregistrés avec succès !');
                    setShowResultatForm(false);
                    setSelectedPrescription(null);
                    setResultatForm({});
                    setPhotosFiles([]);
                    loadPrescriptions();
                  } else {
                    const data = await response.json();
                    alert('Erreur: ' + (data.error || 'Erreur lors de l\'enregistrement'));
                  }
                } catch (error) {
                  console.error('Erreur:', error);
                  alert('Erreur lors de l\'enregistrement des résultats');
                }
              }}
            >
              {/* Champs selon les maladies - DIABETE */}
              {selectedPrescription.maladies_ciblees.includes('DIABETE') && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                    Données pour Diabète
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Taux de glucose
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.taux_glucose || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, taux_glucose: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
        </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Taux d'insuline
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.taux_insuline || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, taux_insuline: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
        </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        IMC
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.imc || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, imc: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
              </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Âge
                      </label>
                      <input
                        type="number"
                        value={resultatForm.age || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, age: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
            </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Nombre de grossesses
                      </label>
                      <input
                        type="number"
                        value={resultatForm.nombre_grossesses || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, nombre_grossesses: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Pression artérielle
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.pression_arterielle || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, pression_arterielle: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Épaisseur pli cutané
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.epaisseur_pli_cutane || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, epaisseur_pli_cutane: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Fonction pedigree diabète
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={resultatForm.fonction_pedigree_diabete || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, fonction_pedigree_diabete: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Champs selon les maladies - MALADIE_RENALE */}
              {selectedPrescription.maladies_ciblees.includes('MALADIE_RENALE') && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                    Données pour Maladie Rénale
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Urée sanguine
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.uree_sanguine || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, uree_sanguine: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
              </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Créatinine sérique
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.creatinine_serique || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, creatinine_serique: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Albumine
                      </label>
                      <input
                        type="number"
                        value={resultatForm.albumine || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, albumine: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
              </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Hémoglobine
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.hemoglobine || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, hemoglobine: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
            </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Sodium
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.sodium || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, sodium: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Potassium
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.potassium || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, potassium: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Volume cellulaire packé
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.volume_cellulaire_packe || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, volume_cellulaire_packe: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Globules blancs
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.globules_blancs || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, globules_blancs: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Globules rouges
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.globules_rouges || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, globules_rouges: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Gravité spécifique
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={resultatForm.gravite_specifique || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, gravite_specifique: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Sucre
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.sucre || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, sucre: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Glucose sang
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.glucose_sang || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, glucose_sang: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Globules rouges urine
                      </label>
                      <select
                        value={resultatForm.globules_rouges_urine || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, globules_rouges_urine: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="">Sélectionner</option>
                        <option value="normal">Normal</option>
                        <option value="abnormal">Anormal</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Pus cells
                      </label>
                      <select
                        value={resultatForm.pus_cells || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, pus_cells: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="">Sélectionner</option>
                        <option value="normal">Normal</option>
                        <option value="abnormal">Anormal</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Pus cells clumps
                      </label>
                      <select
                        value={resultatForm.pus_cells_clumps || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, pus_cells_clumps: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="">Sélectionner</option>
                        <option value="present">Présent</option>
                        <option value="notpresent">Non présent</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Bactéries
                      </label>
                      <select
                        value={resultatForm.bacteries || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, bacteries: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="">Sélectionner</option>
                        <option value="present">Présent</option>
                        <option value="notpresent">Non présent</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Appétit
                      </label>
                      <select
                        value={resultatForm.appetit || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, appetit: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="">Sélectionner</option>
                        <option value="good">Bon</option>
                        <option value="poor">Mauvais</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.hypertension || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, hypertension: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Hypertension
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.diabete_mellitus || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, diabete_mellitus: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Diabète mellitus
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.maladie_coronaire || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, maladie_coronaire: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Maladie coronaire
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.oedeme_pieds || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, oedeme_pieds: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Œdème des pieds
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.anemie || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, anemie: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Anémie
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Champs selon les maladies - CARDIOVASCULAIRE */}
              {selectedPrescription.maladies_ciblees.includes('CARDIOVASCULAIRE') && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                    Données pour Cardiovasculaire
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Cholestérol
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.cholesterol || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, cholesterol: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
              </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Pression systolique
                      </label>
                      <input
                        type="number"
                        value={resultatForm.pression_systolique || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, pression_systolique: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
              </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Pression diastolique
                      </label>
                      <input
                        type="number"
                        value={resultatForm.pression_diastolique || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, pression_diastolique: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
            </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Glucose
                      </label>
                      <input
                        type="number"
                        value={resultatForm.glucose_cardio || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, glucose_cardio: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
          </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Taille (cm)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.taille_cm || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, taille_cm: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
        </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Poids (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={resultatForm.poids_kg || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, poids_kg: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Genre
                      </label>
                      <select
                        value={resultatForm.genre || ''}
                        onChange={(e) => setResultatForm({ ...resultatForm, genre: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      >
                        <option value="">Sélectionner</option>
                        <option value="HOMME">Homme</option>
                        <option value="FEMME">Femme</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.fumeur || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, fumeur: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Fumeur
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.consommation_alcool || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, consommation_alcool: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Consommation d'alcool
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={resultatForm.activite_physique || false}
                        onChange={(e) => setResultatForm({ ...resultatForm, activite_physique: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                        Activité physique
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Champs selon les maladies - TUBERCULOSE */}
              {selectedPrescription.maladies_ciblees.includes('TUBERCULOSE') && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>
                    Radiographie pulmonaire pour Tuberculose
                  </h3>
                  <div style={{
                    padding: '16px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '14px', color: '#991b1b', marginBottom: '8px', fontWeight: '600' }}>
                      ⚠️ Important
              </div>
                    <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                      Pour la tuberculose, vous devez uploader une image de radiographie pulmonaire. 
                      L'image sera analysée par l'IA pour détecter la présence de tuberculose.
              </div>
            </div>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    Assurez-vous que l'image de la radiographie est claire et bien visible.
          </div>
        </div>
              )}

              {/* Upload de photos */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  {selectedPrescription.maladies_ciblees.includes('TUBERCULOSE') 
                    ? 'Photo de la radiographie pulmonaire (obligatoire pour la tuberculose)'
                    : 'Photos des documents d\'examens'}
                </label>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Photos des documents d'examens
                </label>
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  background: '#f9fafb',
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setPhotosFiles(Array.from(e.target.files));
                      }
                    }}
                    style={{ display: 'none' }}
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FiFileText size={32} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      Cliquez pour sélectionner des photos ou glissez-déposez
                    </span>
                    {photosFiles.length > 0 && (
                      <span style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                        {photosFiles.length} photo(s) sélectionnée(s)
                      </span>
                    )}
                  </label>
                </div>
                {photosFiles.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                    {photosFiles.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotosFiles(photosFiles.filter((_, i) => i !== index));
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowResultatForm(false);
                    setSelectedPrescription(null);
                    setResultatForm({});
                    setPhotosFiles([]);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #3c4f8a 0%, #3885b0 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <FiSave />
                  Enregistrer les résultats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
