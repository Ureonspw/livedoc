import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Créer automatiquement des prescriptions pour les examens de suivi dont la date est arrivée
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date_reference } = body // Optionnel : date de référence (par défaut aujourd'hui)

    const dateRef = date_reference ? new Date(date_reference) : new Date()
    dateRef.setHours(0, 0, 0, 0) // Début de journée

    console.log('🔍 Recherche des examens de suivi à créer pour la date:', dateRef.toISOString())

    // Récupérer tous les examens programmés dont la date est arrivée ou passée
    const where: any = {
      statut: 'PROGRAMME',
      date_examen: {
        lte: dateRef, // Date d'examen <= date de référence
      },
    }

    // Filtrer par médecin si spécifié dans le body
    const medecin_id = body.medecin_id
    if (medecin_id) {
      where.id_medecin = parseInt(medecin_id)
    }

    const examensAcreer = await prisma.examenSuiviProgramme.findMany({
      where,
      include: {
        suivi: {
          include: {
            patient: true,
            medecin: true,
          },
        },
      },
      orderBy: { date_examen: 'asc' },
    })

    console.log(`📋 ${examensAcreer.length} examen(s) à créer`)

    const prescriptionsCreees = []

    for (const examen of examensAcreer) {
      try {
        // Vérifier si une prescription existe déjà pour cet examen
        const prescriptionExistante = await prisma.prescriptionExamen.findFirst({
          where: {
            consultation: {
              patient: {
                id_patient: examen.suivi.id_patient,
              },
            },
            maladies_ciblees: {
              has: examen.type_examen,
            },
            statut: {
              in: ['EN_ATTENTE', 'EN_COURS'],
            },
            date_prescription: {
              gte: new Date(dateRef.getTime() - 7 * 24 * 60 * 60 * 1000), // Dans les 7 derniers jours
            },
          },
        })

        if (prescriptionExistante) {
          console.log(`⚠️ Prescription déjà existante pour l'examen ${examen.id_examen_suivi}`)
          continue
        }

        // Vérifier si une consultation existe déjà pour aujourd'hui pour ce patient
        let consultation = await prisma.consultation.findFirst({
          where: {
            id_patient: examen.suivi.id_patient,
            id_medecin: examen.suivi.id_medecin,
            date_consultation: {
              gte: new Date(dateRef),
              lt: new Date(dateRef.getTime() + 24 * 60 * 60 * 1000), // Dans les 24h
            },
          },
        })

        // Si pas de consultation, en créer une
        if (!consultation) {
          consultation = await prisma.consultation.create({
            data: {
              id_patient: examen.suivi.id_patient,
              id_medecin: examen.suivi.id_medecin,
              motif: `Examen de suivi - ${examen.type_examen}`,
              observation: examen.raison || `Examen programmé le ${examen.date_examen.toLocaleDateString('fr-FR')}`,
            },
          })
          console.log(`✅ Consultation créée: ${consultation.id_consultation}`)
        }

        // Créer la prescription d'examen
        const prescription = await prisma.prescriptionExamen.create({
          data: {
            id_consultation: consultation.id_consultation,
            id_medecin: examen.suivi.id_medecin,
            maladies_ciblees: [examen.type_examen],
            commentaire: `Examen de suivi programmé - ${examen.raison || 'Suivi médical régulier'}`,
            statut: 'EN_ATTENTE',
          },
          include: {
            consultation: {
              include: {
                patient: true,
              },
            },
          },
        })

        console.log(`✅ Prescription créée: ${prescription.id_prescription} pour patient ${examen.suivi.patient.nom} ${examen.suivi.patient.prenom}`)

        // Mettre à jour l'examen programmé pour indiquer qu'une prescription a été créée
        // (on ne le marque pas comme REALISE car l'examen n'est pas encore fait, juste la prescription créée)
        await prisma.examenSuiviProgramme.update({
          where: { id_examen_suivi: examen.id_examen_suivi },
          data: {
            notes: examen.notes 
              ? `${examen.notes}\n\nPrescription créée le ${new Date().toLocaleDateString('fr-FR')} (ID: ${prescription.id_prescription})`
              : `Prescription créée le ${new Date().toLocaleDateString('fr-FR')} (ID: ${prescription.id_prescription})`,
          },
        })

        prescriptionsCreees.push({
          examen_id: examen.id_examen_suivi,
          prescription_id: prescription.id_prescription,
          consultation_id: consultation.id_consultation,
          patient: {
            id: examen.suivi.patient.id_patient,
            nom: examen.suivi.patient.nom,
            prenom: examen.suivi.patient.prenom,
          },
          maladie: examen.type_examen,
          date_examen: examen.date_examen,
        })
      } catch (examenError: any) {
        console.error(`❌ Erreur lors de la création de la prescription pour l'examen ${examen.id_examen_suivi}:`, examenError.message)
        continue
      }
    }

    return NextResponse.json({
      message: `${prescriptionsCreees.length} prescription(s) créée(s)`,
      prescriptionsCreees,
      totalExamens: examensAcreer.length,
    })
  } catch (error: any) {
    console.error('Erreur lors de la création automatique des prescriptions:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la création automatique des prescriptions',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// GET - Vérifier les examens à créer (sans les créer)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date_reference = searchParams.get('date_reference')
    const medecin_id = searchParams.get('medecin_id')

    const dateRef = date_reference ? new Date(date_reference) : new Date()
    dateRef.setHours(0, 0, 0, 0)

    const where: any = {
      statut: 'PROGRAMME',
      date_examen: {
        lte: dateRef,
      },
    }

    if (medecin_id) {
      where.id_medecin = parseInt(medecin_id)
    }

    const examensAcreer = await prisma.examenSuiviProgramme.findMany({
      where,
      include: {
        suivi: {
          include: {
            patient: true,
            medecin: {
              select: {
                nom: true,
                prenom: true,
              },
            },
          },
        },
      },
      orderBy: { date_examen: 'asc' },
    })

    return NextResponse.json({
      examensAcreer: examensAcreer.map((e: any) => ({
        id_examen_suivi: e.id_examen_suivi,
        date_examen: e.date_examen,
        type_examen: e.type_examen,
        raison: e.raison,
        patient: {
          id: e.suivi.patient.id_patient,
          nom: e.suivi.patient.nom,
          prenom: e.suivi.patient.prenom,
        },
        medecin: e.suivi.medecin,
        suivi_id: e.suivi.id_suivi,
      })),
      total: examensAcreer.length,
    })
  } catch (error: any) {
    console.error('Erreur lors de la vérification des examens:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la vérification des examens',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
