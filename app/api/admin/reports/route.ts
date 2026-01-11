import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET - Générer des rapports système
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    switch (reportType) {
      case 'summary': {
        // Rapport récapitulatif
        const [
          totalUsers,
          totalPatients,
          totalConsultations,
          totalPredictions,
          predictionsByStatus,
          usersByRole,
        ] = await Promise.all([
          prisma.utilisateur.count(),
          prisma.patient.count(),
          prisma.consultation.count({
            where: startDate || endDate ? { date_consultation: dateFilter } : undefined,
          }),
          prisma.predictionIA.count({
            where: startDate || endDate ? { date_prediction: dateFilter } : undefined,
          }),
          prisma.validation.groupBy({
            by: ['validation_status'],
            _count: true,
            where: startDate || endDate ? { date_validation: dateFilter } : undefined,
          }),
          prisma.utilisateur.groupBy({
            by: ['role'],
            _count: true,
          }),
        ])

        return NextResponse.json({
          type: 'summary',
          period: {
            start: startDate || null,
            end: endDate || null,
          },
          data: {
            users: {
              total: totalUsers,
              byRole: usersByRole.reduce((acc, item) => {
                acc[item.role] = item._count
                return acc
              }, {} as Record<string, number>),
            },
            patients: {
              total: totalPatients,
            },
            consultations: {
              total: totalConsultations,
            },
            predictions: {
              total: totalPredictions,
            },
            validations: {
              byStatus: predictionsByStatus.reduce((acc, item) => {
                acc[item.validation_status] = item._count
                return acc
              }, {} as Record<string, number>),
            },
          },
        })
      }

      case 'activity': {
        // Rapport d'activité
        const activityLogs = await prisma.activityLog.findMany({
          where: startDate || endDate ? { date_creation: dateFilter } : undefined,
          include: {
            utilisateur: {
              select: {
                nom: true,
                prenom: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            date_creation: 'desc',
          },
          take: 1000,
        })

        const activityByAction = await prisma.activityLog.groupBy({
          by: ['action'],
          _count: true,
          where: startDate || endDate ? { date_creation: dateFilter } : undefined,
        })

        return NextResponse.json({
          type: 'activity',
          period: {
            start: startDate || null,
            end: endDate || null,
          },
          data: {
            totalActions: activityLogs.length,
            byAction: activityByAction.reduce((acc, item) => {
              acc[item.action] = item._count
              return acc
            }, {} as Record<string, number>),
            logs: activityLogs.map((log) => ({
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
                    role: log.utilisateur.role,
                  }
                : null,
              details: log.details,
            })),
          },
        })
      }

      case 'predictions': {
        // Rapport sur les prédictions
        const [
          predictionsByDisease,
          predictionsByMonth,
          averageProbabilities,
          topValidated,
        ] = await Promise.all([
          prisma.predictionIA.groupBy({
            by: ['maladie_predite'],
            _count: true,
            where: startDate || endDate ? { date_prediction: dateFilter } : undefined,
          }),
          (async () => {
            const where: any = {}
            if (startDate) where.date_prediction = { ...where.date_prediction, gte: new Date(startDate) }
            if (endDate) where.date_prediction = { ...where.date_prediction, lte: new Date(endDate) }
            
            const predictions = await prisma.predictionIA.findMany({
              where: Object.keys(where).length > 0 ? where : undefined,
              select: { date_prediction: true },
            })
            
            // Grouper par mois
            const byMonth: Record<string, number> = {}
            predictions.forEach(p => {
              const month = p.date_prediction.toISOString().substring(0, 7)
              byMonth[month] = (byMonth[month] || 0) + 1
            })
            
            return Object.entries(byMonth)
              .map(([month, count]) => ({ month: new Date(month + '-01'), count: BigInt(count) }))
              .sort((a, b) => b.month.getTime() - a.month.getTime())
          })(),
          prisma.predictionIA.groupBy({
            by: ['maladie_predite'],
            _avg: {
              probabilite: true,
            },
            where: startDate || endDate ? { date_prediction: dateFilter } : undefined,
          }),
          prisma.validation.findMany({
            where: {
              validation_status: 'VALIDE',
              ...(startDate || endDate ? { date_validation: dateFilter } : {}),
            },
            include: {
              prediction: {
                select: {
                  maladie_predite: true,
                  probabilite: true,
                },
              },
            },
            orderBy: {
              date_validation: 'desc',
            },
            take: 10,
          }),
        ])

        return NextResponse.json({
          type: 'predictions',
          period: {
            start: startDate || null,
            end: endDate || null,
          },
          data: {
            byDisease: predictionsByDisease.reduce((acc, item) => {
              acc[item.maladie_predite] = item._count
              return acc
            }, {} as Record<string, number>),
            byMonth: predictionsByMonth.map((item) => ({
              month: item.month.toISOString().substring(0, 7),
              count: Number(item.count),
            })),
            averageProbabilities: averageProbabilities.reduce((acc, item) => {
              acc[item.maladie_predite] = Number(item._avg.probabilite)
              return acc
            }, {} as Record<string, number>),
            topValidated: topValidated.map((v) => ({
              id: v.id_validation,
              maladie: v.prediction.maladie_predite,
              probabilite: Number(v.prediction.probabilite),
              date: v.date_validation,
            })),
          },
        })
      }

      default:
        return NextResponse.json(
          { error: 'Type de rapport non reconnu' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Erreur lors de la génération du rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport', details: error.message },
      { status: 500 }
    )
  }
}
