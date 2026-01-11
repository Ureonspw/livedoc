"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiHome, FiUsers, FiShield, FiSettings, FiFileText, FiBarChart2,
  FiBell, FiSearch, FiArrowLeft, FiChevronRight, FiUserPlus,
  FiUserCheck, FiLock, FiActivity, FiDatabase, FiLogOut, FiEye,
  FiEdit, FiTrash2, FiCheck, FiX, FiMenu, FiDownload, FiRefreshCw
} from "react-icons/fi";
import Classes from "@/app/Assets/styles/DashboardAdmin.module.css";

interface User {
  id_utilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'MEDECIN' | 'INFIRMIER' | 'ADMIN';
  date_creation: string;
  lastLogin?: string | null;
}

interface Stats {
  users: {
    total: number;
    byRole: {
      MEDECIN: number;
      INFIRMIER: number;
      ADMIN: number;
    };
    recent: number;
    byMonth?: Array<{ month: string; MEDECIN: number; INFIRMIER: number; ADMIN: number; total: number }>;
  };
  patients: { 
    total: number;
    byDay?: Array<{ date: string; day: string; count: number }>;
  };
  consultations: { 
    total: number; 
    byMonth: Array<{ month: string; count: number }>;
    byDay?: Array<{ date: string; day: string; count: number }>;
  };
  predictions: { 
    total: number; 
    byDisease: Record<string, number>;
    byDay?: Array<{ date: string; day: string; DIABETE: number; MALADIE_RENALE: number; CARDIOVASCULAIRE: number; TUBERCULOSE: number; total: number }>;
  };
  validations: { 
    total: number;
    byStatus?: Record<string, number>;
  };
  system: {
    activeSessions: number;
    recentErrors: number;
    dbStatus: string;
  };
  recentActivity: Array<any>;
}

