import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Vérifier si un suivi existe pour une prédiction
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id_prediction = searchParams.get('id_prediction')

    if (!id_prediction) {
      return NextResponse.json(
        { error: 'ID prédiction requis' },
        { status: 400 }
      )
    }

    // Récupérer la prédiction avec le patient
    const prediction = await prisma.predictionIA.findUnique({
      where: { id_prediction: parseInt(id_prediction) },
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
    })

    if (!prediction || !prediction.visite?.consultation?.patient) {
      return NextResponse.json(
        { error: 'Prédiction ou patient non trouvé' },
        { status: 404 }
      )
    }

    const patient = prediction.visite.consultation.patient

    // Vérifier si un suivi existe déjà
    const suiviExistant = await prisma.suiviMedical.findFirst({
      where: {
        id_patient: patient.id_patient,
        maladie_predite: prediction.maladie_predite,
        statut_suivi: {
          not: 'GUERI',
        },
      },
    })

    return NextResponse.json({
      hasSuivi: !!suiviExistant,
      suivi: suiviExistant ? { id_suivi: suiviExistant.id_suivi } : null,
      patient: {
        id_patient: patient.id_patient,
        nom: patient.nom,
        prenom: patient.prenom,
      },
      maladie_predite: prediction.maladie_predite,
    })
  } catch (error: any) {
    console.error('Erreur lors de la vérification du suivi:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du suivi' },
      { status: 500 }
    )
  }
}
