"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft, FiEdit, FiSave, FiX, FiCalendar, FiClock, FiTrendingUp,
  FiTrendingDown, FiActivity, FiCheckCircle, FiAlertCircle, FiPackage,
  FiUser, FiHeart, FiDroplet, FiPlus, FiFileText, FiBarChart2, FiCheck
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
  patient: any;
  medecin: any;
  prediction_initiale: any;
  examens_programmes: any[];
  consultations_suivi: any[];
}

export default function SuiviDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [suivi, setSuivi] = useState<SuiviMedical | null>(null);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    statut_suivi: '',
    traitement: '',
    recommandations: '',
    notes_evolution: '',
    date_prochain_examen: '',
    date_guerison: '',
  });
  const [showExamenForm, setShowExamenForm] = useState(false);
  const [examenForm, setExamenForm] = useState({
    date_examen: '',
    type_examen: '',
    raison: '',
    notes: '',
  });
  const [examensProgrammes, setExamensProgrammes] = useState<any[]>([]);
  const [creatingPrescriptions, setCreatingPrescriptions] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user && id) {
      loadSuivi();
      loadHistorique();
      loadExamensProgrammes();
    }
  }, [user, id]);

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
      console.error('Erreur:', error);
      router.push('/login');
    }
  };

  const loadSuivi = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/suivi-medical/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSuivi(data.suivi);
        setEditForm({
          statut_suivi: data.suivi.statut_suivi,
          traitement: data.suivi.traitement || '',
          recommandations: data.suivi.recommandations || '',
          notes_evolution: data.suivi.notes_evolution || '',
          date_prochain_examen: data.suivi.date_prochain_examen ? new Date(data.suivi.date_prochain_examen).toISOString().split('T')[0] : '',
          date_guerison: data.suivi.date_guerison ? new Date(data.suivi.date_guerison).toISOString().split('T')[0] : '',
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistorique = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/suivi-medical/${id}/historique`);
      if (response.ok) {
        const data = await response.json();
        setHistorique(data.historique || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadExamensProgrammes = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/suivi-medical/${id}/examen`);
      if (response.ok) {
        const data = await response.json();
        setExamensProgrammes(data.examens || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleCreerPrescriptions = async () => {
    if (!id) return;
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
        loadExamensProgrammes();
        loadSuivi();
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

  const handleUpdateSuivi = async () => {
    if (!id || !user) return;
    try {
      const response = await fetch(`/api/suivi-medical/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_suivi: editForm.statut_suivi,
          traitement: editForm.traitement || null,
          recommandations: editForm.recommandations || null,
          notes_evolution: editForm.notes_evolution || null,
          date_prochain_examen: editForm.date_prochain_examen || null,
          date_guerison: editForm.date_guerison || null,
        }),
      });

      if (response.ok) {
        setEditing(false);
        loadSuivi();
        alert('Suivi mis à jour avec succès');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleProgrammerExamen = async () => {
    if (!id || !user || !examenForm.date_examen || !examenForm.type_examen) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      const response = await fetch(`/api/suivi-medical/${id}/examen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_medecin: user.id_utilisateur,
          date_examen: examenForm.date_examen,
          type_examen: examenForm.type_examen,
          raison: examenForm.raison || null,
          notes: examenForm.notes || null,
        }),
      });

      if (response.ok) {
        setShowExamenForm(false);
        setExamenForm({
          date_examen: '',
          type_examen: '',
          raison: '',
          notes: '',
        });
        loadSuivi();
        loadHistorique();
        loadExamensProgrammes();
        alert('Examen programmé avec succès');
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la programmation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la programmation');
    }
  };

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

  if (loading || !suivi) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div className={Classes.dashboardContainer}>
      <main className={Classes.mainContent} style={{ padding: '30px' }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Link href="/suivi-medical" style={{ color: '#3c4f8a', textDecoration: 'none' }}>
                <FiArrowLeft size={24} />
              </Link>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                  Suivi de {suivi.patient?.prenom} {suivi.patient?.nom}
                </h1>
                <p style={{ color: '#64748b', margin: '5px 0 0 0' }}>
                  {getMaladieLabel(suivi.maladie_predite)} • Début: {new Date(suivi.date_debut_suivi).toLocaleDateString('fr-FR')}
                </p>
                <p style={{ color: '#10b981', margin: '5px 0 0 0', fontSize: '12px', fontWeight: '500' }}>
                  ✨ Nouveau : Section "Examens programmés" disponible ci-dessous
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
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
                  }}
                >
                  <FiEdit /> Modifier
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      loadSuivi();
                    }}
                    style={{
                      background: '#e2e8f0',
                      color: '#1e293b',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FiX /> Annuler
                  </button>
                  <button
                    onClick={handleUpdateSuivi}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FiSave /> Enregistrer
                  </button>
                </>
              )}
              <button
                onClick={() => setShowExamenForm(true)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiPlus /> Programmer un examen
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          {/* Statut */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <FiActivity size={20} style={{ color: getStatutColor(suivi.statut_suivi) }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Statut du suivi</h3>
            </div>
            {editing ? (
              <select
                value={editForm.statut_suivi}
                onChange={(e) => setEditForm({ ...editForm, statut_suivi: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <option value="EN_COURS">En cours</option>
                <option value="AMELIORATION">Amélioration</option>
                <option value="STABLE">Stable</option>
                <option value="DETERIORATION">Détérioration</option>
                <option value="GUERI">Guéri</option>
                <option value="ARRETE">Arrêté</option>
              </select>
            ) : (
              <div
                style={{
                  background: getStatutColor(suivi.statut_suivi),
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}
              >
                {getStatutLabel(suivi.statut_suivi)}
              </div>
            )}
            {suivi.date_guerison && (
              <p style={{ marginTop: '10px', color: '#64748b', fontSize: '14px' }}>
                Guéri le: {new Date(suivi.date_guerison).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>

          {/* Prochain examen */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <FiCalendar size={20} style={{ color: '#3c4f8a' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Prochain examen</h3>
            </div>
            {editing ? (
              <input
                type="date"
                value={editForm.date_prochain_examen}
                onChange={(e) => setEditForm({ ...editForm, date_prochain_examen: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
            ) : (
              <div style={{ color: '#1e293b', fontSize: '16px', fontWeight: '500' }}>
                {suivi.date_prochain_examen
                  ? new Date(suivi.date_prochain_examen).toLocaleDateString('fr-FR')
                  : 'Aucun examen programmé'}
              </div>
            )}
          </div>
        </div>

        {/* Informations principales */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Informations</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>Traitement</label>
              {editing ? (
                <textarea
                  value={editForm.traitement}
                  onChange={(e) => setEditForm({ ...editForm, traitement: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
              ) : (
                <p style={{ margin: 0, color: '#1e293b' }}>{suivi.traitement || 'Aucun traitement spécifié'}</p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>Recommandations</label>
              {editing ? (
                <textarea
                  value={editForm.recommandations}
                  onChange={(e) => setEditForm({ ...editForm, recommandations: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
              ) : (
                <p style={{ margin: 0, color: '#1e293b' }}>{suivi.recommandations || 'Aucune recommandation'}</p>
              )}
            </div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>Notes d'évolution</label>
            {editing ? (
              <textarea
                value={editForm.notes_evolution}
                onChange={(e) => setEditForm({ ...editForm, notes_evolution: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
            ) : (
              <p style={{ margin: 0, color: '#1e293b' }}>{suivi.notes_evolution || 'Aucune note'}</p>
            )}
          </div>
        </div>

        {/* Examens programmés */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Examens programmés</h2>
            {examensProgrammes.filter((e: any) => {
              const dateExamen = new Date(e.date_examen);
              const aujourdhui = new Date();
              aujourdhui.setHours(0, 0, 0, 0);
              return e.statut === 'PROGRAMME' && dateExamen <= aujourdhui;
            }).length > 0 && (
              <button
                onClick={handleCreerPrescriptions}
                disabled={creatingPrescriptions}
                style={{
                  background: creatingPrescriptions ? '#94a3b8' : '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: creatingPrescriptions ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiFileText size={16} />
                {creatingPrescriptions ? 'Création...' : 'Créer les prescriptions pour les examens arrivés'}
              </button>
            )}
          </div>
          {examensProgrammes.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Aucun examen programmé</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {examensProgrammes.map((examen: any) => {
                const dateExamen = new Date(examen.date_examen);
                const aujourdhui = new Date();
                aujourdhui.setHours(0, 0, 0, 0);
                const estArrive = dateExamen <= aujourdhui;
                const estPasse = dateExamen < aujourdhui;

                return (
                  <div
                    key={examen.id_examen_suivi}
                    style={{
                      padding: '15px',
                      borderLeft: `3px solid ${estArrive ? '#f59e0b' : '#3c4f8a'}`,
                      background: estArrive ? '#fef3c7' : '#f8fafc',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '5px' }}>
                          {getMaladieLabel(examen.type_examen)}
                          {estArrive && (
                            <span style={{ marginLeft: '10px', color: '#f59e0b', fontSize: '12px' }}>
                              ⚠️ Date arrivée
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '5px' }}>
                          <FiCalendar style={{ display: 'inline', marginRight: '5px' }} />
                          Date: {dateExamen.toLocaleDateString('fr-FR')}
                          {estPasse && (
                            <span style={{ marginLeft: '10px', color: '#ef4444' }}>
                              ({Math.floor((aujourdhui.getTime() - dateExamen.getTime()) / (1000 * 60 * 60 * 24))} jour(s) de retard)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          Statut: {examen.statut === 'PROGRAMME' ? 'Programmé' : examen.statut === 'REALISE' ? 'Réalisé' : examen.statut}
                        </div>
                        {examen.raison && (
                          <div style={{ fontSize: '13px', color: '#475569', marginTop: '8px' }}>
                            <strong>Raison:</strong> {examen.raison}
                          </div>
                        )}
                        {examen.visite && (
                          <div style={{ fontSize: '13px', color: '#10b981', marginTop: '8px' }}>
                            ✅ Prescription créée (Visite ID: {examen.visite.id_visite})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historique */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Historique</h2>
          {historique.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Aucun historique disponible</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {historique.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '15px',
                    borderLeft: '3px solid #3c4f8a',
                    background: '#f8fafc',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '5px' }}>
                        {item.type === 'DIAGNOSTIC_INITIAL' && 'Diagnostic initial'}
                        {item.type === 'DEBUT_SUIVI' && 'Début du suivi'}
                        {item.type === 'CONSULTATION_SUIVI' && 'Consultation de suivi'}
                        {item.type === 'EXAMEN_SUIVI' && 'Examen de suivi'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        {new Date(item.date).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  {item.data && (
                    <div style={{ fontSize: '14px', color: '#475569', marginTop: '10px' }}>
                      {item.data.evolution && <p><strong>Évolution:</strong> {item.data.evolution}</p>}
                      {item.data.symptomes && <p><strong>Symptômes:</strong> {item.data.symptomes}</p>}
                      {item.data.traitement_actuel && <p><strong>Traitement:</strong> {item.data.traitement_actuel}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal programmation examen */}
        {showExamenForm && (
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
            onClick={() => setShowExamenForm(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                width: '90%',
                maxWidth: '500px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Programmer un examen</h2>
                <button
                  onClick={() => setShowExamenForm(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                >
                  <FiX />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Date de l'examen *</label>
                  <input
                    type="date"
                    value={examenForm.date_examen}
                    onChange={(e) => setExamenForm({ ...examenForm, date_examen: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Type d'examen *</label>
                  <select
                    value={examenForm.type_examen}
                    onChange={(e) => setExamenForm({ ...examenForm, type_examen: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="">Sélectionner un type</option>
                    <option value="DIABETE">Diabète</option>
                    <option value="MALADIE_RENALE">Maladie Rénale</option>
                    <option value="CARDIOVASCULAIRE">Cardiovasculaire</option>
                    <option value="TUBERCULOSE">Tuberculose</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Raison</label>
                  <textarea
                    value={examenForm.raison}
                    onChange={(e) => setExamenForm({ ...examenForm, raison: e.target.value })}
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
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Notes</label>
                  <textarea
                    value={examenForm.notes}
                    onChange={(e) => setExamenForm({ ...examenForm, notes: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <button
                  onClick={handleProgrammerExamen}
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
                  Programmer l'examen
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
