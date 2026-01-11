import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Mettre à jour le statut d'une prescription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { statut } = body

    if (!statut || !['EN_ATTENTE', 'EN_COURS', 'TERMINE'].includes(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide. Doit être: EN_ATTENTE, EN_COURS ou TERMINE' },
        { status: 400 }
      )
    }

    const prescription = await prisma.prescriptionExamen.update({
      where: { id_prescription: id },
      data: { statut: statut as 'EN_ATTENTE' | 'EN_COURS' | 'TERMINE' },
    })

    return NextResponse.json({
      message: 'Statut de la prescription mis à jour',
      prescription,
    })
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de la prescription:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la prescription' },
      { status: 500 }
    )
  }
}

