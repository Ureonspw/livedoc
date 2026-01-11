import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Récupérer les logs d'activité avec filtres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = (page - 1) * limit

    const where: any = {}

    if (action) {
      where.action = action
    }

    if (entityType) {
      where.entity_type = entityType
    }

    if (userId) {
      where.id_utilisateur = parseInt(userId)
    }

    if (startDate || endDate) {
      where.date_creation = {}
      if (startDate) {
        where.date_creation.gte = new Date(startDate)
      }
      if (endDate) {
        where.date_creation.lte = new Date(endDate)
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          utilisateur: {
            select: {
              id_utilisateur: true,
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
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    // Obtenir les actions uniques pour les filtres
    const uniqueActions = await prisma.activityLog.findMany({
      select: {
        action: true,
      },
      distinct: ['action'],
    })

    const uniqueEntityTypes = await prisma.activityLog.findMany({
      select: {
        entity_type: true,
      },
      distinct: ['entity_type'],
      where: {
        entity_type: {
          not: null,
        },
      },
    })

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id_log,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        date: log.date_creation,
        ipAddress: log.ip_address,
        user: log.utilisateur
          ? {
              id: log.utilisateur.id_utilisateur,
              nom: log.utilisateur.nom,
              prenom: log.utilisateur.prenom,
              email: log.utilisateur.email,
              role: log.utilisateur.role,
            }
          : null,
        details: log.details,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        actions: uniqueActions.map((item) => item.action),
        entityTypes: uniqueEntityTypes
          .map((item) => item.entity_type)
          .filter((type): type is string => type !== null),
      },
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des logs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des logs', details: error.message },
      { status: 500 }
    )
  }
}
