import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Historique complet d'un suivi médical
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const id_suivi = parseInt(id)

    // Récupérer le suivi avec toutes les données
    const suivi = await prisma.suiviMedical.findUnique({
      where: { id_suivi },
      include: {
        patient: true,
        medecin: {
          select: {
            nom: true,
            prenom: true,
          },
        },
        prediction_initiale: {
          include: {
            visite: {
              include: {
                consultation: true,
                donneesCliniques: true,
                constantesVitales: true,
              },
            },
            validations: {
              include: {
                medecin: {
                  select: {
                    nom: true,
                    prenom: true,
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

    // Récupérer toutes les consultations de suivi
    const consultationsSuivi = await prisma.consultationSuivi.findMany({
      where: { id_suivi },
      orderBy: { date_consultation: 'desc' },
      include: {
        consultation: {
          include: {
            visites: {
              include: {
                predictions: {
                  include: {
                    validations: {
                      include: {
                        medecin: {
                          select: {
                            nom: true,
                            prenom: true,
                          },
                        },
                      },
                    },
                  },
                },
                donneesCliniques: true,
                constantesVitales: true,
              },
            },
          },
        },
      },
    })

    // Récupérer tous les examens programmés
    const examensProgrammes = await prisma.examenSuiviProgramme.findMany({
      where: { id_suivi },
      orderBy: { date_examen: 'desc' },
      include: {
        medecin: {
          select: {
            nom: true,
            prenom: true,
          },
        },
        visite: {
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
    })

    // Construire l'historique chronologique
    const historique: any[] = []

    // Ajouter le diagnostic initial
    if (suivi.prediction_initiale) {
      historique.push({
        type: 'DIAGNOSTIC_INITIAL',
        date: suivi.prediction_initiale.date_prediction,
        data: {
          prediction: {
            ...suivi.prediction_initiale,
            probabilite: Number(suivi.prediction_initiale.probabilite),
            seuil_utilise: Number(suivi.prediction_initiale.seuil_utilise),
          },
          visite: suivi.prediction_initiale.visite,
        },
      })
    }

    // Ajouter le début du suivi
    historique.push({
      type: 'DEBUT_SUIVI',
      date: suivi.date_debut_suivi,
      data: {
        traitement: suivi.traitement,
        recommandations: suivi.recommandations,
      },
    })

    // Ajouter les consultations de suivi
    consultationsSuivi.forEach((cs) => {
      historique.push({
        type: 'CONSULTATION_SUIVI',
        date: cs.date_consultation,
        data: {
          consultation: cs.consultation,
          evolution: cs.evolution,
          symptomes: cs.symptomes,
          traitement_actuel: cs.traitement_actuel,
          prochaines_etapes: cs.prochaines_etapes,
        },
      })
    })

    // Ajouter les examens programmés
    examensProgrammes.forEach((examen) => {
      historique.push({
        type: 'EXAMEN_SUIVI',
        date: examen.date_examen,
        data: {
          examen,
          statut: examen.statut,
          date_realisation: examen.date_realisation,
        },
      })
    })

    // Trier par date (plus récent en premier)
    historique.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Convertir les Decimal en nombres
    const suiviSerialized = {
      ...suivi,
      prediction_initiale: suivi.prediction_initiale ? {
        ...suivi.prediction_initiale,
        probabilite: Number(suivi.prediction_initiale.probabilite),
        seuil_utilise: Number(suivi.prediction_initiale.seuil_utilise),
      } : null,
    }

    return NextResponse.json({
      suivi: suiviSerialized,
      historique,
      statistiques: {
        totalConsultations: consultationsSuivi.length,
        totalExamens: examensProgrammes.length,
        examensRealises: examensProgrammes.filter((e) => e.statut === 'REALISE').length,
        examensProgrammes: examensProgrammes.filter((e) => e.statut === 'PROGRAMME').length,
      },
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'historique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    )
  }
}
