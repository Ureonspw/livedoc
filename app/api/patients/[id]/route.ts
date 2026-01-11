import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Récupérer un patient par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = parseInt(resolvedParams.id)

    const patient = await prisma.patient.findUnique({
      where: { id_patient: id },
      include: {
        consultations: {
          include: {
            medecin: {
              select: {
                nom: true,
                prenom: true,
              },
            },
          },
          orderBy: { date_consultation: 'desc' },
          take: 10,
        },
        salleAttente: {
          where: {
            statut: 'EN_ATTENTE',
          },
          orderBy: { date_arrivee: 'desc' },
        },
        suivis: {
          orderBy: { date_suivi: 'desc' },
          take: 5,
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ patient })
  } catch (error: any) {
    console.error('Erreur lors de la récupération du patient:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du patient' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = parseInt(resolvedParams.id)
    const body = await request.json()
    const { nom, prenom, sexe, date_naissance, telephone, adresse } = body

    const patient = await prisma.patient.update({
      where: { id_patient: id },
      data: {
        ...(nom && { nom }),
        ...(prenom && { prenom }),
        ...(sexe && { sexe: sexe.toUpperCase() === 'HOMME' ? 'HOMME' : 'FEMME' }),
        ...(date_naissance && { date_naissance: new Date(date_naissance) }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(adresse !== undefined && { adresse: adresse || null }),
      },
    })

    return NextResponse.json({
      message: 'Patient mis à jour avec succès',
      patient,
    })
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du patient:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du patient' },
      { status: 500 }
    )
  }
}

