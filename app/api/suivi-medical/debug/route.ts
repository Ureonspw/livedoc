import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - API de diagnostic pour vérifier les données
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medecin_id = searchParams.get('medecin_id')

    // 1. Vérifier les validations VALIDE
    const validations = await prisma.validation.findMany({
      where: {
        validation_status: 'VALIDE',
        ...(medecin_id && { id_medecin: parseInt(medecin_id) }),
      },
      include: {
        prediction: {
          select: {
            id_prediction: true,
            maladie_predite: true,
            id_visite: true,
          },
        },
      },
      take: 10,
      orderBy: { date_validation: 'desc' },
    })

    // 2. Vérifier les suivis médicaux
    const suivis = await prisma.suiviMedical.findMany({
      where: medecin_id ? { id_medecin: parseInt(medecin_id) } : {},
      take: 10,
      orderBy: { date_debut_suivi: 'desc' },
      include: {
        patient: {
          select: {
            id_patient: true,
            nom: true,
            prenom: true,
          },
        },
      },
    })

    // 3. Pour chaque validation, vérifier si un suivi existe
    const validationsAvecSuivi = []
    for (const validation of validations) {
      // Récupérer le patient depuis la visite
      const visite = await prisma.visite.findUnique({
        where: { id_visite: validation.prediction.id_visite },
        include: {
          consultation: {
            include: {
              patient: {
                select: {
                  id_patient: true,
                  nom: true,
                  prenom: true,
                },
              },
            },
          },
        },
      })

      if (visite?.consultation?.patient) {
        const patient = visite.consultation.patient
        const suiviExistant = await prisma.suiviMedical.findFirst({
          where: {
            id_patient: patient.id_patient,
            maladie_predite: validation.prediction.maladie_predite,
          },
        })

        validationsAvecSuivi.push({
          validation: {
            id_validation: validation.id_validation,
            id_prediction: validation.prediction.id_prediction,
            maladie: validation.prediction.maladie_predite,
            date_validation: validation.date_validation,
          },
          patient: {
            id_patient: patient.id_patient,
            nom: patient.nom,
            prenom: patient.prenom,
          },
          hasSuivi: !!suiviExistant,
          suivi: suiviExistant ? {
            id_suivi: suiviExistant.id_suivi,
            statut: suiviExistant.statut_suivi,
          } : null,
        })
      }
    }

    return NextResponse.json({
      diagnostic: {
        totalValidations: validations.length,
        totalSuivis: suivis.length,
        validationsAvecSuivi,
        suivisExistants: suivis.map((s: any) => ({
          id_suivi: s.id_suivi,
          patient: s.patient,
          maladie: s.maladie_predite,
          statut: s.statut_suivi,
        })),
      },
    })
  } catch (error: any) {
    console.error('Erreur diagnostic:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors du diagnostic',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
