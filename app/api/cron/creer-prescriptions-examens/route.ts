import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Job automatique pour créer les prescriptions d'examens (appelé par un cron job)
// Cette route peut être appelée par un service externe (cron job, Vercel Cron, etc.)
export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé secrète pour sécuriser l'endpoint
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-change-in-production'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const dateRef = new Date()
    dateRef.setHours(0, 0, 0, 0)

    console.log('🔄 Job automatique: Création des prescriptions pour les examens arrivés -', dateRef.toISOString())

    // Récupérer tous les examens programmés dont la date est arrivée ou passée
    const where: any = {
      statut: 'PROGRAMME',
      date_examen: {
        lte: dateRef,
      },
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
        await prisma.examenSuiviProgramme.update({
          where: { id_examen_suivi: examen.id_examen_suivi },
          data: {
            notes: examen.notes 
              ? `${examen.notes}\n\nPrescription créée automatiquement le ${new Date().toLocaleDateString('fr-FR')} (ID: ${prescription.id_prescription})`
              : `Prescription créée automatiquement le ${new Date().toLocaleDateString('fr-FR')} (ID: ${prescription.id_prescription})`,
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
      success: true,
      message: `${prescriptionsCreees.length} prescription(s) créée(s)`,
      prescriptionsCreees,
      totalExamens: examensAcreer.length,
      date: dateRef.toISOString(),
    })
  } catch (error: any) {
    console.error('Erreur lors de la création automatique des prescriptions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création automatique des prescriptions',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// GET - Vérifier l'état du job (pour monitoring)
export async function GET(request: NextRequest) {
  try {
    const dateRef = new Date()
    dateRef.setHours(0, 0, 0, 0)

    const examensAcreer = await prisma.examenSuiviProgramme.findMany({
      where: {
        statut: 'PROGRAMME',
        date_examen: {
          lte: dateRef,
        },
      },
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
      date: dateRef.toISOString(),
      examensEnAttente: examensAcreer.length,
      examens: examensAcreer.map((e: any) => ({
        id_examen_suivi: e.id_examen_suivi,
        date_examen: e.date_examen,
        type_examen: e.type_examen,
        patient: {
          id: e.suivi.patient.id_patient,
          nom: e.suivi.patient.nom,
          prenom: e.suivi.patient.prenom,
        },
        medecin: e.suivi.medecin,
      })),
    })
  } catch (error: any) {
    console.error('Erreur lors de la vérification:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la vérification',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
