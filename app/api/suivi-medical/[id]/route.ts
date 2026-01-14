import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Détails d'un suivi médical
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const id_suivi = parseInt(id)

    const suivi = await prisma.suiviMedical.findUnique({
      where: { id_suivi },
      include: {
        patient: true,
        medecin: {
          select: {
            id_utilisateur: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
        prediction_initiale: {
          include: {
            visite: {
              include: {
                consultation: {
                  include: {
                    patient: true,
                  },
                },
                donneesCliniques: true,
                constantesVitales: true,
              },
            },
          },
        },
        examens_programmes: {
          orderBy: { date_examen: 'asc' },
          include: {
            medecin: {
              select: {
                nom: true,
                prenom: true,
              },
            },
            visite: {
              include: {
                predictions: true,
              },
            },
          },
        },
        consultations_suivi: {
          orderBy: { date_consultation: 'desc' },
          include: {
            consultation: {
              include: {
                visites: {
                  include: {
                    predictions: {
                      include: {
                        validations: true,
                      },
                    },
                    donneesCliniques: true,
                    constantesVitales: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!suivi) {
      return NextResponse.json(
        { error: 'Suivi médical non trouvé' },
        { status: 404 }
      )
    }

    // Convertir les Decimal en nombres
    const suiviSerialized = {
      ...suivi,
      prediction_initiale: suivi.prediction_initiale ? {
        ...suivi.prediction_initiale,
        probabilite: Number(suivi.prediction_initiale.probabilite),
        seuil_utilise: Number(suivi.prediction_initiale.seuil_utilise),
      } : null,
    }

    return NextResponse.json({ suivi: suiviSerialized })
  } catch (error: any) {
    console.error('Erreur lors de la récupération du suivi:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du suivi' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un suivi médical
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const id_suivi = parseInt(id)
    const body = await request.json()

    const {
      statut_suivi,
      traitement,
      recommandations,
      notes_evolution,
      date_prochain_examen,
      date_guerison,
    } = body

    // Vérifier que le suivi existe
    const suiviExistant = await prisma.suiviMedical.findUnique({
      where: { id_suivi },
    })

    if (!suiviExistant) {
      return NextResponse.json(
        { error: 'Suivi médical non trouvé' },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: any = {}
    if (statut_suivi) updateData.statut_suivi = statut_suivi
    if (traitement !== undefined) updateData.traitement = traitement
    if (recommandations !== undefined) updateData.recommandations = recommandations
    if (notes_evolution !== undefined) updateData.notes_evolution = notes_evolution
    if (date_prochain_examen !== undefined) {
      updateData.date_prochain_examen = date_prochain_examen ? new Date(date_prochain_examen) : null
    }
    if (date_guerison !== undefined) {
      updateData.date_guerison = date_guerison ? new Date(date_guerison) : null
      if (date_guerison && !statut_suivi) {
        updateData.statut_suivi = 'GUERI'
      }
    }

    // Si le statut passe à GUERI, mettre à jour la date de guérison
    if (statut_suivi === 'GUERI' && !updateData.date_guerison) {
      updateData.date_guerison = new Date()
    }

    // Mettre à jour le suivi
    const suivi = await prisma.suiviMedical.update({
      where: { id_suivi },
      data: updateData,
      include: {
        patient: true,
        medecin: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Suivi médical mis à jour avec succès',
      suivi,
    })
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du suivi:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du suivi',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
