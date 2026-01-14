"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft, FiSearch, FiFilter, FiPlus, FiTrendingUp, FiTrendingDown,
  FiActivity, FiClock, FiCheckCircle, FiAlertCircle, FiCalendar,
  FiUser, FiHeart, FiDroplet, FiPackage, FiEye, FiEdit, FiX, FiFileText
} from "react-icons/fi";
import Classes from "@/app/Assets/styles/Dashboard.module.css";

interface User {
  id_utilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

interface SuiviMedical {
  id_suivi: number;
  id_patient: number;
  id_medecin: number;
  maladie_predite: string;
  statut_suivi: string;
  date_debut_suivi: string;
  date_prochain_examen: string | null;
  traitement: string | null;
  recommandations: string | null;
  notes_evolution: string | null;
  date_guerison: string | null;
  patient: {
    id_patient: number;
    nom: string;
    prenom: string;
    sexe: string;
    date_naissance: string;
    telephone: string | null;
  };
  medecin: {
    id_utilisateur: number;
    nom: string;
    prenom: string;
  };
  prediction_initiale: {
    id_prediction: number;
    maladie_predite: string;
    probabilite: number;
    date_prediction: string;
  } | null;
  examens_programmes: Array<{
    id_examen_suivi: number;
    date_examen: string;
    type_examen: string;
    statut: string;
  }>;
}

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'EN_COURS': return '#3c4f8a';
    case 'AMELIORATION': return '#10b981';
    case 'STABLE': return '#f59e0b';
    case 'DETERIORATION': return '#ef4444';
    case 'GUERI': return '#10b981';
    case 'ARRETE': return '#6b7280';
    default: return '#6b7280';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'EN_COURS': return 'En cours';
    case 'AMELIORATION': return 'Amélioration';
    case 'STABLE': return 'Stable';
    case 'DETERIORATION': return 'Détérioration';
    case 'GUERI': return 'Guéri';
    case 'ARRETE': return 'Arrêté';
    default: return statut;
  }
};

const getMaladieLabel = (maladie: string) => {
  switch (maladie) {
    case 'DIABETE': return 'Diabète';
    case 'MALADIE_RENALE': return 'Maladie Rénale';
    case 'CARDIOVASCULAIRE': return 'Cardiovasculaire';
    case 'TUBERCULOSE': return 'Tuberculose';
    default: return maladie;
  }
};

