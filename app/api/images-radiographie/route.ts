import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Créer une image de radiographie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id_visite, chemin_fichier, nom_fichier, taille_fichier, type_mime } = body

    if (!id_visite || !chemin_fichier || !nom_fichier) {
      return NextResponse.json(
        { error: 'ID visite, chemin et nom de fichier sont requis' },
        { status: 400 }
      )
    }

    const image = await prisma.imageRadiographie.create({
      data: {
        id_visite: parseInt(id_visite),
        chemin_fichier: chemin_fichier,
        nom_fichier: nom_fichier,
        taille_fichier: taille_fichier ? BigInt(taille_fichier) : null,
        type_mime: type_mime || null,
      },
    })

    return NextResponse.json(
      {
        message: 'Image de radiographie créée avec succès',
        image: {
          ...image,
          taille_fichier: image.taille_fichier ? image.taille_fichier.toString() : null,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'image:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'image', details: error.message },
      { status: 500 }
    )
  }
}

