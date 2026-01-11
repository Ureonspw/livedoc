import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Liste de la salle d'attente
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const statut = searchParams.get('statut') as 'EN_ATTENTE' | 'EN_CONSULTATION' | 'TERMINE' | null
    const medecin_id = searchParams.get('medecin_id')

    const where: any = statut ? { statut } : {}
    
    // Si un médecin_id est fourni, filtrer par les consultations de ce médecin
    if (medecin_id) {
      const medecinIdNum = parseInt(medecin_id)
      // Récupérer les consultations de ce médecin
      const consultations = await prisma.consultation.findMany({
        where: { id_medecin: medecinIdNum },
        select: { id_patient: true },
      })
      const patientIds = consultations.map(c => c.id_patient)
      if (patientIds.length > 0) {
        where.id_patient = { in: patientIds }
      } else {
        // Si le médecin n'a pas de consultations, retourner une liste vide
        return NextResponse.json({
          salleAttente: [],
          stats: {
            en_attente: 0,
            en_consultation: 0,
            termine: 0,
          },
        })
      }
    }

    const salleAttenteRaw = await prisma.salleAttente.findMany({
      where,
      include: {
        patient: {
          select: {
            id_patient: true,
            nom: true,
            prenom: true,
            sexe: true,
            date_naissance: true,
            telephone: true,
          },
        },
      },
      orderBy: [
        { statut: 'asc' },
        { date_arrivee: 'asc' },
      ],
    })

    // Trier manuellement par priorité : CRITIQUE > URGENT > NORMAL
    const prioriteOrder = { CRITIQUE: 3, URGENT: 2, NORMAL: 1 }
    const salleAttente = salleAttenteRaw.sort((a, b) => {
      const priorityDiff = (prioriteOrder[b.priorite] || 0) - (prioriteOrder[a.priorite] || 0)
      if (priorityDiff !== 0) return priorityDiff
      // Si même priorité, trier par date d'arrivée
      return new Date(a.date_arrivee).getTime() - new Date(b.date_arrivee).getTime()
    })

    // Statistiques
    const stats = {
      en_attente: await prisma.salleAttente.count({ where: { statut: 'EN_ATTENTE' } }),
      en_consultation: await prisma.salleAttente.count({ where: { statut: 'EN_CONSULTATION' } }),
      termine: await prisma.salleAttente.count({ where: { statut: 'TERMINE' } }),
    }

    return NextResponse.json({
      salleAttente,
      stats,
    })
  } catch (error: any) {
    console.error('Erreur lors de la récupération de la salle d\'attente:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la salle d\'attente' },
      { status: 500 }
    )
  }
}

// POST - Ajouter un patient à la salle d'attente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_patient, priorite } = body

    if (!id_patient) {
      return NextResponse.json(
        { error: 'ID patient requis' },
        { status: 400 }
      )
    }

    // Valider la priorité
    const prioriteValide = priorite && ['NORMAL', 'URGENT', 'CRITIQUE'].includes(priorite) 
      ? priorite 
      : 'NORMAL'

    // Vérifier si le patient est déjà en attente
    const existing = await prisma.salleAttente.findFirst({
      where: {
        id_patient,
        statut: 'EN_ATTENTE',
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Le patient est déjà en salle d\'attente' },
        { status: 400 }
      )
    }

    // Ajouter à la salle d'attente
    const salleAttente = await prisma.salleAttente.create({
      data: {
        id_patient,
        statut: 'EN_ATTENTE',
        priorite: prioriteValide as 'NORMAL' | 'URGENT' | 'CRITIQUE',
      },
      include: {
        patient: {
          select: {
            id_patient: true,
            nom: true,
            prenom: true,
            sexe: true,
            date_naissance: true,
            telephone: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Patient ajouté à la salle d\'attente',
        salleAttente,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout à la salle d\'attente:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout à la salle d\'attente' },
      { status: 500 }
    )
  }
}

