import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Créer des constantes vitales pour une visite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id_visite,
      temperature,
      frequence_cardiaque,
      saturation_oxygene,
      poids,
      taille,
    } = body

    if (!id_visite) {
      return NextResponse.json(
        { error: 'ID visite requis' },
        { status: 400 }
      )
    }

    // Vérifier si la visite existe
    const visite = await prisma.visite.findUnique({
      where: { id_visite },
    })

    if (!visite) {
      return NextResponse.json(
        { error: 'Visite non trouvée' },
        { status: 404 }
      )
    }

    // Créer ou mettre à jour les constantes vitales
    const constantes = await prisma.constantesVitales.upsert({
      where: { id_visite },
      update: {
        temperature: temperature ? parseFloat(temperature) : null,
        frequence_cardiaque: frequence_cardiaque ? parseInt(frequence_cardiaque) : null,
        saturation_oxygene: saturation_oxygene ? parseInt(saturation_oxygene) : null,
        poids: poids ? parseFloat(poids) : null,
        taille: taille ? parseFloat(taille) : null,
      },
      create: {
        id_visite,
        temperature: temperature ? parseFloat(temperature) : null,
        frequence_cardiaque: frequence_cardiaque ? parseInt(frequence_cardiaque) : null,
        saturation_oxygene: saturation_oxygene ? parseInt(saturation_oxygene) : null,
        poids: poids ? parseFloat(poids) : null,
        taille: taille ? parseFloat(taille) : null,
      },
      include: {
        visite: {
          include: {
            consultation: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Constantes vitales enregistrées',
        constantes,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erreur lors de l\'enregistrement des constantes vitales:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement des constantes vitales' },
      { status: 500 }
    )
  }
}

