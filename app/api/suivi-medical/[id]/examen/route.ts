import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Programmer un examen de suivi
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const id_suivi = parseInt(id)
    const body = await request.json()

    const {
      id_medecin,
      date_examen,
      type_examen,
      raison,
      notes,
    } = body

    if (!id_medecin || !date_examen || !type_examen) {
      return NextResponse.json(
        { error: 'ID médecin, date d\'examen et type d\'examen sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que le suivi existe
    const suivi = await prisma.suiviMedical.findUnique({
      where: { id_suivi },
    })

    if (!suivi) {
      return NextResponse.json(
        { error: 'Suivi médical non trouvé' },
        { status: 404 }
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

    // Créer l'examen programmé
    const examen = await prisma.examenSuiviProgramme.create({
      data: {
        id_suivi,
        id_medecin,
        date_examen: new Date(date_examen),
        type_examen,
        raison: raison || null,
        notes: notes || null,
        statut: 'PROGRAMME',
      },
      include: {
        medecin: {
          select: {
            nom: true,
            prenom: true,
          },
        },
        suivi: {
          include: {
            patient: true,
          },
        },
      },
    })

    // Mettre à jour la date du prochain examen dans le suivi si c'est le premier ou le plus proche
    const prochainExamen = await prisma.examenSuiviProgramme.findFirst({
      where: {
        id_suivi,
        statut: 'PROGRAMME',
      },
      orderBy: { date_examen: 'asc' },
    })

    if (prochainExamen) {
      await prisma.suiviMedical.update({
        where: { id_suivi },
        data: {
          date_prochain_examen: prochainExamen.date_examen,
        },
      })
    }

    return NextResponse.json(
      {
        message: 'Examen de suivi programmé avec succès',
        examen,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la programmation de l\'examen:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la programmation de l\'examen',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

// GET - Liste des examens programmés pour un suivi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const id_suivi = parseInt(id)
    const searchParams = request.nextUrl.searchParams
    const statut = searchParams.get('statut')

    const where: any = { id_suivi }
    if (statut) {
      where.statut = statut
    }

    const examens = await prisma.examenSuiviProgramme.findMany({
      where,
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
    })

    return NextResponse.json({ examens })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des examens:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des examens' },
      { status: 500 }
    )
  }
}