export default function DashboardAdminPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsFilters, setLogsFilters] = useState({
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [logsStats, setLogsStats] = useState<any>(null);
  const [availableFilters, setAvailableFilters] = useState({ actions: [] as string[], entityTypes: [] as string[] });
  const [reports, setReports] = useState<any>(null);
  const [reportType, setReportType] = useState('summary');
  const [reportPeriod, setReportPeriod] = useState({ startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    mot_de_passe: "",
    role: "MEDECIN" as 'MEDECIN' | 'INFIRMIER' | 'ADMIN',
  });

  const navItems = [
    { id: "dashboard", label: "Supervision", icon: FiHome },
    { id: "users", label: "Gestion Utilisateurs", icon: FiUsers },
    { id: "permissions", label: "Permissions", icon: FiShield },
    { id: "logs", label: "Journalisation", icon: FiFileText },
    { id: "reports", label: "Rapports", icon: FiBarChart2 },
    { id: "settings", label: "Paramètres Système", icon: FiSettings },
  ];

  // Charger la session utilisateur
  useEffect(() => {
    loadUser();
  }, []);

  // Charger les données selon la section active
  useEffect(() => {
    if (activeNav === "dashboard") {
      loadStats();
      // Rafraîchir automatiquement toutes les 30 secondes
      const interval = setInterval(() => {
        loadStats();
      }, 30000);
      return () => clearInterval(interval);
    } else if (activeNav === "users") {
      loadUsers();
    } else if (activeNav === "logs") {
      loadLogs(1);
      // Rafraîchir automatiquement toutes les 30 secondes
      const interval = setInterval(() => {
        loadLogs(logsPagination.page);
      }, 30000);
      return () => clearInterval(interval);
    } else if (activeNav === "reports") {
      loadReports();
    }
  }, [activeNav]);

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      if (data.user) {
        if (data.user.role !== 'ADMIN') {
          router.push('/login');
          return;
        }
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logsFilters.action) params.append('action', logsFilters.action);
      if (logsFilters.entityType) params.append('entityType', logsFilters.entityType);
      if (logsFilters.userId) params.append('userId', logsFilters.userId);
      if (logsFilters.startDate) params.append('startDate', logsFilters.startDate);
      if (logsFilters.endDate) params.append('endDate', logsFilters.endDate);
      params.append('page', page.toString());
      params.append('limit', '50');
      
      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setLogsPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
        setAvailableFilters(data.filters || { actions: [], entityTypes: [] });
        
        // Calculer les statistiques des logs
        const stats = {
          total: data.pagination?.total || 0,
          byAction: {} as Record<string, number>,
          byEntityType: {} as Record<string, number>,
          byUser: {} as Record<string, number>,
          recent: data.logs?.filter((log: any) => {
            const logDate = new Date(log.date);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return logDate >= weekAgo;
          }).length || 0,
        };
        
        data.logs?.forEach((log: any) => {
          stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
          if (log.entityType) {
            stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;
          }
          if (log.user) {
            const userKey = `${log.user.prenom} ${log.user.nom}`;
            stats.byUser[userKey] = (stats.byUser[userKey] || 0) + 1;
          }
        });
        
        setLogsStats(stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (reportPeriod.startDate) params.append('startDate', reportPeriod.startDate);
      if (reportPeriod.endDate) params.append('endDate', reportPeriod.endDate);
      
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      if (response.ok) {
        setShowUserModal(false);
        setUserForm({ nom: "", prenom: "", email: "", mot_de_passe: "", role: "MEDECIN" });
        loadUsers();
        loadStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id_utilisateur}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      if (response.ok) {
        setShowUserModal(false);
        setEditingUser(null);
        setUserForm({ nom: "", prenom: "", email: "", mot_de_passe: "", role: "MEDECIN" });
        loadUsers();
        loadStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour de l\'utilisateur');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Utilisateur supprimé avec succès');
        loadUsers();
        loadStats();
      } else {
        const data = await response.json();
        const errorMessage = data.details 
          ? `${data.error}\n${data.details}` 
          : data.error || 'Erreur lors de la suppression';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUserForm({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      mot_de_passe: "",
      role: user.role,
    });
    setShowUserModal(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({ nom: "", prenom: "", email: "", mot_de_passe: "", role: "MEDECIN" });
    setShowUserModal(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
      router.push('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const formatRole = (role: string) => {
    const roles: Record<string, string> = {
      MEDECIN: 'Médecin',
      INFIRMIER: 'Personnel',
      ADMIN: 'Administrateur',
    };
    return roles[role] || role;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Jamais';
    return new Date(date).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Chargement...</div>
      </div>
    );
  }

  const metrics = stats ? [
    { id: 1, label: "Utilisateurs Totaux", value: stats.users.total.toString(), icon: FiUsers, color: "blue" },
    { id: 2, label: "Médecins", value: stats.users.byRole.MEDECIN.toString(), icon: FiUserCheck, color: "red" },
    { id: 3, label: "Personnel", value: stats.users.byRole.INFIRMIER.toString(), icon: FiUsers, color: "purple" },
    { id: 4, label: "Admins", value: stats.users.byRole.ADMIN.toString(), icon: FiShield, color: "blue-dark" },
    { id: 5, label: "Sessions Actives", value: stats.system.activeSessions.toString(), icon: FiActivity, color: "green" },
    { id: 6, label: "Erreurs Récentes", value: stats.system.recentErrors.toString(), icon: FiBell, color: "orange" },
    { id: 7, label: "Base de Données", value: stats.system.dbStatus, icon: FiDatabase, color: "green-light" },
    { id: 8, label: "Patients", value: stats.patients.total.toString(), icon: FiUsers, color: "orange-dark" },
    { id: 9, label: "Consultations", value: stats.consultations.total.toString(), icon: FiFileText, color: "blue" },
    { id: 10, label: "Prédictions", value: stats.predictions.total.toString(), icon: FiBarChart2, color: "purple" },
    { id: 11, label: "Validations", value: stats.validations.total.toString(), icon: FiCheck, color: "green" },
    { id: 12, label: "Nouveaux Utilisateurs (7j)", value: stats.users.recent.toString(), icon: FiUserPlus, color: "blue" },
  ] : [];

  const permissions = stats ? [
    { role: "Médecin", access: "Consultation, Diagnostic, Validation", users: stats.users.byRole.MEDECIN },
    { role: "Personnel", access: "Enregistrement, Triage, Saisie", users: stats.users.byRole.INFIRMIER },
    { role: "Administrateur", access: "Tous les accès", users: stats.users.byRole.ADMIN },
  ] : [];

  return (
    <div className={Classes.dashboardContainer}>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* Left Sidebar */}
      <aside className={`${Classes.sidebar} ${sidebarOpen ? Classes.sidebarOpen : ''}`}>
        <div className={Classes.sidebarHeader}>
          <div className={Classes.logo}>
            <FiShield size={28} />
            <Link href="/" className={Classes.logoText}>LIVEDOC</Link>
          </div>
        </div>

        <div className={Classes.userProfile}>
          <div className={Classes.avatar}>
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent((user?.prenom || '') + ' ' + (user?.nom || ''))}&background=3c4f8a&color=fff`} alt="Admin" />
          </div>
          <div className={Classes.userName}>{user?.prenom} {user?.nom}</div>
          <div className={Classes.socialIcons}>
            <FiUsers />
            <FiShield />
            <FiSettings />
          </div>
        </div>

        <nav className={Classes.navigation}>
          <ul className={Classes.navMenu}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className={`${Classes.navItem} ${activeNav === item.id ? Classes.active : ''}`}
                  onClick={() => setActiveNav(item.id)}
                >
                  <a href="#">
                    <Icon className={Classes.navIcon} />
                    <span>{item.label}</span>
                    {item.id === "users" && <FiChevronRight className={Classes.chevron} />}
                    {item.id === "permissions" && <FiChevronRight className={Classes.chevron} />}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={Classes.mainContent}>
        {/* Top Header */}
        <header className={Classes.topHeader}>
          <div className={Classes.headerLeft}>
            <button 
              className={Classes.mobileMenuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <FiMenu />
            </button>
          </div>
          <div className={Classes.headerCenter}>
            <div className={Classes.searchBar}>
              <FiSearch />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (activeNav === 'users') {
                    setTimeout(loadUsers, 500);
                  }
                }}
              />
            </div>
          </div>
          <div className={Classes.headerRight}>
            <button 
              className={Classes.headerIcon}
              onClick={() => {
                if (activeNav === 'dashboard') loadStats();
                else if (activeNav === 'users') loadUsers();
                else if (activeNav === 'logs') loadLogs(logsPagination.page);
                else if (activeNav === 'reports') loadReports();
              }}
              title="Actualiser"
              style={{ 
                animation: (activeNav === 'dashboard' && loadingStats) || 
                          (activeNav === 'users' && loadingUsers) || 
                          (activeNav === 'logs' && loadingLogs) 
                  ? 'spin 1s linear infinite' : 'none',
                cursor: 'pointer',
              }}
            >
              <FiRefreshCw />
            </button>
            <div className={Classes.notificationIcon}>
              <FiBell />
              {stats && stats.system.recentErrors > 0 && (
                <span className={Classes.notificationBadge}>{stats.system.recentErrors}</span>
              )}
            </div>
            <span className={Classes.userEmail}>{user?.email}</span>
            <button 
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
              title="Déconnexion"
            >
              <FiLogOut />
            </button>
            <div className={Classes.headerAvatar}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent((user?.prenom || '') + ' ' + (user?.nom || ''))}&background=3c4f8a&color=fff`} alt="Admin" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className={Classes.dashboardContent}>
          {activeNav === "dashboard" && (
            <>
          {/* Welcome Section */}
          <div className={Classes.welcomeSection}>
            <h1>
              <FiShield />
              Bienvenue dans le <span>Panneau d'Administration</span>
            </h1>
            <div className={Classes.overallCards}>
              <div className={`${Classes.overallCard} ${Classes.imports}`}>
                <div className={Classes.overallIcon}>
                  <FiUsers />
                </div>
                <div className={Classes.overallContent}>
                  <div className={Classes.overallLabel}>Utilisateurs Totaux</div>
                  <div className={Classes.overallValue}>
                        {stats?.users.total || 0}
                    <FiActivity className={Classes.arrowUp} />
                  </div>
                </div>
              </div>
              <div className={`${Classes.overallCard} ${Classes.exports}`}>
                <div className={Classes.overallIcon}>
                  <FiShield />
                </div>
                <div className={Classes.overallContent}>
                  <div className={Classes.overallLabel}>Sessions Actives</div>
                  <div className={Classes.overallValue}>
                        {stats?.system.activeSessions || 0}
                    <FiActivity className={Classes.arrowUp} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className={Classes.metricsGrid}>
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.id} className={`${Classes.metricCard} ${Classes[metric.color]}`}>
                  <div className={Classes.metricIcon}>
                    <Icon />
                  </div>
                  <div className={Classes.metricContent}>
                    <div className={Classes.metricLabel}>{metric.label}</div>
                    <div className={Classes.metricValue}>{metric.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

              {/* Graphiques - Consultations et Patients */}
              {stats && (stats.consultations.byDay.length > 0 || stats.patients.byDay.length > 0) && (
                <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
                  {/* Graphique Consultations par jour */}
                  {stats.consultations.byDay.length > 0 && (
                    <div style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                        <FiBarChart2 style={{ marginRight: '8px', color: '#3b82f6' }} />
                        Consultations par jour (7 derniers jours)
                      </h3>
                      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', justifyContent: 'space-around' }}>
                        {stats.consultations.byDay.map((item, index) => {
                          const maxCount = Math.max(...stats.consultations.byDay.map(d => d.count), 1);
                          const height = (item.count / maxCount) * 180;
                          return (
                            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ 
                                width: '100%', 
                                height: `${Math.max(height, 5)}px`, 
                                background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                                borderRadius: '8px 8px 0 0',
                                minHeight: '5px',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.8';
                                e.currentTarget.style.transform = 'scaleY(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.transform = 'scaleY(1)';
                              }}
                              title={`${item.count} consultation(s)`}
                              />
                              <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                {item.count}
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                                {item.day}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Graphique Patients par jour */}
                  {stats.patients.byDay.length > 0 && (
                    <div style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                        <FiUsers style={{ marginRight: '8px', color: '#10b981' }} />
                        Patients enregistrés par jour (7 derniers jours)
                      </h3>
                      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', justifyContent: 'space-around' }}>
                        {stats.patients.byDay.map((item, index) => {
                          const maxCount = Math.max(...stats.patients.byDay.map(d => d.count), 1);
                          const height = (item.count / maxCount) * 180;
                          return (
                            <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ 
                                width: '100%', 
                                height: `${Math.max(height, 5)}px`, 
                                background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                                borderRadius: '8px 8px 0 0',
                                minHeight: '5px',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.8';
                                e.currentTarget.style.transform = 'scaleY(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.transform = 'scaleY(1)';
                              }}
                              title={`${item.count} patient(s)`}
                              />
                              <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                {item.count}
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                                {item.day}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Graphiques - Prédictions par maladie */}
              {stats && stats.predictions.byDay && stats.predictions.byDay.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <div style={{ 
                    background: 'white', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                      <FiActivity style={{ marginRight: '8px', color: '#8b5cf6' }} />
                      Prédictions par maladie (7 derniers jours)
                    </h3>
                    {(() => {
                      const colors = {
                        DIABETE: '#ef4444',
                        MALADIE_RENALE: '#3b82f6',
                        CARDIOVASCULAIRE: '#f59e0b',
                        TUBERCULOSE: '#8b5cf6',
                      };
                      const diseaseNames = {
                        DIABETE: 'Diabète',
                        MALADIE_RENALE: 'Rénale',
                        CARDIOVASCULAIRE: 'Cardio',
                        TUBERCULOSE: 'Tuberculose',
                      };
                      const maxTotal = Math.max(...stats.predictions.byDay.map(d => d.total), 1);
                      return (
                        <>
                          <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: 'space-around' }}>
                            {stats.predictions.byDay.map((item, index) => (
                              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', alignItems: 'center' }}>
                                  {(['DIABETE', 'MALADIE_RENALE', 'CARDIOVASCULAIRE', 'TUBERCULOSE'] as const).map((disease) => {
                                    const count = item[disease] || 0;
                                    const height = (count / maxTotal) * 200;
                                    return count > 0 ? (
                                      <div
                                        key={disease}
                                        style={{
                                          width: '100%',
                                          height: `${Math.max(height, 3)}px`,
                                          background: colors[disease],
                                          borderRadius: '4px',
                                          minHeight: '3px',
                                          transition: 'all 0.3s ease',
                                          cursor: 'pointer',
                                        }}
                                        title={`${diseaseNames[disease]}: ${count}`}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.opacity = '0.8';
                                          e.currentTarget.style.transform = 'scaleY(1.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.opacity = '1';
                                          e.currentTarget.style.transform = 'scaleY(1)';
                                        }}
                                      />
                                    ) : null;
                                  })}
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                  {item.total}
                                </div>
                                <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                                  {item.day}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: '20px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {(['DIABETE', 'MALADIE_RENALE', 'CARDIOVASCULAIRE', 'TUBERCULOSE'] as const).map((disease) => (
                              <div key={disease} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '16px', height: '16px', background: colors[disease], borderRadius: '4px' }}></div>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{diseaseNames[disease]}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Graphiques - Évolutions mensuelles */}
              {stats && (stats.consultations.byMonth?.length > 0 || stats.users.byMonth?.length > 0) && (
                <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
                  {/* Graphique - Consultations par mois */}
                  {stats.consultations.byMonth && stats.consultations.byMonth.length > 0 && (
                    <div style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                        <FiBarChart2 style={{ marginRight: '8px', color: '#f59e0b' }} />
                        Évolution des consultations (6 derniers mois)
                      </h3>
                      <div style={{ height: '200px', position: 'relative' }}>
                        <svg viewBox="0 0 600 200" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <linearGradient id="consultationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.3 }} />
                              <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0 }} />
                            </linearGradient>
                          </defs>
                          {(() => {
                            const maxCount = Math.max(...stats.consultations.byMonth.map(d => d.count), 1);
                            const padding = 40;
                            const width = 600 - padding * 2;
                            const height = 200 - padding * 2;
                            const points = stats.consultations.byMonth.map((item, index) => {
                              const x = padding + (index / Math.max(stats.consultations.byMonth.length - 1, 1)) * width;
                              const y = padding + height - (item.count / maxCount) * height;
                              return { x, y, count: item.count, month: item.month };
                            });
                            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaPath = `${pathData} L ${points[points.length - 1].x} ${200 - padding} L ${padding} ${200 - padding} Z`;
                            return (
                              <>
                                <path d={areaPath} fill="url(#consultationGradient)" />
                                <path d={pathData} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                {points.map((point, index) => (
                                  <g key={index}>
                                    <circle cx={point.x} cy={point.y} r="5" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                    <text x={point.x} y={200 - padding + 20} textAnchor="middle" fontSize="10" fill="#64748b">
                                      {point.month.substring(5)}
                                    </text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Graphique - Utilisateurs par mois */}
                  {stats.users.byMonth && stats.users.byMonth.length > 0 && (
                    <div style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                        <FiUsers style={{ marginRight: '8px', color: '#3b82f6' }} />
                        Nouveaux utilisateurs (6 derniers mois)
                      </h3>
                      <div style={{ height: '200px', position: 'relative' }}>
                        <svg viewBox="0 0 600 200" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <linearGradient id="usersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }} />
                              <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
                            </linearGradient>
                          </defs>
                          {(() => {
                            const maxTotal = Math.max(...stats.users.byMonth.map(d => d.total), 1);
                            const padding = 40;
                            const width = 600 - padding * 2;
                            const height = 200 - padding * 2;
                            const points = stats.users.byMonth.map((item, index) => {
                              const x = padding + (index / Math.max(stats.users.byMonth.length - 1, 1)) * width;
                              const y = padding + height - (item.total / maxTotal) * height;
                              return { x, y, total: item.total, month: item.month };
                            });
                            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaPath = `${pathData} L ${points[points.length - 1].x} ${200 - padding} L ${padding} ${200 - padding} Z`;
                            return (
                              <>
                                <path d={areaPath} fill="url(#usersGradient)" />
                                <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                {points.map((point, index) => (
                                  <g key={index}>
                                    <circle cx={point.x} cy={point.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />
                                    <text x={point.x} y={200 - padding + 20} textAnchor="middle" fontSize="10" fill="#64748b">
                                      {point.month.substring(5)}
                                    </text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '3px' }}></div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Médecins</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '3px' }}></div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Personnel</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }}></div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Admins</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Graphique - Prédictions par maladie (Donut) */}
              {stats && stats.predictions.byDisease && Object.keys(stats.predictions.byDisease).length > 0 && (
                <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                  <div style={{ 
                    background: 'white', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                      <FiBarChart2 style={{ marginRight: '8px', color: '#8b5cf6' }} />
                      Répartition des prédictions par maladie
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', position: 'relative' }}>
                      <svg viewBox="0 0 200 200" style={{ width: '200px', height: '200px' }}>
                        {(() => {
                          const total = Object.values(stats.predictions.byDisease).reduce((sum, v) => sum + v, 0);
                          if (total === 0) return null;
                          const diseases = [
                            { key: 'DIABETE', name: 'Diabète', color: '#ef4444' },
                            { key: 'MALADIE_RENALE', name: 'Maladie Rénale', color: '#3b82f6' },
                            { key: 'CARDIOVASCULAIRE', name: 'Cardiovasculaire', color: '#f59e0b' },
                            { key: 'TUBERCULOSE', name: 'Tuberculose', color: '#8b5cf6' },
                          ];
                          let currentAngle = -90;
                          const radius = 70;
                          const centerX = 100;
                          const centerY = 100;
                          return diseases.map((disease, index) => {
                            const count = stats.predictions.byDisease[disease.key] || 0;
                            const percentage = (count / total) * 100;
                            const angle = (percentage / 100) * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;
                            
                            if (count === 0) return null;
                            
                            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
                            const largeArc = angle > 180 ? 1 : 0;
                            
                            return (
                              <path
                                key={index}
                                d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={disease.color}
                                stroke="white"
                                strokeWidth="2"
                                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.8';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.setAttribute('transform', 'scale(1.05)');
                                  e.currentTarget.setAttribute('transform-origin', `${centerX} ${centerY}`);
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.setAttribute('transform', 'scale(1)');
                                }}
                                title={`${disease.name}: ${count} (${percentage.toFixed(1)}%)`}
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div style={{ position: 'absolute', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                          {stats.predictions.total}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Total</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(['DIABETE', 'MALADIE_RENALE', 'CARDIOVASCULAIRE', 'TUBERCULOSE'] as const).map((disease) => {
                        const count = stats.predictions.byDisease[disease] || 0;
                        const total = stats.predictions.total || 1;
                        const percentage = (count / total) * 100;
                        const colors: Record<string, string> = {
                          DIABETE: '#ef4444',
                          MALADIE_RENALE: '#3b82f6',
                          CARDIOVASCULAIRE: '#f59e0b',
                          TUBERCULOSE: '#8b5cf6',
                        };
                        const names: Record<string, string> = {
                          DIABETE: 'Diabète',
                          MALADIE_RENALE: 'Maladie Rénale',
                          CARDIOVASCULAIRE: 'Cardiovasculaire',
                          TUBERCULOSE: 'Tuberculose',
                        };
                        return (
                          <div key={disease} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '16px', height: '16px', background: colors[disease], borderRadius: '4px' }}></div>
                            <div style={{ flex: 1, fontSize: '14px', color: '#1e293b' }}>{names[disease]}</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{count}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', width: '50px', textAlign: 'right' }}>{percentage.toFixed(1)}%</div>
                          </div>
                        );
                      })}
            </div>
          </div>

                  {/* Graphique - Validations par statut */}
                  {stats.validations.byStatus && Object.keys(stats.validations.byStatus).length > 0 && (
                    <div style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                        <FiCheck style={{ marginRight: '8px', color: '#10b981' }} />
                        Validations par statut
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(stats.validations.byStatus).map(([status, count]) => {
                          const total = stats.validations.total || 1;
                          const percentage = (count / total) * 100;
                          const statusColors: Record<string, string> = {
                            VALIDE: '#10b981',
                            REJETE: '#ef4444',
                            MODIFIE: '#f59e0b',
                            EN_ATTENTE: '#64748b',
                          };
                          const statusNames: Record<string, string> = {
                            VALIDE: 'Validé',
                            REJETE: 'Rejeté',
                            MODIFIE: 'Modifié',
                            EN_ATTENTE: 'En attente',
                          };
                          return (
                            <div key={status}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '14px', color: '#1e293b' }}>{statusNames[status]}</span>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{count}</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${percentage}%`, 
                                  height: '100%', 
                                  background: statusColors[status],
                                  borderRadius: '4px',
                                  transition: 'width 0.5s ease',
                                }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

          {/* Bottom Widgets */}
              <div className={Classes.widgetsGrid} style={{ marginTop: '30px' }}>
            <div className={Classes.widgetCard}>
              <div className={Classes.widgetHeader}>
                <h3>Répartition des Rôles</h3>
              </div>
              <div className={Classes.widgetContent}>
                <div className={Classes.statusBars}>
                      {permissions.map((perm, index) => {
                        const total = stats?.users.total || 1;
                        return (
                    <div key={index} className={Classes.statusBarItem}>
                      <div className={Classes.statusBarLabel}>{perm.role}</div>
                      <div className={Classes.statusBar}>
                        <div
                          className={`${Classes.statusBarFill} ${Classes[['blue', 'light-blue', 'green'][index]]}`}
                                style={{ width: `${(perm.users / total) * 100}%` }}
                        ></div>
                      </div>
                      <div className={Classes.statusBarValue}>{perm.users}</div>
                    </div>
                        );
                      })}
                </div>
              </div>
            </div>

            <div className={Classes.widgetCard}>
              <div className={Classes.widgetHeader}>
                <h3>Permissions par Rôle</h3>
              </div>
              <div className={Classes.widgetContent}>
                <div className={Classes.ordersList}>
                  {permissions.map((perm, index) => (
                    <div key={index} className={Classes.orderItem}>
                      <div className={Classes.orderSender}>
                        <span className={Classes.roleIcon}>
                          {perm.role === "Médecin" && <FiUserCheck />}
                          {perm.role === "Personnel" && <FiUsers />}
                          {perm.role === "Administrateur" && <FiShield />}
                        </span>
                        <div>
                          <div className={Classes.roleName}>{perm.role}</div>
                          <div className={Classes.roleAccess}>{perm.access}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={Classes.widgetCard}>
              <div className={Classes.widgetHeader}>
                    <h3>Activité Récente</h3>
                  </div>
                  <div className={Classes.widgetContent}>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {stats?.recentActivity.slice(0, 10).map((activity, index) => (
                        <div key={index} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {activity.user ? `${activity.user.prenom} ${activity.user.nom}` : 'Système'}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>{activity.action}</div>
                          <div style={{ fontSize: '11px', color: '#999' }}>
                            {new Date(activity.date).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === "users" && (
          <div className={Classes.tableSection}>
            <div className={Classes.tableHeader}>
              <h2>Gestion des Utilisateurs</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      loadUsers();
                    }}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="ALL">Tous les rôles</option>
                    <option value="MEDECIN">Médecin</option>
                    <option value="INFIRMIER">Personnel</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                  <button className={Classes.addButton} onClick={openCreateModal}>
                <FiUserPlus />
                Ajouter un utilisateur
              </button>
                </div>
            </div>
            <div className={Classes.tableContainer}>
              <table className={Classes.userTable}>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                      <th>Date création</th>
                    <th>Dernière connexion</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id_utilisateur}>
                      <td>{user.nom}</td>
                      <td>{user.prenom}</td>
                      <td>{user.email}</td>
                      <td>
                            <span className={Classes.roleBadge}>{formatRole(user.role)}</span>
                      </td>
                          <td>{formatDate(user.date_creation)}</td>
                          <td>{formatDate(user.lastLogin)}</td>
                      <td>
                        <div className={Classes.actionButtons}>
                              <button 
                                className={Classes.actionBtn} 
                                title="Modifier"
                                onClick={() => openEditModal(user)}
                              >
                            <FiEdit />
                          </button>
                              <button 
                                className={`${Classes.actionBtn} ${Classes.delete}`} 
                                title="Supprimer"
                                onClick={() => handleDeleteUser(user.id_utilisateur)}
                              >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeNav === "permissions" && (
            <div className={Classes.dashboardContent}>
              <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                <FiShield style={{ marginRight: '12px', color: '#3c4f8a' }} />
                Gestion des Permissions et Accès
              </h2>

              {/* Matrice des permissions */}
              <div style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                border: '1px solid #e5e7eb',
                marginBottom: '24px',
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                  Matrice des Permissions par Rôle
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#1e293b' }}>Fonctionnalité</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Médecin</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Personnel</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>Administrateur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { feature: 'Gestion des Patients', medecin: 'Lecture', personnel: 'Création/Modification', admin: 'Tous' },
                        { feature: 'Consultations Médicales', medecin: 'Création/Modification', personnel: 'Lecture', admin: 'Tous' },
                        { feature: 'Constantes Vitales', medecin: 'Lecture', personnel: 'Création/Modification', admin: 'Tous' },
                        { feature: 'Données Cliniques', medecin: 'Lecture', personnel: 'Création/Modification', admin: 'Tous' },
                        { feature: 'Prédictions IA', medecin: 'Génération/Validation', personnel: 'Lecture', admin: 'Tous' },
                        { feature: 'Validations Médicales', medecin: 'Création/Modification', personnel: 'Lecture', admin: 'Tous' },
                        { feature: 'Prescriptions d\'Examens', medecin: 'Création', personnel: 'Lecture', admin: 'Tous' },
                        { feature: 'Résultats d\'Examens', medecin: 'Lecture', personnel: 'Création/Modification', admin: 'Tous' },
                        { feature: 'Salle d\'Attente', medecin: 'Lecture', personnel: 'Gestion complète', admin: 'Tous' },
                        { feature: 'Images Radiographie', medecin: 'Lecture/Validation', personnel: 'Upload', admin: 'Tous' },
                        { feature: 'Gestion Utilisateurs', medecin: 'Aucun', personnel: 'Aucun', admin: 'Tous' },
                        { feature: 'Journalisation', medecin: 'Aucun', personnel: 'Aucun', admin: 'Lecture complète' },
                        { feature: 'Rapports Système', medecin: 'Aucun', personnel: 'Aucun', admin: 'Génération/Export' },
                        { feature: 'Paramètres Système', medecin: 'Aucun', personnel: 'Aucun', admin: 'Modification' },
                      ].map((row, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: '500', color: '#1e293b' }}>{row.feature}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '4px 12px', 
                              borderRadius: '6px', 
                              background: row.medecin === 'Aucun' ? '#fee2e2' : row.medecin.includes('Tous') ? '#dbeafe' : '#d1fae5',
                              color: row.medecin === 'Aucun' ? '#991b1b' : row.medecin.includes('Tous') ? '#1e40af' : '#065f46',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {row.medecin}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '4px 12px', 
                              borderRadius: '6px', 
                              background: row.personnel === 'Aucun' ? '#fee2e2' : row.personnel.includes('Tous') ? '#dbeafe' : '#d1fae5',
                              color: row.personnel === 'Aucun' ? '#991b1b' : row.personnel.includes('Tous') ? '#1e40af' : '#065f46',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {row.personnel}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '4px 12px', 
                              borderRadius: '6px', 
                              background: '#dbeafe',
                              color: '#1e40af',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}>
                              {row.admin}
                            </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

              {/* Détails par rôle */}
          <div className={Classes.widgetsGrid}>
                {permissions.map((perm, index) => (
                  <div key={index} className={Classes.widgetCard} style={{ 
                    background: 'white', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div className={Classes.widgetHeader} style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {perm.role === "Médecin" && <FiUserCheck style={{ color: '#ef4444' }} />}
                        {perm.role === "Personnel" && <FiUsers style={{ color: '#3b82f6' }} />}
                        {perm.role === "Administrateur" && <FiShield style={{ color: '#10b981' }} />}
                        {perm.role}
                      </h3>
              </div>
              <div className={Classes.widgetContent}>
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                          Nombre d'utilisateurs
                      </div>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>
                          {perm.users}
                        </div>
                      </div>
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>
                          Accès autorisés
                        </div>
                        <div style={{ 
                          background: '#f8fafc', 
                          padding: '16px', 
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}>
                          <div style={{ color: '#1e293b', lineHeight: '1.8', fontSize: '14px' }}>
                            {perm.access.split(', ').map((access, idx) => (
                              <div key={idx} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                marginBottom: '8px',
                              }}>
                                <FiCheck style={{ color: '#10b981', fontSize: '16px' }} />
                                <span>{access}</span>
                    </div>
                  ))}
                </div>
              </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                          Description
                        </div>
                        <div style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.6' }}>
                          {perm.role === "Médecin" && "Les médecins peuvent consulter les patients, générer des prédictions IA, valider les diagnostics et prescrire des examens. Ils ont accès en lecture à toutes les données médicales."}
                          {perm.role === "Personnel" && "Le personnel médical peut enregistrer les patients, saisir les constantes vitales et les données cliniques, gérer la salle d'attente et uploader les images radiographiques."}
                          {perm.role === "Administrateur" && "Les administrateurs ont un accès complet au système : gestion des utilisateurs, supervision, journalisation, rapports et configuration système."}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

              {/* Statistiques des permissions */}
              {stats && (
                <div style={{ 
                  background: 'white', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                  border: '1px solid #e5e7eb',
                  marginTop: '24px',
                }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                    Statistiques des Rôles
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ textAlign: 'center', padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>Médecins</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{stats.users.byRole.MEDECIN}</div>
                      <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>
                        {((stats.users.byRole.MEDECIN / stats.users.total) * 100).toFixed(1)}% du total
              </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: '#eff6ff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#1e40af', marginBottom: '4px' }}>Personnel</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>{stats.users.byRole.INFIRMIER}</div>
                      <div style={{ fontSize: '11px', color: '#1e40af', marginTop: '4px' }}>
                        {((stats.users.byRole.INFIRMIER / stats.users.total) * 100).toFixed(1)}% du total
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '16px', background: '#f0fdf4', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>Administrateurs</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>{stats.users.byRole.ADMIN}</div>
                      <div style={{ fontSize: '11px', color: '#065f46', marginTop: '4px' }}>
                        {((stats.users.byRole.ADMIN / stats.users.total) * 100).toFixed(1)}% du total
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeNav === "logs" && (
            <div className={Classes.dashboardContent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  <FiFileText style={{ marginRight: '12px', color: '#3c4f8a' }} />
                  Journalisation des Activités
                </h2>
                <button
                  onClick={async () => {
                    try {
                      const params = new URLSearchParams();
                      Object.entries(logsFilters).forEach(([key, value]) => {
                        if (value) params.append(key, value);
                      });
                      const response = await fetch(`/api/admin/logs?${params.toString()}&limit=10000`);
                      const data = await response.json();
                      const csv = [
                        ['Date', 'Heure', 'Utilisateur', 'Rôle', 'Action', 'Type d\'entité', 'ID Entité', 'Adresse IP', 'Détails'].join(','),
                        ...data.logs.map((log: any) => {
                          const date = new Date(log.date);
                          return [
                            date.toLocaleDateString('fr-FR'),
                            date.toLocaleTimeString('fr-FR'),
                            log.user ? `"${log.user.prenom} ${log.user.nom}"` : 'Système',
                            log.user?.role || '-',
                            log.action,
                            log.entityType || '-',
                            log.entityId || '-',
                            log.ipAddress || '-',
                            log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : '-',
                          ].join(',');
                        }),
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                    } catch (error) {
                      alert('Erreur lors de l\'export des logs');
                    }
                  }}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#10b981', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '500',
                  }}
                >
                  <FiDownload />
                  Exporter en CSV
                </button>
              </div>

              {/* Statistiques des logs */}
              {logsStats && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px',
                  marginBottom: '24px',
                }}>
                  <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Total des logs</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>{logsStats.total}</div>
                  </div>
                  <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Logs (7 derniers jours)</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{logsStats.recent}</div>
                  </div>
                  <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Actions uniques</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>{Object.keys(logsStats.byAction).length}</div>
                  </div>
                  <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Types d'entités</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>{Object.keys(logsStats.byEntityType).length}</div>
                  </div>
                </div>
              )}

              {/* Filtres avancés */}
              <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                border: '1px solid #e5e7eb',
                marginBottom: '24px',
              }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Filtres de recherche
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Action</label>
                    <select
                      value={logsFilters.action}
                      onChange={(e) => {
                        setLogsFilters({ ...logsFilters, action: e.target.value });
                        setTimeout(() => loadLogs(1), 300);
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    >
                      <option value="">Toutes les actions</option>
                      {availableFilters.actions.map((action) => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Type d'entité</label>
                    <select
                      value={logsFilters.entityType}
                      onChange={(e) => {
                        setLogsFilters({ ...logsFilters, entityType: e.target.value });
                        setTimeout(() => loadLogs(1), 300);
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    >
                      <option value="">Tous les types</option>
                      {availableFilters.entityTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date début</label>
                    <input
                      type="date"
                      value={logsFilters.startDate}
                      onChange={(e) => {
                        setLogsFilters({ ...logsFilters, startDate: e.target.value });
                        setTimeout(() => loadLogs(1), 300);
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date fin</label>
                    <input
                      type="date"
                      value={logsFilters.endDate}
                      onChange={(e) => {
                        setLogsFilters({ ...logsFilters, endDate: e.target.value });
                        setTimeout(() => loadLogs(1), 300);
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setLogsFilters({ action: '', entityType: '', userId: '', startDate: '', endDate: '' });
                        setTimeout(() => loadLogs(1), 100);
                      }}
                      style={{ 
                        width: '100%',
                        padding: '8px 16px', 
                        background: '#f1f5f9', 
                        color: '#64748b', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              </div>

              {/* Graphiques des logs */}
              {logsStats && (Object.keys(logsStats.byAction).length > 0 || Object.keys(logsStats.byEntityType).length > 0) && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: '24px',
                  marginBottom: '24px',
                }}>
                  {/* Graphique Actions */}
                  {Object.keys(logsStats.byAction).length > 0 && (
                    <div style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                        Répartition par Action
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(logsStats.byAction)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 10)
                          .map(([action, count]) => {
                            const percentage = ((count as number) / logsStats.total) * 100;
                            return (
                              <div key={action}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{action}</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>{count as number}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    width: `${percentage}%`, 
                                    height: '100%', 
                                    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                                    borderRadius: '3px',
                                    transition: 'width 0.5s ease',
                                  }}></div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Graphique Types d'entités */}
                  {Object.keys(logsStats.byEntityType).length > 0 && (
                    <div style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                      border: '1px solid #e5e7eb',
                    }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                        Répartition par Type d'Entité
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(logsStats.byEntityType)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([entityType, count]) => {
                            const percentage = ((count as number) / logsStats.total) * 100;
                            return (
                              <div key={entityType}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{entityType}</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>{count as number}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    width: `${percentage}%`, 
                                    height: '100%', 
                                    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                    borderRadius: '3px',
                                    transition: 'width 0.5s ease',
                                  }}></div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Table des logs */}
              <div style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                    Liste des Logs
                  </h3>
                  {loadingLogs && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Chargement...</div>
                  )}
                </div>
                <div className={Classes.tableContainer}>
                  <table className={Classes.userTable}>
                    <thead>
                      <tr>
                        <th>Date & Heure</th>
                        <th>Utilisateur</th>
                        <th>Rôle</th>
                        <th>Action</th>
                        <th>Type d'entité</th>
                        <th>ID Entité</th>
                        <th>Adresse IP</th>
                        <th>Détails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                            {loadingLogs ? 'Chargement...' : 'Aucun log trouvé'}
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id}>
                            <td style={{ fontSize: '12px', color: '#64748b' }}>
                              <div>{new Date(log.date).toLocaleDateString('fr-FR')}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {new Date(log.date).toLocaleTimeString('fr-FR')}
                              </div>
                            </td>
                            <td>
                              {log.user ? (
                                <div>
                                  <div style={{ fontWeight: '500', color: '#1e293b' }}>
                                    {log.user.prenom} {log.user.nom}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {log.user.email}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontStyle: 'italic' }}>Système</span>
                              )}
                            </td>
                            <td>
                              {log.user ? (
                                <span style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  background: log.user.role === 'ADMIN' ? '#dbeafe' : log.user.role === 'MEDECIN' ? '#fee2e2' : '#f3e8ff',
                                  color: log.user.role === 'ADMIN' ? '#1e40af' : log.user.role === 'MEDECIN' ? '#991b1b' : '#6b21a8',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                }}>
                                  {formatRole(log.user.role)}
                        </span>
                              ) : '-'}
                            </td>
                            <td>
                              <span style={{ 
                                padding: '4px 10px', 
                                borderRadius: '4px', 
                                background: log.action.includes('ERROR') || log.action.includes('DELETE') ? '#fee2e2' : 
                                          log.action.includes('CREATE') ? '#d1fae5' : 
                                          log.action.includes('UPDATE') ? '#fef3c7' : '#eff6ff',
                                color: log.action.includes('ERROR') || log.action.includes('DELETE') ? '#991b1b' : 
                                       log.action.includes('CREATE') ? '#065f46' : 
                                       log.action.includes('UPDATE') ? '#92400e' : '#1e40af',
                                fontSize: '11px',
                                fontWeight: '600',
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: '#64748b' }}>{log.entityType || '-'}</td>
                            <td style={{ fontSize: '12px', color: '#64748b' }}>{log.entityId || '-'}</td>
                            <td style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                              {log.ipAddress || '-'}
                            </td>
                            <td>
                              {log.details ? (
                                <details style={{ cursor: 'pointer' }}>
                                  <summary style={{ 
                                    color: '#3b82f6', 
                                    fontSize: '12px',
                                    fontWeight: '500',
                                  }}>
                                    Voir détails
                                  </summary>
                                  <div style={{ 
                                    marginTop: '8px', 
                                    padding: '12px', 
                                    background: '#f8fafc', 
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb',
                                    maxWidth: '400px',
                                  }}>
                                    <pre style={{ 
                                      fontSize: '11px', 
                                      color: '#1e293b',
                                      margin: 0,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                    }}>
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                </details>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {logsPagination.totalPages > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginTop: '20px',
                  }}>
                    <button
                      onClick={() => loadLogs(logsPagination.page - 1)}
                      disabled={logsPagination.page === 1}
                      style={{ 
                        padding: '8px 16px', 
                        background: logsPagination.page === 1 ? '#f1f5f9' : 'white', 
                        color: logsPagination.page === 1 ? '#94a3b8' : '#1e293b',
                        border: '1px solid #e5e7eb', 
                        borderRadius: '6px', 
                        cursor: logsPagination.page === 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Précédent
                    </button>
                    <span style={{ padding: '8px 16px', color: '#64748b', fontSize: '14px' }}>
                      Page {logsPagination.page} sur {logsPagination.totalPages} ({logsPagination.total} résultats)
                    </span>
                    <button
                      onClick={() => loadLogs(logsPagination.page + 1)}
                      disabled={logsPagination.page === logsPagination.totalPages}
                      style={{ 
                        padding: '8px 16px', 
                        background: logsPagination.page === logsPagination.totalPages ? '#f1f5f9' : 'white', 
                        color: logsPagination.page === logsPagination.totalPages ? '#94a3b8' : '#1e293b',
                        border: '1px solid #e5e7eb', 
                        borderRadius: '6px', 
                        cursor: logsPagination.page === logsPagination.totalPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeNav === "reports" && (
            <div className={Classes.dashboardContent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  <FiBarChart2 style={{ marginRight: '12px', color: '#3c4f8a' }} />
                  Rapports et Analyses
                </h2>
              </div>

              {/* Sélection du type de rapport */}
              <div style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                border: '1px solid #e5e7eb',
                marginBottom: '24px',
              }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  Configuration du Rapport
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Type de rapport</label>
                    <select
                      value={reportType}
                      onChange={(e) => {
                        setReportType(e.target.value);
                        loadReports();
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    >
                      <option value="summary">Résumé Général</option>
                      <option value="activity">Rapport d'Activité</option>
                      <option value="predictions">Rapport des Prédictions</option>
                    </select>
                        </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date de début</label>
                    <input
                      type="date"
                      value={reportPeriod.startDate}
                      onChange={(e) => {
                        setReportPeriod({ ...reportPeriod, startDate: e.target.value });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    />
                      </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date de fin</label>
                    <input
                      type="date"
                      value={reportPeriod.endDate}
                      onChange={(e) => {
                        setReportPeriod({ ...reportPeriod, endDate: e.target.value });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={loadReports}
                      disabled={loadingReports}
                      style={{ 
                        width: '100%',
                        padding: '10px 20px', 
                        background: '#3c4f8a', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: loadingReports ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        opacity: loadingReports ? 0.6 : 1,
                      }}
                    >
                      {loadingReports ? 'Génération...' : 'Générer le rapport'}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      if (!reports) {
                        alert('Veuillez d\'abord générer un rapport');
                        return;
                      }
                      try {
                        const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `rapport-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                      } catch (error) {
                        alert('Erreur lors de l\'export du rapport');
                      }
                    }}
                    disabled={!reports}
                    style={{ 
                      padding: '10px 20px', 
                      background: reports ? '#10b981' : '#f1f5f9', 
                      color: reports ? 'white' : '#94a3b8', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: reports ? 'pointer' : 'not-allowed',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FiDownload />
                    Exporter en JSON
                  </button>
                  <button
                    onClick={async () => {
                      if (!reports) {
                        alert('Veuillez d\'abord générer un rapport');
                        return;
                      }
                      try {
                        let csv = '';
                        if (reportType === 'summary') {
                          csv = [
                            ['Métrique', 'Valeur'].join(','),
                            ['Utilisateurs Totaux', reports.data?.users?.total || 0].join(','),
                            ['Médecins', reports.data?.users?.byRole?.MEDECIN || 0].join(','),
                            ['Personnel', reports.data?.users?.byRole?.INFIRMIER || 0].join(','),
                            ['Admins', reports.data?.users?.byRole?.ADMIN || 0].join(','),
                            ['Patients', reports.data?.patients?.total || 0].join(','),
                            ['Consultations', reports.data?.consultations?.total || 0].join(','),
                            ['Prédictions', reports.data?.predictions?.total || 0].join(','),
                            ['Validations', reports.data?.validations?.total || 0].join(','),
                          ].join('\n');
                        } else if (reportType === 'activity') {
                          csv = [
                            ['Date', 'Action', 'Type d\'entité', 'Utilisateur', 'Détails'].join(','),
                            ...(reports.data?.logs || []).map((log: any) => [
                              new Date(log.date).toLocaleString('fr-FR'),
                              log.action,
                              log.entityType || '-',
                              log.user ? `"${log.user.prenom} ${log.user.nom}"` : 'Système',
                              log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : '-',
                            ].join(',')),
                          ].join('\n');
                        } else if (reportType === 'predictions') {
                          csv = [
                            ['Maladie', 'Nombre', 'Probabilité moyenne'].join(','),
                            ...Object.entries(reports.data?.byDisease || {}).map(([disease, count]) => [
                              disease,
                              count,
                              reports.data?.averageProbabilities?.[disease]?.toFixed(4) || '0',
                            ].join(',')),
                          ].join('\n');
                        }
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `rapport-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                      } catch (error) {
                        alert('Erreur lors de l\'export du rapport');
                      }
                    }}
                    disabled={!reports}
                    style={{ 
                      padding: '10px 20px', 
                      background: reports ? '#3b82f6' : '#f1f5f9', 
                      color: reports ? 'white' : '#94a3b8', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: reports ? 'pointer' : 'not-allowed',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FiDownload />
                    Exporter en CSV
                  </button>
                </div>
              </div>

              {/* Affichage du rapport */}
              {reports && (
                <div>
                  {reportType === 'summary' && reports.data && (
                    <div>
                      <div style={{ 
                        background: 'white', 
                        padding: '24px', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                        border: '1px solid #e5e7eb',
                        marginBottom: '24px',
                      }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                          Résumé Général
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Utilisateurs</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{reports.data.users?.total || 0}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                              Médecins: {reports.data.users?.byRole?.MEDECIN || 0} • 
                              Personnel: {reports.data.users?.byRole?.INFIRMIER || 0} • 
                              Admins: {reports.data.users?.byRole?.ADMIN || 0}
                            </div>
                          </div>
                          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Patients</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{reports.data.patients?.total || 0}</div>
                          </div>
                          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Consultations</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{reports.data.consultations?.total || 0}</div>
                          </div>
                          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Prédictions</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{reports.data.predictions?.total || 0}</div>
                          </div>
                          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Validations</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{reports.data.validations?.total || 0}</div>
                            {reports.data.validations?.byStatus && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                Validé: {reports.data.validations.byStatus.VALIDE || 0} • 
                                Rejeté: {reports.data.validations.byStatus.REJETE || 0}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {reportType === 'activity' && reports.data && (
                    <div>
                      <div style={{ 
                        background: 'white', 
                        padding: '24px', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                        border: '1px solid #e5e7eb',
                        marginBottom: '24px',
                      }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                          Rapport d'Activité
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Actions</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{reports.data.totalActions || 0}</div>
                          </div>
                          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Actions Uniques</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{Object.keys(reports.data.byAction || {}).length}</div>
                          </div>
                        </div>
                        {reports.data.byAction && Object.keys(reports.data.byAction).length > 0 && (
                          <div>
                            <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                              Répartition par Action
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {Object.entries(reports.data.byAction)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .map(([action, count]) => {
                                  const percentage = ((count as number) / reports.data.totalActions) * 100;
                                  return (
                                    <div key={action}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{action}</span>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{count as number}</span>
                                      </div>
                                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          width: `${percentage}%`, 
                                          height: '100%', 
                                          background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                                          borderRadius: '4px',
                                          transition: 'width 0.5s ease',
                                        }}></div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {reportType === 'predictions' && reports.data && (
                    <div>
                      <div style={{ 
                        background: 'white', 
                        padding: '24px', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                        border: '1px solid #e5e7eb',
                        marginBottom: '24px',
                      }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                          Rapport des Prédictions
                        </h3>
                        {reports.data.byDisease && Object.keys(reports.data.byDisease).length > 0 && (
                          <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                              Prédictions par Maladie
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                              {Object.entries(reports.data.byDisease).map(([disease, count]) => {
                                const diseaseNames: Record<string, string> = {
                                  DIABETE: 'Diabète',
                                  MALADIE_RENALE: 'Maladie Rénale',
                                  CARDIOVASCULAIRE: 'Cardiovasculaire',
                                  TUBERCULOSE: 'Tuberculose',
                                };
                                const colors: Record<string, string> = {
                                  DIABETE: '#ef4444',
                                  MALADIE_RENALE: '#3b82f6',
                                  CARDIOVASCULAIRE: '#f59e0b',
                                  TUBERCULOSE: '#8b5cf6',
                                };
                                return (
                                  <div key={disease} style={{ 
                                    padding: '16px', 
                                    background: '#f8fafc', 
                                    borderRadius: '8px',
                                    border: `2px solid ${colors[disease]}40`,
                                  }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                                      {diseaseNames[disease]}
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: '700', color: colors[disease], marginBottom: '8px' }}>
                                      {count as number}
                                    </div>
                                    {reports.data.averageProbabilities?.[disease] && (
                                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        Probabilité moyenne: {(reports.data.averageProbabilities[disease] * 100).toFixed(2)}%
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {reports.data.byMonth && reports.data.byMonth.length > 0 && (
                          <div>
                            <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                              Évolution Mensuelle
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {reports.data.byMonth.map((item: any) => (
                                <div key={item.month} style={{ 
                                  padding: '12px', 
                                  background: '#f8fafc', 
                                  borderRadius: '6px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}>
                                  <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                                    {new Date(item.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#3b82f6' }}>
                                    {item.count} prédiction(s)
                                  </span>
                    </div>
                  ))}
                </div>
              </div>
                        )}
            </div>
                    </div>
                  )}

                  {/* Détails complets du rapport */}
                  <div style={{ 
                    background: 'white', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    border: '1px solid #e5e7eb',
                  }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                      Détails Complets du Rapport
                    </h3>
                    <details>
                      <summary style={{ 
                        cursor: 'pointer', 
                        color: '#3b82f6', 
                        fontWeight: '500',
                        marginBottom: '12px',
                      }}>
                        Voir les données brutes (JSON)
                      </summary>
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '16px', 
                        background: '#f8fafc', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        maxHeight: '400px',
                        overflow: 'auto',
                      }}>
                        <pre style={{ 
                          fontSize: '12px', 
                          color: '#1e293b',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {JSON.stringify(reports, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              )}

              {!reports && !loadingReports && (
                <div style={{ 
                  background: 'white', 
                  padding: '60px', 
                  borderRadius: '12px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                }}>
                  <FiBarChart2 size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
                  <div style={{ fontSize: '18px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>
                    Aucun rapport généré
                  </div>
                  <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                    Sélectionnez un type de rapport et cliquez sur "Générer le rapport"
                  </div>
                </div>
              )}

              {loadingReports && (
                <div style={{ 
                  background: 'white', 
                  padding: '60px', 
                  borderRadius: '12px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '16px', color: '#64748b' }}>Génération du rapport en cours...</div>
                </div>
              )}
            </div>
          )}

          {activeNav === "settings" && (
            <div className={Classes.dashboardContent}>
              <h2>Paramètres Système</h2>
            <div className={Classes.widgetCard}>
              <div className={Classes.widgetHeader}>
                  <h3>État du Système</h3>
              </div>
              <div className={Classes.widgetContent}>
                  {stats && (
                    <div style={{ padding: '16px' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Base de données:</strong>{' '}
                        <span style={{ color: stats.system.dbStatus === 'OK' ? 'green' : 'red' }}>
                          {stats.system.dbStatus}
                        </span>
                  </div>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Sessions actives:</strong> {stats.system.activeSessions}
                </div>
                      <div>
                        <strong>Erreurs récentes (7 jours):</strong> {stats.system.recentErrors}
              </div>
            </div>
                  )}
          </div>
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Modal pour créer/modifier un utilisateur */}
      {showUserModal && (
        <div style={{
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
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h2 style={{ marginBottom: '20px' }}>
              {editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Nom</label>
                <input
                  type="text"
                  value={userForm.nom}
                  onChange={(e) => setUserForm({ ...userForm, nom: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Prénom</label>
                <input
                  type="text"
                  value={userForm.prenom}
                  onChange={(e) => setUserForm({ ...userForm, prenom: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>
                  Mot de passe {editingUser && '(laisser vide pour ne pas modifier)'}
                </label>
                <input
                  type="password"
                  value={userForm.mot_de_passe}
                  onChange={(e) => setUserForm({ ...userForm, mot_de_passe: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px' }}>Rôle</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="MEDECIN">Médecin</option>
                  <option value="INFIRMIER">Personnel</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setUserForm({ nom: "", prenom: "", email: "", mot_de_passe: "", role: "MEDECIN" });
                  }}
                  style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={editingUser ? handleUpdateUser : handleCreateUser}
                  style={{ padding: '10px 20px', background: '#3c4f8a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {editingUser ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
