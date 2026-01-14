import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Liste des patients en suivi pour un médecin
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const medecin_id = searchParams.get('medecin_id')
    const statut = searchParams.get('statut')
    const maladie = searchParams.get('maladie')

    // D'abord, vérifier combien de suivis existent au total
    const totalSuivis = await prisma.suiviMedical.count()
    console.log(`📊 Total de suivis dans la BDD: ${totalSuivis}`)
    
    const where: any = {}
    if (medecin_id) {
      where.id_medecin = parseInt(medecin_id)
      const countMedecin = await prisma.suiviMedical.count({ where: { id_medecin: parseInt(medecin_id) } })
      console.log(`📊 Suivis pour médecin ${medecin_id}: ${countMedecin}`)
    }
    if (statut) {
      where.statut_suivi = statut
    }
    if (maladie) {
      where.maladie_predite = maladie
    }

    console.log('🔍 Requête suivi médical avec where:', JSON.stringify(where))

    // Requête de base sans relations complexes
    let suivis: any[] = []
    try {
      suivis = await prisma.suiviMedical.findMany({
        where,
        orderBy: { date_debut_suivi: 'desc' },
      })
      console.log(`✅ Nombre de suivis trouvés avec filtre: ${suivis.length}`)
      
      // Si aucun suivi trouvé avec filtre mais qu'il y en a dans la BDD, essayer sans filtre médecin
      if (suivis.length === 0 && medecin_id && totalSuivis > 0) {
        console.log('⚠️ Aucun suivi trouvé avec filtre médecin, essai sans filtre...')
        const suivisSansFiltre = await prisma.suiviMedical.findMany({
          take: 5,
          orderBy: { date_debut_suivi: 'desc' },
        })
        console.log(`📋 Exemples de suivis (sans filtre):`, suivisSansFiltre.map((s: any) => ({
          id_suivi: s.id_suivi,
          id_medecin: s.id_medecin,
          id_patient: s.id_patient,
          maladie: s.maladie_predite,
        })))
      }
    } catch (dbError: any) {
      console.error('❌ Erreur lors de la requête de base:', dbError.message)
      console.error('Code:', dbError.code)
      console.error('Stack:', dbError.stack)
      // Retourner un tableau vide plutôt que de planter
      suivis = []
    }

    // Charger les relations séparément
    for (let i = 0; i < suivis.length; i++) {
      const suivi = suivis[i]
      
      // Charger le patient
      try {
        const patient = await prisma.patient.findUnique({
          where: { id_patient: suivi.id_patient },
          select: {
            id_patient: true,
            nom: true,
            prenom: true,
            sexe: true,
            date_naissance: true,
            telephone: true,
          },
        })
        suivis[i].patient = patient
      } catch (e: any) {
        console.warn(`Erreur chargement patient ${suivi.id_patient}:`, e.message)
        suivis[i].patient = null
      }

      // Charger le médecin
      try {
        const medecin = await prisma.utilisateur.findUnique({
          where: { id_utilisateur: suivi.id_medecin },
          select: {
            id_utilisateur: true,
            nom: true,
            prenom: true,
          },
        })
        suivis[i].medecin = medecin
      } catch (e: any) {
        console.warn(`Erreur chargement médecin ${suivi.id_medecin}:`, e.message)
        suivis[i].medecin = null
      }
    }

    // Charger les relations optionnelles séparément
    const suivisEnrichis = await Promise.all(
      suivis.map(async (suivi: any) => {
        const suiviEnrichi: any = { ...suivi }

        // Charger prediction_initiale si elle existe
        if (suivi.id_prediction_initiale) {
          try {
            const prediction = await prisma.predictionIA.findUnique({
              where: { id_prediction: suivi.id_prediction_initiale },
              select: {
                id_prediction: true,
                maladie_predite: true,
                probabilite: true,
                date_prediction: true,
              },
            })
            suiviEnrichi.prediction_initiale = prediction ? {
              ...prediction,
              probabilite: Number(prediction.probabilite),
            } : null
          } catch (e: any) {
            console.warn(`Erreur chargement prediction ${suivi.id_prediction_initiale}:`, e.message)
            suiviEnrichi.prediction_initiale = null
          }
        } else {
          suiviEnrichi.prediction_initiale = null
        }

        // Charger le prochain examen programmé
        try {
          const prochainExamen = await prisma.examenSuiviProgramme.findFirst({
            where: {
              id_suivi: suivi.id_suivi,
              statut: 'PROGRAMME',
            },
            orderBy: { date_examen: 'asc' },
          })
          suiviEnrichi.examens_programmes = prochainExamen ? [prochainExamen] : []
        } catch (e: any) {
          console.warn(`Erreur chargement examens pour suivi ${suivi.id_suivi}:`, e.message)
          suiviEnrichi.examens_programmes = []
        }

        // Charger la dernière consultation de suivi
        try {
          const derniereConsultation = await prisma.consultationSuivi.findFirst({
            where: { id_suivi: suivi.id_suivi },
            orderBy: { date_consultation: 'desc' },
          })
          suiviEnrichi.consultations_suivi = derniereConsultation ? [derniereConsultation] : []
        } catch (e: any) {
          console.warn(`Erreur chargement consultations pour suivi ${suivi.id_suivi}:`, e.message)
          suiviEnrichi.consultations_suivi = []
        }

        return suiviEnrichi
      })
    )

    return NextResponse.json({ suivis: suivisEnrichis })
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des suivis:', error)
    console.error('Message:', error.message)
    console.error('Code:', error.code)
    console.error('Stack:', error.stack)
    
    // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur 500
    // pour que l'interface puisse s'afficher
    if (error.code === 'P2002' || error.code === 'P2025' || error.message?.includes('relation') || error.message?.includes('column')) {
      console.warn('Erreur de structure de base de données, retour d\'un tableau vide')
      return NextResponse.json({ suivis: [] })
    }
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des suivis',
        message: error.message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau suivi médical
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id_patient,
      id_medecin,
      id_prediction_initiale,
      maladie_predite,
      traitement,
      recommandations,
      date_prochain_examen,
    } = body

    if (!id_patient || !id_medecin || !maladie_predite) {
      return NextResponse.json(
        { error: 'ID patient, ID médecin et maladie prédite sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que le médecin existe
    const medecin = await prisma.utilisateur.findUnique({
      where: { id_utilisateur: id_medecin },
    })

    if (!medecin || (medecin.role !== 'MEDECIN' && medecin.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Médecin non trouvé ou non autorisé' },
        { status: 400 }
      )
    }

    // Vérifier si un suivi existe déjà pour ce patient et cette maladie
    const suiviExistant = await prisma.suiviMedical.findFirst({
      where: {
        id_patient,
        maladie_predite,
        statut_suivi: {
          not: 'GUERI',
        },
      },
    })

    if (suiviExistant) {
      return NextResponse.json(
        { error: 'Un suivi est déjà en cours pour ce patient et cette maladie' },
        { status: 400 }
      )
    }

    // Créer le suivi
    const suivi = await prisma.suiviMedical.create({
      data: {
        id_patient,
        id_medecin,
        id_prediction_initiale: id_prediction_initiale || null,
        maladie_predite,
        traitement: traitement || null,
        recommandations: recommandations || null,
        date_prochain_examen: date_prochain_examen ? new Date(date_prochain_examen) : null,
        statut_suivi: 'EN_COURS',
      },
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

    return NextResponse.json(
      {
        message: 'Suivi médical créé avec succès',
        suivi,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la création du suivi:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la création du suivi',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