export default function SuiviMedicalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [suivis, setSuivis] = useState<SuiviMedical[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('ALL');
  const [filterMaladie, setFilterMaladie] = useState<string>('ALL');
  const [selectedSuivi, setSelectedSuivi] = useState<SuiviMedical | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    id_patient: '',
    maladie_predite: '',
    traitement: '',
    recommandations: '',
    date_prochain_examen: '',
  });
  const [predictionsSansSuivi, setPredictionsSansSuivi] = useState<any[]>([]);
  const [showPredictionsSansSuivi, setShowPredictionsSansSuivi] = useState(false);
  const [examensArrives, setExamensArrives] = useState<any[]>([]);
  const [creatingPrescriptions, setCreatingPrescriptions] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadSuivis();
      loadPredictionsSansSuivi();
      loadExamensArrives();
    }
  }, [user, filterStatut, filterMaladie]);

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      router.push('/login');
    }
  };

  const loadSuivis = async () => {
    if (!user?.id_utilisateur) return;
    setLoading(true);
    try {
      let url = `/api/suivi-medical?medecin_id=${user.id_utilisateur}`;
      if (filterStatut !== 'ALL') {
        url += `&statut=${filterStatut}`;
      }
      if (filterMaladie !== 'ALL') {
        url += `&maladie=${filterMaladie}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSuivis(data.suivis || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des suivis:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictionsSansSuivi = async () => {
    if (!user?.id_utilisateur) return;
    try {
      const response = await fetch(`/api/suivi-medical/predictions-sans-suivi?medecin_id=${user.id_utilisateur}`);
      if (response.ok) {
        const data = await response.json();
        setPredictionsSansSuivi(data.predictions || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des prédictions sans suivi:', error);
    }
  };

  const loadExamensArrives = async () => {
    if (!user?.id_utilisateur) return;
    try {
      const response = await fetch(`/api/suivi-medical/examens/creer-prescriptions?medecin_id=${user.id_utilisateur}`);
      if (response.ok) {
        const data = await response.json();
        setExamensArrives(data.examensAcreer || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des examens arrivés:', error);
    }
  };

  const handleCreerPrescriptionsTous = async () => {
    if (!user) return;
    setCreatingPrescriptions(true);
    try {
      const response = await fetch('/api/suivi-medical/examens/creer-prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.prescriptionsCreees.length} prescription(s) créée(s) avec succès !\n\nLes infirmiers peuvent maintenant remplir ces examens.`);
        loadExamensArrives();
        loadSuivis();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la création des prescriptions');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création des prescriptions');
    } finally {
      setCreatingPrescriptions(false);
    }
  };

  const handleCreateSuiviFromPrediction = async (prediction: any) => {
    if (!user?.id_utilisateur) return;
    try {
      const response = await fetch('/api/suivi-medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_patient: prediction.patient.id_patient,
          id_medecin: user.id_utilisateur,
          id_prediction_initiale: prediction.id_prediction,
          maladie_predite: prediction.maladie_predite,
          traitement: prediction.validation.commentaire || null,
          recommandations: prediction.validation.diagnostic_final || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Suivi médical créé avec succès !');
        loadSuivis();
        loadPredictionsSansSuivi();
        router.push(`/suivi-medical/${data.suivi.id_suivi}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la création du suivi');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du suivi');
    }
  };

  const handleCreateSuivi = async () => {
    if (!user?.id_utilisateur || !createForm.id_patient || !createForm.maladie_predite) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      const response = await fetch('/api/suivi-medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_patient: parseInt(createForm.id_patient),
          id_medecin: user.id_utilisateur,
          maladie_predite: createForm.maladie_predite,
          traitement: createForm.traitement || null,
          recommandations: createForm.recommandations || null,
          date_prochain_examen: createForm.date_prochain_examen || null,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setCreateForm({
          id_patient: '',
          maladie_predite: '',
          traitement: '',
          recommandations: '',
          date_prochain_examen: '',
        });
        loadSuivis();
        alert('Suivi médical créé avec succès');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la création du suivi');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du suivi');
    }
  };

  const filteredSuivis = suivis.filter((suivi) => {
    const matchesSearch = 
      suivi.patient.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suivi.patient.prenom.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!user) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <div className={Classes.dashboardContainer}>
      <main className={Classes.mainContent} style={{ padding: '30px' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Link href="/dashboard" style={{ color: '#3c4f8a', textDecoration: 'none' }}>
                <FiArrowLeft size={24} />
              </Link>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                  Suivi Médical
                </h1>
                <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>
                  Gérez le suivi des patients avec maladies chroniques
                </p>
                <p style={{ color: '#10b981', margin: '5px 0 0 0', fontSize: '12px', fontWeight: '500' }}>
                  ✨ Nouveau : Création automatique de prescriptions pour les examens arrivés
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                background: '#3c4f8a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '500',
              }}
            >
              <FiPlus /> Nouveau Suivi
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Rechercher un patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              style={{
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '150px',
              }}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="EN_COURS">En cours</option>
              <option value="AMELIORATION">Amélioration</option>
              <option value="STABLE">Stable</option>
              <option value="DETERIORATION">Détérioration</option>
              <option value="GUERI">Guéri</option>
              <option value="ARRETE">Arrêté</option>
            </select>
            <select
              value={filterMaladie}
              onChange={(e) => setFilterMaladie(e.target.value)}
              style={{
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '150px',
              }}
            >
              <option value="ALL">Toutes les maladies</option>
              <option value="DIABETE">Diabète</option>
              <option value="MALADIE_RENALE">Maladie Rénale</option>
              <option value="CARDIOVASCULAIRE">Cardiovasculaire</option>
              <option value="TUBERCULOSE">Tuberculose</option>
            </select>
          </div>

          {/* Alert pour prédictions sans suivi */}
          {predictionsSansSuivi.length > 0 && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiAlertCircle size={20} style={{ color: '#f59e0b' }} />
                <div>
                  <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                    {predictionsSansSuivi.length} prédiction(s) validée(s) sans suivi médical
                  </div>
                  <div style={{ fontSize: '14px', color: '#78350f' }}>
                    Créez un suivi médical pour ces patients diagnostiqués
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPredictionsSansSuivi(!showPredictionsSansSuivi)}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {showPredictionsSansSuivi ? 'Masquer' : 'Voir'}
              </button>
            </div>
          )}

          {/* Liste des prédictions sans suivi */}
          {showPredictionsSansSuivi && predictionsSansSuivi.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px', color: '#1e293b' }}>
                Prédictions validées sans suivi ({predictionsSansSuivi.length})
              </h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                {predictionsSansSuivi.map((prediction) => (
                  <div
                    key={prediction.id_prediction}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                            {prediction.patient.prenom} {prediction.patient.nom}
                          </h3>
                          <span
                            style={{
                              background: '#3c4f8a',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            {getMaladieLabel(prediction.maladie_predite)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                          <span>Probabilité: {(prediction.probabilite * 100).toFixed(1)}%</span>
                          <span>Validé le: {new Date(prediction.date_validation).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {prediction.validation.commentaire && (
                          <div style={{ marginTop: '10px', fontSize: '13px', color: '#475569' }}>
                            <strong>Commentaire:</strong> {prediction.validation.commentaire}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleCreateSuiviFromPrediction(prediction)}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <FiPlus size={16} />
                        Créer un suivi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert pour examens arrivés */}
          {examensArrives.length > 0 && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiAlertCircle size={20} style={{ color: '#f59e0b' }} />
                <div>
                  <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                    {examensArrives.length} examen(s) de suivi dont la date est arrivée
                  </div>
                  <div style={{ fontSize: '14px', color: '#78350f' }}>
                    Créez les prescriptions d'examens pour que les infirmiers puissent les remplir
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreerPrescriptionsTous}
                disabled={creatingPrescriptions}
                style={{
                  background: creatingPrescriptions ? '#94a3b8' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: creatingPrescriptions ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiFileText size={16} />
                {creatingPrescriptions ? 'Création...' : 'Créer les prescriptions'}
              </button>
            </div>
          )}
        </div>

        {/* Liste des suivis */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
        ) : filteredSuivis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <FiActivity size={48} style={{ color: '#cbd5e1', marginBottom: '15px' }} />
            <p style={{ color: '#64748b', fontSize: '16px' }}>Aucun suivi médical trouvé</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {filteredSuivis.map((suivi) => (
              <div
                key={suivi.id_suivi}
                onClick={() => router.push(`/suivi-medical/${suivi.id_suivi}`)}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid #e2e8f0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                        {suivi.patient.prenom} {suivi.patient.nom}
                      </h3>
                      <span
                        style={{
                          background: getStatutColor(suivi.statut_suivi),
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        {getStatutLabel(suivi.statut_suivi)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiPackage /> {getMaladieLabel(suivi.maladie_predite)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiCalendar /> Début: {new Date(suivi.date_debut_suivi).toLocaleDateString('fr-FR')}
                      </span>
                      {suivi.date_prochain_examen && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3c4f8a' }}>
                          <FiClock /> Prochain examen: {new Date(suivi.date_prochain_examen).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <FiEye size={20} style={{ color: '#3c4f8a' }} />
                </div>
                {suivi.examens_programmes.length > 0 && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3c4f8a', fontSize: '14px' }}>
                      <FiCalendar />
                      <span>Examen programmé le {new Date(suivi.examens_programmes[0].date_examen).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal de création */}
        {showCreateForm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowCreateForm(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Nouveau Suivi Médical</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                >
                  <FiX />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    ID Patient *
                  </label>
                  <input
                    type="number"
                    value={createForm.id_patient}
                    onChange={(e) => setCreateForm({ ...createForm, id_patient: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Maladie *
                  </label>
                  <select
                    value={createForm.maladie_predite}
                    onChange={(e) => setCreateForm({ ...createForm, maladie_predite: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="">Sélectionner une maladie</option>
                    <option value="DIABETE">Diabète</option>
                    <option value="MALADIE_RENALE">Maladie Rénale</option>
                    <option value="CARDIOVASCULAIRE">Cardiovasculaire</option>
                    <option value="TUBERCULOSE">Tuberculose</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Traitement
                  </label>
                  <textarea
                    value={createForm.traitement}
                    onChange={(e) => setCreateForm({ ...createForm, traitement: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Recommandations
                  </label>
                  <textarea
                    value={createForm.recommandations}
                    onChange={(e) => setCreateForm({ ...createForm, recommandations: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Date du prochain examen
                  </label>
                  <input
                    type="date"
                    value={createForm.date_prochain_examen}
                    onChange={(e) => setCreateForm({ ...createForm, date_prochain_examen: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <button
                  onClick={handleCreateSuivi}
                  style={{
                    background: '#3c4f8a',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    marginTop: '10px',
                  }}
                >
                  Créer le suivi
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
