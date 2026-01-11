import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Statistiques système pour la supervision
export async function GET(request: NextRequest) {
  try {
    // Statistiques utilisateurs
    const [
      totalUsers,
      usersByRole,
      recentUsers,
      totalPatients,
      totalConsultations,
      totalPredictions,
      totalValidations,
      recentActivityLogs,
      predictionsByDisease,
      consultationsByMonth,
      consultationsByDayRaw,
      patientsByDayRaw,
      predictionsByDayRaw,
      validationsByStatusRaw,
      usersByMonthRaw,
    ] = await Promise.all([
      // Total utilisateurs
      prisma.utilisateur.count(),
      
      // Utilisateurs par rôle
      prisma.utilisateur.groupBy({
        by: ['role'],
        _count: true,
      }),
      
      // Utilisateurs récents (7 derniers jours)
      prisma.utilisateur.count({
        where: {
          date_creation: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Total patients
      prisma.patient.count(),
      
      // Total consultations
      prisma.consultation.count(),
      
      // Total prédictions
      prisma.predictionIA.count(),
      
      // Total validations
      prisma.validation.count(),
      
      // Activité récente (100 dernières actions)
      prisma.activityLog.findMany({
        take: 100,
        orderBy: {
          date_creation: 'desc',
        },
        include: {
          utilisateur: {
            select: {
              nom: true,
              prenom: true,
              email: true,
            },
          },
        },
      }),
      
      // Prédictions par maladie
      prisma.predictionIA.groupBy({
        by: ['maladie_predite'],
        _count: true,
      }),
      
        // Consultations par mois (6 derniers mois)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', date_consultation) as month,
          COUNT(*) as count
        FROM consultation
        WHERE date_consultation >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', date_consultation)
        ORDER BY month DESC
      ` as Promise<Array<{ month: Date; count: bigint }>>,
      
      // Consultations par jour (7 derniers jours)
      prisma.consultation.findMany({
        where: {
          date_consultation: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          date_consultation: true,
        },
      }),
      
      // Patients par jour (7 derniers jours)
      prisma.patient.findMany({
        where: {
          date_creation: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          date_creation: true,
        },
      }),
      
      // Prédictions par jour (7 derniers jours)
      prisma.predictionIA.findMany({
        where: {
          date_prediction: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          date_prediction: true,
          maladie_predite: true,
        },
      }),
      
      // Validations par statut
      prisma.validation.groupBy({
        by: ['validation_status'],
        _count: true,
      }),
      
      // Utilisateurs par mois (6 derniers mois)
      prisma.utilisateur.findMany({
        where: {
          date_creation: {
            gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          date_creation: true,
          role: true,
        },
      }),
    ])

    // Formater les utilisateurs par rôle
    const roleStats = {
      MEDECIN: 0,
      INFIRMIER: 0,
      ADMIN: 0,
    }
    
    usersByRole.forEach((item) => {
      roleStats[item.role as keyof typeof roleStats] = item._count
    })

    // Formater les prédictions par maladie
    const diseaseStats: Record<string, number> = {}
    predictionsByDisease.forEach((item) => {
      diseaseStats[item.maladie_predite] = item._count
    })

    // Formater les consultations par mois
    const monthlyConsultations = consultationsByMonth.map((item) => ({
      month: item.month.toISOString().substring(0, 7),
      count: Number(item.count),
    }))
    
    // Formater les consultations par jour (7 derniers jours)
    const consultationsByDay = (() => {
      const days: Record<string, number> = {}
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        days[dateStr] = 0
      }
      
      consultationsByDayRaw.forEach((c) => {
        const dateStr = c.date_consultation.toISOString().split('T')[0]
        if (days[dateStr] !== undefined) {
          days[dateStr]++
        }
      })
      
      return Object.entries(days).map(([date, count]) => ({
        date,
        day: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
        count,
      }))
    })()
    
    // Formater les patients par jour (7 derniers jours)
    const patientsByDay = (() => {
      const days: Record<string, number> = {}
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        days[dateStr] = 0
      }
      
      patientsByDayRaw.forEach((p) => {
        const dateStr = p.date_creation.toISOString().split('T')[0]
        if (days[dateStr] !== undefined) {
          days[dateStr]++
        }
      })
      
      return Object.entries(days).map(([date, count]) => ({
        date,
        day: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
        count,
      }))
    })()
    
    // Formater les prédictions par jour et par maladie
    const predictionsByDay = (() => {
      const days: Record<string, Record<string, number>> = {}
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        days[dateStr] = {
          DIABETE: 0,
          MALADIE_RENALE: 0,
          CARDIOVASCULAIRE: 0,
          TUBERCULOSE: 0,
        }
      }
      
      predictionsByDayRaw.forEach((p) => {
        const dateStr = p.date_prediction.toISOString().split('T')[0]
        if (days[dateStr]) {
          days[dateStr][p.maladie_predite] = (days[dateStr][p.maladie_predite] || 0) + 1
        }
      })
      
      return Object.entries(days).map(([date, diseases]) => ({
        date,
        day: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
        ...diseases,
        total: Object.values(diseases).reduce((sum, v) => sum + v, 0),
      }))
    })()
    
    // Formater les validations par statut
    const validationsByStatus = validationsByStatusRaw.reduce((acc, item) => {
      acc[item.validation_status] = item._count
      return acc
    }, {} as Record<string, number>)
    
    // Formater les utilisateurs par mois
    const usersByMonth = (() => {
      const months: Record<string, Record<string, number>> = {}
      const today = new Date()
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const monthStr = date.toISOString().substring(0, 7)
        months[monthStr] = { MEDECIN: 0, INFIRMIER: 0, ADMIN: 0 }
      }
      
      usersByMonthRaw.forEach((u) => {
        const monthStr = u.date_creation.toISOString().substring(0, 7)
        if (months[monthStr]) {
          months[monthStr][u.role] = (months[monthStr][u.role] || 0) + 1
        }
      })
      
      return Object.entries(months).map(([month, roles]) => ({
        month,
        ...roles,
        total: Object.values(roles).reduce((sum, v) => sum + v, 0),
      }))
    })()

    // Calculer les sessions actives (utilisateurs avec activité dans les dernières 24h)
    const activeSessions = await prisma.activityLog.findMany({
      where: {
        action: 'LOGIN',
        date_creation: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      distinct: ['id_utilisateur'],
      select: {
        id_utilisateur: true,
      },
    })

    // Compter les erreurs récentes (actions avec "ERROR" dans le nom)
    const recentErrors = await prisma.activityLog.count({
      where: {
        action: {
          contains: 'ERROR',
        },
        date_creation: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    })

    // Vérifier l'état de la base de données
    let dbStatus = 'OK'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      dbStatus = 'ERROR'
    }

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: roleStats,
        recent: recentUsers,
        byMonth: usersByMonth,
      },
      patients: {
        total: totalPatients,
        byDay: patientsByDay,
      },
      consultations: {
        total: totalConsultations,
        byMonth: monthlyConsultations,
        byDay: consultationsByDay,
      },
      predictions: {
        total: totalPredictions,
        byDisease: diseaseStats,
        byDay: predictionsByDay,
      },
      validations: {
        total: totalValidations,
        byStatus: validationsByStatus,
      },
      system: {
        activeSessions: activeSessions.length,
        recentErrors,
        dbStatus,
      },
      recentActivity: recentActivityLogs.map((log) => ({
        id: log.id_log,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        date: log.date_creation,
        user: log.utilisateur
          ? {
              nom: log.utilisateur.nom,
              prenom: log.utilisateur.prenom,
              email: log.utilisateur.email,
            }
          : null,
        details: log.details,
      })),
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques', details: error.message },
      { status: 500 }
    )
  }
}
