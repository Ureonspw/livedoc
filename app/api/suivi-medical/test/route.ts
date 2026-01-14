import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Test direct de la base de données
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medecin_id = searchParams.get('medecin_id')

    // 1. Compter tous les suivis médicaux
    const totalSuivis = await prisma.suiviMedical.count()
    
    // 2. Compter les suivis pour ce médecin
    const suivisMedecin = medecin_id 
      ? await prisma.suiviMedical.count({ where: { id_medecin: parseInt(medecin_id) } })
      : 0

    // 3. Récupérer tous les suivis (sans filtre)
    const tousLesSuivis = await prisma.suiviMedical.findMany({
      take: 10,
      orderBy: { date_debut_suivi: 'desc' },
    })

    // 4. Récupérer les suivis pour ce médecin
    const suivisFiltres = medecin_id 
      ? await prisma.suiviMedical.findMany({
          where: { id_medecin: parseInt(medecin_id) },
          take: 10,
          orderBy: { date_debut_suivi: 'desc' },
        })
      : []

    // 5. Vérifier les validations VALIDE récentes
    const validationsRecentes = await prisma.validation.findMany({
      where: {
        validation_status: 'VALIDE',
        ...(medecin_id && { id_medecin: parseInt(medecin_id) }),
      },
      take: 5,
      orderBy: { date_validation: 'desc' },
      include: {
        prediction: {
          select: {
            id_prediction: true,
            maladie_predite: true,
            id_visite: true,
          },
        },
      },
    })

    // 6. Pour chaque validation, vérifier le patient et si un suivi existe
    const validationsAvecDetails = []
    for (const validation of validationsRecentes) {
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

        validationsAvecDetails.push({
          validation_id: validation.id_validation,
          prediction_id: validation.prediction.id_prediction,
          maladie: validation.prediction.maladie_predite,
          patient: {
            id: patient.id_patient,
            nom: patient.nom,
            prenom: patient.prenom,
          },
          hasSuivi: !!suiviExistant,
          suivi_id: suiviExistant?.id_suivi || null,
        })
      }
    }

    return NextResponse.json({
      diagnostic: {
        totalSuivisDansBDD: totalSuivis,
        suivisPourMedecin: suivisMedecin,
        medecin_id_demande: medecin_id,
        tousLesSuivis: tousLesSuivis.map((s: any) => ({
          id_suivi: s.id_suivi,
          id_patient: s.id_patient,
          id_medecin: s.id_medecin,
          maladie_predite: s.maladie_predite,
          statut_suivi: s.statut_suivi,
          date_debut_suivi: s.date_debut_suivi,
        })),
        suivisFiltres: suivisFiltres.map((s: any) => ({
          id_suivi: s.id_suivi,
          id_patient: s.id_patient,
          id_medecin: s.id_medecin,
          maladie_predite: s.maladie_predite,
          statut_suivi: s.statut_suivi,
        })),
        validationsRecentes: validationsAvecDetails,
      },
    })
  } catch (error: any) {
    console.error('Erreur test:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors du test',
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
