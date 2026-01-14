import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Récupérer les prédictions validées VALIDE sans suivi médical
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medecin_id = searchParams.get('medecin_id')

    console.log('Recherche prédictions sans suivi pour médecin:', medecin_id)

    // Récupérer toutes les validations VALIDE
    const validations = await prisma.validation.findMany({
      where: {
        validation_status: 'VALIDE',
        ...(medecin_id && { id_medecin: parseInt(medecin_id) }),
      },
      include: {
        prediction: {
          include: {
            visite: {
              include: {
                consultation: {
                  include: {
                    patient: true,
                  },
                },
              },
            },
          },
        },
        medecin: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
      orderBy: { date_validation: 'desc' },
    })

    console.log(`Nombre de validations VALIDE trouvées: ${validations.length}`)

    // Filtrer celles qui n'ont pas de suivi médical
    const predictionsSansSuivi = []
    for (const validation of validations) {
      try {
        if (!validation.prediction || !validation.prediction.visite || !validation.prediction.visite.consultation || !validation.prediction.visite.consultation.patient) {
          console.warn('Validation sans patient complet:', validation.id_validation)
          continue
        }

        const patient = validation.prediction.visite.consultation.patient
        const maladie = validation.prediction.maladie_predite

        if (!maladie) {
          console.warn('Prédiction sans maladie:', validation.prediction.id_prediction)
          continue
        }

        // Vérifier si un suivi existe
        const suiviExistant = await prisma.suiviMedical.findFirst({
          where: {
            id_patient: patient.id_patient,
            maladie_predite: maladie,
            statut_suivi: {
              not: 'GUERI',
            },
          },
        })

        if (!suiviExistant) {
          predictionsSansSuivi.push({
            id_prediction: validation.prediction.id_prediction,
            maladie_predite: maladie,
            probabilite: Number(validation.prediction.probabilite),
            date_prediction: validation.prediction.date_prediction,
            date_validation: validation.date_validation,
            patient: {
              id_patient: patient.id_patient,
              nom: patient.nom,
              prenom: patient.prenom,
              sexe: patient.sexe,
              date_naissance: patient.date_naissance,
            },
            medecin: validation.medecin,
            validation: {
              id_validation: validation.id_validation,
              commentaire: validation.commentaire,
              diagnostic_final: validation.diagnostic_final,
            },
          })
        }
      } catch (itemError: any) {
        console.warn('Erreur lors du traitement d\'une validation:', itemError.message)
        continue
      }
    }

    console.log(`Nombre de prédictions sans suivi: ${predictionsSansSuivi.length}`)

    return NextResponse.json({
      predictions: predictionsSansSuivi,
      total: predictionsSansSuivi.length,
    })
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des prédictions sans suivi:', error)
    console.error('Message:', error.message)
    console.error('Code:', error.code)
    console.error('Stack:', error.stack)
    
    // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur 500
    if (error.code === 'P2002' || error.code === 'P2025' || error.message?.includes('relation') || error.message?.includes('column')) {
      console.warn('Erreur de structure de base de données, retour d\'un tableau vide')
      return NextResponse.json({ predictions: [], total: 0 })
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des prédictions sans suivi',
        message: error.message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
