import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Récupérer les images de radiographie d'une visite
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Gérer les params synchrones et asynchrones (Next.js 13+)
    const resolvedParams = await Promise.resolve(params)
    const visiteId = parseInt(resolvedParams.id)
    
    if (isNaN(visiteId)) {
      return NextResponse.json(
        { error: 'ID de visite invalide' },
        { status: 400 }
      )
    }

    const images = await prisma.imageRadiographie.findMany({
      where: { id_visite: visiteId },
      orderBy: { date_upload: 'desc' },
    })

    // Convertir les BigInt en string
    const imagesSerialized = images.map((image: any) => ({
      ...image,
      taille_fichier: image.taille_fichier ? image.taille_fichier.toString() : null,
    }))

    return NextResponse.json({ images: imagesSerialized })
  } catch (error: any) {
    console.error('Erreur lors de la récupération des images:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des images', details: error.message },
      { status: 500 }
    )
  }
}

