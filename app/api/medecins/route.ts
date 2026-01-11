import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Liste des médecins disponibles
export async function GET(request: NextRequest) {
  try {
    const medecins = await prisma.utilisateur.findMany({
      where: {
        role: 'MEDECIN',
      },
      select: {
        id_utilisateur: true,
        nom: true,
        prenom: true,
        email: true,
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' },
      ],
    })

    // Si aucun médecin, retourner aussi les admins comme fallback
    if (medecins.length === 0) {
      const admins = await prisma.utilisateur.findMany({
        where: {
          role: 'ADMIN',
        },
        select: {
          id_utilisateur: true,
          nom: true,
          prenom: true,
          email: true,
        },
        orderBy: [
          { nom: 'asc' },
          { prenom: 'asc' },
        ],
      })
      return NextResponse.json({ medecins: admins, isFallback: true })
    }

    return NextResponse.json({ medecins, isFallback: false })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des médecins:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des médecins' },
      { status: 500 }
    )
  }
}

