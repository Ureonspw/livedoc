import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Mettre à jour le statut d'un patient dans la salle d'attente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Gérer les params qui peuvent être une Promise (Next.js 15+) ou un objet (Next.js 13-14)
    const resolvedParams = await Promise.resolve(params)
    const id = parseInt(resolvedParams.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { statut, priorite, id_medecin } = body

    const updateData: any = {}

    if (statut) {
      if (!['EN_ATTENTE', 'EN_CONSULTATION', 'TERMINE'].includes(statut)) {
        return NextResponse.json(
          { error: 'Statut invalide. Doit être: EN_ATTENTE, EN_CONSULTATION ou TERMINE' },
          { status: 400 }
        )
      }
      
      // Si on passe à EN_CONSULTATION, vérifier qu'il n'y a pas déjà un patient EN_CONSULTATION pour ce médecin
      if (statut === 'EN_CONSULTATION' && id_medecin) {
        // Chercher une consultation EN_CONSULTATION pour ce médecin
        const consultationEnCours = await prisma.consultation.findFirst({
          where: {
            id_medecin: parseInt(id_medecin),
            date_consultation: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
            },
          },
          include: {
            patient: {
              include: {
                salleAttente: {
                  where: {
                    statut: 'EN_CONSULTATION',
                  },
                },
              },
            },
          },
        });

        if (consultationEnCours && consultationEnCours.patient.salleAttente.length > 0) {
          return NextResponse.json(
            { error: 'Vous avez déjà un patient en consultation. Veuillez terminer cette consultation avant d\'en commencer une autre.' },
            { status: 400 }
          );
        }
      }
      
      updateData.statut = statut
    }

    if (priorite) {
      if (!['NORMAL', 'URGENT', 'CRITIQUE'].includes(priorite)) {
        return NextResponse.json(
          { error: 'Priorité invalide. Doit être: NORMAL, URGENT ou CRITIQUE' },
          { status: 400 }
        )
      }
      updateData.priorite = priorite
    }

    // Vérifier que l'entrée existe
    const existing = await prisma.salleAttente.findUnique({
      where: { id_salle_attente: id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Entrée de salle d\'attente non trouvée' },
        { status: 404 }
      )
    }

    const salleAttente = await prisma.salleAttente.update({
      where: { id_salle_attente: id },
      data: updateData,
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

    return NextResponse.json({
      message: 'Statut mis à jour',
      salleAttente,
    })
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du statut:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour du statut',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE - Retirer un patient de la salle d'attente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Gérer les params qui peuvent être une Promise (Next.js 15+) ou un objet (Next.js 13-14)
    const resolvedParams = await Promise.resolve(params)
    const id = parseInt(resolvedParams.id)

    await prisma.salleAttente.delete({
      where: { id_salle_attente: id },
    })

    return NextResponse.json({
      message: 'Patient retiré de la salle d\'attente',
    })
  } catch (error: any) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}

